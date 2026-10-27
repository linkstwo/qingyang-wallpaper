// Legal interior edge flips improve skinny clipping triangles without changing
// any source coordinate or material boundary. No original RGB is modified.
export function improveSourceTriangles(mesh,{maxPasses=32}={}){
 const vertices=Array.from({length:mesh.positions.length/2},(_,i)=>mesh.positions.slice(i*2,i*2+2)),faces=Array.from({length:mesh.indices.length/3},(_,i)=>mesh.indices.slice(i*3,i*3+3));
 const area=(a,b,c)=>(vertices[b][0]-vertices[a][0])*(vertices[c][1]-vertices[a][1])-(vertices[b][1]-vertices[a][1])*(vertices[c][0]-vertices[a][0]);
 const quality=t=>{let sum=0;for(let i=0;i<3;i++){const a=vertices[t[i]],b=vertices[t[(i+1)%3]];sum+=(a[0]-b[0])**2+(a[1]-b[1])**2;}return Math.abs(area(...t))/Math.max(sum,1e-30);};
 let flips=0,passes=0;
 for(;passes<maxPasses;passes++){
  const edges=new Map();for(let i=0;i<faces.length;i++)for(let k=0;k<3;k++){const a=faces[i][k],b=faces[i][(k+1)%3],key=Math.min(a,b)+','+Math.max(a,b);if(!edges.has(key))edges.set(key,[]);edges.get(key).push({face:i,a,b,c:faces[i][(k+2)%3]});}
  let changed=0;const touched=new Set();
  for(const pair of edges.values()){
   if(pair.length!==2)continue;const [u,v]=pair;if(touched.has(u.face)||touched.has(v.face)||u.a!==v.b||u.b!==v.a)continue;
   if(mesh.triangleGroups&&mesh.triangleGroups[u.face]!==mesh.triangleGroups[v.face])continue;
   const A=[u.c,u.a,v.c],B=[u.c,v.c,u.b],sign=Math.sign(area(...faces[u.face]));if(area(...A)*sign<=1e-8||area(...B)*sign<=1e-8)continue;
   if(Math.min(quality(A),quality(B))<=Math.min(quality(faces[u.face]),quality(faces[v.face]))*1.001)continue;
   faces[u.face]=A;faces[v.face]=B;touched.add(u.face);touched.add(v.face);changed++;flips++;
  }if(!changed)break;
 }
 const indices=faces.flat(),source=new Float32Array(indices.flatMap(i=>vertices[i]));
 return {...mesh,indices,source,report:{...mesh.report,qualityFlips:flips,qualityPasses:passes}};
}
