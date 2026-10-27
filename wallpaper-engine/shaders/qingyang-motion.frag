#include "common.h"
uniform sampler2D g_Texture0; // {"hidden":true}
uniform sampler2D g_Texture1; // {"hidden":true}
uniform sampler2D g_Texture2; // {"hidden":true}
uniform sampler2D g_Texture3; // {"hidden":true}
uniform vec2 g_Body; // {"material":"body","default":"0 0","range":[-12,12]}
uniform vec2 g_Chest; // {"material":"chest","default":"0 0","range":[-15,15]}
uniform vec2 g_Hair; // {"material":"hair","default":"0 0","range":[-21,21]}
uniform vec2 g_Pose; // {"material":"pose","default":"0 0","range":[-1,1]}
uniform float g_Gain; // {"material":"gain","default":1,"range":[0,1.5]}
varying vec2 v_TexCoord;
varying vec2 v_Device;
float bell(vec2 p,vec2 c,vec2 r){vec2 d=(p-c)/r;return exp(-2.0*dot(d,d));}
float chest(vec2 p){float f=.82*bell(p,vec2(602,729),vec2(120,165)),n=bell(p,vec2(766,772),vec2(165,190));return (1.0-(1.0-f)*(1.0-n))*smoothstep(490.0,635.0,p.y)*(1.0-smoothstep(965.0,1125.0,p.y));}
vec2 displacement(vec2 p,vec2 view,vec2 body,vec2 chestMotion,vec2 hair){
 float hw=smoothstep(330.0,590.0,p.y)*(1.0-smoothstep(590.0,730.0,p.y));
 float t=clamp((p.y-330.0)/260.0,0.0,1.0),d=(p.x-(350.0+130.0*t))/50.0;hw*=exp(-2.0*d*d);
 float bw=.32+.68*bell(p,vec2(795,800),vec2(320,430))+.22*bell(p,vec2(731,416),vec2(220,180));
 float head=1.0-smoothstep(420.0,590.0,p.y);
 // Pin hand/paper and seat. This is the native first-pass envelope, not full IK.
 float pin=max(bell(p,vec2(350,1005),vec2(125,110)),1.0-smoothstep(450.0,600.0,p.x));
 pin=max(pin,smoothstep(1270.0,1410.0,p.y));
 vec2 move=(body*bw+chestMotion*chest(p)*(1.0-head)+hair*hw)*(1.0-pin);
 move+=view*vec2(4.0,2.0)*bell(p,vec2(780,720),vec2(400,650))*(1.0-pin);
 return move*g_Gain;
}
void main(){
 vec2 size=vec2(1152,1536),p=v_TexCoord*size,q=p;
 vec2 view=texSample2D(g_Texture3,vec2(.5/9.0,.5)).rg;
 vec2 body=texSample2D(g_Texture3,vec2(3.5/9.0,.5)).rg*5.0;
 vec2 cm=texSample2D(g_Texture3,vec2(5.5/9.0,.5)).rg*8.5+g_Chest;
 vec2 hair=texSample2D(g_Texture3,vec2(7.5/9.0,.5)).rg*vec2(14.0,7.0);
 for(int i=0;i<3;i++){q=p-displacement(q,view,body,cm,hair);}
 vec2 uv=clamp(q/size,vec2(.00001,.00001),vec2(.99999,.99999));
 vec4 src=texSample2D(g_Texture0,uv);
 float a=texSample2D(g_Texture2,uv).r;
 vec4 bg=texSample2D(g_Texture1,v_TexCoord);
 gl_FragColor=vec4(mix(bg.rgb,src.rgb,a),1.0);
}
