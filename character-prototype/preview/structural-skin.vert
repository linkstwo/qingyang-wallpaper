// S2 structural diagnostic only. All positions use source-world units.
precision highp float;
attribute vec3 a_position,a_normal;
attribute vec4 a_weights0;
attribute vec2 a_weights1;
attribute float a_support,a_region;
uniform mat4 u_bones[6];
uniform vec2 u_camera;
uniform float u_mode;
varying vec3 v_color;
vec3 skinPoint(){
 vec4 p=vec4(a_position,1.0);
 vec3 q=(u_bones[0]*p).xyz*a_weights0.x+(u_bones[1]*p).xyz*a_weights0.y
       +(u_bones[2]*p).xyz*a_weights0.z+(u_bones[3]*p).xyz*a_weights0.w
       +(u_bones[4]*p).xyz*a_weights1.x+(u_bones[5]*p).xyz*a_weights1.y;
 return mix(q,a_position,a_support);
}
vec3 camera(vec3 p){float c=cos(u_camera.x),s=sin(u_camera.x),cx=cos(u_camera.y),sx=sin(u_camera.y);
 float x=c*p.x+s*p.z,z=-s*p.x+c*p.z;return vec3(x,cx*p.y-sx*z,sx*p.y+cx*z);}
void main(){
 vec3 world=skinPoint(),p=camera(world),n=normalize(camera(a_normal));
 float w=(2300.0-p.z)/2300.0;vec2 q=p.xy/w+vec2(790.0,1110.0);
 vec3 color=a_region<1.5?vec3(.24,.68,.9):(a_region<2.5?vec3(.95,.65,.2):vec3(.4,.85,.4));
 v_color=color*(.4+.6*max(0.0,dot(n,normalize(vec3(-.4,-.6,1.0)))));
 if(u_mode>.5)v_color=n*.5+.5;
 if(u_mode>1.5)v_color=mix(vec3(.15,.3,.7),vec3(1.0,.85,.2),clamp((p.z+500.0)/1000.0,0.0,1.0));
 if(u_mode>2.5)v_color=mix(vec3(.7,.14,.5),vec3(.1,1.0,.8),a_support);
 gl_Position=vec4((q*vec2(2.0/1600.0,-2.0/1740.0)+vec2(-.72,.92))*w,(4250.0-14.0*p.z)/17250.0,w);
}
