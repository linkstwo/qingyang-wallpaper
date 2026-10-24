package android.opengl;
import java.util.*; import android.view.Surface;
public class EGL14 {
 public static final EGLDisplay EGL_NO_DISPLAY=new EGLDisplay(), DISPLAY=new EGLDisplay();
 public static final EGLContext EGL_NO_CONTEXT=new EGLContext(); public static final EGLSurface EGL_NO_SURFACE=new EGLSurface();
 public static final int EGL_DEFAULT_DISPLAY=0,EGL_RENDERABLE_TYPE=1,EGL_OPENGL_ES2_BIT=4,EGL_SURFACE_TYPE=2,EGL_WINDOW_BIT=4,EGL_RED_SIZE=3,EGL_GREEN_SIZE=5,EGL_BLUE_SIZE=6,EGL_ALPHA_SIZE=7,EGL_DEPTH_SIZE=8,EGL_STENCIL_SIZE=9,EGL_NONE=12344,EGL_CONTEXT_CLIENT_VERSION=12440;
 public static EGLContext current=EGL_NO_CONTEXT; public static Set<EGLContext> contexts=new HashSet<>(); public static Set<EGLSurface> surfaces=new HashSet<>(); public static Map<EGLSurface,Surface> targets=new HashMap<>();
 public static String failure=""; public static int error=0x3000,swaps,refs,created; public static boolean persistentFailure;
 static boolean fail(String op){if(op.equals(failure)){if(!persistentFailure)failure="";error=0x3009;return true;}return false;}
 public static int eglGetError(){int e=error;error=0x3000;return e;}
 public static EGLDisplay eglGetDisplay(int n){return fail("display")?EGL_NO_DISPLAY:DISPLAY;}
 public static boolean eglInitialize(EGLDisplay d,int[]a,int b,int[]c,int e){if(fail("initialize"))return false;refs++;return true;}
 public static boolean eglChooseConfig(EGLDisplay d,int[]a,int b,EGLConfig[]c,int e,int n,int[]count,int off){if(fail("config"))return false;c[0]=new EGLConfig();count[0]=1;return true;}
 public static EGLContext eglCreateContext(EGLDisplay d,EGLConfig c,EGLContext share,int[]a,int o){if(fail("context"))return EGL_NO_CONTEXT;EGLContext x=new EGLContext();contexts.add(x);created++;return x;}
 public static EGLSurface eglCreateWindowSurface(EGLDisplay d,EGLConfig c,Object win,int[]a,int o){if(fail("window"))return EGL_NO_SURFACE;if(!((Surface)win).isValid())throw new AssertionError("invalid window");EGLSurface s=new EGLSurface();surfaces.add(s);targets.put(s,(Surface)win);return s;}
 public static boolean eglMakeCurrent(EGLDisplay d,EGLSurface a,EGLSurface b,EGLContext c){if(c!=EGL_NO_CONTEXT && fail("current"))return false;if(c!=EGL_NO_CONTEXT && (!contexts.contains(c)||!surfaces.contains(a)))throw new AssertionError("dead EGL context/surface");current=c;return true;}
 public static EGLContext eglGetCurrentContext(){return current;}
 public static boolean eglSwapBuffers(EGLDisplay d,EGLSurface s){if(fail("swap"))return false;if(current==EGL_NO_CONTEXT||!surfaces.contains(s)||!targets.get(s).isValid())throw new AssertionError("swap without valid EGL");swaps++;return true;}
 public static boolean eglDestroySurface(EGLDisplay d,EGLSurface s){surfaces.remove(s);targets.remove(s);return true;}
 public static boolean eglDestroyContext(EGLDisplay d,EGLContext c){contexts.remove(c);return true;}
 public static boolean eglTerminate(EGLDisplay d){if(refs>0)refs--;return true;}
}