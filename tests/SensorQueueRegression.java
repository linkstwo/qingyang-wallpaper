package com.tangtang.motionwallpaper;
import android.hardware.*;
import android.os.SystemClock;
/** Tests the real ingestion path, including the accelerometer-only fallback. */
public final class SensorQueueRegression {
    static int checks;
    static void check(boolean b,String s){checks++;if(!b)throw new AssertionError(s);}
    static void event(SensorFeed f,int type,long t,float x,float y,float z){
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
        System.out.println("{\"assertions\":"+checks+",\"productionSensorFeed\":true,\"phoneTested\":false}");
    }
}
