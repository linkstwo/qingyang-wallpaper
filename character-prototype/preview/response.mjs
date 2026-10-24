import {Spring, clamp} from './rig.mjs';
const spring=(frequency,damping,limit)=>new Spring({frequency,damping,limit});
export class Response {
  constructor(enhanced=true){
    this.enhanced=enhanced;
    this.bodyX=spring(2.4,.88,1.2);this.bodyY=spring(2.4,.88,1.2);
    this.chestX=spring(enhanced?2.6:3.2,enhanced?.43:.5,1.4);
    this.chestY=spring(enhanced?2.8:3.2,enhanced?.48:.5,1.4);
    this.hairX=spring(enhanced?1.6:1.7,enhanced?.42:.58,1.5);
    this.hairY=spring(1.9,.48,1.5);this.reset();
  }
  reset(){for(const s of [this.bodyX,this.bodyY,this.chestX,this.chestY,this.hairX,this.hairY])s.reset();this.view={x:0,y:0};this.prev={x:0,y:0};this.drive={x:0,y:0};this.values=[0,0,0,0,0,0];}
  step(dt,{x=0,y=0,alphaX=0,alphaY=0,linearX=0,linearY=0}={}){
    if(!Number.isFinite(dt)||dt<=0||dt>.1)return;
    // Match Android float dt, including Spring substep rounding.
    dt=Math.fround(dt);
    const old={...this.view},s=1-Math.exp(-dt*12);
    this.view.x+=(clamp(x,-1,1)-this.view.x)*s;this.view.y+=(clamp(y,-1,1)-this.view.y)*s;
    const vx=(this.view.x-old.x)/dt,vy=(this.view.y-old.y)/dt;
    const ax=clamp((vx-this.prev.x)/dt,-180,180),ay=clamp((vy-this.prev.y)/dt,-180,180);this.prev={x:vx,y:vy};
    if(this.enhanced){
      const k=1-Math.exp(-dt/.045),fx=alphaY*.12-linearX*.6-vx*.06,fy=alphaX*.12+linearY*.6-vy*.06;
      this.drive.x+=(6*Math.tanh(fx/6)-this.drive.x)*k;this.drive.y+=(6*Math.tanh(fy/6)-this.drive.y)*k;
      const gx=this.drive.x,gy=this.drive.y;
      const bx=this.bodyX.step(gx*9,dt),by=this.bodyY.step(gy*9,dt);
      const cx=this.chestX.step(gx*20+bx*18,dt),cy=this.chestY.step(gy*20+by*18,dt);
      const hx=this.hairX.step(gx*12+bx*10,dt),hy=this.hairY.step(gy*8+by*8,dt);
      this.values=[bx*5,by*5,cx*8.5,cy*8.5,hx*14,hy*7];return;
    }
    const g=this.enhanced?.15:.05,gx=clamp(alphaY*g,-6,6),gy=clamp(alphaX*g,-6,6);
    const bx=this.bodyX.step(-ax*1.4+gx*9,dt),by=this.bodyY.step(-ay*1.4+gy*9,dt);
    const cx=this.chestX.step(-ax*3.4-bx*60+gx*18,dt),cy=this.chestY.step(-ay*4.2-by*75+gy*18,dt);
    const hx=this.hairX.step(-ax*2.2-(this.enhanced?bx*20:0)+gx*11,dt);
    const hy=this.enhanced?this.hairY.step(-ay*1.4-by*16+gy*8,dt):hx*.35;
    this.values=[bx*5,by*5,cx*(this.enhanced?8.5:7),cy*(this.enhanced?8.5:7),hx*(this.enhanced?14:10),hy*(this.enhanced?7:10)];
  }
}
export function framing(width,height,wider=true,sizePercent=90){
  const w=Math.max(1,width),h=Math.max(1,height),cover=Math.max(w/1086,h/1448),scale=wider?Math.min(cover,w/1086*clamp(sizePercent,65,125)/100):cover;
  return {scale,x:wider?w*.5-590*scale:(w-1086*scale)*.5,y:wider?Math.min(0,(h-1448*scale)*.5):(h-1448*scale)*.5,motionGain:Math.min(1.45,cover/scale)};
}
export function hairWeight(x,y){const t=clamp((y-275)/205,0,1),s=(x-(191+53*t))/36;const smooth=(a,b,v)=>{const u=clamp((v-a)/(b-a),0,1);return u*u*(3-2*u);};return Math.exp(-2*s*s)*smooth(285,465,y)*(1-smooth(480,515,y));}
