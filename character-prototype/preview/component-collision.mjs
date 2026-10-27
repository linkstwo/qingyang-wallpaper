// Source-plane triangle overlap gate for component authoring. Not a 3D/body test.
export function componentTriangleOverlaps(positions,indices,{limit=32,epsilon=1e-7}={}){
 if(!Array.isArray(positions)||positions.length%2||!positions.every(Number.isFinite)||!Array.isArray(indices)||indices.length%3||indices.some(i=>!Number.isInteger(i)||i<0||i>=positions.length/2)||!Number.isInteger(limit)||limit<1||!Number.isFinite(epsilon)||epsilon<0)throw Error('Invalid component collision input');
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const inside=(p,t)=>{const s=t.map((a,i)=>cross(a,t[(i+1)%3],p));return s.every(v=>v>epsilon)||s.every(v=>v< -epsilon);};
 const proper=(a,b,c,d)=>cross(a,b,c)*cross(a,b,d)<-epsilon*epsilon&&cross(c,d,a)*cross(c,d,b)<-epsilon*epsilon;
 const tris=[];for(let i=0;i<indices.length;i+=3){const ids=indices.slice(i,i+3),p=ids.map(id=>positions.slice(id*2,id*2+2));tris.push({id:i/3,ids,p,minX:Math.min(...p.map(q=>q[0])),maxX:Math.max(...p.map(q=>q[0])),minY:Math.min(...p.map(q=>q[1])),maxY:Math.max(...p.map(q=>q[1]))});}tris.sort((a,b)=>a.minX-b.minX);
 const overlaps=[];let candidatePairs=0;
 for(let i=0;i<tris.length;i++){const a=tris[i];for(let j=i+1;j<tris.length&&tris[j].minX<a.maxX-epsilon;j++){const b=tris[j];if(b.minY>=a.maxY-epsilon||a.minY>=b.maxY-epsilon)continue;candidatePairs++;
  // Shared edges can be neighbours or duplicated faces; do not skip them.
  // Centroids also detect exact duplicate/contained triangles whose edges
  // coincide and whose corners all lie on the other triangle's boundary.
  const centroid=t=>[0,1].map(k=>t.reduce((n,p)=>n+p[k],0)/3);
  let hit=a.p.some(p=>inside(p,b.p))||b.p.some(p=>inside(p,a.p))||inside(centroid(a.p),b.p)||inside(centroid(b.p),a.p);
  if(!hit)for(let x=0;x<3&&!hit;x++)for(let y=0;y<3&&!hit;y++)hit=proper(a.p[x],a.p[(x+1)%3],b.p[y],b.p[(y+1)%3]);
  if(hit){overlaps.push([a.id,b.id]);if(overlaps.length>=limit)return {overlaps,candidatePairs,truncated:true};}
 }}return {overlaps,candidatePairs,truncated:false};
}
