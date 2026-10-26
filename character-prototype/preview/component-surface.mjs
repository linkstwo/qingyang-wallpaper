// One connected observed front patch. Inferred arm thickness is not a full body
// reconstruction, camera calibration, hidden back texture or main registration.
export const nearDownSurfaceProfile={sourceSha256:'56a79d4fa430d24396d3413c2f444e10e224d2e196fae9b87c72f9f1b5ddfeea',pivot:[930,700],cameraDistance:2300,sections:[[410,900,88,35],[490,925,74,40],[650,946,56,35],[820,956,47,26],[1030,972,36,15]]};
export function buildNearDownObservedSurface(mesh,{thicknessGain=.65}={}){
 if(!mesh||mesh.sourceSha256!==nearDownSurfaceProfile.sourceSha256||!Array.isArray(mesh.sourcePositions)||!Array.isArray(mesh.indices)||!Number.isFinite(thicknessGain)||thicknessGain<0||thicknessGain>1)throw Error('Invalid near/down observed surface');
 // A bounded C1 dome avoids the infinite silhouette derivative of sqrt(1-r²).
 // This is an authoring depth field, not measured cylindrical anatomy.
 const profile=nearDownSurfaceProfile,positions=[],restW=[],depths=[];
 for(let i=0;i<mesh.sourcePositions.length;i+=2){const [x,y]=mesh.sourcePositions.slice(i,i+2);if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Non-finite observed source');const ss=profile.sections;let j=0;while(j<ss.length-2&&y>ss[j+1][0])j++;const a=ss[j],b=ss[j+1],t=Math.max(0,Math.min(1,(y-a[0])/(b[0]-a[0]))),cx=a[1]+(b[1]-a[1])*t,r=a[2]+(b[2]-a[2])*t,center=a[3]+(b[3]-a[3])*t,radial=Math.max(-1,Math.min(1,(x-cx)/r)),z=thicknessGain*(center+r*Math.max(0,1-radial*radial)**2),w=(profile.cameraDistance-z)/profile.cameraDistance;positions.push((x-profile.pivot[0])*w,(y-profile.pivot[1])*w,z);restW.push(w);depths.push(z);}
 return {...mesh,positions,restW,depths,surfaceProfile:profile,depthInferred:true,registeredToMain:false,hiddenTextureAdded:false,limitations:['Only observed front-patch source UVs exist.','Cross-section depths and local camera distance are authoring estimates.','No cap or rear texture is invented at the patch boundary.']};
}
export function projectObservedComponent(surface,{yaw=0,pitch=0}={}){
 if(!Number.isFinite(yaw)||!Number.isFinite(pitch)||Math.abs(yaw)>.5||Math.abs(pitch)>.25)throw Error('Outside diagnostic component range');
 const {pivot,cameraDistance:d}=surface.surfaceProfile,c=Math.cos(yaw),s=Math.sin(yaw),cx=Math.cos(pitch),sx=Math.sin(pitch),target=[];
 for(let i=0;i<surface.positions.length;i+=3){const [px,py,pz]=surface.positions.slice(i,i+3),x=c*px+s*pz,z=-s*px+c*pz,y=cx*py-sx*z,zz=sx*py+cx*z,w=(d-zz)/d;target.push(x/w+pivot[0],y/w+pivot[1]);}return target;
}
