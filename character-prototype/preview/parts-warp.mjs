// Floating-point MLS similarity deformation for authoring, not wallpaper physics.
// Based on Schaefer et al. (2006), also implemented by Jarvis73/Moving-Least-Squares.
// That project's MIT notice is retained in third-party/MLS-LICENSE.txt.
export const mix=(a,b,t)=>a+(b-a)*t;
const finitePoint=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
export function validateHandles(handles,size){
 if(!Array.isArray(handles)||handles.length<3||handles.length>40)throw Error('控制点数量应为3–40');
 const ids=new Set();for(const h of handles){if(typeof h.id!=='string'||ids.has(h.id)||!finitePoint(h.source)||!finitePoint(h.target))throw Error('控制点格式错误');ids.add(h.id);for(const p of [h.source,h.target])if(p.some((v,k)=>v<0||v>size[k]))throw Error('控制点超出图片');}
 for(let i=0;i<handles.length;i++)for(let j=0;j<i;j++)if(Math.hypot(...handles[i].source.map((v,k)=>v-handles[j].source[k]))<1e-5)throw Error('原始控制点重复');return true;
}
export function similarityPoint(point,handles){
 let sw=0,px=0,py=0,qx=0,qy=0;const weights=[];
 for(const h of handles){const dx=point[0]-h.source[0],dy=point[1]-h.source[1],d=dx*dx+dy*dy;if(d<1e-12)return h.target.slice();const w=1/d;weights.push(w);sw+=w;px+=w*h.source[0];py+=w*h.source[1];qx+=w*h.target[0];qy+=w*h.target[1];}
 px/=sw;py/=sw;qx/=sw;qy/=sw;let a=0,b=0,den=0;
 for(let i=0;i<handles.length;i++){const h=handles[i],w=weights[i],x=h.source[0]-px,y=h.source[1]-py,u=h.target[0]-qx,v=h.target[1]-qy;a+=w*(x*u+y*v);b+=w*(x*v-y*u);den+=w*(x*x+y*y);}
 if(den<1e-12)throw Error('控制点退化，不能计算');const x=point[0]-px,y=point[1]-py;return [qx+(a*x-b*y)/den,qy+(b*x+a*y)/den];
}
export function makeHandles(roi){const [x,y,w,h]=roi;return [[.2,.2],[.5,.5],[.8,.8]].map((p,i)=>({id:'pin'+i,source:[x+p[0]*w,y+p[1]*h],target:[x+p[0]*w,y+p[1]*h]}));}
export function buildWarp(roi,handles,{columns=24,rows=30,gain=1}={}){
 if(!roi||roi.length!==4||!roi.every(Number.isFinite)||roi[2]<8||roi[3]<8||roi[0]<0||roi[1]<0)throw Error('局部范围无效');
 if(!Number.isFinite(gain)||gain<0||gain>1||!Number.isInteger(columns)||!Number.isInteger(rows)||columns<2||rows<2||columns>80||rows>80)throw Error('网格设置无效');
 const [x,y,w,h]=roi,anchors=[];for(const xx of [0,.5,1])for(const yy of [0,.5,1])if(xx!==.5||yy!==.5)anchors.push({id:`edge${xx}${yy}`,source:[x+xx*w,y+yy*h],target:[x+xx*w,y+yy*h]});
 const all=[...anchors,...handles];validateHandles(all,[x+w,y+h]);
 const source=[],target=[],indices=[];let identity=true;
 for(const p of handles)if(p.source.some((v,k)=>Math.abs(v-p.target[k])>1e-10))identity=false;
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){const p=[x+i/columns*w,y+j/rows*h];source.push(p);const q=identity||gain===0?p:similarityPoint(p,all),edge=Math.min(i/columns,1-i/columns,j/rows,1-j/rows),blend=gain*smooth(edge/.12);target.push(p.map((v,k)=>mix(v,q[k],blend)));}
 let minAreaRatio=Infinity;
 for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){const a=j*(columns+1)+i,b=a+1,c=a+columns+1,d=c+1;for(const tri of [[a,b,d],[a,d,c]]){indices.push(tri);const p=tri.map(k=>target[k]),area=(p[1][0]-p[0][0])*(p[2][1]-p[0][1])-(p[1][1]-p[0][1])*(p[2][0]-p[0][0]);minAreaRatio=Math.min(minAreaRatio,area/(w/columns*h/rows));}}
 return {source,target,indices,minAreaRatio,valid:minAreaRatio>.08,identity:identity||gain===0};
}
export function validateDraft(draft,identity){
 if(!draft||draft.version!==1||draft.method!=='mls-similarity'||draft.confidence!==0||draft.sourceSha256!==identity.sha||draft.source!==identity.source||JSON.stringify(draft.size)!==JSON.stringify(identity.size))throw Error('草稿与当前原图不匹配');
 if(!['arm','shoulder','torso'].includes(draft.part)||!Number.isFinite(draft.gain)||draft.gain<0||draft.gain>1)throw Error('草稿部件或强度无效');
 const r=draft.roi;if(!Array.isArray(r)||r.length!==4||!r.every(Number.isFinite)||r[0]<0||r[1]<0||r[2]<8||r[3]<8||r[0]+r[2]>identity.size[0]||r[1]+r[3]>identity.size[1])throw Error('草稿范围无效');validateHandles(draft.handles,identity.size);if(draft.handles.some(h=>[h.source,h.target].some(p=>p.some((v,k)=>v<r[k]||v>r[k]+r[k+2]))))throw Error('控制点超出局部范围');if(!buildWarp(r,draft.handles,{gain:draft.gain}).valid)throw Error('草稿会使部件翻折');return true;
}
