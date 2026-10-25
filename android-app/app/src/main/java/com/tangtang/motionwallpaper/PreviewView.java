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

/** 应用内预览：与壁纸共享 SceneRenderer/Physics，系统实际锁屏仍需独立验收。 */
final class PreviewView extends GLSurfaceView implements GLSurfaceView.Renderer {
    private static final String TAG = "QingyangPreview";
    private static final long STEP_NANOS = 8333333L;
    private static final float STEP_SECONDS = 0.008333334f;

    private final Physics physics = new Physics();
    private final SensorFeed feed;
    private SceneRenderer scene;
    private long lastNanos;
    private long accumulator;
    private long frames;
    private long windowStart;
    private long lastLog;
    private int fps;
    private String error = "";
    private volatile CropFrame cropOverride;
    private volatile boolean freezeMotion;

    void crop(CropFrame frame) { cropOverride=frame; }
    void freezeMotion(boolean value) { freezeMotion=value; queueEvent(() -> physics.reset()); }

    PreviewView(Context context) {
        super(context);
        setEGLContextClientVersion(2);
        setRenderer(this);
        setRenderMode(RENDERMODE_CONTINUOUSLY);
        feed = new SensorFeed(context, new Handler(Looper.getMainLooper()));
    }

    void start() {
        lastNanos = accumulator = 0L;
        onResume();
        feed.start();
    }

    void stop() {
        feed.stop();
        onPause();
        physics.reset();
    }

    void recalibrate() {
        feed.calibrate();
        queueEvent(() -> { physics.reset(); lastNanos = accumulator = 0L; });
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
        if (scene != null) scene.abandonGlResources();
        scene = null;
        lastNanos = accumulator = 0L;
        // Recreate GPU resources for each new context, after dimensions are known.
    }

    @Override
    public void onSurfaceChanged(GL10 gl, int width, int height) {
        try {
            if (scene == null) {
                scene = new SceneRenderer(getContext());
                scene.phonePreview(true);
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
            if(!freezeMotion) physics.step(STEP_SECONDS, feed.motion());
            accumulator -= STEP_NANOS;
        }
        scene.cropOverride(cropOverride);
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
