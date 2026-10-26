"""Production PreviewView host fault injection; Android/GL are test doubles."""
from pathlib import Path
import argparse,subprocess,tempfile,shutil
R=Path(__file__).resolve().parents[1];p=argparse.ArgumentParser();p.add_argument('--baseline',action='store_true');a=p.parse_args()
fixtures={
'android/opengl/GLSurfaceView.java':'''package android.opengl;import android.content.Context;public class GLSurfaceView {public interface Renderer {void onSurfaceCreated(javax.microedition.khronos.opengles.GL10 g,javax.microedition.khronos.egl.EGLConfig c);void onSurfaceChanged(javax.microedition.khronos.opengles.GL10 g,int w,int h);void onDrawFrame(javax.microedition.khronos.opengles.GL10 g);}public static final int RENDERMODE_WHEN_DIRTY=0;final Context c;public int requests;public GLSurfaceView(Context c){this.c=c;}public Context getContext(){return c;}public void setEGLContextClientVersion(int n){}public void setEGLConfigChooser(int a,int b,int c,int d,int e,int f){}public void setPreserveEGLContextOnPause(boolean b){}public void setRenderer(Renderer r){}public void setRenderMode(int n){}public void requestRender(){requests++;}public void queueEvent(Runnable r){r.run();}public void onResume(){}public void onPause(){}}''',
'javax/microedition/khronos/opengles/GL10.java':'package javax.microedition.khronos.opengles; public interface GL10 {}',
'javax/microedition/khronos/egl/EGLConfig.java':'package javax.microedition.khronos.egl; public interface EGLConfig {}',
'android/view/Choreographer.java':'''package android.view;public class Choreographer {public interface FrameCallback{void doFrame(long time);}public static Choreographer getInstance(){return new Choreographer();}public void postFrameCallbackDelayed(FrameCallback c,long d){}public void removeFrameCallback(FrameCallback c){}}''',
'com/tangtang/motionwallpaper/CropFrame.java':'package com.tangtang.motionwallpaper;final class CropFrame {}',
'com/tangtang/motionwallpaper/SceneRenderer.java':'''package com.tangtang.motionwallpaper;import android.content.Context;class SceneRenderer {static int draws,creates,releases,live;static boolean failCreate,failDraw,alwaysFail;boolean ready,allocated;SceneRenderer(Context c){}void phonePreview(boolean v){}void cropOverride(CropFrame c){}boolean isReady(){return ready;}void create(int w,int h){creates++;allocated=true;live++;if(failCreate||alwaysFail){failCreate=false;throw new IllegalStateException("texture decode failure");}ready=true;}void resize(int w,int h){}void draw(Physics p){if(failDraw){failDraw=false;throw new IllegalStateException("injected draw failure");}if(!ready)throw new AssertionError("unready draw");draws++;}void release(){releases++;if(allocated)live--;allocated=ready=false;}void abandonGlResources(){if(allocated)live--;allocated=ready=false;}}'''}
with tempfile.TemporaryDirectory() as tmp:
 t=Path(tmp);src=t/'src';shutil.copytree(R/'tests/host-fixtures',src);pkg=Path('com/tangtang/motionwallpaper');(src/pkg/'LifecycleRegression.java').unlink()
 f=src/'android/os/Looper.java';f.write_text(f.read_text().replace('public static long now=1000;','private static final Looper MAIN=new Looper();public static Looper getMainLooper(){return MAIN;}public static long now=1000;'))
 f=src/pkg/'SensorFeed.java';f.write_text(f.read_text().replace('void decayStale(){}','void calibrate(){m.reset();}void decayStale(){}'))
 for n in ('PreviewView.java','MathX.java','Attitude.java','MotionInput.java','Physics.java','Spring.java'):
  f=src/pkg/n;path=Path('android-app/app/src/main/java')/pkg/n
  if a.baseline and n=='PreviewView.java':f.write_bytes(subprocess.check_output(['git','show','9a24a706:'+str(path)],cwd=R))
  else:shutil.copyfile(R/path,f)
 for path,content in fixtures.items():
  f=src/path;f.parent.mkdir(parents=True,exist_ok=True);f.write_text(content)
 shutil.copyfile(R/'tests/PreviewLifecycleRegression.java',src/pkg/'PreviewLifecycleRegression.java')
 subprocess.run(([shutil.which('javac')] if shutil.which('javac') else ['java','-m','jdk.compiler/com.sun.tools.javac.Main'])+['-encoding','UTF-8','-d',str(t/'classes'),*map(str,src.rglob('*.java'))],check=True)
 r=subprocess.run(['java','-ea','-cp',str(t/'classes'),'com.tangtang.motionwallpaper.PreviewLifecycleRegression'],text=True,capture_output=True);print(r.stdout+r.stderr,end='')
 if r.returncode:raise SystemExit(r.returncode)
 if not a.baseline:(R/'validation/preview-lifecycle-regression.json').write_text(r.stdout)
