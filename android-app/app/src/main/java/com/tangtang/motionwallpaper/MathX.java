package com.tangtang.motionwallpaper;

/** 数值小工具，与样片 rig.mjs / MotionInput 的算法一一对应。 */
final class MathX {
    private MathX() {}

    static float clamp(float v, float min, float max) {
        return Math.max(min, Math.min(max, v));
    }

    static float limit(float v, float m) {
        return clamp(v, -m, m);
    }

    /** 与 rig.mjs / MotionInput.mix 相同的指数平滑：时间常数 tau 秒。 */
    static float mix(float from, float to, float dt, float tau) {
        return from + (to - from) * (float) (1.0d - Math.exp(-dt / tau));
    }

    static boolean valid(float a, float b, float c) {
        return Float.isFinite(a) && Float.isFinite(b) && Float.isFinite(c);
    }
}