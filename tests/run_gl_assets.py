"""Compile actual production GlAssets with counted GL handle fault injection."""
from pathlib import Path
import tempfile,subprocess,shutil
R=Path(__file__).resolve().parents[1]
fixtures={
'android/graphics/Bitmap.java':'package android.graphics;public class Bitmap {}',
'android/opengl/GLUtils.java':'''package android.opengl;public class GLUtils {public static void texImage2D(int a,int b,android.graphics.Bitmap c,int d){if(GLES20.fail.equals("uploadThrow"))throw new IllegalArgumentException("upload");if(GLES20.fail.equals("uploadError"))GLES20.error=1285;}}''',
'android/opengl/GLES20.java':'''package android.opengl;import java.util.*;public class GLES20 {
 public static final int GL_TEXTURE_2D=1,GL_TEXTURE_MIN_FILTER=2,GL_TEXTURE_MAG_FILTER=3,GL_LINEAR=4,GL_TEXTURE_WRAP_S=5,GL_TEXTURE_WRAP_T=6,GL_CLAMP_TO_EDGE=7,GL_NO_ERROR=0,GL_VERTEX_SHADER=8,GL_FRAGMENT_SHADER=9,GL_LINK_STATUS=10,GL_COMPILE_STATUS=11;
 public static final Set<Integer> textures=new HashSet<>(),shaders=new HashSet<>(),programs=new HashSet<>();static final Map<Integer,Integer> types=new HashMap<>();public static String fail="";public static int error,next;
 public static void glGenTextures(int n,int[] a,int o){if(fail.equals("textureZero"))a[o]=0;else{a[o]=++next;textures.add(a[o]);}}
 public static void glDeleteTextures(int n,int[]a,int o){for(int i=0;i<n;i++)if(!textures.remove(a[o+i]))throw new AssertionError("texture double deletion");}
 public static void glBindTexture(int a,int b){if(fail.equals("bindThrow"))throw new IllegalStateException("bind");}public static void glTexParameteri(int a,int b,int c){}public static int glGetError(){int e=error;error=0;return e;}
 public static int glCreateShader(int t){if(fail.equals("shaderZero"))return 0;int id=++next;shaders.add(id);types.put(id,t);return id;}
 public static void glShaderSource(int s,String v){if(fail.equals("sourceThrow"))throw new IllegalArgumentException("source");}public static void glCompileShader(int s){if(fail.equals("compileThrow"))throw new IllegalStateException("compile");}
 public static void glGetShaderiv(int s,int p,int[]a,int o){a[o]=(fail.equals("vertex")&&types.get(s)==GL_VERTEX_SHADER)||(fail.equals("fragment")&&types.get(s)==GL_FRAGMENT_SHADER)?0:1;}
 public static String glGetShaderInfoLog(int s){return "injected compile error";}public static void glDeleteShader(int s){if(!shaders.remove(s))throw new AssertionError("shader double deletion");}
 public static int glCreateProgram(){if(fail.equals("programZero"))return 0;int s=++next;programs.add(s);return s;}
 public static void glAttachShader(int p,int s){if(fail.equals("attachThrow"))throw new IllegalStateException("attach");}public static void glLinkProgram(int p){if(fail.equals("linkThrow"))throw new IllegalStateException("link");}
 public static void glGetProgramiv(int p,int n,int[]a,int o){a[o]=fail.equals("link")?0:1;}public static String glGetProgramInfoLog(int p){return "injected link error";}public static void glDeleteProgram(int p){if(!programs.remove(p))throw new AssertionError("program double deletion");}
}'''}
with tempfile.TemporaryDirectory() as tmp:
 t=Path(tmp)
 for path,s in fixtures.items():f=t/path;f.parent.mkdir(parents=True,exist_ok=True);f.write_text(s)
 for path in ['android-app/app/src/main/java/com/tangtang/motionwallpaper/GlAssets.java','tests/GlAssetsRegression.java']:shutil.copy(R/path,t/Path(path).name)
 subprocess.run(([shutil.which('javac')] if shutil.which('javac') else ['java','-m','jdk.compiler/com.sun.tools.javac.Main'])+['-encoding','UTF-8','-d',str(t/'classes'),*map(str,t.rglob('*.java'))],check=True)
 result=subprocess.check_output(['java','-ea','-cp',str(t/'classes'),'com.tangtang.motionwallpaper.GlAssetsRegression'],text=True);print(result,end='');(R/'validation/gl-assets-regression.json').write_text(result)
