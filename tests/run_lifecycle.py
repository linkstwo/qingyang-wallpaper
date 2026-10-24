"""Host regression for actual RenderLoop + EglCore. No device/rendering acceptance implied.
Run with Python 3.12 and JDK 17. --baseline demonstrates the 0.5.0 failure.
"""
import argparse, os, pathlib, shutil, subprocess, tempfile
ROOT = pathlib.Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--baseline', action='store_true')
args = parser.parse_args()
java_home = pathlib.Path(os.environ.get('JAVA_HOME', r'C:\AndroidSetup\jdk\jdk-17.0.20.1+1'))
exe = '.exe' if os.name == 'nt' else ''
javac = str(java_home / 'bin' / ('javac' + exe))
java = str(java_home / 'bin' / ('java' + exe))
if not pathlib.Path(javac).exists():
    javac = shutil.which('javac') or javac
    java = shutil.which('java') or java
with tempfile.TemporaryDirectory(prefix='qingyang-lifecycle-') as temp:
    folder = pathlib.Path(temp)
    src = folder / 'src'
    shutil.copytree(ROOT / 'tests' / 'host-fixtures', src)
    package = pathlib.Path('com/tangtang/motionwallpaper')
    real = ROOT / 'android-app/app/src/main/java' / package
    for name in ('RenderLoop.java', 'EglCore.java', 'MathX.java', 'MotionInput.java', 'Physics.java', 'Spring.java'):
        target = src / package / name
        if args.baseline and name in ('RenderLoop.java', 'EglCore.java'):
            shutil.copyfile(ROOT / 'tests' / 'baseline' / name, target)
        else:
            shutil.copyfile(real / name, target)
    sources = sorted(src.rglob('*.java'))
    classes = folder / 'classes'
    classes.mkdir()
    argfile = folder / 'sources.txt'
    argfile.write_text('\n'.join('"' + str(p).replace('\\', '/') + '"' for p in sources), encoding='utf-8')
    subprocess.run([javac, '-encoding', 'UTF-8', '-d', str(classes), '@' + str(argfile)], check=True)
    subprocess.run([java, '-ea', '-cp', str(classes), 'com.tangtang.motionwallpaper.LifecycleRegression'], check=True)
