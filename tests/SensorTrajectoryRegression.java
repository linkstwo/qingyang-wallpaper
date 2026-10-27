package com.tangtang.motionwallpaper;
import android.hardware.*;
import android.os.SystemClock;
import android.view.Display;
public final class SensorTrajectoryRegression {
    static int checks;
    static void check(boolean b,String s){checks++;if(!b)throw new AssertionError(s);}
    static void send(SensorFeed f,int type,long t,float... v){
        SystemClock.nanos=t;SensorEvent e=new SensorEvent();e.sensor=new Sensor(type);e.timestamp=t;e.values=v;f.onSensorChanged(e);
    }
    static float[] replay(int fps,int rotation){
        Display.rotation=rotation;SensorManager.fused=true;SystemClock.nanos=1_000_000_000L;
        SensorFeed f=new SensorFeed(new android.content.Context(),new android.os.Handler());f.start();
        Physics p=new Physics();float peak=0, held=0;
        // 600Hz clock: real sensor queue at 50Hz, solver 120Hz, render reads 30/60/120Hz.
        for(int tick=1;tick<=600*9;tick++){
            long t=1_000_000_000L+tick*1_000_000_000L/600;
            SystemClock.nanos=t;
            if(tick%12==0){
                float sec=tick/600f;
                float yaw=sec<1?0:sec<2?.12f*(sec-1):.12f;
                float half=yaw/2, x=0,y=0;
                // Inverse screen mapping gives identical screen-local yaw in all rotations.
                switch(rotation){case 0:y=(float)Math.sin(half);break;case 1:x=-(float)Math.sin(half);break;case 2:y=-(float)Math.sin(half);break;case 3:x=(float)Math.sin(half);break;}
                send(f,Sensor.TYPE_GAME_ROTATION_VECTOR,t,x,y,0,(float)Math.cos(half));
                float w=sec<3?(float)Math.sin(sec*Math.PI*4)*2:0;
                float gx=rotation==1?-w:rotation==3?w:0;
                float gy=rotation==0?w:rotation==2?-w:0;
                send(f,Sensor.TYPE_GYROSCOPE,t,gx,gy,0);
                send(f,Sensor.TYPE_GRAVITY,t,0,9.80665f,0);
                send(f,Sensor.TYPE_LINEAR_ACCELERATION,t,0,0,0);
            }
            if(tick%5==0){f.decayStale();p.step(1f/120,f.motion());peak=Math.max(peak,Math.abs(p.chestPx));}
            if(tick%(600/fps)==0){
                check(Float.isFinite(p.viewX)&&Math.abs(p.viewX)<=1,"finite bounded camera");
                check(Math.abs(p.chestPx)<=12,"bounded local motion");
            }
            if(tick==600*8)held=p.viewX;
        }
        check(Math.abs(held-(float)Math.tanh(-.12/.28))<1e-5,"held yaw must stay at the same view");
        check(Math.abs(p.chestPx)+Math.abs(p.hairPx)<.002,"no continuing soft motion while holding");
        f.stop();check(!f.motion().hasPose&&!f.motion().excited(),"stop clears pose and excitation");
        return new float[]{peak,held};
    }
    static float fallbackReplay(int fps,int rotation,boolean accelerometerOnly){
        Display.rotation=rotation;SensorManager.fused=!accelerometerOnly;SystemClock.nanos=20_000_000_000L;
        SensorFeed f=new SensorFeed(new android.content.Context(),new android.os.Handler());f.start();
        final int[] wakes={0};f.wake=()->wakes[0]++;
        Physics p=new Physics();int settled=-1;
        for(int tick=1;tick<=600*9;tick++){
            long t=20_000_000_000L+tick*1_000_000_000L/600;SystemClock.nanos=t;
            if(tick%12==0){
                float sec=tick/600f,tilt=.1f*Math.max(0,Math.min(1,sec-1));
                float x=9.80665f*tilt,y=9.80665f*(float)Math.sqrt(1-tilt*tilt),dx=x,dy=y;
                switch(rotation){case 1:dx=-y;dy=x;break;case 2:dx=-x;dy=-y;break;case 3:dx=y;dy=-x;break;}
                send(f,accelerometerOnly?Sensor.TYPE_ACCELEROMETER:Sensor.TYPE_GRAVITY,t,dx,dy,0);
            }
            if(tick%5==0){f.decayStale();p.step(1f/120,f.motion());}
            if(tick%(600/fps)==0)check(Float.isFinite(p.viewX)&&Math.abs(p.viewX)<=1,"fallback camera finite and bounded");
            if(tick==600*8)settled=wakes[0];
        }
        check(wakes[0]>0,"fallback tilt wakes idle renderer without quaternion or gyro");
        check(wakes[0]==settled,"held fallback settles instead of waking forever");
        check(!f.motion().hasPose,"fallback test must not accidentally use fused quaternion");
        check(p.viewX>.1f,"held fallback view stays displaced");
        check(Math.abs(p.chestPx)+Math.abs(p.hairPx)<.002f,"holding fallback does not sustain soft-body motion");
        f.stop();return p.viewX;
    }
    public static void main(String[] args){
        float[] reference=replay(60,0);
        for(int rotation=0;rotation<4;rotation++)for(int fps:new int[]{30,60,120}){
            float[] r=replay(fps,rotation);
            check(Math.abs(r[0]-reference[0])<1e-5,"same sensor trace has same inertia in every screen rotation/frame rate");
            check(Math.abs(r[1]-reference[1])<1e-6,"same held screen yaw in every rotation/frame rate");
        }
        for(boolean accel:new boolean[]{false,true}){
            float base=fallbackReplay(60,0,accel);
            for(int rotation=0;rotation<4;rotation++)for(int fps:new int[]{30,60,120})
                check(Math.abs(fallbackReplay(fps,rotation,accel)-base)<1e-6,"fallback orientation/render-rate invariance");
        }
        System.out.printf(java.util.Locale.US,"{\"assertions\":%d,\"sensorHz\":50,\"solverHz\":120,\"renderFps\":[30,60,120],\"screenRotations\":[0,1,2,3],\"chestPeakPx\":%.7f,\"heldViewX\":%.7f,\"phoneTested\":false}%n",checks,reference[0],reference[1]);
    }
}
