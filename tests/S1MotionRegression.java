package com.tangtang.motionwallpaper;
import java.nio.file.*;
import java.util.*;
public final class S1MotionRegression {
    static float[] replay(boolean lively,List<String> rows){
        Physics p=new Physics(true,lively);MotionInput m=new MotionInput();
        float chest=0,body=0,hair=0;
        for(int n=0;n<120*8;n++){
            double t=n/120.0;
            m.alphaY=t<2?(float)(35*Math.sin(t*Math.PI*6)):0;
            m.alphaX=t<2?(float)(20*Math.sin(t*Math.PI*4.4)):0;
            p.step(1f/120f,m);
            if(!Float.isFinite(p.chestPx)||Math.abs(p.chestPx)>11.901||Math.abs(p.bodyPx)>6.001)
                throw new AssertionError("new motion must respect existing scanned bounds");
            chest=Math.max(chest,Math.abs(p.chestPx));body=Math.max(body,Math.abs(p.bodyPx));hair=Math.max(hair,Math.abs(p.hairPx));
            if(rows!=null)rows.add(String.format(Locale.US,"%.6f,%.9f,%.9f,%.9f,%.9f",t,p.bodyPx,p.chestPx,p.chestPy,p.hairPx));
        }
        if(p.moving()||Math.abs(p.chestPx)>.002)throw new AssertionError("new response must settle at rest");
        return new float[]{body,chest,hair};
    }
    public static void main(String[] args)throws Exception{
        List<String> old=new ArrayList<>(),now=new ArrayList<>();
        float[] a=replay(false,old),b=replay(true,now);
        if(!(b[1]>a[1]*1.35f&&b[0]>a[0]*1.5f))throw new AssertionError("default motion must have a material same-input difference");
        double error=0,energy=0;
        for(int n=0;n<old.size();n++){
            double x=Double.parseDouble(old.get(n).split(",")[2])/a[1];
            double y=Double.parseDouble(now.get(n).split(",")[2])/b[1];
            error+=(x-y)*(x-y);energy+=x*x;
        }
        if(error/energy<.05)throw new AssertionError("new relative response must change phase/decay, not only multiply pixels");
        Physics stress=new Physics();MotionInput force=new MotionInput();
        for(int n=0;n<120*10;n++){
            double t=n/120.0;force.alphaY=(float)(250*Math.sin(t*19));force.alphaX=(float)(200*Math.cos(t*16));
            force.ax=(float)(18*Math.sin(t*13));force.ay=(float)(16*Math.cos(t*17));force.az=(float)(18*Math.sin(t*14));
            stress.step(1f/120f,force);
            if(Math.abs(stress.bodyPx)>6.001||Math.abs(stress.bodyPy)>6.001||Math.abs(stress.chestPx)>11.901
                ||Math.abs(stress.chestPy)>11.901||Math.abs(stress.chestPz)>10.201
                ||Math.abs(stress.hairPx)>21.001||Math.abs(stress.hairPy)>10.501)
                throw new AssertionError("combined strong input escaped the existing geometry-scan domain");
        }
        force=new MotionInput();for(int n=0;n<120*8;n++)stress.step(1f/120f,force);
        if(stress.moving())throw new AssertionError("combined strong input must settle");
        if(args.length>0){Path dir=Paths.get(args[0]);Files.createDirectories(dir);Files.write(dir.resolve("motion-0.5.6.csv"),old);Files.write(dir.resolve("motion-0.5.7.csv"),now);}
        System.out.printf(Locale.US,"{\"oldBodyPeak\":%.9f,\"newBodyPeak\":%.9f,\"oldRelativePeak\":%.9f,\"newRelativePeak\":%.9f,\"normalizedTrajectoryError\":%.9f,\"settled\":true,\"phoneTested\":false}%n",a[0],b[0],a[1],b[1],error/energy);
    }
}
