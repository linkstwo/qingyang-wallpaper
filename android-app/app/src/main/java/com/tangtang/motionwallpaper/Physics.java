package com.tangtang.motionwallpaper;

/** Fixed-step view following and layered inertia, checked against preview/response.mjs.
 * Fused attitude controls the held view; smoothed angular/linear acceleration drives
 * body, clothed soft tissue and independently delayed hair. Physics(false) preserves
 * the 0.5.1 baseline for deterministic comparison.
 */
final class Physics {
    private final boolean enhanced;
    Physics() { this(true); }
    Physics(boolean enhanced) { this.enhanced = enhanced; }
    private static final float BODY_PIXELS = 5.0f;
    private static final float CHEST_PIXELS = 7.0f;
    private static final float HAIR_PIXELS = 10.0f;
    /** 倾斜满量程：重力归一化差值 0.30 ≈ 17 度。 */
    private static final float TILT_FULL = 0.30f;

    private final Spring bodyX = new Spring(2.4f, 0.88f, 1.2f);
    private final Spring bodyY = new Spring(2.4f, 0.88f, 1.2f);
    private final Spring chestX = new Spring(2.6f, 0.43f, 1.4f);
    private final Spring chestZ = new Spring(3.1f, 0.54f, 1.2f);
    private final Spring chestY = new Spring(2.8f, 0.48f, 1.4f);
    private final Spring hairX = new Spring(1.7f, 0.58f, 1.5f);

    private final Spring legacyChestX = new Spring(3.2f, 0.50f, 1.4f);
    private final Spring legacyChestY = new Spring(3.2f, 0.50f, 1.4f);
    private final Spring tipX = new Spring(1.6f, 0.42f, 1.5f);
    private final Spring tipY = new Spring(1.9f, 0.48f, 1.5f);

    /** 传给渲染的当前值。 */
    float viewX;
    float viewY;
    float bodyPx;
    float bodyPy;
    float chestPx;
    float chestPy;
    float chestPz;
    float hairPx;
    float hairPy;

    private float targetX;
    private float targetY;
    private float driveX, driveY, driveZ;
    private float prevVx;
    private float prevVy;

    void reset() {
        bodyX.reset();
        bodyY.reset();
        chestX.reset();
        chestY.reset(); chestZ.reset();
        hairX.reset();
        legacyChestX.reset(); legacyChestY.reset(); tipX.reset(); tipY.reset();
        viewX = viewY = targetX = targetY = prevVx = prevVy = 0.0f;
        driveX = driveY = driveZ = 0f;
        bodyPx = bodyPy = chestPx = chestPy = chestPz = hairPx = hairPy = 0.0f;
    }

    /**
     * 手机倾斜直接决定目标视角，采用“屏幕即窗口”的常规视差约定：
     * 顶部向左倾 → 画面内容向右移（viewX &gt; 0）；顶部后仰 → 内容向下移（viewY &gt; 0）。
     * 重力基线在进入壁纸时取，所以怎么拿着都算中性；保持倾斜就停在对应位置。
     */
    private void updateTarget(MotionInput motion) {
        if (enhanced && motion.hasPose) {
            // A held yaw around world vertical is invisible to gravity alone.
            // Modest roll contribution preserves the familiar sideways-tilt gesture.
            targetX = (float)Math.tanh((-motion.poseYaw - motion.poseRoll * 0.35f) / 0.28f);
            targetY = (float)Math.tanh(motion.posePitch / 0.25f);
            return;
        }
        targetX = MathX.clamp(motion.tiltX / TILT_FULL, -1.0f, 1.0f);
        targetY = MathX.clamp(motion.tiltZ / TILT_FULL, -1.0f, 1.0f);
    }

