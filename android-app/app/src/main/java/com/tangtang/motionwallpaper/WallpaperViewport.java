package com.tangtang.motionwallpaper;

/** Visible display rectangle inside a possibly larger, scrolled wallpaper Surface.
 * Coordinates use Android's top-left origin; GL converts y once at the boundary.
 */
final class WallpaperViewport {
    static int[] visible(int surfaceWidth, int surfaceHeight, int displayWidth, int displayHeight,
                         float xOffset, float yOffset, int xPixels, int yPixels) {
        int sw = Math.max(1, surfaceWidth), sh = Math.max(1, surfaceHeight);
        int w = Math.min(sw, Math.max(1, displayWidth)), h = Math.min(sh, Math.max(1, displayHeight));
        int x = origin(sw - w, xOffset, xPixels), y = origin(sh - h, yOffset, yPixels);
        return new int[]{x, y, w, h};
    }
    private static int origin(int extra, float offset, int pixels) {
        if (extra <= 0) return 0;
        if (pixels < 0) return Math.max(0, Math.min(extra, -pixels));
        float t = Float.isFinite(offset) ? MathX.clamp(offset, 0f, 1f) : 0.5f;
        return Math.round(extra * t);
    }
}
