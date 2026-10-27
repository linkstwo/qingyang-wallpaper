"""Real MeshAssets parser mutation tests; assets copied to a temporary directory."""
from pathlib import Path
import tempfile,subprocess,shutil,argparse
R=Path(__file__).resolve().parents[1];p=argparse.ArgumentParser();p.add_argument('--baseline',action='store_true');a=p.parse_args()
with tempfile.TemporaryDirectory() as tmp:
 t=Path(tmp);assets=t/'assets';shutil.copytree(R/'android-app/app/src/main/assets',assets)
 fixtures={'android/content/Context.java':'package android.content;public class Context {public android.content.res.AssetManager getAssets(){return new android.content.res.AssetManager();}}','android/content/res/AssetManager.java':'package android.content.res;import java.io.*;public class AssetManager {public InputStream open(String n)throws IOException{return new FileInputStream(System.getProperty("assets")+"/"+n);}}'}
 for path,s in fixtures.items():f=t/path;f.parent.mkdir(parents=True,exist_ok=True);f.write_text(s)
 path='android-app/app/src/main/java/com/tangtang/motionwallpaper/MeshAssets.java'
 if a.baseline:(t/'MeshAssets.java').write_bytes(subprocess.check_output(['git','show','9a24a706:'+path],cwd=R))
 else:shutil.copy(R/path,t/'MeshAssets.java')
 shutil.copy(R/'tests/MeshIntegrityRegression.java',t/'MeshIntegrityRegression.java')
 subprocess.run(([shutil.which('javac')] if shutil.which('javac') else ['java','-m','jdk.compiler/com.sun.tools.javac.Main'])+['-encoding','UTF-8','-d',str(t/'classes'),*map(str,t.rglob('*.java'))],check=True)
 r=subprocess.run(['java','-ea','-Dassets='+str(assets),'-cp',str(t/'classes'),'com.tangtang.motionwallpaper.MeshIntegrityRegression'],capture_output=True,text=True);print(r.stdout+r.stderr,end='')
 if r.returncode:raise SystemExit(r.returncode)
 if not a.baseline:(R/'validation/mesh-integrity-regression.json').write_text(r.stdout)
