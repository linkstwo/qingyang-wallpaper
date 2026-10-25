package com.tangtang.motionwallpaper;

import android.content.Context;
import android.opengl.GLSurfaceView;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.view.Choreographer;
import javax.microedition.khronos.egl.EGLConfig;
import javax.microedition.khronos.opengles.GL10;

/** Frozen editing renders only changes; live motion follows vsync and sleeps when settled. */
final class PreviewView extends GLSurfaceView implements GLSurfaceView.Renderer {
    interface Listener { void ready(String error); }
    private final Physics physics=new Physics();
    private final Handler main=new Handler(Looper.getMainLooper());
    private final SensorFeed feed;
    private final Choreographer choreographer;
    private SceneRenderer scene;
    private Listener listener;
    private long lastNanos,accumulator;
    private boolean started,scheduled;
    private volatile boolean freezeMotion,animating;
    private volatile CropFrame cropOverride;
    private volatile String error="";
    private final Choreographer.FrameCallback tick=new Choreographer.FrameCallback(){
        @Override public void doFrame(long time){scheduled=false;if(!started||freezeMotion)return;requestRender();schedule(animating?0:100);}
    };
    PreviewView(Context context){
        super(context);choreographer=Choreographer.getInstance();
        feed=new SensorFeed(context,main);feed.wake=()->wake();
        setEGLContextClientVersion(2);setPreserveEGLContextOnPause(true);
        setRenderer(this);setRenderMode(RENDERMODE_WHEN_DIRTY);
    }
    void listener(Listener value){listener=value;}
    void crop(CropFrame frame){cropOverride=frame;requestRender();}
    void freezeMotion(boolean value){
        if(freezeMotion==value)return;freezeMotion=value;
        queueEvent(()->{physics.reset();lastNanos=accumulator=0;animating=false;});
        if(value){feed.stop();cancelTick();}else if(started){feed.start();wake();}
        requestRender();
    }
    void start(){if(started)return;started=true;onResume();queueEvent(()->{physics.reset();lastNanos=accumulator=0;});if(!freezeMotion){feed.start();wake();}requestRender();}
    void stop(){if(!started)return;started=false;cancelTick();feed.stop();onPause();}
    void recalibrate(){feed.calibrate();queueEvent(()->{physics.reset();lastNanos=accumulator=0;});requestRender();wake();}
    private void wake(){if(!started||freezeMotion)return;cancelTick();schedule(0);}
    private void schedule(long delay){if(scheduled||!started||freezeMotion)return;scheduled=true;choreographer.postFrameCallbackDelayed(tick,delay);}
    private void cancelTick(){choreographer.removeFrameCallback(tick);scheduled=false;}
    String stats(){return error.isEmpty()?feed.state():"渲染错误："+error;}
    @Override public void onSurfaceCreated(GL10 gl,EGLConfig config){if(scene!=null)scene.abandonGlResources();scene=null;lastNanos=accumulator=0;}
    @Override public void onSurfaceChanged(GL10 gl,int width,int height){
        try{if(scene==null){scene=new SceneRenderer(getContext());scene.phonePreview(true);scene.create(width,height);}else scene.resize(width,height);error="";}
        catch(Exception failure){error=String.valueOf(failure.getMessage());Log.e("QingyangPreview","预览加载失败",failure);}
        final String result=error;main.post(()->{if(listener!=null)listener.ready(result);});
    }
    @Override public void onDrawFrame(GL10 gl){
        if(scene==null||!scene.isReady())return;
        long now=SystemClock.elapsedRealtimeNanos();if(lastNanos==0)lastNanos=now;
        accumulator+=Math.min(Math.max(0,now-lastNanos),100000000L);lastNanos=now;
        if(!freezeMotion)feed.decayStale();
        while(accumulator>=8333333L){if(!freezeMotion)physics.step(.008333334f,feed.motion());accumulator-=8333333L;}
        scene.cropOverride(cropOverride);scene.draw(physics);animating=physics.moving();
    }
}
