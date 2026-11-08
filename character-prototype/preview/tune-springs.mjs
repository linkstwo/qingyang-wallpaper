// 弹簧手感调参仿真：不改渲染，只算数字。用法：
//   node tune-springs.mjs            用 mesh.json 当前配置
//   node tune-springs.mjs --preset A 用下方 PRESETS 里的候选组对比
// 指标（老板验收口径）：
//   快晃段胸口峰值 px（要一眼可见：目标 ≥30px）、停手后过冲次数（Q弹：2-3 次收敛）、
//   收敛时长（<2s）、慢倾斜段胸口位移（不该跟着晃：目标 <6px）、撞限幅次数（撞限=假感来源）。
import {Spring, demoInput, clamp} from './rig.mjs';
import config from './mesh.json' with {type:'json'};

const PRESETS = {
  current: {springs: config.springs, limits: config.limits},
  A: {springs: {body:{frequency:2.2,damping:0.75,limit:1.2}, chest:{frequency:2.6,damping:0.34,limit:1.5}, hair:{frequency:1.5,damping:0.40,limit:1.5}},
      limits: {bodyPixels:13, chestPixels:30, hairPixels:26}},
  B: {springs: {body:{frequency:2.0,damping:0.70,limit:1.2}, chest:{frequency:2.3,damping:0.30,limit:1.6}, hair:{frequency:1.4,damping:0.35,limit:1.6}},
      limits: {bodyPixels:16, chestPixels:36, hairPixels:30}},
  A2: {springs: {body:{frequency:2.2,damping:0.75,limit:1.2}, chest:{frequency:2.6,damping:0.36,limit:1.8}, hair:{frequency:1.5,damping:0.40,limit:1.5}},
      limits: {bodyPixels:13, chestPixels:27, hairPixels:26}},
  A4: {springs: {body:{frequency:2.0,damping:0.72,limit:1.2}, chest:{frequency:2.4,damping:0.34,limit:1.8}, hair:{frequency:1.4,damping:0.38,limit:1.6}},
      limits: {bodyPixels:14, chestPixels:30, hairPixels:28}},
};

function simulate(cfg){
  const S={};
  for(const [n,c] of Object.entries(cfg.springs)){S[n+'X']=new Spring(c);S[n+'Y']=new Spring(c);}
  let view={x:0,y:0},prevV={x:0,y:0},dt=1/120;
  const stat={chestPeak:0,bodyPeak:0,hairPeak:0,tiltChestMax:0,settle:null,overshoots:0,clampHits:0,sign:1,lastExtreme:0,peaks:[]};
  let prevChest=0;
  for(let t=0;t<=16;t+=dt){
    const d=demoInput(t),target={x:d.x,y:d.y};
    const old={...view},k=1-Math.exp(-dt*12);
    view.x+=(target.x-view.x)*k;view.y+=(target.y-view.y)*k;
    const vx=(view.x-old.x)/dt,vy=(view.y-old.y)/dt;
    const ax=clamp((vx-prevV.x)/dt,-180,180),ay=clamp((vy-prevV.y)/dt,-180,180);prevV={x:vx,y:vy};
    const before=S.chestX.x;
    const bx=S.bodyX.step(-ax*1.4,dt),by=S.bodyY.step(-ay*1.4,dt);
    const cx=S.chestX.step(-ax*3.4-bx*60,dt),cy=S.chestY.step(-ay*4.2-by*75,dt);
    const hx=S.hairX.step(-ax*2.2,dt);
    if(Math.abs(S.chestX.x-S.chestX.limit)<1e-9||Math.abs(S.chestX.x+S.chestX.limit)<1e-9)stat.clampHits++;
    const chest=Math.hypot(cx,cy)*cfg.limits.chestPixels;
    const body=Math.hypot(bx,by)*cfg.limits.bodyPixels;
    const hair=Math.abs(hx)*cfg.limits.hairPixels;
    if(t<10)stat.tiltChestMax=Math.max(stat.tiltChestMax,chest);
    if(t>=10){stat.chestPeak=Math.max(stat.chestPeak,chest);}
    stat.bodyPeak=Math.max(stat.bodyPeak,body);stat.hairPeak=Math.max(stat.hairPeak,hair);
    // 停手后（t>13.2）：数过冲（符号翻转）次数与收敛时间
    if(t>13.2){
      if(stat.settle===null){
        const s=Math.sign(cx);
        if(s!==0&&s!==stat.sign){stat.sign=s;stat.overshoots++;}
        if(Math.abs(chest)<2&&stat.overshoots>=1)stat.settle=t-13.2;
        else if(Math.abs(chest)>=2)stat.pending=true;
      } else if(Math.abs(chest)>=2){stat.settle=null;} // 复弹则重新计
    }
    prevChest=chest;
  }
  if(stat.settle===null)stat.settle=16-13.2; // 到仿真结束都没收住
  return stat;
}

const names=process.argv.includes('--preset')?process.argv[process.argv.indexOf('--preset')+1].split(','):Object.keys(PRESETS);
console.log('预设 | 胸峰值px | 身体峰值 | 头发峰值 | 慢倾胸口 | 停手后过冲 | 收敛s | 撞限幅帧');
for(const n of names){
  const p=PRESETS[n];if(!p){console.log('无预设',n);continue;}
  const s=simulate(p);
  console.log(`${n} | ${s.chestPeak.toFixed(1)} | ${s.bodyPeak.toFixed(1)} | ${s.hairPeak.toFixed(1)} | ${s.tiltChestMax.toFixed(1)} | ${s.overshoots} | ${s.settle.toFixed(2)} | ${s.clampHits}`);
}
