package com.tangtang.motionwallpaper;
import android.content.Context;import android.os.*;import android.view.Surface;import android.opengl.*;import android.util.Log;import java.lang.reflect.*;
public class LifecycleRegression {
 static int checks;
 static void check(boolean ok,String m){if(!ok)throw new AssertionError(m);checks++;}
 static Looper looper(RenderLoop r)throws Exception{Field f=RenderLoop.class.getDeclaredField("handler");f.setAccessible(true);return ((Handler)f.get(r)).getLooper();}
 static SensorFeed feed(RenderLoop r)throws Exception{Field f=RenderLoop.class.getDeclaredField("feed");f.setAccessible(true);return (SensorFeed)f.get(r);}
 static void close(RenderLoop r)throws Exception{Looper.on(looper(r),r::close);}
 static RenderLoop start(boolean activeFirst){RenderLoop r=new RenderLoop(new Context());if(activeFirst)r.setActive(true);r.setSurface(new Surface(),1080,2400);if(!activeFirst)r.setActive(true);Looper.advance(0);return r;}
 public static void main(String[]args)throws Exception{
  RenderLoop r=start(false);check(EGL14.swaps>0,"initial wallpaper frame must reach swap (original 0.5.0 regression)");check(Log.lines.stream().anyMatch(s->s.contains("FIRST_SWAP_OK")),"first frame acknowledgement");
  int draws=SceneRenderer.draws;r.setActive(false);Looper.advance(0);Looper.advance(500);check(SceneRenderer.draws==draws,"hidden screen must stop frames");check(!feed(r).active,"hidden screen must stop sensors");r.setActive(true);Looper.advance(0);check(SceneRenderer.draws>draws,"visible screen resumes");check(feed(r).active,"visible retained-context resume restarts sensors");check(Log.lines.stream().filter(s->s.contains("FIRST_SWAP_OK")).count()>=2,"resume acknowledges a new submitted frame");
  int contexts=EGL14.created;r.resize(2400,1080);Looper.advance(0);check(EGL14.created==contexts,"resize must retain context");check(SceneRenderer.resizes>0,"resize updates renderer viewport");
  Looper.on(looper(r),r::clearSurface);draws=SceneRenderer.draws;Looper.advance(500);check(SceneRenderer.draws==draws,"destroyed surface stops drawing");check(EGL14.contexts.isEmpty()&&EGL14.surfaces.isEmpty(),"destroyed surface releases EGL");
  r.setSurface(new Surface(),1080,2400);r.setActive(true);Looper.advance(0);check(SceneRenderer.draws>draws,"replacement surface renders");
  EGL14.failure="swap";Looper.advance(200);check(r.status().contains("eglSwapBuffers")&&r.status().contains("3009"),"swap failure exposes exact operation/code");draws=SceneRenderer.draws;Looper.advance(100);check(SceneRenderer.draws==draws,"recovery backs off");Looper.advance(300);check(SceneRenderer.draws>draws&&!r.status().contains("渲染错误"),"swap failure recovers without visibility toggle");check(feed(r).active,"recovery restarts sensors");
  for(String op:new String[]{"display","initialize","config","context","window","current"}){close(r);EGL14.failure=op;r=start(true);check(r.status().contains("渲染错误"),op+" failure surfaced");check(!feed(r).active,op+" failed init stops sensors");Looper.advance(300);check(!r.status().contains("渲染错误"),op+" initialization retries and recovers");close(r);check(EGL14.contexts.isEmpty()&&EGL14.surfaces.isEmpty(),op+" partial initialization cleans up");}
  r=start(false);int previousSwaps=EGL14.swaps;GLES20.nextError=0x502;Looper.advance(100);check(r.status().contains("draw glError=0x502"),"draw failure must be reported");check(EGL14.swaps==previousSwaps,"failed GL draw must not be acknowledged as presented");Looper.advance(300);check(EGL14.swaps>previousSwaps,"draw failure recovers after GL resource rebuild");close(r);
  SceneRenderer.failNext=true;r=start(false);check(r.status().contains("texture decode"),"asset failure not counted as frame");Looper.advance(300);check(!r.status().contains("渲染错误"),"asset/GL recreation recovers");close(r);
  r=start(true);RenderLoop second=start(false);int before=EGL14.swaps;close(r);Looper.advance(300);check(EGL14.swaps>before,"second wallpaper engine survives first teardown");close(second);check(EGL14.contexts.isEmpty()&&EGL14.surfaces.isEmpty(),"both engines clean up independently");
  Surface invalid=new Surface();invalid.valid=false;r=new RenderLoop(new Context());r.setSurface(invalid,1,1);r.setActive(true);draws=SceneRenderer.draws;Looper.advance(300);check(SceneRenderer.draws==draws,"invalid native Surface never draws");close(r);
  r=start(false);EGL14.failure="swap";EGL14.persistentFailure=true;Looper.advance(6000);long retries=Log.lines.stream().filter(s->s.contains("EGL retry")).count();check(Looper.pending()==1,"permanent failure retains only one bounded retry");draws=SceneRenderer.draws;r.setActive(false);Looper.advance(0);Looper.advance(4000);check(SceneRenderer.draws==draws&&Looper.pending()==0,"screen off cancels pending fault recovery");close(r);EGL14.persistentFailure=false;EGL14.failure="";
  r=new RenderLoop(new Context());r.setActive(true);Looper.advance(0);
  check(!feed(r).active,"activation without a Surface must not register sensors");
  r.setSurface(new Surface(),1080,2400);Looper.advance(0);check(feed(r).active,"valid Surface starts sensors after EGL creation");
  Field pf=RenderLoop.class.getDeclaredField("physics");pf.setAccessible(true);Physics prior=(Physics)pf.get(r);prior.chestPx=3;
  r.setSurface(new Surface(),1080,2400);Looper.advance(0);check(prior.chestPx==0,"replacement Surface discards old motion");
  Surface replacement=new Surface();replacement.valid=false;r.setSurface(replacement,1,1);Looper.advance(0);
  check(!feed(r).active,"invalid replacement stops prior Surface sensors");close(r);
  r=new RenderLoop(new Context());r.setSurface(new Surface(),1,1);r.setActive(true);close(r);draws=SceneRenderer.draws;Looper.advance(1000);check(SceneRenderer.draws==draws,"close defeats queued surface/activation callbacks");check(EGL14.contexts.isEmpty()&&EGL14.surfaces.isEmpty(),"no EGL leaks at end");check(EGL14.refs==0,"all display initialize references balanced");
  System.out.println("PASS "+checks+" lifecycle assertions; host Java uses real RenderLoop/EglCore, fake Android/EGL/renderer, no phone claim.");
 }
}