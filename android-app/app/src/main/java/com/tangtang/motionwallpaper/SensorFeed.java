package com.tangtang.motionwallpaper;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.hardware.display.DisplayManager;
import android.os.Handler;
import android.os.SystemClock;
import android.view.Display;

/**
 * 姿态与惯性数据源：优先游戏旋转向量，退回普通旋转向量，再退回重力姿态。
 * 优先 TYPE_GRAVITY + TYPE_LINEAR_ACCELERATION（系统融合好的），再挂陀螺仪；
 * 缺融合传感器时退回 TYPE_ACCELEROMETER 自己低通分重力（时间常数 0.24 秒）。
 * 采样周期 20ms（SENSOR_DELAY_GAME 量级），屏幕旋转变化时重新取基线。
 */
final class SensorFeed implements SensorEventListener {
    private final Context context;
    private final Handler handler;
    private final SensorManager manager;
    private final MotionInput motion = new MotionInput();
    private final float[] gravity = new float[3];

    Runnable wake;
    private Display display;
    private boolean active;
    private boolean hasGravity;
    private boolean hasLinear;
    private boolean hasAttitude;
    private boolean gravityReady;
    private int rotation;
    private long count;
    private long lastEvent;
    private long lastRotation;
    private long accelStamp;
    private long calibrationStamp;
    private String warning = "";

    SensorFeed(Context context, Handler handler) {
        this.context = context.getApplicationContext();
        this.handler = handler;
        this.manager = (SensorManager) this.context.getSystemService(Context.SENSOR_SERVICE);
    }

    void start() {
        if (active || manager == null) {
            return;
        }
        active = true;
        calibrate();
        lastEvent = 0L;
        warning = "";
        DisplayManager dm = (DisplayManager) context.getSystemService(Context.DISPLAY_SERVICE);
        display = dm == null ? null : dm.getDisplay(Display.DEFAULT_DISPLAY);
        rotation = display != null ? display.getRotation() : 0;
        motion.rotation(rotation);
        hasGravity = register(Sensor.TYPE_GRAVITY);
        hasLinear = register(Sensor.TYPE_LINEAR_ACCELERATION);
        hasAttitude = register(Sensor.TYPE_GAME_ROTATION_VECTOR) || register(Sensor.TYPE_ROTATION_VECTOR);
        register(Sensor.TYPE_GYROSCOPE);
        if (!hasGravity || !hasLinear) {
            register(Sensor.TYPE_ACCELEROMETER);
        }
    }

    private boolean register(int type) {
        try {
            Sensor sensor = manager.getDefaultSensor(type);
            return sensor != null && manager.registerListener(this, sensor, 20000, handler);
        } catch (RuntimeException e) {
            warning = "部分动作传感器不可用";
            return false;
        }
    }

    void stop() {
        if (manager != null) {
            manager.unregisterListener(this);
        }
        active = false;
        motion.reset();
    }

    void calibrate() {
        // Sensor callbacks can remain queued across stop/start or recenter.
        // Their timestamps share elapsedRealtimeNanos: never use old data as a new baseline.
        calibrationStamp = SystemClock.elapsedRealtimeNanos();
        motion.reset();
        gravityReady = false;
        accelStamp = 0L;
    }

    MotionInput motion() {
        return motion.copy();
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (!active || event.values.length < 3 || event.timestamp <= calibrationStamp) {
            return;
        }
        final float x = event.values[0];
        final float y = event.values[1];
        final float z = event.values[2];
        if (!MathX.valid(x, y, z)) {
            return;
        }
        // A delayed batch from this session must not re-establish a stale pose.
        if (SystemClock.elapsedRealtimeNanos() - event.timestamp > 500000000L) return;
        final long now = SystemClock.elapsedRealtime();
        if (now - lastRotation > 300L) {
            lastRotation = now;
            int current = display == null ? 0 : display.getRotation();
            if (current != rotation) {
                rotation = current;
                calibrate();
                motion.rotation(rotation);
            }
        }
        // Rotation may have recalibrated while handling this queued event.
        if (event.timestamp <= calibrationStamp) return;
        if (event.sensor.getType() == Sensor.TYPE_ACCELEROMETER
                && event.timestamp <= accelStamp) return;
        count++;
        lastEvent = now;
        boolean poseChanged = false;
        switch (event.sensor.getType()) {
            case Sensor.TYPE_GAME_ROTATION_VECTOR:
            case Sensor.TYPE_ROTATION_VECTOR: {
                float w = event.values.length >= 4 ? event.values[3]
                        : (float)Math.sqrt(Math.max(0f, 1f-x*x-y*y-z*z));
                poseChanged = motion.orientation(x, y, z, w, event.timestamp);
                break;
            }
            case Sensor.TYPE_ACCELEROMETER: {
                final float dt = accelStamp == 0L ? 0.02f
                        : MathX.clamp((event.timestamp - accelStamp) * 1.0E-9f, 0.001f, 0.2f);
                accelStamp = event.timestamp;
                final float k = (float) (1.0d - Math.exp(-dt / 0.24f));
                for (int i = 0; i < 3; i++) {
                    gravity[i] = gravityReady ? gravity[i] + (event.values[i] - gravity[i]) * k : event.values[i];
                }
                gravityReady = true;
                if (!hasGravity) {
                    motion.gravity(gravity[0], gravity[1], gravity[2], event.timestamp);
                }
                if (!hasLinear) {
                    motion.acceleration(x - gravity[0], y - gravity[1], z - gravity[2], event.timestamp);
                }
                break;
            }
            case Sensor.TYPE_GYROSCOPE:
                motion.gyro(x, y, z, event.timestamp);
                break;
            case Sensor.TYPE_GRAVITY:
                motion.gravity(x, y, z, event.timestamp);
                break;
            case Sensor.TYPE_LINEAR_ACCELERATION:
                motion.acceleration(x, y, z, event.timestamp);
                break;
            default:
                break;
        }
        if (wake != null && (poseChanged || motion.excited())) {
            wake.run();
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
    }

    void decayStale() {
        motion.age(SystemClock.elapsedRealtimeNanos());
    }

    boolean fresh() {
        return active && lastEvent != 0L && SystemClock.elapsedRealtime() - lastEvent < 800L;
    }

    String state() {
        if (!active) {
            return "动作感应已暂停";
        }
        if (fresh()) {
            return (hasAttitude && motion.copy().hasPose ? "融合姿态与惯性感应" : "重力姿态与惯性感应") + " · " + count;
        }
        return warning.isEmpty() ? "等待动作数据" : warning;
    }

    /** 供验收日志打印原始动作量：能直接看出注入了哪一路传感器。 */
    String motionSnapshot() {
        return String.format(java.util.Locale.US,
                "tilt=%.3f,%.3f,%.3f w=%.2f,%.2f,%.2f alpha=%.2f,%.2f,%.2f lin=%.2f,%.2f,%.2f pose=%.3f,%.3f valid=%s",
                motion.tiltX, motion.tiltY, motion.tiltZ,
                motion.wx, motion.wy, motion.wz,
                motion.alphaX, motion.alphaY, motion.alphaZ,
                motion.ax, motion.ay, motion.az, motion.poseYaw, motion.posePitch, motion.hasPose);
    }
}
