// Source coordinates are carried through Float32 meshes. A sub-ULP altitude
// cannot define reliable topology after clipping, even if its area is nonzero.
export function sourceTriangleQuality(pts){
 if(!Array.isArray(pts)||pts.length!==3||pts.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))throw Error('Invalid source triangle');
 const [a,b,c]=pts,area2=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])),edges=pts.map((p,i)=>Math.hypot(p[0]-pts[(i+1)%3][0],p[1]-pts[(i+1)%3][1])),altitude=area2/Math.max(...edges,1e-30),float32HeightBudget=Math.max(1,...pts.flat().map(Math.abs))*2**-23*8,condition=area2/Math.max(edges.reduce((s,e)=>s+e*e,0),1e-30);
 return {area:area2/2,altitude,float32HeightBudget,condition,degenerate:altitude<=float32HeightBudget||condition<1e-6};
}
