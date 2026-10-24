package com.tangtang.motionwallpaper;

/** Pure scene mapping, shared by the app preview and wallpaper renderer. */
final class Framing {
    final float scale, x, y, motionGain;

    static int[] previewViewport(int width, int height, float phoneAspect) {
        width = Math.max(1, width); height = Math.max(1, height);
        float aspect = Float.isFinite(phoneAspect) && phoneAspect > 0f ? phoneAspect : 0.45f;
        int w = width, h = height;
        if (width / (float) height > aspect) w = Math.max(1, Math.round(height * aspect));
        else h = Math.max(1, Math.round(width / aspect));
        return new int[]{(width - w) / 2, (height - h) / 2, w, h};
    }

    Framing(int width, int height, boolean wider) {
        float w = Math.max(1, width), h = Math.max(1, height);
        float cover = Math.max(w / 1086f, h / 1448f);
        scale = wider ? Math.min(cover, w / 850f) : cover;
        float imageWidth = 1086f * scale;
        x = wider && imageWidth > w
                ? MathX.clamp(w * 0.5f - 610f * scale, w - imageWidth, 0f)
                : (w - imageWidth) * 0.5f;
        float centeredY = (h - 1448f * scale) * 0.5f;
        y = wider ? Math.min(0f, centeredY) : centeredY;
        // Screen-space inertia stays legible when the composition pulls back.
        motionGain = Math.min(1.6f, cover / scale);
    }
}
