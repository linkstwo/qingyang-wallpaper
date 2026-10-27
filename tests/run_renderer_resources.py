"""Actual SceneRenderer/GlAssets/MeshAssets with counted fake GLES; no real raster.
The optional baseline compiles the complete old SceneRenderer, not copied test logic.
"""
from pathlib import Path
import ast,argparse,tempfile,shutil,subprocess
R=Path(__file__).resolve().parents[1];p=argparse.ArgumentParser();p.add_argument('--baseline',action='store_true');a=p.parse_args()
mod=ast.parse((R/'tests/run_gl_assets.py').read_text());fixtures=ast.literal_eval(next(n.value for n in mod.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='fixtures' for t in n.targets)))
g=fixtures['android/opengl/GLES20.java'];g=g.replace('public static final Set<Integer> textures=', 'public static final Set<Integer> buffers=new HashSet<>(); public static final Set<Integer> textures=')
constants=['GL_ARRAY_BUFFER','GL_BLEND','GL_COLOR_BUFFER_BIT','GL_DEPTH_BUFFER_BIT','GL_DEPTH_TEST','GL_FLOAT','GL_LEQUAL','GL_ONE_MINUS_SRC_ALPHA','GL_SRC_ALPHA','GL_STATIC_DRAW','GL_TEXTURE0','GL_TEXTURE1','GL_TRIANGLES']
extra='public static final int '+','.join(n+'='+str(i+30) for i,n in enumerate(constants))+';\n'
methods={'glGetAttribLocation':('int','int p,String s','return 1;'),'glGetUniformLocation':('int','int p,String s','return 1;'),'glUseProgram':('void','int p',''),'glUniform1f':('void','int a,float b',''),'glUniform1i':('void','int a,int b',''),'glUniform2f':('void','int a,float b,float c',''),'glUniform3f':('void','int a,float b,float c,float d',''),'glEnableVertexAttribArray':('void','int a',''),'glDisableVertexAttribArray':('void','int a',''),'glEnable':('void','int a',''),'glDisable':('void','int a',''),'glBlendFunc':('void','int a,int b',''),'glViewport':('void','int a,int b,int c,int d',''),'glClearColor':('void','float a,float b,float c,float d',''),'glClear':('void','int a',''),'glDepthMask':('void','boolean b',''),'glDepthFunc':('void','int a',''),'glActiveTexture':('void','int a',''),'glBindBuffer':('void','int a,int b',''),'glVertexAttribPointer':('void','int a,int b,int c,boolean d,int e,int f',''),'glVertexAttrib1f':('void','int a,float b',''),'glDrawArrays':('void','int a,int b,int c',''),'glBufferData':('void','int a,int b,java.nio.Buffer c,int d',''),'glGenBuffers':('void','int n,int[]a,int o','for(int i=0;i<n;i++){a[o+i]=++next;buffers.add(a[o+i]);}'),'glDeleteBuffers':('void','int n,int[]a,int o','for(int i=0;i<n;i++)if(!buffers.remove(a[o+i]))throw new AssertionError("buffer double deletion");')}
extra+='\n'.join('public static '+typ+' '+name+'('+args+'){'+body+'}' for name,(typ,args,body) in methods.items());fixtures['android/opengl/GLES20.java']=g.rsplit('}',1)[0]+extra+'}'
fixtures.update({
'android/content/Context.java':(R/'tests/crop-fixtures/android/content/Context.java').read_text().replace('public class Context {','public class Context {public Context getApplicationContext(){return this;}public static final String DISPLAY_SERVICE="display";public Object getSystemService(String s){return null;}public android.content.res.AssetManager getAssets(){return new android.content.res.AssetManager();}'),
'android/content/SharedPreferences.java':(R/'tests/crop-fixtures/android/content/SharedPreferences.java').read_text(),
'android/content/res/AssetManager.java':'''package android.content.res;import java.io.*;public class AssetManager {public InputStream open(String n)throws IOException{return new FileInputStream(System.getProperty("assets")+"/"+n);}}''',
'android/graphics/Point.java':'package android.graphics;public class Point {public int x,y;public Point(int x,int y){this.x=x;this.y=y;}}',
'android/view/Display.java':'package android.view;public class Display {public static final int DEFAULT_DISPLAY=0;public void getRealSize(android.graphics.Point p){}}',
'android/hardware/display/DisplayManager.java':'package android.hardware.display;public class DisplayManager {public android.view.Display getDisplay(int n){return null;}}',
'android/graphics/Bitmap.java':'package android.graphics;public class Bitmap {public static int live;boolean recycled;public Bitmap(){live++;}public int getWidth(){return 1152;}public int getHeight(){return 1536;}public void recycle(){if(recycled)throw new AssertionError("bitmap double recycle");recycled=true;live--;}}',
'android/graphics/BitmapFactory.java':'package android.graphics;public class BitmapFactory {public static Bitmap decodeStream(java.io.InputStream s){return new Bitmap();}}'
})
with tempfile.TemporaryDirectory() as tmp:
 t=Path(tmp)
 for path,s in fixtures.items():f=t/path;f.parent.mkdir(parents=True,exist_ok=True);f.write_text(s)
 names=['FirstPassAssets','GlAssets','SceneRenderer','MeshAssets','SceneSettings','CropFrame','Physics','MotionInput','Attitude','Spring','MathX','Framing','StudyFraming','WallpaperViewport']
 for n in names:
  path='android-app/app/src/main/java/com/tangtang/motionwallpaper/'+n+'.java';f=t/(n+'.java')
  if a.baseline and n=='SceneRenderer':f.write_bytes(subprocess.check_output(['git','show','9a24a706:'+path],cwd=R))
  else:shutil.copyfile(R/path,f)
 shutil.copyfile(R/'tests/RendererResourcesRegression.java',t/'RendererResourcesRegression.java')
 subprocess.run(([shutil.which('javac')] if shutil.which('javac') else ['java','-m','jdk.compiler/com.sun.tools.javac.Main'])+['-encoding','UTF-8','-d',str(t/'classes'),*map(str,t.rglob('*.java'))],check=True)
 r=subprocess.run(['java','-ea','-Dassets='+str(R/'android-app/app/src/main/assets'),'-cp',str(t/'classes'),'com.tangtang.motionwallpaper.RendererResourcesRegression'],capture_output=True,text=True);print(r.stdout+r.stderr,end='')
 if r.returncode:raise SystemExit(r.returncode)
 if not a.baseline:(R/'validation/renderer-resources-regression.json').write_text(r.stdout)
