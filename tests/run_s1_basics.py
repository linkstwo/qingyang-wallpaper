from pathlib import Path
import json,os,subprocess,tempfile
ROOT=Path(__file__).resolve().parents[1]
JDK=Path(os.environ.get('JAVA_HOME',r'C:\AndroidSetup\jdk\jdk-17.0.20.1+1'))
EXE='.exe' if os.name=='nt' else ''
SOURCE=ROOT/'android-app/app/src/main/java/com/tangtang/motionwallpaper'
with tempfile.TemporaryDirectory(prefix='qingyang-s1-') as tmp:
    java=[str(JDK/'bin'/('java'+EXE))]
    javac=[str(JDK/'bin'/('javac'+EXE))]
    sources=[SOURCE/(n+'.java') for n in ('CropFrame','SceneSettings','Framing','StudyFraming','MathX','WallpaperViewport','Physics','MotionInput','Attitude','Spring')]
    sources+=list((ROOT/'tests/crop-fixtures').rglob('*.java'))
    sources += [ROOT/'tests/CropFrameRegression.java',ROOT/'tests/S1MotionRegression.java',ROOT/'tests/ResponseRegression.java']
    subprocess.run(javac+['-encoding','UTF-8','-d',tmp,*map(str,sources)],check=True)
    report={}
    for name in ('CropFrameRegression','S1MotionRegression','ResponseRegression'):
        args=[str(ROOT/'validation')] if name=='S1MotionRegression' else []
        r=subprocess.check_output(java+['-ea','-cp',tmp,'com.tangtang.motionwallpaper.'+name,*args],text=True)
        report[name]=json.loads(r)
    (ROOT/'validation/s1-basics-0.5.7.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
