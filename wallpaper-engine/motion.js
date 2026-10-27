// The classes above are copied verbatim from the current GitHub Q response.
const response=new Response(true,true);
let material=null, strength=1, demo=false, breathing=true, clock=0,previous=null;
function finite(v){return Number.isFinite(v)?v:0;}
export function init(){material=thisLayer.getEffect(0);}
export function applyUserProperties(p){
 if(p.hasOwnProperty('motion'))strength=Math.max(0,Math.min(1.5,p.motion));
 if(p.hasOwnProperty('demo')){demo=p.demo;clock=0;response.reset();previous=null;}
 if(p.hasOwnProperty('breathing'))breathing=p.breathing;
}
export function update(value){
 const dt=engine.frametime;
 if(!material||!Number.isFinite(dt)||dt<=0||dt>.1){response.reset();previous=null;return true;}
 clock+=dt;
 let x=0,y=0;
 if(demo){
  const t=clock%18;
  if(t<3){x=.72*Math.sin(t/3*Math.PI/2);y=-.3*Math.sin(t/3*Math.PI/2);}
  else if(t<5){x=.72;y=-.3;}
  else if(t<8){let u=(t-5)/3,s=3*u*u-2*u*u*u;x=.72-1.4*s;y=-.3+.65*s;}
  else if(t<10){x=-.68;y=.35;}
  else if(t<13){let u=t-10,e=Math.min(1,u*4)*Math.min(1,(3-u)*4);x=e*.65*Math.sin(u*2*Math.PI*3.2);y=e*.55*Math.sin(u*2*Math.PI*2.6);}
 } else if(!engine.isMobileDevice()){
  x=Math.max(-1,Math.min(1,(finite(input.cursorWorldPosition.x)-576)/576));
  y=Math.max(-1,Math.min(1,(768-finite(input.cursorWorldPosition.y))/768));
 }
 response.step(dt,{x,y});
 const b=response.values;
 material.setMaterialProperty('chest',new Vec2(0,breathing?Math.sin(clock*1.8)*.65:0));
 material.setMaterialProperty('pose',new Vec2(demo?x:0,demo?y:0));
 material.setMaterialProperty('demo',demo?1:0);
 material.setMaterialProperty('gain',strength);
 return true;
}
