precision highp float;
attribute vec2 a_source,a_uv;
attribute float a_pin,a_depth;
uniform vec2 u_size,u_view,u_body,u_hair,u_ndcScale,u_ndcOffset;
uniform vec3 u_chest;
uniform float u_layer,u_motionGain,u_tipMode,u_structureMode,u_roundMode;
varying vec3 v_sourceUv;
float bell(vec2 p,vec2 c,vec2 r){vec2 d=(p-c)/r;return exp(-2.0*dot(d,d));}
vec3 rotateScene(vec3 p){vec2 v=clamp(u_view,vec2(-1.0),vec2(1.0));float a=v.x*mix(0.04,0.30,u_roundMode),b=v.y*0.02,c=cos(a),s=sin(a),cx=cos(b),sx=sin(b),x=c*p.x+s*p.z,z=-s*p.x+c*p.z;return vec3(x,cx*p.y-sx*z,sx*p.y+cx*z);}
vec3 sourceWorld(vec2 p,float z){return vec3((p-vec2(790.0,1110.0))*((2300.0-z)/2300.0),z);}
vec3 cameraProjection(vec3 p){vec3 q=rotateScene(p);float w=(2300.0-q.z)/2300.0;return vec3(q.xy/w+vec2(790.0,1110.0),w);}
vec3 projectSource(vec2 p,float z,float dz){vec3 r=sourceWorld(p,z);r.z+=dz;return cameraProjection(r);}
float supportDepth(vec2 p){float y=p.y-1110.0,paper=(192.16695652173914+0.12*y)/(1.0+0.000052173913043478256*y);return mix(paper,40.0,smoothstep(1270.0,1410.0,p.y));}
float headWeight(vec2 p){return 1.0-smoothstep(420.0,590.0,p.y);}
vec2 rigidHeadCamera(vec2 p){vec2 anchor=vec2(550.0,305.0);vec3 r=sourceWorld(anchor,116.0),a=cameraProjection(r),b=cameraProjection(r+vec3(0.0,100.0,0.0));float angle=atan(-(b.x-a.x),b.y-a.y),c=cos(angle),s=sin(angle);vec2 d=p-anchor;return a.xy+vec2(c*d.x-s*d.y,s*d.x+c*d.y);}
float hairWeight(vec2 p){float t=clamp((p.y-330.0)/260.0,0.0,1.0),d=(p.x-(350.0+130.0*t))/50.0;return exp(-2.0*d*d)*smoothstep(330.0,590.0,p.y)*(1.0-smoothstep(590.0,730.0,p.y));}
float bodyWeight(vec2 p){return .32+.68*bell(p,vec2(795.0,800.0),vec2(320.0,430.0))+.22*bell(p,vec2(731.0,416.0),vec2(220.0,180.0));}
float chestWeight(vec2 p){float far=.82*bell(p,vec2(602.0,729.0),vec2(120.0,165.0)),near=bell(p,vec2(766.0,772.0),vec2(165.0,190.0));return (1.0-(1.0-far)*(1.0-near))*smoothstep(490.0,635.0,p.y)*(1.0-smoothstep(965.0,1125.0,p.y));}
vec2 materialPoint(vec2 p,vec3 chest,vec2 hair){float h=headWeight(p),cw=chestWeight(p),hw=hairWeight(p),w=bodyWeight(p)+.3*(1.0-smoothstep(360.0,520.0,p.y));vec2 d=u_body*w+chest.xy*cw+hair*hw,head=u_body*(bodyWeight(vec2(550.0,305.0))+.3)+hair*hw;return p+mix(d,head,h)*u_motionGain;}
float segmentWeight(vec2 p,vec2 a,vec2 b,float radius){vec2 v=b-a,d=p-a;float t=clamp(dot(v,d)/dot(v,v),0.0,1.0);return 1.0-smoothstep(radius,radius+100.0,length(d-t*v));}
vec2 supportElbow(vec2 s){vec2 a=vec2(590.0,535.0),b=vec2(635.0,920.0),c=vec2(350.0,1005.0);if(all(equal(a,s)))return b;float upper=length(b-a),fore=length(c-b);vec2 d=c-s;float len=length(d),reach=clamp(len,abs(upper-fore)+.0001,upper+fore-.0001),along=(upper*upper-fore*fore+reach*reach)/(2.0*reach),height=sqrt(max(0.0,upper*upper-along*along));vec2 axis=d/len;return s+axis*along+vec2(axis.y,-axis.x)*height;}
vec2 segmentTransform(vec2 p,vec2 a,vec2 b,vec2 qa,vec2 qb){vec2 v=b-a,q=qb-qa,d=p-a;float den=length(v)*length(q),c=dot(v,q)/den,s=(v.x*q.y-v.y*q.x)/den;return qa+vec2(c*d.x-s*d.y,s*d.x+c*d.y);}
vec2 supportedArm(vec2 p,vec2 raw){vec2 a=vec2(590.0,535.0),b=vec2(635.0,920.0),c=vec2(350.0,1005.0);float upper=segmentWeight(p,a,b,36.0),fore=segmentWeight(p,b,c,33.0),w=max(upper,fore)*smoothstep(820.0,910.0,p.y);if(w<=0.0)return raw;vec2 shoulder=materialPoint(a,vec3(0.0),vec2(0.0)),elbow=supportElbow(shoulder),qa=segmentTransform(p,a,b,shoulder,elbow),qb=segmentTransform(p,b,c,elbow,c);return mix(raw,qa+(qb-qa)*fore/(upper+fore),w);}
void main(){vec2 p=a_source,q=p;float clipW=1.0,sourceW=1.0,sceneDepth=0.0;
 if(u_layer<-.5){}
 else if(u_layer<.5){vec3 projected=projectSource(p,0.0,0.0);q=mix(p,projected.xy,u_structureMode);clipW=mix(1.0,projected.z,u_structureMode);sceneDepth=(1.0-projected.z)*2300.0*u_structureMode;}
 else if(u_layer<1.5){vec2 material=mix(p,supportedArm(p,materialPoint(p,u_chest,u_hair)),1.0-a_pin);sourceW=mix(1.0,(2300.0-a_depth)/2300.0,u_structureMode);float h=headWeight(p),dz=u_chest.z*chestWeight(p)*u_motionGain*(1.0-a_pin)*(1.0-h);vec3 projected=projectSource(material,a_depth,dz);vec2 target=mix(projected.xy,rigidHeadCamera(material),h);q=mix(material,target,u_structureMode);clipW=mix(1.0,projected.z,u_structureMode);sceneDepth=(1.0-projected.z)*2300.0*u_structureMode;}
 else if(u_layer<2.5){vec2 material=materialPoint(p,vec3(0.0),vec2(0.0));sourceW=(2300.0-a_depth)/2300.0;vec3 projected=projectSource(material,a_depth,0.0);q=projected.xy;clipW=projected.z;sceneDepth=(1.0-projected.z)*2300.0;}
 else if(u_layer>2.5){sourceW=mix(1.0,(2300.0-supportDepth(p))/2300.0,u_structureMode);vec3 projected=projectSource(p,supportDepth(p),0.0);q=mix(p,projected.xy,u_structureMode);clipW=mix(1.0,projected.z,u_structureMode);sceneDepth=(1.0-projected.z)*2300.0*u_structureMode;}
 v_sourceUv=vec3((u_layer>1.5 && u_layer<2.5?a_uv:p/u_size)*sourceW,sourceW);
 gl_Position=vec4((q*u_ndcScale+u_ndcOffset)*clipW,(4250.0-14.0*sceneDepth)/17250.0,clipW);
}
