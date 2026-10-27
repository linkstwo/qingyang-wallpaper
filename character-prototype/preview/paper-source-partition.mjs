// Observed visible paper silhouette in the current reading photo. Research only.
// This separates source materials; it does not reconstruct the body behind paper.
export const paperSourcePartition={
 version:2,source:'references/originals/main-reading-v2.png',size:[1152,1536],
 sourceSha256:'cc43f133c865b272f06cdff0d35086fae5b668100a70df09cc5cc1d0301eb411',
 outline:[[49,755],[299,945],[335,1005],[432,1030],[451,1078],[480,1137],[508,1195],[535,1233],[565,1260],[463,1251],[420,1231],[346,1199],[279,1167],[255,1157],[192,1168],[136,1168],[57,1158],[48,1115],[40,1070],[35,1035],[20,988],[0,951],[0,846],[23,803]],
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

// The lower-right chain from (480,1137) also borders visible trouser cloth.
// Starting at index8 omitted three supported segments and opened a wedge
// when looking from the left. Indices1..4 remain occlusion, not contact.
// Observed lower paper edge rests over the lap. Only this contact chain may
// share geometry with cloth. Upper/right edges occlude unseen body and must
// remain separate; this does not supply any hidden texture.
export const paperLapContactChain=paperSourcePartition.outline.slice(8,17);
export const paperRightClothContactChain=paperSourcePartition.outline.slice(5,9);
export function paperLapContactWeight(x,y,width=48,{includeRightCloth=false}={}){
 const chain=includeRightCloth?paperSourcePartition.outline.slice(5,17):paperLapContactChain;
 let distance=Infinity;
 for(let i=1;i<chain.length;i++){
  const a=chain[i-1],b=chain[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
  distance=Math.min(distance,Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy));
 }
 const t=Math.max(0,Math.min(1,distance/width));return 1-t*t*(3-2*t);
}

// Only external paper edges adjoin scene background. The holding fingers and
// lower lap edge are deliberately excluded from this discarded matte collar.
export function paperExteriorCollars(){
 const inner=paperSourcePartition.outline,outer=paperAssignmentOutline(4);
 return [0,...Array.from({length:8},(_,i)=>16+i)].map(i=>{
  const j=(i+1)%inner.length;return [inner[i],inner[j],outer[j],outer[i]];
 });
}

// Actual workshop background left of the lower paper edge, not body/paper.
// The lower contour is manually observed, with a few-pixel boundary uncertainty.
export const paperLeftBackgroundOutline=[[0,951],[20,988],[35,1035],[40,1070],[48,1115],[57,1158],[100,1163.4430379746836],[80,1167],[60,1171],[40,1175],[20,1180],[0,1187]];

// Visible workshop background between the held paper, fingers and lap.
// This is a conservative source classification, not unseen body texture.
// The paper-facing edge matches the observed paper chain; other boundaries stay
// conservative near skin/cloth. Boundary precision remains a few source pixels.
export const paperUnderHandBackgroundOutline=[[432,1030],[451,1078],[466,1110],[490,1100],[520,1080],[550,1050],[590,1028],[608,1015],[610,990],[575,995],[550,999],[525,1002],[500,1005],[475,1007],[450,1015],[425,1025]];
