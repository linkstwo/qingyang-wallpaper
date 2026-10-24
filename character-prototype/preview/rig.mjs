import earcut from './earcut.mjs';
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class Spring {
  constructor(config){Object.assign(this,config);this.x=0;this.v=0;}
  step(force,dt){
    const omega=2*Math.PI*this.frequency;
    const steps=Math.max(1,Math.ceil(dt*240));
    const h=dt/steps;
    for(let i=0;i<steps;i++){
      this.v+=(force-omega*omega*this.x-2*this.damping*omega*this.v)*h;
      this.x+=this.v*h;
      if(Math.abs(this.x)>this.limit){this.x=clamp(this.x,-this.limit,this.limit);this.v*=0.35;}
    }
    return this.x;
  }
  reset(){this.x=0;this.v=0;}
}
export function makeMesh(outline,holes=[],edge=27){
  const flat=outline.flat(), holeIndices=[];
  for(const h of holes){holeIndices.push(flat.length/2);flat.push(...h.flat());}
  const indices=earcut(flat,holeIndices), result=[];
  const add=(a,b,c,depth=0)=>{
    const lengths=[Math.hypot(a[0]-b[0],a[1]-b[1]),Math.hypot(b[0]-c[0],b[1]-c[1]),Math.hypot(c[0]-a[0],c[1]-a[1])];
    const longest=Math.max(...lengths);
    if(longest<=edge||depth>16){result.push(...a,...b,...c);return;}
    const i=lengths.indexOf(longest),p=[a,b,c][i],q=[b,c,a][i],r=[c,a,b][i],m=[(p[0]+q[0])/2,(p[1]+q[1])/2];
    add(p,m,r,depth+1);add(m,q,r,depth+1);
  };
  for(let i=0;i<indices.length;i+=3){add(...indices.slice(i,i+3).map(n=>flat.slice(2*n,2*n+2)));}
  return new Float32Array(result);
}
export function demoInput(t){
  if(t<3) return {x:0.72*Math.sin(t/3*Math.PI/2),y:-0.30*Math.sin(t/3*Math.PI/2),phase:'慢倾斜 · 观察脸、肩部与腰部的相对变化'};
  if(t<5) return {x:0.72,y:-0.30,phase:'保持倾斜 · 视角停在当前位置'};
  if(t<8) {const u=(t-5)/3;return {x:0.72-1.4*(3*u*u-2*u*u*u),y:-0.30+0.65*(3*u*u-2*u*u*u),phase:'缓慢反向 · 转向过程保持连续'};}
  if(t<10) return {x:-0.68,y:0.35,phase:'保持反向 · 手与图纸保持固定'};
  if(t<13) {const u=t-10,e=Math.min(1,u*4)*Math.min(1,(3-u)*4);return {x:e*0.65*Math.sin(u*2*Math.PI*3.2),y:e*0.55*Math.sin(u*2*Math.PI*2.6),phase:'快速轻晃 · 观察身体、胸部和头发的延迟'};}
  if(t<18) return {x:0,y:0,phase:'停止晃动 · 等待回弹收敛'};
  return {x:0,y:0,phase:'演示结束 · 可以移动指针继续观察',done:true};
}
