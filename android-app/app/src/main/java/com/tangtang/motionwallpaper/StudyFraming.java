package com.tangtang.motionwallpaper;

/** Source-pixel framing only. These coarse regions do not reconstruct hidden surfaces. */
final class StudyFraming {
    static final float RESERVE_ZOOM = 1.08f;
    final float scale, x, y;

    private StudyFraming(float scale, float x, float y) {
        this.scale = scale; this.x = x; this.y = y;
    }

    static StudyFraming fit(int width, int height, boolean back, int sizePercent, int topPercent) {
        float w = Math.max(1, width), h = Math.max(1, height);
        float left = back ? 137f : 185f, right = back ? 786f : 1015f;
        float top = back ? 15f : 20f, bottom = back ? 1000f : 1040f;
        float inset = Math.min(w * (24f / 1080f), h * .1f);
        float cover = Math.max(w / 1086f, h / 1448f);
        float base = Math.min(cover, Math.min((w - 2f * inset) / (RESERVE_ZOOM * (right-left)),
                (h - 2f * inset) / (RESERVE_ZOOM * (bottom-top))));
        float scale = Math.min(cover, base * MathX.clamp(sizePercent, 65, 125) / 90f);
        float x = w * .5f - (left+right) * .5f * scale;
        float y = h * MathX.clamp(topPercent, 0, 20) / 100f;
        float minY = h*.5f + (inset-h*.5f)/RESERVE_ZOOM - top*scale;
        float maxY = h*.5f + (h-inset-h*.5f)/RESERVE_ZOOM - bottom*scale;
        if (minY <= maxY) y = MathX.clamp(y, minY, maxY);
        return new StudyFraming(scale, x, y);
    }
}
