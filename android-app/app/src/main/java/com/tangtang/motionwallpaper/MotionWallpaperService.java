package com.tangtang.motionwallpaper;

import android.app.KeyguardManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Rect;
import android.os.Build;
import android.os.PowerManager;
import android.service.wallpaper.WallpaperService;
import android.util.Log;
import android.view.SurfaceHolder;

/**
 * 动态壁纸服务。生命周期策略沿用原轻漾 0.4.0：
 * 只有“可见 + 屏幕亮着 + Surface 就绪”三条同时成立才渲染，
 * 并且监听 SCREEN_ON / SCREEN_OFF / USER_PRESENT 立刻更新状态——
 * 熄屏或壁纸不可见时渲染线程与传感器都停，不留后台耗电。
 */
public final class MotionWallpaperService extends WallpaperService {
    private static final String TAG = "QingyangWallpaper";

    final class MotionEngine extends Engine {
        private final PowerManager power;
        private final KeyguardManager keyguard;
        private final BroadcastReceiver receiver;
        private RenderLoop loop;
        private boolean registered;
        private boolean surfaceReady;
        private boolean visible;

        MotionEngine() {
            super();
            power = (PowerManager) MotionWallpaperService.this.getSystemService(Context.POWER_SERVICE);
            keyguard = (KeyguardManager) MotionWallpaperService.this.getSystemService(Context.KEYGUARD_SERVICE);
            receiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    update();
                }
            };
        }

        @Override
        public void onCreate(SurfaceHolder holder) {
            super.onCreate(holder);
            loop = new RenderLoop(MotionWallpaperService.this);
            setTouchEventsEnabled(false);
            IntentFilter filter = new IntentFilter();
            filter.addAction(Intent.ACTION_SCREEN_ON);
            filter.addAction(Intent.ACTION_SCREEN_OFF);
            filter.addAction(Intent.ACTION_USER_PRESENT);
            if (Build.VERSION.SDK_INT >= 33) {
                MotionWallpaperService.this.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                MotionWallpaperService.this.registerReceiver(receiver, filter);
            }
            registered = true;
            Log.i(TAG, "壁纸引擎已创建 preview=" + isPreview());
        }

        @Override
        public void onSurfaceCreated(SurfaceHolder holder) {
            super.onSurfaceCreated(holder);
            surfaceReady = true;
            Rect frame = holder.getSurfaceFrame();
            loop.setSurface(holder.getSurface(), frame.width(), frame.height());
            update();
        }

        @Override
        public void onSurfaceChanged(SurfaceHolder holder, int format, int width, int height) {
            super.onSurfaceChanged(holder, format, width, height);
            loop.resize(width, height);
            update();
        }

        @Override
        public void onVisibilityChanged(boolean isVisible) {
            visible = isVisible;
            update();
        }

        void update() {
            if (loop == null) {
                return;
            }
            final boolean interactive = power == null || power.isInteractive();
            final boolean locked = keyguard != null && keyguard.isKeyguardLocked();
            String where = "系统壁纸";
            int flags = -1;
            if (isPreview()) {
                where = "系统设置预览";
            } else if (Build.VERSION.SDK_INT >= 34) {
                flags = getWallpaperFlags();
                final boolean lock = (flags & android.app.WallpaperManager.FLAG_LOCK) != 0;
                final boolean home = (flags & android.app.WallpaperManager.FLAG_SYSTEM) != 0;
                where = lock && home ? "锁屏与桌面" : lock ? "锁屏壁纸" : home ? "桌面壁纸" : "壁纸预览";
            }
            loop.setTitle(where + (locked ? " · 当前已锁定" : " · 当前已解锁"));
            final boolean shouldRender = visible && interactive && surfaceReady;
            loop.setActive(shouldRender);
            Log.i(TAG, "state visible=" + visible + " interactive=" + interactive + " surfaceReady=" + surfaceReady
                    + " locked=" + locked + " flags=" + flags + " where=" + where + " render=" + shouldRender);
        }

        @Override
        public void onSurfaceDestroyed(SurfaceHolder holder) {
            surfaceReady = false;
            if (loop != null) {
                loop.setActive(false);
                loop.clearSurface();
            }
            super.onSurfaceDestroyed(holder);
        }

        @Override
        public void onDestroy() {
            if (registered) {
                MotionWallpaperService.this.unregisterReceiver(receiver);
                registered = false;
            }
            if (loop != null) {
                loop.close();
                loop = null;
            }
            super.onDestroy();
        }
    }

    @Override
    public Engine onCreateEngine() {
        return new MotionEngine();
    }
}