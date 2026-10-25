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
        this(width, height, wider, sizePercent, 10);
    }

    Framing(int width, int height, boolean wider, int sizePercent, int topPercent) {
        float w = Math.max(1, width), h = Math.max(1, height);
        float cover = Math.max(w / 1086f, h / 1448f);
        // Preserve the annotated head/shoulder/back-side region instead of shrinking
        // the full image width. This can reveal only surfaces in the original view.
        StudyFraming subject = StudyFraming.fit(width, height, false, sizePercent, topPercent);
        scale = wider ? subject.scale : cover;
        x = wider ? subject.x : (w - 1086f * scale) * 0.5f;
        y = wider ? subject.y : (h - 1448f * scale) * 0.5f;
        // Screen-space inertia stays legible when the composition pulls back.
        motionGain = Math.min(1.45f, cover / scale);
    }
}
