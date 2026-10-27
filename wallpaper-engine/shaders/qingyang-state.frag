#include "common.h"
uniform sampler2D g_Texture0; // {"hidden":true}
uniform float g_Frametime;
uniform vec2 g_Pose; // {"material":"pose","default":"0 0"}
uniform float g_Demo; // {"material":"demo","default":0}
varying vec2 v_TexCoord;
varying vec2 v_Device;
vec2 state(float i){return texSample2D(g_Texture0,vec2((i+.5)/9.0,.5)).rg;}
void main(){
 vec2 inputValue=clamp(mix(v_Device,g_Pose,g_Demo),vec2(-1.0,-1.0),vec2(1.0,1.0));
 float dt=g_Frametime;
 vec2 previous=state(0.0),oldVelocity=state(1.0),drive=state(2.0);
 vec2 bx=state(3.0),bv=state(4.0),cx=state(5.0),cv=state(6.0),hx=state(7.0),hv=state(8.0);
 vec2 velocity=vec2(0.0,0.0);
 if(dt>0.0&&dt<=.1){
  velocity=clamp((inputValue-previous)/dt,vec2(-25.0,-25.0),vec2(25.0,25.0));
  // Native device parallax supplies pose, without exposing raw Android gyroscope.
  // A bounded pose-rate drive excites the same parent/child spring frequencies.
  vec2 force=clamp(-velocity*.12,vec2(-6.0,-6.0),vec2(6.0,6.0));
  drive+=(force-drive)*(1.0-exp(-dt/.045));
  vec2 oldBv=bv;
  float steps=ceil(dt*240.0),h=dt/steps;
  for(int k=0;k<24;k++){
   if(float(k)<steps){bv+=(drive*30.0-227.3957*bx-26.5416*bv)*h;bx+=bv*h;bx=clamp(bx,vec2(-1.2,-1.2),vec2(1.2,1.2));}
  }
  vec2 parentAcceleration=(bv-oldBv)/dt*5.0;
  vec2 chestForce=drive*45.0-parentAcceleration*.045;
  vec2 hairForce=drive*vec2(12.0,8.0)+bx*vec2(10.0,8.0);
  for(int k=0;k<24;k++){
   if(float(k)<steps){
    cv+=(chestForce-vec2(208.8408,256.7084)*cx-vec2(9.8269,12.1768)*cv)*h;
    cx=clamp(cx+cv*h,vec2(-1.4,-1.4),vec2(1.4,1.4));
    hv+=(hairForce-vec2(101.0647,142.5171)*hx-vec2(8.4446,11.4605)*hv)*h;
    hx=clamp(hx+hv*h,vec2(-1.5,-1.5),vec2(1.5,1.5));
   }
  }
 }else{drive=vec2(0.0,0.0);bx=vec2(0.0,0.0);bv=bx;cx=bx;cv=bx;hx=bx;hv=bx;}
 float cell=floor(v_TexCoord.x*9.0);
 vec2 result=inputValue;
 if(cell>0.5)result=velocity;
 if(cell>1.5)result=drive;
 if(cell>2.5)result=bx;
 if(cell>3.5)result=bv;
 if(cell>4.5)result=cx;
 if(cell>5.5)result=cv;
 if(cell>6.5)result=hx;
 if(cell>7.5)result=hv;
 gl_FragColor=vec4(result,0.0,1.0);
}
