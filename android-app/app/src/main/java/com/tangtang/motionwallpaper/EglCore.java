package com.tangtang.motionwallpaper;

import android.opengl.EGL14;
import android.opengl.EGLConfig;
import android.opengl.EGLContext;
import android.opengl.EGLDisplay;
import android.opengl.EGLSurface;
import android.view.Surface;

/** One EGL context per wallpaper engine, owned exclusively by its render thread. */
final class EglCore {
    private EGLDisplay display = EGL14.EGL_NO_DISPLAY;
    private EGLContext context = EGL14.EGL_NO_CONTEXT;
    private EGLSurface surface = EGL14.EGL_NO_SURFACE;
    private EGLConfig config;
    private boolean initialized;
    private String lastError = "";

    String lastError() {
        return lastError;
    }

    private boolean fail(String operation) {
        // Capture before cleanup consumes or replaces EGL's thread-local error.
        lastError = operation + " eglError=0x" + Integer.toHexString(EGL14.eglGetError());
        release();
        return false;
    }

    boolean create(Surface target) {
        release();
        lastError = "";
        if (target == null || !target.isValid()) {
            lastError = "Invalid Android Surface";
            return false;
        }
        display = EGL14.eglGetDisplay(EGL14.EGL_DEFAULT_DISPLAY);
        if (display == EGL14.EGL_NO_DISPLAY) return fail("eglGetDisplay");
        int[] version = new int[2];
        if (!EGL14.eglInitialize(display, version, 0, version, 1)) return fail("eglInitialize");
        initialized = true;
        int[] attributes = {
                EGL14.EGL_RENDERABLE_TYPE, EGL14.EGL_OPENGL_ES2_BIT,
                EGL14.EGL_SURFACE_TYPE, EGL14.EGL_WINDOW_BIT,
                EGL14.EGL_RED_SIZE, 8, EGL14.EGL_GREEN_SIZE, 8,
                EGL14.EGL_BLUE_SIZE, 8, EGL14.EGL_ALPHA_SIZE, 0,
                EGL14.EGL_DEPTH_SIZE, 0, EGL14.EGL_STENCIL_SIZE, 0,
                EGL14.EGL_NONE
        };
        EGLConfig[] configs = new EGLConfig[1];
        int[] count = new int[1];
        if (!EGL14.eglChooseConfig(display, attributes, 0, configs, 0, 1, count, 0)
                || count[0] == 0) return fail("eglChooseConfig");
        config = configs[0];
        int[] contextAttributes = {EGL14.EGL_CONTEXT_CLIENT_VERSION, 2, EGL14.EGL_NONE};
        context = EGL14.eglCreateContext(display, config, EGL14.EGL_NO_CONTEXT, contextAttributes, 0);
        if (context == EGL14.EGL_NO_CONTEXT) return fail("eglCreateContext");
        return createSurface(target);
    }

    boolean createSurface(Surface target) {
        if (target == null || !target.isValid() || display == EGL14.EGL_NO_DISPLAY
                || context == EGL14.EGL_NO_CONTEXT || config == null) {
            lastError = "Cannot create window without valid Surface/context";
            release();
            return false;
        }
        if (surface != EGL14.EGL_NO_SURFACE) {
            EGL14.eglMakeCurrent(display, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_CONTEXT);
            EGL14.eglDestroySurface(display, surface);
            surface = EGL14.EGL_NO_SURFACE;
        }
        surface = EGL14.eglCreateWindowSurface(display, config, target, new int[]{EGL14.EGL_NONE}, 0);
        if (surface == EGL14.EGL_NO_SURFACE) return fail("eglCreateWindowSurface");
        if (!makeCurrent()) {
            release();
            return false;
        }
        return true;
    }

    boolean makeCurrent() {
        if (!hasSurface()) return false;
        if (!EGL14.eglMakeCurrent(display, surface, surface, context)) {
            lastError = "eglMakeCurrent eglError=0x" + Integer.toHexString(EGL14.eglGetError());
            return false;
        }
        return true;
    }

    boolean swap() {
        if (!hasSurface()) return false;
        if (!EGL14.eglSwapBuffers(display, surface)) {
            lastError = "eglSwapBuffers eglError=0x" + Integer.toHexString(EGL14.eglGetError());
            return false;
        }
        return true;
    }

    boolean hasSurface() {
        return display != EGL14.EGL_NO_DISPLAY && context != EGL14.EGL_NO_CONTEXT
                && surface != EGL14.EGL_NO_SURFACE;
    }

    void release() {
        if (display != EGL14.EGL_NO_DISPLAY) {
            // Do not unbind a different engine's context during partial initialization.
            if (context != EGL14.EGL_NO_CONTEXT && context.equals(EGL14.eglGetCurrentContext())) {
                EGL14.eglMakeCurrent(display, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_CONTEXT);
            }
            if (surface != EGL14.EGL_NO_SURFACE) EGL14.eglDestroySurface(display, surface);
            if (context != EGL14.EGL_NO_CONTEXT) EGL14.eglDestroyContext(display, context);
            if (initialized) EGL14.eglTerminate(display);
        }
        display = EGL14.EGL_NO_DISPLAY;
        context = EGL14.EGL_NO_CONTEXT;
        surface = EGL14.EGL_NO_SURFACE;
        config = null;
        initialized = false;
    }
}
