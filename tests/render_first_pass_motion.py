"""Whole production scene driven by the existing JS response trace."""
import json,subprocess,sys,hashlib
from pathlib import Path
from PIL import ImageDraw
import render_first_pass_gles as scene
root=scene.g.ROOT;out=Path('/workspace/scratch/2ea7e7be90fa/deliveries-first-pass/qingyang-0.6.0-motion.mp4')
script="""import {Response} from './character-prototype/preview/response.mjs';const r=new Response(true,true),frames=[];for(let i=0;i<2160;i++){const t=i/120;let x=0,y=0,alphaY=0;if(t<3)x=-Math.sin(t/3*Math.PI/2);else if(t<5)x=-1;else if(t<8){const u=(t-5)/3;x=-1+2*u*u*(3-2*u);}else if(t<10)x=1;else if(t<13){const u=t-10,e=Math.min(1,u*4)*Math.min(1,(3-u)*4);x=e*.65*Math.sin(u*Math.PI*2*2.3);alphaY=e*12*Math.cos(u*Math.PI*2*2.3);}r.step(1/120,{x,y,alphaY});if(i%10===0)frames.push({t,view:r.view.x,values:r.values});}console.log(JSON.stringify(frames));"""
frames=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=root,text=True))
p=subprocess.Popen(['ffmpeg','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgb24','-video_size','540x1176','-framerate','12','-i','-','-c:v','libx264','-preset','fast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',str(out)],stdin=subprocess.PIPE)
for f in frames:
 im=scene.render(f['view'],values=f['values']);d=ImageDraw.Draw(im);phase='slow turn' if f['t']<3 else 'hold' if f['t']<5 else 'reverse' if f['t']<8 else 'hold' if f['t']<10 else 'quick motion' if f['t']<13 else 'settle';d.rectangle((0,0,540,23),fill=(18,24,32));d.text((8,6),f"0.6.0 first-pass / {phase} / {f['t']:.1f}s",fill='white');p.stdin.write(im.tobytes())
p.stdin.close();assert p.wait()==0
r={'file':out.name,'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'frames':len(frames),'fps':12,'durationSeconds':18,'realProductionShaders':True,'existingJsResponseTrace':True,'syntheticInput':True,'phoneTested':False,'approximateSideBackRegistration':True}
(root/'validation/first-pass-motion.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))
