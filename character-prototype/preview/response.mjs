import {Spring, clamp} from './rig.mjs';
const spring=(frequency,damping,limit)=>new Spring({frequency,damping,limit});
export class Response {
  constructor(enhanced=true){
    this.enhanced=enhanced;
    this.bodyX=spring(2.4,.88,1.2);this.bodyY=spring(2.4,.88,1.2);
    this.chestX=spring(enhanced?2.85:3.2,enhanced?.36:.5,1.4);
    this.chestY=spring(enhanced?2.85:3.2,enhanced?.36:.5,1.4);
    this.hairX=spring(enhanced?1.6:1.7,enhanced?.42:.58,1.5);
    this.hairY=spring(1.9,.48,1.5);this.reset();
  }
  reset(){for(const s of [this.bodyX,this.bodyY,this.chestX,this.chestY,this.hairX,this.hairY])s.reset();this.view={x:0,y:0};this.prev={x:0,y:0};this.values=[0,0,0,0,0,0];}
  step(dt,{x=0,y=0,alphaX=0,alphaY=0}={}){
    if(!Number.isFinite(dt)||dt<=0||dt>.1)return;
    // Match Android float dt, including Spring substep rounding.
    dt=Math.fround(dt);
    const old={...this.view},s=1-Math.exp(-dt*12);
    this.view.x+=(clamp(x,-1,1)-this.view.x)*s;this.view.y+=(clamp(y,-1,1)-this.view.y)*s;
    const vx=(this.view.x-old.x)/dt,vy=(this.view.y-old.y)/dt;
    const ax=clamp((vx-this.prev.x)/dt,-180,180),ay=clamp((vy-this.prev.y)/dt,-180,180);this.prev={x:vx,y:vy};
    const g=this.enhanced?.15:.05,gx=clamp(alphaY*g,-6,6),gy=clamp(alphaX*g,-6,6);
    const bx=this.bodyX.step(-ax*1.4+gx*9,dt),by=this.bodyY.step(-ay*1.4+gy*9,dt);
    const cx=this.chestX.step(-ax*3.4-bx*60+gx*18,dt),cy=this.chestY.step(-ay*4.2-by*75+gy*18,dt);
    const hx=this.hairX.step(-ax*2.2-(this.enhanced?bx*20:0)+gx*11,dt);
    const hy=this.enhanced?this.hairY.step(-ay*1.4-by*16+gy*8,dt):hx*.35;
    this.values=[bx*5,by*5,cx*(this.enhanced?8.5:7),cy*(this.enhanced?8.5:7),hx*(this.enhanced?14:10),hy*(this.enhanced?7:10)];
  }
}
export function framing(width,height,wider=true){
  const w=Math.max(1,width),h=Math.max(1,height),cover=Math.max(w/1086,h/1448),scale=wider?Math.min(cover,w/850):cover,imageWidth=1086*scale;
  return {scale,x:wider&&imageWidth>w?clamp(w*.5-610*scale,w-imageWidth,0):(w-imageWidth)*.5,y:wider?Math.min(0,(h-1448*scale)*.5):(h-1448*scale)*.5,motionGain:Math.min(1.6,cover/scale)};
}
export function hairWeight(x,y){const t=clamp((y-275)/205,0,1),s=(x-(191+53*t))/36;const smooth=(a,b,v)=>{const u=clamp((v-a)/(b-a),0,1);return u*u*(3-2*u);};return Math.exp(-2*s*s)*smooth(285,465,y)*(1-smooth(480,515,y));}
