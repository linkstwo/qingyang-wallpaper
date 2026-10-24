package com.tangtang.motionwallpaper;

/**
 * 形变与回弹。这部分是已验收样片里 character-prototype/preview/app.mjs 的 physics() 与
 * mesh.json 的 spring 参数（body 2.4Hz/0.88、chest 3.2Hz/0.50、hair 1.7Hz/0.58，
 * 像素上限 5/7/10）的等价实现：视角跟手 → 视角加速度激励身体/胸部/碎发的分级弹簧。
 * 浏览器侧的 30/60/120fps 数值验收就是这套算法的性质。
 */
final class Physics {
    private static final float BODY_PIXELS = 5.0f;
    private static final float CHEST_PIXELS = 7.0f;
    private static final float HAIR_PIXELS = 10.0f;
    /** 倾斜满量程：重力归一化差值 0.30 ≈ 17 度。 */
    private static final float TILT_FULL = 0.30f;

    private final Spring bodyX = new Spring(2.4f, 0.88f, 1.2f);
    private final Spring bodyY = new Spring(2.4f, 0.88f, 1.2f);
    private final Spring chestX = new Spring(3.2f, 0.50f, 1.4f);
    private final Spring chestY = new Spring(3.2f, 0.50f, 1.4f);
    private final Spring hairX = new Spring(1.7f, 0.58f, 1.5f);

    /** 传给渲染的当前值。 */
    float viewX;
    float viewY;
    float bodyPx;
    float bodyPy;
    float chestPx;
    float chestPy;
    float hairPx;

    private float targetX;
    private float targetY;
    private float prevVx;
    private float prevVy;

    void reset() {
        bodyX.reset();
        bodyY.reset();
        chestX.reset();
        chestY.reset();
        hairX.reset();
        viewX = viewY = targetX = targetY = prevVx = prevVy = 0.0f;
        bodyPx = bodyPy = chestPx = chestPy = hairPx = 0.0f;
    }

    /**
     * 手机倾斜直接决定目标视角，采用“屏幕即窗口”的常规视差约定：
     * 顶部向左倾 → 画面内容向右移（viewX &gt; 0）；顶部后仰 → 内容向下移（viewY &gt; 0）。
     * 重力基线在进入壁纸时取，所以怎么拿着都算中性；保持倾斜就停在对应位置。
     */
    private void updateTarget(MotionInput motion) {
        targetX = MathX.clamp(motion.tiltX / TILT_FULL, -1.0f, 1.0f);
        targetY = MathX.clamp(motion.tiltZ / TILT_FULL, -1.0f, 1.0f);
    }

    void step(float dt, MotionInput motion) {
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

        // 陀螺仪角加速度：真机快速甩动时倾斜角可能几乎没变，靠这一路给回弹激励。
        // 轴向对应：绕屏幕纵轴左右倾（roll）→ wy → 横向回弹；绕屏幕横轴前后倾（pitch）→ wx → 纵向回弹。
        final float gx = MathX.limit(motion.alphaY * 0.05f, 6.0f);
        final float gy = MathX.limit(motion.alphaX * 0.05f, 6.0f);

        final float bx = bodyX.step(-ax * 1.4f + gx * 9.0f, dt);
        final float by = bodyY.step(-ay * 1.4f + gy * 9.0f, dt);
        final float cx = chestX.step(-ax * 3.4f - bx * 60.0f + gx * 18.0f, dt);
        final float cy = chestY.step(-ay * 4.2f - by * 75.0f + gy * 18.0f, dt);
        final float hx = hairX.step(-ax * 2.2f + gx * 11.0f, dt);

        bodyPx = bx * BODY_PIXELS;
        bodyPy = by * BODY_PIXELS;
        chestPx = cx * CHEST_PIXELS;
        chestPy = cy * CHEST_PIXELS;
        hairPx = hx * HAIR_PIXELS;
    }

    /** 是否还有值得画的运动（静止时渲染降到 10fps 省电）。 */
    boolean moving() {
        return Math.abs(viewX - targetX) > 0.002f
                || Math.abs(viewY - targetY) > 0.002f
                || Math.abs(bodyX.velocity()) + Math.abs(bodyY.velocity()) > 0.01f
                || Math.abs(chestX.velocity()) + Math.abs(chestY.velocity()) > 0.01f
                || Math.abs(hairX.velocity()) > 0.01f
                || Math.abs(bodyX.value()) + Math.abs(chestX.value()) + Math.abs(hairX.value()) > 0.01f;
    }

    /** 供验收日志打印：一行说清当前视角与回弹。 */
    String snapshot() {
        return String.format(java.util.Locale.US, "view=%.3f,%.3f body=%.2f,%.2f chest=%.2f,%.2f hair=%.2f",
                viewX, viewY, bodyPx, bodyPy, chestPx, chestPy, hairPx);
    }
}