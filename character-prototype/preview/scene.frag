precision highp float;
varying vec2 v_uv;
uniform sampler2D u_texture,u_mask;
uniform float u_maskMode,u_cover,u_layer,u_softFrame;
uniform vec2 u_size;
void main(){
  vec3 rgb=texture2D(u_texture,v_uv).rgb;
  float alpha=1.0;
  if(u_layer< -0.5){
    vec2 d=vec2(24.0)/u_size;
    rgb=(rgb+texture2D(u_texture,v_uv+d).rgb+texture2D(u_texture,v_uv-d).rgb
      +texture2D(u_texture,v_uv+vec2(d.x,-d.y)).rgb+texture2D(u_texture,v_uv+vec2(-d.x,d.y)).rgb)*0.15;
    rgb*=1.0-smoothstep(0.60,0.96,v_uv.y);
  } else if(u_maskMode>0.5){
    alpha=texture2D(u_mask,v_uv).r;
    if(u_maskMode>1.5){
      vec2 d=vec2(3.0)/u_size;
      alpha=max(alpha,texture2D(u_mask,v_uv+d).r);
      alpha=max(alpha,texture2D(u_mask,v_uv-d).r);
      alpha=max(alpha,texture2D(u_mask,v_uv+vec2(d.x,-d.y)).r);
      alpha=max(alpha,texture2D(u_mask,v_uv+vec2(-d.x,d.y)).r);
      alpha*=u_cover;
    }
  } else if(u_softFrame>0.5){
    float edge=min(min(v_uv.x,1.0-v_uv.x),min(v_uv.y,1.0-v_uv.y));
    alpha=mix(smoothstep(0.0,0.045,edge),1.0,texture2D(u_mask,v_uv).r);
  }
  if(u_layer>=0.0 && u_softFrame>0.5){
    alpha*=smoothstep(0.0,0.025,v_uv.y);
    alpha*=1.0-smoothstep(0.86,1.0,v_uv.y);
  }
  gl_FragColor=vec4(rgb,alpha);
}
