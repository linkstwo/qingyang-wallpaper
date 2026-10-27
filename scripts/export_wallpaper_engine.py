"""Build a native Scene wallpaper from the exact current reading-v2 assets.

No browser wallpaper, video conversion, original edits, or Steam upload.
"""
from pathlib import Path
import argparse, hashlib, json, shutil, struct
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'wallpaper-engine'
def dump(path, obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding='utf-8')
def tex(image,path):
    """Uncompressed native RGBA8888 TEXB0002, one image and one mip."""
    image=image.convert('RGBA'); w,h=image.size; raw=image.tobytes()
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_bytes(b'TEXV0005\0TEXI0001\0'+struct.pack('<7I',0,2,w,h,w,h,0)+b'TEXB0002\0'+struct.pack('<7I',1,1,w,h,0,len(raw),len(raw))+raw)
    b=path.read_bytes()
    assert b[-len(raw):]==raw and len(b)==len(raw)+83
    return {'width':w,'height':h,'pixelSha256':hashlib.sha256(raw).hexdigest(),'sha256':hashlib.sha256(b).hexdigest()}
def build(dest):
    dest.mkdir(parents=True,exist_ok=True)
    for directory in ['effects','shaders','materials','models']:
        shutil.copytree(SRC/directory,dest/directory,dirs_exist_ok=True)
    original=ROOT/'character-prototype/preview/original.png'
    image=Image.open(original);w,h=image.size
    assert (w,h)==(1152,1536)
    textures={}
    for name in ['original','mask','background']:
        p=ROOT/f'character-prototype/preview/{name}.png'
        textures[name]={'source':str(p.relative_to(ROOT)),'sourceSha256':hashlib.sha256(p.read_bytes()).hexdigest(),**tex(Image.open(p),dest/f'materials/qy-{name}.tex')}
    preview=Image.open(original);preview.thumbnail((320,427));preview.save(dest/'preview.jpg',quality=92)
    # Include the exact existing Spring/Response implementation, avoiding browser imports.
    rig=(ROOT/'character-prototype/preview/rig.mjs').read_text(encoding='utf-8')
    spring=rig[rig.index('export const clamp='):rig.index('export function makeMesh')].replace('export ','')
    response=(ROOT/'character-prototype/preview/response.mjs').read_text(encoding='utf-8')
    response=response[response.index('const spring='):response.index('export function legacyFraming')].replace('export class','class')
    script=spring+'\n'+response+'\n'+(SRC/'motion.js').read_text(encoding='utf-8')
    obj={'id':1,'name':'轻漾 · 阅读图原生场景','image':'models/qingyang.json','origin':'576 768 0','scale':'1 1 1','angles':'0 0 0','size':'1152 1536','alignment':'center','solid':True,'visible':{'value':True,'script':script},'parallaxDepth':'0.012 0.012','effects':[{'id':2,'name':'轻漾 · 局部变形与Q弹','file':'effects/qingyang/effect.json','visible':True,'passes':[{'id':3,'constantshadervalues':{'pose':'0 0','demo':0}},{'id':4},{'id':5,'textures':[None,'qy-background','qy-mask',None],'constantshadervalues':{'body':'0 0','chest':'0 0','hair':'0 0','pose':'0 0','gain':1}}]}]}
    scene={'version':0,'camera':{'center':'0 0 -1','eye':'0 0 0','up':'0 1 0'},'general':{'orthogonalprojection':{'width':1152,'height':1536},'clearcolor':'0.05 0.04 0.035','clearenabled':True,'bloom':False,'cameraparallax':True,'cameraparallaxamount':.08,'cameraparallaxdelay':.12,'cameraparallaxmouseinfluence':1,'zoom':1},'objects':[obj]}
    props={'motion':{'type':'slider','text':'局部回弹强度','value':1,'min':0,'max':1.5,'step':.05,'precision':2,'fraction':True,'index':0},'demo':{'type':'bool','text':'慢倾斜 / 快晃 / 停止演示','value':False,'index':1},'breathing':{'type':'bool','text':'轻微呼吸','value':True,'index':2}}
    dump(dest/'scene.json',scene)
    dump(dest/'project.json',{'title':'轻漾 · 阅读与微风','description':'用户阅读图原生Scene首版；局部Q弹、独立发梢及设备视差。手机回弹输入和侧背连续转向尚待验收。','type':'scene','file':'scene.json','preview':'preview.jpg','tags':['Relaxing'],'general':{'properties':props}})
    report={'baseApplicationCommit':'ea79388acf8789fc83e8cc113724d0fbf213511c','type':'scene','entry':'scene.json','textures':textures,'responseCopiedVerbatim':True,'nativeRendered':False,'mobileExported':False,'phoneTested':False,'limitations':['Inverse material warp is a bounded native first pass; it does not include the existing multi-surface side/back strip.','Device parallax drives GPU pose-rate springs. Android motion-to-Q and half-float feedback require actual mobile verification.']}
    dump(dest/'provenance.json',report)
    print(json.dumps({'output':str(dest),'textures':len(textures),'entry':'scene.json'},ensure_ascii=False))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);a=p.parse_args();build(a.output)
