"""Run production Java without Android, then compare JS trajectories to that result."""
from pathlib import Path
import json
import os
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
home = Path(os.environ.get('JAVA_HOME', '/usr/lib/jvm/java-17-openjdk-amd64'))
java = shutil.which('java') or str(home / 'bin/java')
javac = shutil.which('javac')
compile_cmd = [javac] if javac else [java, '-m', 'jdk.compiler/com.sun.tools.javac.Main']
source = ROOT / 'android-app/app/src/main/java/com/tangtang/motionwallpaper'
with tempfile.TemporaryDirectory(prefix='qingyang-response-') as temp:
    files = [source / (n + '.java') for n in ('MathX', 'MotionInput', 'Physics', 'Spring', 'Framing')]
    subprocess.run(compile_cmd + ['-encoding', 'UTF-8', '-d', temp, *map(str, files),
                                 str(ROOT / 'tests/ResponseRegression.java')], check=True)
    result = subprocess.check_output([java, '-ea', '-cp', temp,
                                     'com.tangtang.motionwallpaper.ResponseRegression'], text=True)
    metrics = json.loads(result)
    subprocess.run(['node', str(ROOT / 'tests/response-regression.mjs'), json.dumps(metrics)], check=True)
    (ROOT / 'validation/cloud-response.json').write_text(json.dumps(metrics, indent=2) + '\n')
    print(result.strip())
