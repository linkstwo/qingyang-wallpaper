"""Compile the real SensorFeed against a deterministic Android sensor queue.
No emulator, device or phone acceptance. --baseline uses the pre-fix source.
"""
from pathlib import Path
import json, subprocess, tempfile, shutil, argparse
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(); p.add_argument('--baseline',action='store_true'); args=p.parse_args()
fixtures={
'android/content/Context.java':'''package android.content; public class Context { public static final String SENSOR_SERVICE="sensor", DISPLAY_SERVICE="display"; public Object getSystemService(String s){return s.equals(SENSOR_SERVICE)?new android.hardware.SensorManager():new android.hardware.display.DisplayManager();} public Context getApplicationContext(){return this;} }''',
'android/os/Handler.java':'package android.os; public class Handler {}',
'android/os/SystemClock.java':'''package android.os; public class SystemClock { public static long nanos=1000000000L; public static long elapsedRealtime(){return nanos/1000000;} public static long elapsedRealtimeNanos(){return nanos;} }''',
'android/view/Display.java':'package android.view; public class Display { public static final int DEFAULT_DISPLAY=0; public static int rotation=0; public int getRotation(){return rotation;} }',
'android/hardware/display/DisplayManager.java':'package android.hardware.display; public class DisplayManager { public android.view.Display getDisplay(int n){return new android.view.Display();} }',
'android/hardware/Sensor.java':'''package android.hardware; public class Sensor { public static final int TYPE_GRAVITY=9,TYPE_LINEAR_ACCELERATION=10,TYPE_GAME_ROTATION_VECTOR=15,TYPE_ROTATION_VECTOR=11,TYPE_GYROSCOPE=4,TYPE_ACCELEROMETER=1; private int type; public Sensor(int t){type=t;} public int getType(){return type;} }''',
'android/hardware/SensorEvent.java':'package android.hardware; public class SensorEvent { public Sensor sensor; public float[] values; public long timestamp; }',
'android/hardware/SensorEventListener.java':'package android.hardware; public interface SensorEventListener { void onSensorChanged(SensorEvent e); void onAccuracyChanged(Sensor s,int a); }',
'android/hardware/SensorManager.java':'''package android.hardware; public class SensorManager { public static boolean fused=false; public Sensor getDefaultSensor(int t){return fused||t==Sensor.TYPE_ACCELEROMETER||t==Sensor.TYPE_GYROSCOPE?new Sensor(t):null;} public boolean registerListener(SensorEventListener l,Sensor s,int us,android.os.Handler h){return true;} public void unregisterListener(SensorEventListener l){} }''',
}
with tempfile.TemporaryDirectory(prefix='qingyang-sensor-') as tmp:
    root=Path(tmp); src=ROOT/'android-app/app/src/main/java/com/tangtang/motionwallpaper'
    for path,content in fixtures.items():
        f=root/path;f.parent.mkdir(parents=True,exist_ok=True);f.write_text(content)
    pkg=root/'com/tangtang/motionwallpaper';pkg.mkdir(parents=True)
    for name in ['MathX','Attitude','MotionInput','SensorFeed','Physics','Spring']:
        data=(src/(name+'.java')).read_text()
        if args.baseline and name=='SensorFeed':
            data=subprocess.check_output(['git','show','17b7e3451a667b82859366555d8d5d123e005c09:android-app/app/src/main/java/com/tangtang/motionwallpaper/SensorFeed.java'],cwd=ROOT,text=True)
        (pkg/(name+'.java')).write_text(data)
    shutil.copy(ROOT/'tests/SensorQueueRegression.java',pkg)
    shutil.copy(ROOT/'tests/SensorTrajectoryRegression.java',pkg)
    subprocess.run(([shutil.which('javac')] if shutil.which('javac') else ['java','-m','jdk.compiler/com.sun.tools.javac.Main'])+['-encoding','UTF-8','-d',tmp,*map(str,root.rglob('*.java'))],check=True)
    result=subprocess.check_output(['java','-ea','-cp',tmp,'com.tangtang.motionwallpaper.SensorQueueRegression'],text=True)
    if not args.baseline:
        (ROOT/'validation/sensor-queue-regression.json').write_text(result)
    print(result.strip())

    if not args.baseline:
        trajectory=subprocess.check_output(['java','-ea','-cp',tmp,'com.tangtang.motionwallpaper.SensorTrajectoryRegression'],text=True)
        (ROOT/'validation/sensor-trajectory-regression.json').write_text(trajectory)
        print(trajectory.strip())
