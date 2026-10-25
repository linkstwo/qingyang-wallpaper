precision highp float;
attribute vec2 a_source;
attribute float a_pin,a_depth;
uniform vec2 u_size,u_view,u_body,u_hair,u_ndcScale,u_ndcOffset;
uniform vec3 u_chest;
uniform float u_layer,u_motionGain,u_tipMode,u_structureMode;
varying vec2 v_uv;
float bell(vec2 p,vec2 c,vec2 r){vec2 d=(p-c)/r;return exp(-2.0*dot(d,d));}
vec3 rotateSurface(vec3 r){vec2 v=clamp(u_view,vec2(-1.0),vec2(1.0));float yaw=v.x*.14,pitch=v.y*.07,cy=cos(yaw),sy=sin(yaw),cx=cos(pitch),sx=sin(pitch);vec3 t=vec3(cy*r.x+sy*r.z,r.y,-sy*r.x+cy*r.z);return vec3(t.x,cx*t.y-sx*t.z,sx*t.y+cx*t.z);}
vec2 perspective(vec3 p){return p.xy*(2300.0/(2300.0-p.z));}
vec3 base(vec2 p,float z){return vec3(p-vec2(790.0,1110.0),z);}
vec2 projectInertia(vec2 p,float z,vec3 d){vec3 r=base(p,z);return perspective(rotateSurface(r+d))-perspective(rotateSurface(r));}
vec2 boundedTurn(vec2 p,float z){vec3 r=base(p,z);vec2 t=perspective(rotateSurface(r))-perspective(r);return t/sqrt(vec2(1.0)+t*t/vec2(576.0,400.0))*smoothstep(0.0,45.0,z);}
float headWeight(vec2 p){return 1.0-smoothstep(420.0,590.0,p.y);}
vec2 rigidHeadTurn(vec2 p){vec2 anchor=vec2(550.0,305.0);vec3 r=base(anchor,116.0);vec2 axis=perspective(rotateSurface(r+vec3(0.0,100.0,0.0)))-perspective(rotateSurface(r));float angle=atan(-axis.x,axis.y),c=cos(angle),s=sin(angle);vec2 d=p-anchor;return boundedTurn(anchor,116.0)+vec2(c*d.x-s*d.y,s*d.x+c*d.y)-d;}
float hairWeight(vec2 p){float t=clamp((p.y-330.0)/260.0,0.0,1.0),d=(p.x-(350.0+130.0*t))/50.0;return exp(-2.0*d*d)*smoothstep(330.0,590.0,p.y)*(1.0-smoothstep(590.0,730.0,p.y));}
float bodyWeight(vec2 p){return .32+.68*bell(p,vec2(795.0,800.0),vec2(320.0,430.0))+.22*bell(p,vec2(731.0,416.0),vec2(220.0,180.0));}
float chestWeight(vec2 p){float far=.82*bell(p,vec2(602.0,729.0),vec2(120.0,165.0)),near=bell(p,vec2(766.0,772.0),vec2(165.0,190.0));return (1.0-(1.0-far)*(1.0-near))*smoothstep(490.0,635.0,p.y)*(1.0-smoothstep(965.0,1125.0,p.y));}
vec2 freePoint(vec2 p,float z,vec3 chest,vec2 hair){float hw=headWeight(p),cw=chestWeight(p),hairW=hairWeight(p),w=bodyWeight(p)+.3*(1.0-smoothstep(360.0,520.0,p.y));vec2 t=mix(boundedTurn(p,z),rigidHeadTurn(p),hw)*u_structureMode;vec2 d=(u_body*w+chest.xy*cw+hair*hairW)*u_motionGain;vec2 movement=mix(d,projectInertia(p,z,vec3(d,chest.z*cw*u_motionGain)),u_structureMode);vec2 anchor=vec2(550.0,305.0),hd=u_body*(bodyWeight(anchor)+.3)*u_motionGain;hd=mix(hd,projectInertia(anchor,116.0,vec3(hd,0.0)),u_structureMode);vec2 hairD=hair*hairW*u_motionGain;hairD=mix(hairD,projectInertia(p,z,vec3(hairD,0.0)),u_structureMode);return p+t+mix(movement,hd+hairD,hw);}
float segmentWeight(vec2 p,vec2 a,vec2 b,float radius){vec2 v=b-a,d=p-a;float t=clamp(dot(v,d)/dot(v,v),0.0,1.0);return 1.0-smoothstep(radius,radius+100.0,length(d-t*v));}
vec2 supportElbow(vec2 s){vec2 a=vec2(590.0,535.0),b=vec2(635.0,920.0),c=vec2(350.0,1005.0);if(all(equal(a,s)))return b;float upper=length(b-a),fore=length(c-b);vec2 d=c-s;float len=length(d),reach=clamp(len,abs(upper-fore)+.0001,upper+fore-.0001),along=(upper*upper-fore*fore+reach*reach)/(2.0*reach),height=sqrt(max(0.0,upper*upper-along*along));vec2 axis=d/len;return s+axis*along+vec2(axis.y,-axis.x)*height;}
vec2 segmentTransform(vec2 p,vec2 a,vec2 b,vec2 qa,vec2 qb){vec2 v=b-a,q=qb-qa,d=p-a;float den=length(v)*length(q),c=dot(v,q)/den,s=(v.x*q.y-v.y*q.x)/den;return qa+vec2(c*d.x-s*d.y,s*d.x+c*d.y);}
vec2 supportedArm(vec2 p,vec2 raw){vec2 a=vec2(590.0,535.0),b=vec2(635.0,920.0),c=vec2(350.0,1005.0);float upper=segmentWeight(p,a,b,36.0),fore=segmentWeight(p,b,c,33.0),w=max(upper,fore)*smoothstep(820.0,910.0,p.y);if(w<=0.0)return raw;vec2 shoulder=freePoint(a,19.113383765126226,vec3(0.0),vec2(0.0)),elbow=supportElbow(shoulder),qa=segmentTransform(p,a,b,shoulder,elbow),qb=segmentTransform(p,b,c,elbow,c);return mix(raw,qa+(qb-qa)*fore/(upper+fore),w);}
void main(){vec2 p=a_source,q=p;v_uv=p/u_size;if(u_layer<-.5){}else if(u_layer<.5){q-=u_view*vec2(5.0,3.0)*u_structureMode;}else if(u_layer<1.5){q=mix(p,supportedArm(p,freePoint(p,a_depth,u_chest,u_hair)),1.0-a_pin);}gl_Position=vec4(q.x*u_ndcScale.x+u_ndcOffset.x,q.y*u_ndcScale.y+u_ndcOffset.y,0.0,1.0);}
