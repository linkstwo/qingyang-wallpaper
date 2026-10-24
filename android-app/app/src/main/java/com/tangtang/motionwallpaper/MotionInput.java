package com.tangtang.motionwallpaper;

/**
 * 手机姿态与挥动信号。算法沿用原轻漾 0.4.0 反编译出来的 MotionInput（只读参考）：
 * 重力取“相对进入壁纸那一刻的基线差值”，因此锁屏里手机怎么拿着都算中性；
 * 线性加速度用短时间常数平滑；陀螺仪另算角加速度，用于“快速晃动”的回弹激励；
 * 全部按当前屏幕旋转做轴映射，横竖屏切换时不会串轴。
 */
final class MotionInput {
    /** 倾斜（重力归一化后的差值），±0.30 约等于 ±17 度。 */
    float tiltX;
    float tiltY;
    float tiltZ;
    /** 线性加速度，m/s^2。 */
    float ax;
    float ay;
    float az;
    /** 角速度 rad/s 与角加速度 rad/s^2。 */
    float wx;
    float wy;
    float wz;
    float alphaX;
    float alphaY;
    float alphaZ;

    private float gx0;
    private float gy0;
    private float gz0;
    private boolean base;
    private long gravityStamp;
    private long gyroStamp;
    private long accelStamp;
    private int rotation;

    synchronized void reset() {
        tiltX = tiltY = tiltZ = 0.0f;
        ax = ay = az = 0.0f;
        wx = wy = wz = 0.0f;
        alphaX = alphaY = alphaZ = 0.0f;
        base = false;
        gravityStamp = 0L;
        gyroStamp = 0L;
        accelStamp = 0L;
    }

    synchronized void rotation(int value) {
        if (rotation != value) {
            rotation = value;
            reset();
        }
    }

    static float mapX(float x, float y, int rotation) {
        switch (rotation & 3) {
            case 1: return y;
            case 2: return -x;
            case 3: return -y;
            default: return x;
        }
    }

    static float mapY(float x, float y, int rotation) {
        switch (rotation & 3) {
            case 1: return -x;
            case 2: return -y;
            case 3: return x;
            default: return y;
        }
    }

    private static float delta(long now, long last) {
        if (last == 0L) {
            return 0.02f;
        }
        return MathX.clamp((now - last) * 1.0E-9f, 0.001f, 0.2f);
    }

    synchronized void gravity(float x, float y, float z, long stamp) {
        if (!MathX.valid(x, y, z) || stamp <= gravityStamp) {
            return;
        }
        final float nx = mapX(x, y, rotation) / 9.80665f;
        final float ny = mapY(x, y, rotation) / 9.80665f;
        final float nz = z / 9.80665f;
        final float dt = delta(stamp, gravityStamp);
        if (!base) {
            gx0 = nx;
            gy0 = ny;
            gz0 = nz;
            base = true;
        }
        tiltX = MathX.mix(tiltX, nx - gx0, dt, 0.075f);
        tiltY = MathX.mix(tiltY, ny - gy0, dt, 0.075f);
        tiltZ = MathX.mix(tiltZ, nz - gz0, dt, 0.075f);
        gravityStamp = stamp;
    }

    synchronized void acceleration(float x, float y, float z, long stamp) {
        if (!MathX.valid(x, y, z) || stamp <= accelStamp) {
            return;
        }
        final float dt = delta(stamp, accelStamp);
        final float nx = mapX(x, y, rotation);
        final float ny = mapY(x, y, rotation);
        if (accelStamp != 0L && stamp - accelStamp > 200000000L) {
            ax = ay = az = 0.0f;
        }
        ax = MathX.mix(ax, MathX.limit(nx, 20.0f), dt, 0.024f);
        ay = MathX.mix(ay, MathX.limit(ny, 20.0f), dt, 0.024f);
        az = MathX.mix(az, MathX.limit(z, 20.0f), dt, 0.024f);
        accelStamp = stamp;
    }

    synchronized void gyro(float x, float y, float z, long stamp) {
        if (!MathX.valid(x, y, z) || stamp <= gyroStamp) {
            return;
        }
        final float dt = delta(stamp, gyroStamp);
        final float nx = mapX(x, y, rotation);
        final float ny = mapY(x, y, rotation);
        final float oldX = wx;
        final float oldY = wy;
        final float oldZ = wz;
        if (gyroStamp == 0L || stamp - gyroStamp > 150000000L) {
            wx = MathX.limit(nx, 8.0f);
            wy = MathX.limit(ny, 8.0f);
            wz = MathX.limit(z, 8.0f);
            alphaX = alphaY = alphaZ = 0.0f;
        } else {
            wx = MathX.mix(wx, MathX.limit(nx, 8.0f), dt, 0.03f);
            wy = MathX.mix(wy, MathX.limit(ny, 8.0f), dt, 0.03f);
            wz = MathX.mix(wz, MathX.limit(z, 8.0f), dt, 0.03f);
            alphaX = MathX.mix(alphaX, MathX.limit((wx - oldX) / dt, 55.0f), dt, 0.055f);
            alphaY = MathX.mix(alphaY, MathX.limit((wy - oldY) / dt, 55.0f), dt, 0.055f);
            alphaZ = MathX.mix(alphaZ, MathX.limit((wz - oldZ) / dt, 55.0f), dt, 0.055f);
        }
        gyroStamp = stamp;
    }

    /** 传感器长时间没数据时把挥动量衰减掉，避免锁屏里残留一个假回弹。 */
    synchronized void age(long nowNanos) {
        if (accelStamp != 0L && nowNanos - accelStamp > 180000000L) {
            ax = ay = az = 0.0f;
        }
        if (gyroStamp != 0L && nowNanos - gyroStamp > 180000000L) {
            wx = wy = wz = 0.0f;
            alphaX = alphaY = alphaZ = 0.0f;
        }
    }

    /** Atomic frame input for GLSurfaceView's render thread. */
    synchronized MotionInput copy() {
        MotionInput sample = new MotionInput();
        sample.tiltX = tiltX; sample.tiltY = tiltY; sample.tiltZ = tiltZ;
        sample.ax = ax; sample.ay = ay; sample.az = az;
        sample.wx = wx; sample.wy = wy; sample.wz = wz;
        sample.alphaX = alphaX; sample.alphaY = alphaY; sample.alphaZ = alphaZ;
        return sample;
    }

    /** 有没有值得唤醒渲染的动作（用于静止时降到 10fps 省电）。 */
    synchronized boolean excited() {
        return Math.abs(ax) + Math.abs(ay) + Math.abs(az) > 0.18f
                || Math.abs(alphaX) + Math.abs(alphaY) + Math.abs(alphaZ) > 0.25f
                || Math.abs(wx) + Math.abs(wy) + Math.abs(wz) > 0.12f;
    }
}