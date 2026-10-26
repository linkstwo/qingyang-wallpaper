// Shape-preserving cubic Hermite interpolation; no overshoot between source rails.
export function monotoneCurve(xs,ys){
 if(xs.length!==ys.length||xs.length<2||xs.some((x,i)=>!Number.isFinite(x)||(i&&x<=xs[i-1]))||ys.some(x=>!Number.isFinite(x)))throw Error('Invalid monotone curve samples');
 const h=xs.slice(1).map((x,i)=>x-xs[i]),d=h.map((v,i)=>(ys[i+1]-ys[i])/v),m=Array(xs.length).fill(0);
 for(let i=1;i<m.length-1;i++){if(d[i-1]*d[i]<=0)m[i]=0;else{const a=2*h[i]+h[i-1],b=h[i]+2*h[i-1];m[i]=(a+b)/(a/d[i-1]+b/d[i]);}}
 function endpoint(h0,h1,d0,d1){let v=((2*h0+h1)*d0-h0*d1)/(h0+h1);if(v*d0<=0)v=0;else if(d0*d1<0&&Math.abs(v)>3*Math.abs(d0))v=3*d0;return v;}
 if(xs.length===2)m[0]=m[1]=d[0];else{m[0]=endpoint(h[0],h[1],d[0],d[1]);m[m.length-1]=endpoint(h.at(-1),h.at(-2),d.at(-1),d.at(-2));}
 return x=>{if(x<=xs[0])return ys[0];if(x>=xs.at(-1))return ys.at(-1);let i=0;while(i<xs.length-2&&x>xs[i+1])i++;const t=(x-xs[i])/h[i],t2=t*t,t3=t2*t;return (2*t3-3*t2+1)*ys[i]+(t3-2*t2+t)*h[i]*m[i]+(-2*t3+3*t2)*ys[i+1]+(t3-t2)*h[i]*m[i+1];};
}
