package com.tangtang.motionwallpaper;

/**
 * 搬自已验收样片的 character-prototype/preview/rig.mjs 里的 Spring。
 * 半隐式欧拉 + 子步进（最多 1/240 秒一步），越界夹紧并吸掉 65% 速度，
 * 避免快速晃动时出现持续震荡或发散。
 */
final class Spring {
    private final float frequency;
    private final float damping;
    private final float limit;
    private float x;
    private float v;

    Spring(float frequency, float damping, float limit) {
        this.frequency = frequency;
        this.damping = damping;
        this.limit = limit;
    }

    float step(float force, float dt) {
        final float omega = (float) (2.0d * Math.PI * frequency);
        final int steps = Math.max(1, (int) Math.ceil(dt * 240.0d));
        final float h = dt / steps;
        for (int i = 0; i < steps; i++) {
            v += (force - omega * omega * x - 2.0f * damping * omega * v) * h;
            x += v * h;
            if (Math.abs(x) > limit) {
                x = MathX.clamp(x, -limit, limit);
                v *= 0.35f;
            }
        }
        return x;
    }

    float value() {
        return x;
    }

    float velocity() {
        return v;
    }

    void reset() {
        x = 0.0f;
        v = 0.0f;
    }
}