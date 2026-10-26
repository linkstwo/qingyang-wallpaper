// Observed visible paper silhouette in the current reading photo. Research only.
// This separates source materials; it does not reconstruct the body behind paper.
export const paperSourcePartition={
 version:1,source:'references/originals/main-reading-v2.png',size:[1152,1536],
 sourceSha256:'cc43f133c865b272f06cdff0d35086fae5b668100a70df09cc5cc1d0301eb411',
 outline:[[44,763],[299,958],[335,1005],[432,1030],[451,1078],[480,1137],[508,1195],[535,1233],[565,1260],[463,1251],[420,1231],[346,1199],[279,1167],[255,1157],[192,1168],[136,1168],[57,1158],[48,1115],[40,1070],[35,1035],[20,988],[0,951],[0,846],[23,803]],
 inferredSegments:[{from:1,to:3,reason:'Paper upper edge partly occluded by holding fingers; hand remains at the supported plane, not an independently observed hidden paper edge.'}],
 limitations:['Outline manually observed with approximate pixel precision.','Paper folds are not reconstructed; the supported plane remains inferred.','Source original, production mask, paper polygon and Android assets are unchanged.']
};
// Match the existing motion matte's four-pixel coverage collar. This padding
// is an assignment envelope, not an observed physical paper boundary.
export function paperAssignmentOutline(padding=4){
 const poly=paperSourcePartition.outline,area=poly.reduce((s,p,i)=>{const q=poly[(i+1)%poly.length];return s+p[0]*q[1]-q[0]*p[1];},0),sign=Math.sign(area);
 return poly.map((p,i)=>{const a=poly[(i+poly.length-1)%poly.length],b=poly[(i+1)%poly.length],edge=(u,v)=>{const d=[v[0]-u[0],v[1]-u[1]],L=Math.hypot(...d);return {d,n:[sign*d[1]/L,-sign*d[0]/L]};},u=edge(a,p),v=edge(p,b),A=p.map((x,k)=>x+u.n[k]*padding),B=p.map((x,k)=>x+v.n[k]*padding),cross=(x,y)=>x[0]*y[1]-x[1]*y[0],den=cross(u.d,v.d);let q;
  if(Math.abs(den)<1e-8)q=A;else{const t=cross(B.map((x,k)=>x-A[k]),v.d)/den;q=A.map((x,k)=>x+t*u.d[k]);}
  const length=Math.hypot(...q.map((x,k)=>x-p[k]));if(length>padding*3)q=p.map((x,k)=>x+(q[k]-x)*padding*3/length);
  return q.map((x,k)=>Math.max(0,Math.min(paperSourcePartition.size[k],x)));
 });
}
