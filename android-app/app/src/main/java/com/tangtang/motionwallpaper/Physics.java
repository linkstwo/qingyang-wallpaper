package com.tangtang.motionwallpaper;

/**
 * 形变与回弹。这部分是已验收样片里 character-prototype/preview/app.mjs 的 physics() 的等价实现：
 * 视角跟手 → 视角加速度激励身体/胸部/碎发/发梢的分级弹簧。
 * 浏览器侧的 30/60/120fps 数值验收就是这套算法的性质。
 *
 * <p>弹簧参数/增益/位移上限来自 RenderParams（assets 无 qingyang-params.json 时
 * 为真机调整默认值，行为与参数接线前一致）。
 */
final class Physics {
    private static final float TILT_FULL = 0.30f;

    private final RenderParams params;
    private final Spring bodyX;
    private final Spring bodyY;
    private final Spring chestX;
    private final Spring chestY;
    private final Spring hairX;
    private final Spring hairTipX;

    /** 传给渲染的当前值。 */
    float viewX;
    float viewY;
    /** 跟移取景偏移（0=左贴边 1=右贴边），由 RenderParams.viewPan 决定基准与幅度。 */
    float pan01;
    float bodyPx;
    float bodyPy;
    float chestPx;
    float chestPy;
    float hairPx;
    float hairTipPx;

    private float targetX;
    private float targetY;
    private float prevVx;
    private float prevVy;

    /** 保留无参构造：使用内置默认参数（与参数接线前的行为完全一致）。 */
    Physics() {
        this(null);
    }

    /** 参数化构造：params 为 null 时回落默认值。 */
    Physics(RenderParams params) {
        this.params = params != null ? params : new RenderParams();
        bodyX = new Spring(this.params.springBody[0], this.params.springBody[1], this.params.springBody[2]);
        bodyY = new Spring(this.params.springBody[0], this.params.springBody[1], this.params.springBody[2]);
        chestX = new Spring(this.params.springChest[0], this.params.springChest[1], this.params.springChest[2]);
        chestY = new Spring(this.params.springChest[0], this.params.springChest[1], this.params.springChest[2]);
        hairX = new Spring(this.params.springHair[0], this.params.springHair[1], this.params.springHair[2]);
        hairTipX = new Spring(this.params.springHairTip[0], this.params.springHairTip[1], this.params.springHairTip[2]);
    }

    void reset() {
        bodyX.reset();
        bodyY.reset();
        chestX.reset();
        chestY.reset();
        hairX.reset();
        hairTipX.reset();
        viewX = viewY = targetX = targetY = prevVx = prevVy = 0.0f;
        bodyPx = bodyPy = chestPx = chestPy = hairPx = hairTipPx = 0.0f;
        pan01 = params != null ? params.viewPanBase : 0.5f;
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

        final RenderParams p = params;
        final float bx = bodyX.step(-ax * p.gainBody + gx * 9.0f, dt);
        final float by = bodyY.step(-ay * p.gainBody + gy * 9.0f, dt);
        final float cx = chestX.step(-ax * p.gainChestX - bx * p.gainChestCoupling + gx * 18.0f, dt);
        final float cy = chestY.step(-ay * p.gainChestY - by * p.gainChestCouplingY + gy * 18.0f, dt);
        final float hx = hairX.step(-ax * p.gainHair + gx * 11.0f, dt);
        final float tx = hairTipX.step(-ax * p.gainHairTip + gx * 13.0f, dt);

        bodyPx = bx * p.limitBody;
        bodyPy = by * p.limitBody;
        chestPx = cx * p.limitChest;
        chestPy = cy * p.limitChest;
        hairPx = hx * p.limitHair;
        hairTipPx = tx * p.limitHairTip;
        // 跟移取景：基准偏移随视角小幅摆动（T02 选项 A；range=0 时不跟移=原行为）
        pan01 = MathX.clamp(p.viewPanBase + viewX * p.viewPanRange, 0.0f, 1.0f);
    }

    /** 是否还有值得画的运动（静止时渲染降到 10fps 省电）。 */
    boolean moving() {
        return Math.abs(viewX - targetX) > 0.002f
                || Math.abs(viewY - targetY) > 0.002f
                || Math.abs(bodyX.velocity()) + Math.abs(bodyY.velocity()) > 0.01f
                || Math.abs(chestX.velocity()) + Math.abs(chestY.velocity()) > 0.01f
                || Math.abs(hairX.velocity()) + Math.abs(hairTipX.velocity()) > 0.01f
                || Math.abs(bodyX.value()) + Math.abs(chestX.value()) + Math.abs(hairX.value())
                        + Math.abs(hairTipX.value()) > 0.01f;
    }

    /** 供验收日志打印：一行说清当前视角与回弹。 */
    String snapshot() {
        return String.format(java.util.Locale.US, "view=%.3f,%.3f body=%.2f,%.2f chest=%.2f,%.2f hair=%.2f tip=%.2f pan=%.3f",
                viewX, viewY, bodyPx, bodyPy, chestPx, chestPy, hairPx, hairTipPx, pan01);
    }
}
