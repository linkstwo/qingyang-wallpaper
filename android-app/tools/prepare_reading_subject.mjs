// One landmark source generates the native shader/config; do not hand-edit generated GLSL.
import fs from 'node:fs';
import {subject as S} from '../../character-prototype/preview/subject.mjs';
import {structure,depthAt} from '../../character-prototype/preview/structure.mjs';
const out=new URL('../../character-prototype/preview/',import.meta.url),number=x=>Number.isInteger(x)?x.toFixed(1):String(x),v=a=>'vec2('+a.map(number).join(',')+')',a=S.arm,h=S.head,hair=S.hair;
const shader=`precision highp float;
attribute vec2 a_source;
attribute float a_pin,a_depth;
uniform vec2 u_size,u_view,u_body,u_hair,u_ndcScale,u_ndcOffset;
uniform vec3 u_chest;
uniform float u_layer,u_motionGain,u_tipMode,u_structureMode;
varying vec2 v_uv;
float bell(vec2 p,vec2 c,vec2 r){vec2 d=(p-c)/r;return exp(-2.0*dot(d,d));}
vec3 rotateSurface(vec3 r){vec2 v=clamp(u_view,vec2(-1.0),vec2(1.0));float yaw=v.x*.14,pitch=v.y*.07,cy=cos(yaw),sy=sin(yaw),cx=cos(pitch),sx=sin(pitch);vec3 t=vec3(cy*r.x+sy*r.z,r.y,-sy*r.x+cy*r.z);return vec3(t.x,cx*t.y-sx*t.z,sx*t.y+cx*t.z);}
vec2 perspective(vec3 p){return p.xy*(${number(structure.cameraDistance)}/(${number(structure.cameraDistance)}-p.z));}
vec3 base(vec2 p,float z){return vec3(p-${v(structure.pivot)},z);}
vec2 projectInertia(vec2 p,float z,vec3 d){vec3 r=base(p,z);return perspective(rotateSurface(r+d))-perspective(rotateSurface(r));}
vec2 boundedTurn(vec2 p,float z){vec3 r=base(p,z);vec2 t=perspective(rotateSurface(r))-perspective(r);return t/sqrt(vec2(1.0)+t*t/vec2(576.0,400.0))*smoothstep(0.0,45.0,z);}
float headWeight(vec2 p){return 1.0-smoothstep(${number(h.rigidThroughY)},${number(h.neckEndsY)},p.y);}
vec2 rigidHeadTurn(vec2 p){vec2 anchor=${v(h.anchor)};vec3 r=base(anchor,${number(h.depth)});vec2 axis=perspective(rotateSurface(r+vec3(0.0,100.0,0.0)))-perspective(rotateSurface(r));float angle=atan(-axis.x,axis.y),c=cos(angle),s=sin(angle);vec2 d=p-anchor;return boundedTurn(anchor,${number(h.depth)})+vec2(c*d.x-s*d.y,s*d.x+c*d.y)-d;}
float hairWeight(vec2 p){float t=clamp((p.y-${number(hair.rootY)})/${number(hair.tipY-hair.rootY)},0.0,1.0),d=(p.x-(${number(hair.rootX)}+${number(hair.tipX-hair.rootX)}*t))/${number(hair.width)};return exp(-2.0*d*d)*smoothstep(${number(hair.rootY)},${number(hair.tipY)},p.y)*(1.0-smoothstep(${number(hair.tipY)},${number(hair.releaseY)},p.y));}
float bodyWeight(vec2 p){return .32+.68*bell(p,${v(S.torso.center)},${v(S.torso.radius)})+.22*bell(p,${v(S.neck.center)},${v(S.neck.radius)});}
vec2 freePoint(vec2 p,float z,vec3 chest,vec2 hair){float hw=headWeight(p),cw=bell(p,${v(S.chest.center)},${v(S.chest.radius)}),hairW=hairWeight(p),w=bodyWeight(p)+.3*(1.0-smoothstep(360.0,520.0,p.y));vec2 t=mix(boundedTurn(p,z),rigidHeadTurn(p),hw)*u_structureMode;vec2 d=(u_body*w+chest.xy*cw+hair*hairW)*u_motionGain;vec2 movement=mix(d,projectInertia(p,z,vec3(d,chest.z*cw*u_motionGain)),u_structureMode);vec2 anchor=${v(h.anchor)},hd=u_body*(bodyWeight(anchor)+.3)*u_motionGain;hd=mix(hd,projectInertia(anchor,${number(h.depth)},vec3(hd,0.0)),u_structureMode);vec2 hairD=hair*hairW*u_motionGain;hairD=mix(hairD,projectInertia(p,z,vec3(hairD,0.0)),u_structureMode);return p+t+mix(movement,hd+hairD,hw);}
float segmentWeight(vec2 p,vec2 a,vec2 b,float radius){vec2 v=b-a,d=p-a;float t=clamp(dot(v,d)/dot(v,v),0.0,1.0);return 1.0-smoothstep(radius,radius+${number(a.feather)},length(d-t*v));}
vec2 supportElbow(vec2 s){vec2 a=${v(a.shoulder)},b=${v(a.elbow)},c=${v(a.wrist)};if(all(equal(a,s)))return b;float upper=length(b-a),fore=length(c-b);vec2 d=c-s;float len=length(d),reach=clamp(len,abs(upper-fore)+.0001,upper+fore-.0001),along=(upper*upper-fore*fore+reach*reach)/(2.0*reach),height=sqrt(max(0.0,upper*upper-along*along));vec2 axis=d/len;return s+axis*along+vec2(axis.y,-axis.x)*height;}
vec2 segmentTransform(vec2 p,vec2 a,vec2 b,vec2 qa,vec2 qb){vec2 v=b-a,q=qb-qa,d=p-a;float den=length(v)*length(q),c=dot(v,q)/den,s=(v.x*q.y-v.y*q.x)/den;return qa+vec2(c*d.x-s*d.y,s*d.x+c*d.y);}
vec2 supportedArm(vec2 p,vec2 raw){vec2 a=${v(a.shoulder)},b=${v(a.elbow)},c=${v(a.wrist)};float upper=segmentWeight(p,a,b,${number(a.upperRadius)}),fore=segmentWeight(p,b,c,${number(a.foreRadius)}),w=max(upper,fore)*smoothstep(${number(a.visibleY[0])},${number(a.visibleY[1])},p.y);if(w<=0.0)return raw;vec2 shoulder=freePoint(a,${number(depthAt(...a.shoulder))},vec3(0.0),vec2(0.0)),elbow=supportElbow(shoulder),qa=segmentTransform(p,a,b,shoulder,elbow),qb=segmentTransform(p,b,c,elbow,c);return mix(raw,qa+(qb-qa)*fore/(upper+fore),w);}
void main(){vec2 p=a_source,q=p;v_uv=p/u_size;if(u_layer<-.5){}else if(u_layer<.5){q-=u_view*vec2(5.0,3.0)*u_structureMode;}else if(u_layer<1.5){q=mix(p,supportedArm(p,freePoint(p,a_depth,u_chest,u_hair)),1.0-a_pin);}gl_Position=vec4(q.x*u_ndcScale.x+u_ndcOffset.x,q.y*u_ndcScale.y+u_ndcOffset.y,0.0,1.0);}
`;
fs.writeFileSync(new URL('scene.vert',out),shader);
const config=JSON.parse(fs.readFileSync(new URL('mesh.json',out)));Object.assign(config,{canvas:S.canvas,characterOutline:S.outline,holes:[],foregroundOutline:S.paper,pins:S.contacts,subjectId:S.id});fs.writeFileSync(new URL('mesh.json',out),JSON.stringify(config,null,2)+'\n');
const points=S.outline.map(p=>p.join(',')).join(' ');fs.writeFileSync(new URL('subject-mask.svg',out),`<svg xmlns="http://www.w3.org/2000/svg" width="1152" height="1536" viewBox="0 0 1152 1536"><rect width="1152" height="1536" fill="black"/><polygon points="${points}" fill="white"/></svg>\n`);
console.log('Reading-v2 shader and geometry generated from observed landmarks.');
