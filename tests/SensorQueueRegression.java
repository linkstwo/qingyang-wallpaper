package com.tangtang.motionwallpaper;
import android.hardware.*;
import android.os.SystemClock;
/** Tests the real ingestion path, including the accelerometer-only fallback. */
public final class SensorQueueRegression {
    static int checks;
    static void check(boolean b,String s){checks++;if(!b)throw new AssertionError(s);}
    static void event(SensorFeed f,int type,long t,float x,float y,float z){
        SystemClock.nanos=Math.max(SystemClock.nanos,t);
        SensorEvent e=new SensorEvent();e.sensor=new Sensor(type);e.timestamp=t;e.values=new float[]{x,y,z};f.onSensorChanged(e);
    }
    static SensorFeed start(long t){SystemClock.nanos=t;SensorFeed f=new SensorFeed(new android.content.Context(),new android.os.Handler());f.start();return f;}
    public static void main(String[] args){
        SensorFeed f=start(1_000_000_000L);
        event(f,Sensor.TYPE_ACCELEROMETER,900_000_000L,8,0,0);
        event(f,Sensor.TYPE_ACCELEROMETER,1_020_000_000L,0,9.80665f,0);
        check(f.motion().tiltX==0 && f.motion().tiltY==0,"queued pre-start sample must not establish a false baseline");
        event(f,Sensor.TYPE_ACCELEROMETER,1_040_000_000L,1,9.80665f,0);
        MotionInput before=f.motion();
        event(f,Sensor.TYPE_ACCELEROMETER,1_030_000_000L,-20,0,0);
        event(f,Sensor.TYPE_ACCELEROMETER,1_040_000_000L,-20,0,0);
        // The late samples must not silently change the fallback filter either.
        SensorFeed clean=start(1_000_000_000L);
        event(clean,1,1_020_000_000L,0,9.80665f,0);event(clean,1,1_040_000_000L,1,9.80665f,0);
        event(f,1,1_060_000_000L,1,9.80665f,0);event(clean,1,1_060_000_000L,1,9.80665f,0);
        check(Math.abs(f.motion().tiltX-clean.motion().tiltX)<1e-7,"out-of-order fallback samples must not poison subsequent gravity");
        check(Math.abs(f.motion().ax-clean.motion().ax)<1e-7,"late sample must not poison linear acceleration");
        f.stop();SystemClock.nanos=2_000_000_000L;f.start();
        event(f,1,1_990_000_000L,8,0,0);event(f,1,2_020_000_000L,0,9.80665f,0);
        check(f.motion().tiltX==0 && f.motion().tiltY==0,"resume must reject previous-session callbacks");
        SystemClock.nanos=2_100_000_000L;f.calibrate();
        event(f,4,2_090_000_000L,0,8,0);
        check(!f.motion().excited(),"recenter must reject queued gyro impulses");
        event(f,4,2_120_000_000L,0,0,0);event(f,4,2_140_000_000L,0,3,0);
        check(f.motion().alphaY>0,"new real gyro motion must still excite the solver");
        SystemClock.nanos=2_400_000_000L;f.decayStale();check(!f.motion().excited(),"stale motion must decay");
        SensorFeed delayed=start(3_000_000_000L);
        SystemClock.nanos=4_000_000_000L;
        event(delayed,1,3_100_000_000L,8,0,0);
        event(delayed,1,4_020_000_000L,0,9.80665f,0);
        check(delayed.motion().tiltX==0 && delayed.motion().tiltY==0,"old delayed batch within this session must not set a stale baseline");
        // A future timestamp must not poison per-stream monotonic stamps.
        SensorFeed future=start(5_000_000_000L);
        android.hardware.SensorEvent bad=new android.hardware.SensorEvent();
        bad.sensor=new Sensor(Sensor.TYPE_ACCELEROMETER);bad.timestamp=Long.MAX_VALUE;
        bad.values=new float[]{8,0,0};future.onSensorChanged(bad);
        event(future,1,5_020_000_000L,0,9.80665f,0);
        event(future,1,5_040_000_000L,1,9.80665f,0);
        check(future.motion().ax>0,"future accelerometer timestamp must not lock out real subsequent input");
        SensorFeed futureGyro=start(6_000_000_000L);
        bad.sensor=new Sensor(Sensor.TYPE_GYROSCOPE);bad.timestamp=Long.MAX_VALUE;
        bad.values=new float[]{0,8,0};futureGyro.onSensorChanged(bad);
        check(!futureGyro.motion().excited(),"future gyro must not create an immortal impulse");
        event(futureGyro,4,6_020_000_000L,0,0,0);
        event(futureGyro,4,6_040_000_000L,0,3,0);
        check(futureGyro.motion().alphaY>0,"future gyro timestamp must not lock out subsequent events");
        SystemClock.nanos=6_400_000_000L;futureGyro.decayStale();
        check(!futureGyro.motion().excited(),"post-recovery motion must still decay");
        // Gravity-only viewing must wake an idle renderer without a gyro impulse.
        SensorManager.fused=true;
        SensorFeed gravityOnly=start(7_000_000_000L);
        final int[] wakes={0};gravityOnly.wake=()->wakes[0]++;
        event(gravityOnly,Sensor.TYPE_GRAVITY,7_020_000_000L,0,9.80665f,0);
        check(wakes[0]==0,"gravity baseline alone must not wake animation");
        event(gravityOnly,Sensor.TYPE_GRAVITY,7_040_000_000L,.8f,9.77f,0);
        check(wakes[0]>0,"gravity fallback pose change must wake renderer without inertial input");
        check(!gravityOnly.motion().excited(),"camera wake must not manufacture a soft-body impulse");
        int quiet=wakes[0];
        for(int k=1;k<=100;k++)event(gravityOnly,Sensor.TYPE_GRAVITY,7_040_000_000L+k*20_000_000L,.8f,9.77f,0);
        int settled=wakes[0];
        for(int k=101;k<=120;k++)event(gravityOnly,Sensor.TYPE_GRAVITY,7_040_000_000L+k*20_000_000L,.8f,9.77f,0);
        check(wakes[0]==settled,"settled gravity pose must stop waking at sensor frequency");
        SensorFeed fusedPose=start(10_000_000_000L);
        final int[] fusedWakes={0};fusedPose.wake=()->fusedWakes[0]++;
        SensorEvent pose=new SensorEvent();pose.sensor=new Sensor(Sensor.TYPE_GAME_ROTATION_VECTOR);
        SystemClock.nanos=10_020_000_000L;pose.timestamp=SystemClock.nanos;pose.values=new float[]{0,0,0,1};fusedPose.onSensorChanged(pose);
        event(fusedPose,Sensor.TYPE_GRAVITY,10_040_000_000L,0,9.80665f,0);
        event(fusedPose,Sensor.TYPE_GRAVITY,10_060_000_000L,.8f,9.77f,0);
        check(fusedWakes[0]==0,"valid fused pose must not wake due to fallback gravity noise");
        SensorManager.fused=false;
        System.out.println("{\"assertions\":"+checks+",\"productionSensorFeed\":true,\"phoneTested\":false}");
    }
}
