"""Reproducible synthetic production-input/physics + GLES video and crop comparison."""
from pathlib import Path
import json, subprocess, tempfile, shutil, math
from PIL import Image, ImageDraw, ImageFont
import render_gles as g
ROOT=g.ROOT
java=shutil.which('java') or '/usr/lib/jvm/java-17-openjdk-amd64/bin/java'
javac=shutil.which('javac');compiler=[javac] if javac else [java,'-m','jdk.compiler/com.sun.tools.javac.Main']
with tempfile.TemporaryDirectory(prefix='qingyang-trace-') as temp:
 source=ROOT/'android-app/app/src/main/java/com/tangtang/motionwallpaper'
 subprocess.run(compiler+['-d',temp,*map(str,[source/(n+'.java') for n in ['MathX','Attitude','MotionInput','Physics','Spring']]),str(ROOT/'tests/ReplayTrace.java')],check=True)
 trace=json.loads(subprocess.check_output([java,'-cp',temp,'com.tangtang.motionwallpaper.ReplayTrace'],text=True))
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',15)
output=ROOT/'validation';output.mkdir(exist_ok=True)
def zoom(im,factor=1.25):
 w,h=im.size;dw,dh=w/factor,h/factor
 return im.crop(((w-dw)/2,(h-dh)/2,(w+dw)/2,(h+dh)/2)).resize((w,h),Image.Resampling.LANCZOS)
new=g.render()
frame=g.frame
def old_frame(wider,size_percent=90):
 if not wider:return frame(False)
 cover=max(g.W/1086,g.H/1448);scale=min(cover,g.W/850);x=max(g.W-1086*scale,min(0,g.W*.5-610*scale))
 return scale,x,min(0,(g.H-1448*scale)*.5),min(1.6,cover/scale)
g.frame=old_frame
old=g.render(structure=False)
g.frame=frame
board=Image.new('RGB',(g.W*2,660),(12,17,20));draw=ImageDraw.Draw(board)
for i,(im,label) in enumerate([(old,'0.5.2 composition'),(new,'0.5.4 / size 90%')]):
 crop=zoom(im).crop((0,0,g.W,600))
 board.paste(crop,(i*g.W,60));draw.text((i*g.W+14,10),label,font=font,fill='white')
 draw.text((i*g.W+14,32),'Simulated 25% system crop / not a phone',font=font,fill='#b5c8c5')
board.save(output/'lock-crop-comparison.png')
video=output/'qingyang-0.5.4-preview.mp4';width,height=720,888
encoder=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{width}x{height}','-r','20','-i','-','-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',str(video)],stdin=subprocess.PIPE)
# Two-second framing comparison under the same simulated compositor crop.
intro=Image.new('RGB',(width,height),(11,16,20));d=ImageDraw.Draw(intro)
d.text((12,8),'Composition / simulated 25% system crop',font=font,fill='white')
d.text((12,30),'Desktop rendering / not a phone test',font=font,fill='#aabeb9')
for col,(im,label) in enumerate([(old,'0.5.2 composition'),(new,'0.5.4 / size 90%')]):
 intro.paste(zoom(im).resize((360,800),Image.Resampling.LANCZOS),(col*360,88))
 d.text((col*360+12,62),label,font=font,fill='white')
for _ in range(40):encoder.stdin.write(intro.tobytes())
for item in trace:
 canvas=Image.new('RGB',(width,height),(11,16,20));d=ImageDraw.Draw(canvas)
 phase='Slow change of view' if item['t']<6 else 'Quick turns / separate inertia' if item['t']<10 else 'Hold view / settle / return'
 d.text((12,8),'Synthetic sensor input / desktop GLES / not a phone recording',font=font,fill='#aabeb9')
 d.text((12,30),phase,font=font,fill='white')
 for col,structure in enumerate([False,True]):
  im=g.render(view=item['view'],body=item['body'],chest=item['chest'],hair=item['hair'],structure=structure)
  canvas.paste(im.resize((360,800),Image.Resampling.LANCZOS),(col*360,88))
  d.text((col*360+12,62),'Inertia only' if not structure else 'Depth + viewing angle + inertia',font=font,fill='white')
 encoder.stdin.write(canvas.tobytes())
 if item['t'] in [2.5,7.5,11.5]:canvas.save(output/('preview-'+str(item['t'])+'.png'))
encoder.stdin.close();assert encoder.wait()==0
metrics={'frames':len(trace)+40,'fps':20,'seconds':(len(trace)+40)/20,'motionSeconds':len(trace)/20,'sensorHz':50,'physicsHz':120,'phoneTested':False,'renderedWithProductionShaders':True,'physics':'production Java MotionInput + Attitude + Physics'}
(output/'preview-trace.json').write_text(json.dumps(metrics,indent=2)+'\n');print(json.dumps(metrics))
