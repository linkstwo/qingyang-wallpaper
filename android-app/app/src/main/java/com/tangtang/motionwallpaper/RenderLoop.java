package com.tangtang.motionwallpaper;

import android.content.Context;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.view.Surface;

import java.util.Locale;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * 壁纸渲染线程：EGL 建在壁纸 Surface 上，固定 1/120 秒步长推进物理，
 * 静止时降到 10fps 省电（有动作时由传感器唤醒回到 60fps）。
 * 骨架沿用原轻漾 0.4.0 RenderLoop 的做法（HandlerThread + 定时帧 + await 收尾）。
 */
final class RenderLoop {
    private static final String TAG = "QingyangRender";
    private static final long STEP_NANOS = 8333333L;
    private static final float STEP_SECONDS = 0.008333334f;
    private static final int ACTIVE_FPS = 60;
    private static final int IDLE_FPS = 10;

    private final HandlerThread thread;
    private final Handler handler;
    private final SensorFeed feed;
    private final Physics physics;
    private final SceneRenderer renderer;
    private final EglCore egl = new EglCore();

    private Surface surface;
    private int width = 1;
    private int height = 1;
    private boolean active;
    private boolean closed;
    private boolean surfaceReady;
    private boolean framePending;
    private boolean needResize;
    private long accumulator;
    private long lastNanos;
    private long lastLog;
    private int frames;
    private int fps;
    private long fpsWindowStart;
    private String lastError = "";

    private final Runnable frame = new Runnable() {
        @Override
        public void run() {
            framePending = false;
            if (closed || !active || !surfaceReady || !egl.hasSurface()) {
                return;
            }
            final long startNanos = SystemClock.elapsedRealtimeNanos();
            if (lastNanos == 0L) {
                lastNanos = startNanos;
            }
            accumulator += Math.min(startNanos - lastNanos, 100000000L);
            lastNanos = startNanos;
            feed.decayStale();
            while (accumulator >= STEP_NANOS) {
                physics.step(STEP_SECONDS, feed.motion());
                accumulator -= STEP_NANOS;
            }
            try {
                if (!renderer.isReady()) {
                    renderer.create(width, height);
                } else if (needResize) {
                    needResize = false;
                    renderer.resize(width, height);
                }
                renderer.draw(physics);
                egl.swap();
            } catch (Exception error) {
                report(error);
                return;
            }
            frames++;
            final long nowMillis = startNanos / 1000000L;
            if (nowMillis - fpsWindowStart >= 1000L) {
                fps = (int) Math.round(frames * 1000.0d / Math.max(1L, nowMillis - fpsWindowStart));
                frames = 0;
                fpsWindowStart = nowMillis;
            }
            if (nowMillis - lastLog >= 900L) {
                lastLog = nowMillis;
                Log.i(TAG, String.format(Locale.US, "fps=%d %s | %s | %s | %s",
                        fps, physics.snapshot(), feed.state(), title, feed.motionSnapshot()));
            }
            final int target = physics.moving() ? ACTIVE_FPS : IDLE_FPS;
            final long spent = (SystemClock.elapsedRealtimeNanos() - startNanos) / 1000000L;
            framePending = true;
            handler.postDelayed(this, Math.max(1L, (1000L / target) - spent));
        }
    };

    private volatile String title = "";

    RenderLoop(Context context) {
        physics = new Physics(RenderParams.load(context.getApplicationContext()));
        thread = new HandlerThread("QingyangWallpaper");
        thread.start();
        handler = new Handler(thread.getLooper());
        renderer = new SceneRenderer(context);
        feed = new SensorFeed(context, handler);
        feed.wake = new Runnable() {
            @Override
            public void run() {
                wakeFromSensor();
            }
        };
    }

    void setTitle(String value) {
        title = value;
    }

    void setSurface(final Surface target, final int surfaceWidth, final int surfaceHeight) {
        handler.post(new Runnable() {
            @Override
            public void run() {
                destroyGl();
                surface = target;
                width = Math.max(1, surfaceWidth);
                height = Math.max(1, surfaceHeight);
                surfaceReady = target != null && target.isValid();
                lastNanos = 0L;
                accumulator = 0L;
                schedule();
            }
        });
    }

    void resize(final int surfaceWidth, final int surfaceHeight) {
        handler.post(new Runnable() {
            @Override
            public void run() {
                width = Math.max(1, surfaceWidth);
                height = Math.max(1, surfaceHeight);
                if (egl.hasSurface() && surface != null && surface.isValid()) {
                    egl.createSurface(surface);
                }
                needResize = true;
                schedule();
            }
        });
    }

    void setActive(final boolean value) {
        handler.post(new Runnable() {
            @Override
            public void run() {
                if (closed || active == value) {
                    return;
                }
                active = value;
                lastNanos = 0L;
                accumulator = 0L;
                physics.reset();
                if (active) {
                    feed.start();
                } else {
                    feed.stop();
                }
                if (active) {
                    schedule();
                } else {
                    handler.removeCallbacks(frame);
                    framePending = false;
                }
            }
        });
    }

    void clearSurface() {
        await(new Runnable() {
            @Override
            public void run() {
                surfaceReady = false;
                feed.stop();
                destroyGl();
            }
        });
    }

    void close() {
        await(new Runnable() {
            @Override
            public void run() {
                closed = true;
                active = false;
                surfaceReady = false;
                feed.stop();
                destroyGl();
            }
        });
        thread.quitSafely();
    }

    String status() {
        if (!lastError.isEmpty()) {
            return "渲染错误：" + lastError;
        }
        return feed.state() + " · " + String.format(Locale.US, "%d fps", fps);
    }

    private void schedule() {
        if (closed || !active || !surfaceReady) {
            return;
        }
        if (framePending) {
            handler.removeCallbacks(frame);
        }
        framePending = true;
        handler.post(frame);
    }

    private void wakeFromSensor() {
        final long now = SystemClock.elapsedRealtimeNanos();
        if (closed || !active || !surfaceReady || physics.moving() || now - lastNanos <= 8000000L) {
            return;
        }
        schedule();
    }

    private void report(Exception error) {
        lastError = String.valueOf(error.getMessage());
        Log.e(TAG, "渲染失败", error);
        feed.stop();
        destroyGl();
        active = false;
        handler.removeCallbacks(frame);
        framePending = false;
    }

    private void destroyGl() {
        handler.removeCallbacks(frame);
        framePending = false;
        renderer.release();
        egl.release();
    }

    private void await(Runnable action) {
        if (Looper.myLooper() == handler.getLooper()) {
            action.run();
            return;
        }
        final CountDownLatch latch = new CountDownLatch(1);
        if (handler.post(new Runnable() {
            @Override
            public void run() {
                try {
                    action.run();
                } finally {
                    latch.countDown();
                }
            }
        })) {
            try {
                latch.await(2000L, TimeUnit.MILLISECONDS);
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
            }
        }
    }
}