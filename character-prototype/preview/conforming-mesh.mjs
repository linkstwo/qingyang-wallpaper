// Weld source-space neighbours and split T-junctions before lifting into depth.
// Independent longest-edge subdivisions otherwise meet along different 3D chords.
export function conformSourceMesh(mesh,{epsilon=1e-4,cell=32}={}){
 const vertices=[],faces=[],buckets=new Map(),key=(x,y)=>x+','+y;
 const vertex=(x,y)=>{const bx=Math.floor(x/epsilon),by=Math.floor(y/epsilon);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const id of buckets.get(key(bx+dx,by+dy))||[]){const p=vertices[id];if(Math.hypot(x-p[0],y-p[1])<=epsilon)return id;}const id=vertices.length;vertices.push([x,y]);const k=key(bx,by);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(id);return id;};
 for(let i=0;i<mesh.length;i+=6){const tri=[0,2,4].map(k=>vertex(mesh[i+k],mesh[i+k+1]));if(new Set(tri).size===3)faces.push(tri);}
 const grid=new Map();for(const [id,p] of vertices.entries()){const k=key(Math.floor(p[0]/cell),Math.floor(p[1]/cell));if(!grid.has(k))grid.set(k,[]);grid.get(k).push(id);}
 const edgeCache=new Map();let splits=0;
 function pointsOnEdge(a,b){const k=key(Math.min(a,b),Math.max(a,b));if(edgeCache.has(k)){const list=edgeCache.get(k);return a<b?list:list.slice().reverse();}const first=Math.min(a,b),last=Math.max(a,b),p=vertices[first],q=vertices[last],dx=q[0]-p[0],dy=q[1]-p[1],length2=dx*dx+dy*dy,found=[];
  for(let x=Math.floor((Math.min(p[0],q[0])-epsilon)/cell);x<=Math.floor((Math.max(p[0],q[0])+epsilon)/cell);x++)for(let y=Math.floor((Math.min(p[1],q[1])-epsilon)/cell);y<=Math.floor((Math.max(p[1],q[1])+epsilon)/cell);y++)for(const id of grid.get(key(x,y))||[]){if(id===first||id===last)continue;const r=vertices[id],t=((r[0]-p[0])*dx+(r[1]-p[1])*dy)/length2;if(t>epsilon/Math.sqrt(length2)&&t<1-epsilon/Math.sqrt(length2)&&Math.abs((r[0]-p[0])*dy-(r[1]-p[1])*dx)<=epsilon*Math.sqrt(length2))found.push({id,t});}
  found.sort((a,b)=>a.t-b.t);const list=[first,...found.map(v=>v.id),last];edgeCache.set(k,list);splits+=found.length;return a<b?list:list.slice().reverse();
 }
 const indices=[];let changedFaces=0;
 for(const tri of faces){const boundary=[];for(let k=0;k<3;k++)boundary.push(...pointsOnEdge(tri[k],tri[(k+1)%3]).slice(0,-1));if(boundary.length===3){indices.push(...tri);continue;}changedFaces++;const center=[0,1].map(k=>tri.reduce((s,id)=>s+vertices[id][k],0)/3),c=vertices.length;vertices.push(center);for(let k=0;k<boundary.length;k++)indices.push(c,boundary[k],boundary[(k+1)%boundary.length]);}
 const source=new Float32Array(indices.flatMap(i=>vertices[i]));
 return {source,positions:vertices.flat(),indices,report:{inputTriangles:mesh.length/6,triangles:indices.length/3,vertices:vertices.length,splitEdges:[...edgeCache.values()].filter(e=>e.length>2).length,edgeInsertions:splits,changedFaces,epsilon}};
}
