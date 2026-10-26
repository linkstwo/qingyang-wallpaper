// One landmark source generates the native shader/config; do not hand-edit generated GLSL.
import fs from 'node:fs';
import {subject as S} from '../../character-prototype/preview/subject.mjs';
import {sceneModel as M} from '../../character-prototype/preview/scene-model.mjs';
const out=new URL('../../character-prototype/preview/',import.meta.url),number=x=>Number.isInteger(x)?x.toFixed(1):String(x),v=a=>'vec2('+a.map(number).join(',')+')',a=S.arm,h=S.head,hair=S.hair;
const refWorldY=(M.paper.referenceY-M.pivot[1])*(M.cameraDistance-M.paper.depth)/M.cameraDistance,paperIntercept=M.paper.depth-M.paper.slopeY*refWorldY;
const shader=`precision highp float;
attribute vec2 a_source;
attribute float a_pin,a_depth;
uniform vec2 u_size,u_view,u_body,u_hair,u_ndcScale,u_ndcOffset;
uniform vec3 u_chest;
uniform float u_layer,u_motionGain,u_tipMode,u_structureMode;
varying vec3 v_sourceUv;
float bell(vec2 p,vec2 c,vec2 r){vec2 d=(p-c)/r;return exp(-2.0*dot(d,d));}
vec3 rotateScene(vec3 p){vec2 v=clamp(u_view,vec2(-1.0),vec2(1.0));float a=v.x*${number(M.yawRadians)},b=v.y*${number(M.pitchRadians)},c=cos(a),s=sin(a),cx=cos(b),sx=sin(b),x=c*p.x+s*p.z,z=-s*p.x+c*p.z;return vec3(x,cx*p.y-sx*z,sx*p.y+cx*z);}
vec3 sourceWorld(vec2 p,float z){return vec3((p-${v(M.pivot)})*((${number(M.cameraDistance)}-z)/${number(M.cameraDistance)}),z);}
vec3 cameraProjection(vec3 p){vec3 q=rotateScene(p);float w=(${number(M.cameraDistance)}-q.z)/${number(M.cameraDistance)};return vec3(q.xy/w+${v(M.pivot)},w);}
vec3 projectSource(vec2 p,float z,float dz){vec3 r=sourceWorld(p,z);r.z+=dz;return cameraProjection(r);}
float supportDepth(vec2 p){float y=p.y-${number(M.pivot[1])},paper=(${number(paperIntercept)}+${number(M.paper.slopeY)}*y)/(1.0+${number(M.paper.slopeY/M.cameraDistance)}*y);return mix(paper,${number(M.seat.depth)},smoothstep(${number(M.seat.transition[0])},${number(M.seat.transition[1])},p.y));}
float headWeight(vec2 p){return 1.0-smoothstep(${number(h.rigidThroughY)},${number(h.neckEndsY)},p.y);}
vec2 rigidHeadCamera(vec2 p){vec2 anchor=${v(h.anchor)};vec3 r=sourceWorld(anchor,${number(h.depth)}),a=cameraProjection(r),b=cameraProjection(r+vec3(0.0,100.0,0.0));float angle=atan(-(b.x-a.x),b.y-a.y),c=cos(angle),s=sin(angle);vec2 d=p-anchor;return a.xy+vec2(c*d.x-s*d.y,s*d.x+c*d.y);}
float hairWeight(vec2 p){float t=clamp((p.y-${number(hair.rootY)})/${number(hair.tipY-hair.rootY)},0.0,1.0),d=(p.x-(${number(hair.rootX)}+${number(hair.tipX-hair.rootX)}*t))/${number(hair.width)};return exp(-2.0*d*d)*smoothstep(${number(hair.rootY)},${number(hair.tipY)},p.y)*(1.0-smoothstep(${number(hair.tipY)},${number(hair.releaseY)},p.y));}
float bodyWeight(vec2 p){return .32+.68*bell(p,${v(S.torso.center)},${v(S.torso.radius)})+.22*bell(p,${v(S.neck.center)},${v(S.neck.radius)});}
float chestWeight(vec2 p){float far=.82*bell(p,${v(S.chest.farCenter)},${v(S.chest.farRadius)}),near=bell(p,${v(S.chest.nearCenter)},${v(S.chest.nearRadius)});return (1.0-(1.0-far)*(1.0-near))*smoothstep(${number(S.chest.attachY[0])},${number(S.chest.attachY[1])},p.y)*(1.0-smoothstep(${number(S.chest.releaseY[0])},${number(S.chest.releaseY[1])},p.y));}
vec2 materialPoint(vec2 p,vec3 chest,vec2 hair){float h=headWeight(p),cw=chestWeight(p),hw=hairWeight(p),w=bodyWeight(p)+.3*(1.0-smoothstep(360.0,520.0,p.y));vec2 d=u_body*w+chest.xy*cw+hair*hw,head=u_body*(bodyWeight(${v(h.anchor)})+.3)+hair*hw;return p+mix(d,head,h)*u_motionGain;}
float segmentWeight(vec2 p,vec2 a,vec2 b,float radius){vec2 v=b-a,d=p-a;float t=clamp(dot(v,d)/dot(v,v),0.0,1.0);return 1.0-smoothstep(radius,radius+${number(a.feather)},length(d-t*v));}
vec2 supportElbow(vec2 s){vec2 a=${v(a.shoulder)},b=${v(a.elbow)},c=${v(a.wrist)};if(all(equal(a,s)))return b;float upper=length(b-a),fore=length(c-b);vec2 d=c-s;float len=length(d),reach=clamp(len,abs(upper-fore)+.0001,upper+fore-.0001),along=(upper*upper-fore*fore+reach*reach)/(2.0*reach),height=sqrt(max(0.0,upper*upper-along*along));vec2 axis=d/len;return s+axis*along+vec2(axis.y,-axis.x)*height;}
vec2 segmentTransform(vec2 p,vec2 a,vec2 b,vec2 qa,vec2 qb){vec2 v=b-a,q=qb-qa,d=p-a;float den=length(v)*length(q),c=dot(v,q)/den,s=(v.x*q.y-v.y*q.x)/den;return qa+vec2(c*d.x-s*d.y,s*d.x+c*d.y);}
vec2 supportedArm(vec2 p,vec2 raw){vec2 a=${v(a.shoulder)},b=${v(a.elbow)},c=${v(a.wrist)};float upper=segmentWeight(p,a,b,${number(a.upperRadius)}),fore=segmentWeight(p,b,c,${number(a.foreRadius)}),w=max(upper,fore)*smoothstep(${number(a.visibleY[0])},${number(a.visibleY[1])},p.y);if(w<=0.0)return raw;vec2 shoulder=materialPoint(a,vec3(0.0),vec2(0.0)),elbow=supportElbow(shoulder),qa=segmentTransform(p,a,b,shoulder,elbow),qb=segmentTransform(p,b,c,elbow,c);return mix(raw,qa+(qb-qa)*fore/(upper+fore),w);}
void main(){vec2 p=a_source,q=p;float clipW=1.0,sourceW=1.0,sceneDepth=0.0;
 if(u_layer<-.5){}
 else if(u_layer<.5){vec3 projected=projectSource(p,0.0,0.0);q=mix(p,projected.xy,u_structureMode);clipW=mix(1.0,projected.z,u_structureMode);sceneDepth=(1.0-projected.z)*${number(M.cameraDistance)}*u_structureMode;}
 else if(u_layer<1.5){vec2 material=mix(p,supportedArm(p,materialPoint(p,u_chest,u_hair)),1.0-a_pin);sourceW=mix(1.0,(${number(M.cameraDistance)}-a_depth)/${number(M.cameraDistance)},u_structureMode);float h=headWeight(p),dz=u_chest.z*chestWeight(p)*u_motionGain*(1.0-a_pin)*(1.0-h);vec3 projected=projectSource(material,a_depth,dz);vec2 target=mix(projected.xy,rigidHeadCamera(material),h);q=mix(material,target,u_structureMode);clipW=mix(1.0,projected.z,u_structureMode);sceneDepth=(1.0-projected.z)*${number(M.cameraDistance)}*u_structureMode;}
 else if(u_layer>2.5){sourceW=mix(1.0,(${number(M.cameraDistance)}-supportDepth(p))/${number(M.cameraDistance)},u_structureMode);vec3 projected=projectSource(p,supportDepth(p),0.0);q=mix(p,projected.xy,u_structureMode);clipW=mix(1.0,projected.z,u_structureMode);sceneDepth=(1.0-projected.z)*${number(M.cameraDistance)}*u_structureMode;}
 v_sourceUv=vec3((p/u_size)*sourceW,sourceW);
 gl_Position=vec4((q*u_ndcScale+u_ndcOffset)*clipW,-sceneDepth/1000.0*clipW,clipW);
}
`;
fs.writeFileSync(new URL('scene.vert',out),shader);
const config=JSON.parse(fs.readFileSync(new URL('mesh.json',out)));Object.assign(config,{canvas:S.canvas,characterOutline:S.outline,holes:[],foregroundOutline:S.paper,pins:S.contacts,subjectId:S.id,sceneVersion:M.version});fs.writeFileSync(new URL('mesh.json',out),JSON.stringify(config,null,2)+'\n');
const points=S.outline.map(p=>p.join(',')).join(' ');fs.writeFileSync(new URL('subject-mask.svg',out),`<svg xmlns="http://www.w3.org/2000/svg" width="1152" height="1536" viewBox="0 0 1152 1536"><rect width="1152" height="1536" fill="black"/><polygon points="${points}" fill="white"/></svg>\n`);
console.log('S2 calibrated scene shader and geometry generated.');
