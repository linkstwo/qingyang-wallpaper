package com.tangtang.motionwallpaper;
import android.content.Context;import android.os.Looper;import android.opengl.GLES20;
public final class PreviewLifecycleRegression {
 static int checks;static void check(boolean b,String s){checks++;if(!b)throw new AssertionError(s);}
 static PreviewView preview(){PreviewView p=new PreviewView(new Context());p.freezeMotion(true);p.start();p.onSurfaceCreated(null,null);return p;}
 public static void main(String[]a)throws Exception{
  PreviewView p=preview();SceneRenderer.failCreate=true;p.onSurfaceChanged(null,540,1176);
  check(p.stats().contains("texture decode"),"creation failure surfaced");
  check(SceneRenderer.live==0,"partial allocations released after failed create");
  int creates=SceneRenderer.creates,draws=SceneRenderer.draws,requests=p.requests;
  p.onDrawFrame(null);check(SceneRenderer.creates==creates,"immediate draw honors retry backoff");
  Looper.advance(249);check(p.requests==requests,"no premature retry");Looper.advance(1);
  check(p.requests==requests+1,"frozen preview requests recovery frame without user input");p.onDrawFrame(null);
  check(SceneRenderer.draws==draws+1,"creation failure recovers on unchanged surface");check(!p.stats().contains("渲染错误"),"success clears error");
  SceneRenderer.failDraw=true;p.onDrawFrame(null);check(p.stats().contains("injected draw"),"draw exception captured");check(SceneRenderer.live==0,"draw failure releases renderer");Looper.advance(250);p.onDrawFrame(null);check(!p.stats().contains("渲染错误"),"draw exception recovers");
  GLES20.nextError=0x502;p.onDrawFrame(null);check(p.stats().contains("draw glError=0x502"),"GL error surfaced");Looper.advance(250);p.onDrawFrame(null);check(!p.stats().contains("渲染错误"),"GL error recovers");
  SceneRenderer.alwaysFail=true;p.onSurfaceCreated(null,null);p.onSurfaceChanged(null,540,1176);
  creates=SceneRenderer.creates;for(int i=0;i<10;i++){p.onDrawFrame(null);Looper.advance(10);}check(SceneRenderer.creates==creates,"frequent frames cannot bypass backoff");
  Looper.advance(150);p.onDrawFrame(null);check(SceneRenderer.creates==creates+1,"second attempt after first delay");
  requests=p.requests;p.stop();Looper.advance(3000);check(p.requests==requests,"pause cancels retry callback");
  SceneRenderer.alwaysFail=false;p.start();p.onDrawFrame(null);check(!p.stats().contains("渲染错误"),"resume recovers persistent failure");
  java.lang.reflect.Field f=PreviewView.class.getDeclaredField("physics");f.setAccessible(true);Physics physics=(Physics)f.get(p);
  physics.chestPx=2;physics.bodyPx=1;p.onSurfaceCreated(null,null);
  check(physics.chestPx==0&&physics.bodyPx==0,"context recreation clears old impulses");
  p.onSurfaceChanged(null,540,1176);p.onDrawFrame(null);PreviewView second=preview();second.onSurfaceChanged(null,540,1176);second.onDrawFrame(null);
  p.stop();int d=SceneRenderer.draws;second.onDrawFrame(null);check(SceneRenderer.draws==d+1,"one paused preview does not stop another");second.stop();
  System.out.println("{\"assertions\":"+checks+",\"actualPreviewView\":true,\"fakeAndroidGLRenderer\":true,\"phoneTested\":false}");
 }
}
