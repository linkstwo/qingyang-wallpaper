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
        this(width, height, wider, 90);
    }

    Framing(int width, int height, boolean wider, int sizePercent) {
        float w = Math.max(1, width), h = Math.max(1, height);
        float cover = Math.max(w / 1086f, h / 1448f);
        // Reserve real room at the back, including a modest compositor centre crop.
        // The full source width is the reference, rather than the old 850px crop.
        scale = wider ? Math.min(cover, w / 1086f * MathX.clamp(sizePercent, 65, 125) / 100f) : cover;
        x = wider ? w * 0.5f - 590f * scale : (w - 1086f * scale) * 0.5f;
        float centeredY = (h - 1448f * scale) * 0.5f;
        // The source hair already touches its top edge; keep it at the screen edge.
        y = wider ? Math.min(0f, centeredY) : centeredY;
        // Screen-space inertia stays legible when the composition pulls back.
        motionGain = Math.min(1.45f, cover / scale);
    }
}