    void step(float dt, MotionInput motion) {
        if (!Float.isFinite(dt) || dt <= 0f || dt > 0.1f) return;
        updateTarget(motion);
        final float oldX = viewX;
        final float oldY = viewY;
        final float s = 1.0f - (float) Math.exp(-dt * 12.0d);
        viewX += (targetX - viewX) * s;
        viewY += (targetY - viewY) * s;

        final float vx = (viewX - oldX) / dt;
        final float vy = (viewY - oldY) / dt;
        final float ax = MathX.clamp((vx - prevVx) / dt, -180.0f, 180.0f);
        final float ay = MathX.clamp((vy - prevVy) / dt, -180.0f, 180.0f);
        prevVx = vx;
        prevVy = vy;

        if (enhanced) {
            // One smooth physical drive, independent of the displayed camera easing.
            // Android linear acceleration uses +y upward; source texture uses +y downward.
            float fx = motion.alphaY * 0.12f - motion.ax * 0.6f - vx * 0.06f;
            float fy = motion.alphaX * 0.12f + motion.ay * 0.6f - vy * 0.06f;
            driveX = MathX.mix(driveX, 6f * (float) Math.tanh(fx / 6f), dt, 0.045f);
            driveY = MathX.mix(driveY, 6f * (float) Math.tanh(fy / 6f), dt, 0.045f);
            driveZ = MathX.mix(driveZ, 6f * (float)Math.tanh(-motion.az * 0.6f / 6f), dt, 0.045f);
            float cz = chestZ.step(driveZ * 22f, dt);
            float bx = bodyX.step(driveX * 9f, dt), by = bodyY.step(driveY * 9f, dt);
            float cx = chestX.step(driveX * 20f + bx * 18f, dt);
            float cy = chestY.step(driveY * 20f + by * 18f, dt);
            float hx = tipX.step(driveX * 12f + bx * 10f, dt);
            float hy = tipY.step(driveY * 8f + by * 8f, dt);
            bodyPx = bx * BODY_PIXELS; bodyPy = by * BODY_PIXELS;
            chestPx = cx * 8.5f; chestPy = cy * 8.5f; chestPz = cz * 8.5f;
            hairPx = hx * 14f; hairPy = hy * 7f;
            return;
        }

        // 陀螺仪角加速度：真机快速甩动时倾斜角可能几乎没变，靠这一路给回弹激励。
        // 轴向对应：绕屏幕纵轴左右倾（roll）→ wy → 横向回弹；绕屏幕横轴前后倾（pitch）→ wx → 纵向回弹。
        final float gx = MathX.limit(motion.alphaY * (enhanced ? 0.15f : 0.05f), 6.0f);
        final float gy = MathX.limit(motion.alphaX * (enhanced ? 0.15f : 0.05f), 6.0f);

        final float bx = bodyX.step(-ax * 1.4f + gx * 9.0f, dt);
        final float by = bodyY.step(-ay * 1.4f + gy * 9.0f, dt);
        final float cx = (enhanced ? chestX : legacyChestX).step(-ax * 3.4f - bx * 60.0f + gx * 18.0f, dt);
        final float cy = (enhanced ? chestY : legacyChestY).step(-ay * 4.2f - by * 75.0f + gy * 18.0f, dt);
        final float hx = enhanced ? tipX.step(-ax * 2.2f - bx * 20f + gx * 11f, dt)
                : hairX.step(-ax * 2.2f + gx * 11.0f, dt);
        final float hy = enhanced ? tipY.step(-ay * 1.4f - by * 16f + gy * 8f, dt) : hx * 0.35f;

        bodyPx = bx * BODY_PIXELS;
        bodyPy = by * BODY_PIXELS;
        chestPx = cx * (enhanced ? 8.5f : CHEST_PIXELS);
        chestPy = cy * (enhanced ? 8.5f : CHEST_PIXELS);
        hairPx = hx * (enhanced ? 14f : HAIR_PIXELS);
        hairPy = hy * (enhanced ? 7f : HAIR_PIXELS);
    }

    /** 是否还有值得画的运动（静止时渲染降到 10fps 省电）。 */
    boolean moving() {
        return Math.abs(viewX - targetX) + Math.abs(viewY - targetY) > 0.002f
                || Math.abs(driveX) + Math.abs(driveY) + Math.abs(driveZ) > 0.01f
                || unsettled(bodyX) || unsettled(bodyY)
                || unsettled(enhanced ? chestX : legacyChestX)
                || unsettled(enhanced ? chestY : legacyChestY) || (enhanced && unsettled(chestZ))
                || unsettled(enhanced ? tipX : hairX) || (enhanced && unsettled(tipY));
    }

    private static boolean unsettled(Spring spring) {
        return Math.abs(spring.velocity()) > 0.01f || Math.abs(spring.value()) > 0.01f;
    }

    /** 供验收日志打印：一行说清当前视角与回弹。 */
    String snapshot() {
        return String.format(java.util.Locale.US, "view=%.3f,%.3f body=%.2f,%.2f chest=%.2f,%.2f,%.2f hair=%.2f,%.2f",
                viewX, viewY, bodyPx, bodyPy, chestPx, chestPy, chestPz, hairPx, hairPy);
    }
}
