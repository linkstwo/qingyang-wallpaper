package com.tangtang.motionwallpaper;

import android.content.Context;
import android.opengl.GLSurfaceView;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;

import java.util.Locale;

import javax.microedition.khronos.egl.EGLConfig;
import javax.microedition.khronos.opengles.GL10;

/** 应用内预览：和壁纸服务共用同一个 SceneRenderer 与 Physics，所见即壁纸所见。 */
final class PreviewView extends GLSurfaceView implements GLSurfaceView.Renderer {
    private static final String TAG = "QingyangPreview";
    private static final long STEP_NANOS = 8333333L;
    private static final float STEP_SECONDS = 0.008333334f;

    private final Physics physics;
    private final SensorFeed feed;
    private SceneRenderer scene;
    private long lastNanos;
    private long accumulator;
    private long frames;
    private long windowStart;
    private long lastLog;
    private int fps;
    private String error = "";

    PreviewView(Context context) {
        super(context);
        physics = new Physics(RenderParams.load(context.getApplicationContext()));
        setEGLContextClientVersion(2);
        setRenderer(this);
        setRenderMode(RENDERMODE_CONTINUOUSLY);
        feed = new SensorFeed(context, new Handler(Looper.getMainLooper()));
    }

    void start() {
        feed.start();
    }

    void stop() {
        feed.stop();
        physics.reset();
    }

    void recalibrate() {
        feed.calibrate();
        physics.reset();
    }

    String stats() {
        if (!error.isEmpty()) {
            return "渲染错误：" + error;
        }
        return String.format(Locale.US, "%s\n%s\n%d fps · %d 个三角形", feed.state(), physics.snapshot(), fps,
                scene == null ? 0 : scene.characterTriangles());
    }

    @Override
    public void onSurfaceCreated(GL10 gl, EGLConfig config) {
        // 真正创建放在 onSurfaceChanged（那里才知道尺寸）
    }

    @Override
    public void onSurfaceChanged(GL10 gl, int width, int height) {
        try {
            if (scene == null) {
                scene = new SceneRenderer(getContext());
                scene.create(width, height);
                Log.i(TAG, "渲染器就绪 tiles=" + scene.characterTriangles() + " size=" + width + "x" + height);
            } else {
                scene.resize(width, height);
            }
            error = "";
        } catch (Exception failure) {
            error = String.valueOf(failure.getMessage());
            Log.e(TAG, "渲染器创建失败", failure);
        }
    }

    @Override
    public void onDrawFrame(GL10 gl) {
        if (scene == null || !scene.isReady()) {
            return;
        }
        final long now = SystemClock.elapsedRealtimeNanos();
        if (lastNanos == 0L) {
            lastNanos = now;
        }
        accumulator += Math.min(now - lastNanos, 100000000L);
        lastNanos = now;
        feed.decayStale();
        while (accumulator >= STEP_NANOS) {
            physics.step(STEP_SECONDS, feed.motion());
            accumulator -= STEP_NANOS;
        }
        scene.draw(physics);
        frames++;
        final long nowMillis = now / 1000000L;
        if (nowMillis - windowStart >= 1000L) {
            fps = (int) Math.round(frames * 1000.0d / Math.max(1L, nowMillis - windowStart));
            frames = 0;
            windowStart = nowMillis;
        }
        if (nowMillis - lastLog >= 900L) {
            lastLog = nowMillis;
            Log.i(TAG, String.format(Locale.US, "fps=%d %s | %s | %s", fps, physics.snapshot(), feed.state(), feed.motionSnapshot()));
        }
    }
}