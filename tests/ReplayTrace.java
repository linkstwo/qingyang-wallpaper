package com.tangtang.motionwallpaper;

/** Synthetic 50Hz fused-quaternion/gyro stream -> production 120Hz physics -> 20fps trace.
 * Deliberately not a phone recording. Used by the shared-GLES visual preview.
 */
public final class ReplayTrace {
    static float[] pose(double t) {
        double yaw=0,pitch=0;
        if(t<6){double a=Math.sin(Math.PI*t/6);yaw=.22*Math.sin(t*Math.PI/3)*a*a;pitch=.10*Math.sin(t*Math.PI/3+.4)*a*a;}
        else if(t<10){double u=t-6,a=Math.sin(Math.PI*u/4);yaw=.075*Math.sin(u*Math.PI*4.4)*a*a;pitch=.035*Math.sin(u*Math.PI*3.6)*a*a;}
        else if(t<13){double a=Math.min(1,(t-10)/.8);a=a*a*(3-2*a);yaw=.14*a;}
        else if(t<15){double a=(t-13)/2;a=a*a*(3-2*a);yaw=.14*(1-a);}
        double sy=Math.sin(yaw/2),cy=Math.cos(yaw/2),sx=Math.sin(pitch/2),cx=Math.cos(pitch/2);
        return new float[]{(float)(cy*sx),(float)(sy*cx),(float)(-sy*sx),(float)(cy*cx)};
    }
    public static void main(String[] args){
        java.util.Locale.setDefault(java.util.Locale.US);
        MotionInput input=new MotionInput(); Physics physics=new Physics();
        float[] previous=null;float b=(float)Math.sqrt(.5);float peak=0;
        System.out.print("[");boolean first=true;
        for(int tick=0;tick<=15*600;tick++){
            double t=tick/600.0;long stamp=1_000_000_000L+Math.round(t*1e9);
            if(tick%12==0){
                float[] q=pose(t);float x=q[0],y=q[1],z=q[2],w=q[3];
                input.orientation(b*(w+x),b*(y-z),b*(z+y),b*(w-x),stamp);
                input.gravity(2*(x*y+w*z)*9.80665f,(1-2*(x*x+z*z))*9.80665f,2*(y*z-w*x)*9.80665f,stamp);
                if(previous!=null){
                    float px=previous[0],py=previous[1],pz=previous[2],pw=previous[3];
                    float dx=pw*x-px*w-py*z+pz*y,dy=pw*y+px*z-py*w-pz*x,dz=pw*z-px*y+py*x-pz*w;
                    input.gyro(dx*100,dy*100,dz*100,stamp);
                }else input.gyro(0,0,0,stamp);
                input.acceleration(0,0,t>6&&t<10?(float)(2*Math.sin((t-6)*Math.PI*3)):0,stamp);previous=q;
            }
            if(tick%5==0&&tick>0){input.age(stamp);physics.step(1f/120f,input.copy());peak=Math.max(peak,Math.abs(physics.chestPx));}
            if(tick%30==0&&tick<15*600){
                if(!first)System.out.print(",");first=false;
                System.out.printf("{\"t\":%.4f,\"view\":[%.7f,%.7f],\"body\":[%.7f,%.7f],\"chest\":[%.7f,%.7f,%.7f],\"hair\":[%.7f,%.7f]}",t,physics.viewX,physics.viewY,physics.bodyPx,physics.bodyPy,physics.chestPx,physics.chestPy,physics.chestPz,physics.hairPx,physics.hairPy);
            }
        }
        if(!Float.isFinite(peak)||peak<.1f||Math.abs(physics.chestPx)>.02f)throw new AssertionError("invalid synthetic trace");
        System.out.println("]");
    }
}
