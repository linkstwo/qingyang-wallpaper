precision highp float;
varying vec3 v_sourceUv;
uniform sampler2D u_texture,u_mask;
uniform float u_maskMode,u_cover,u_layer,u_softFrame;
uniform vec2 u_size;
void main(){
  vec2 v_uv=v_sourceUv.xy/v_sourceUv.z;
  vec3 rgb=texture2D(u_texture,v_uv).rgb;
  float alpha=1.0;
  if(u_layer< -0.5){
    // Real empty workshop plate, without blur bands or black padding.
    rgb*=1.0-0.14*smoothstep(0.65,1.0,v_uv.y);
  } else if(u_maskMode>0.5){
    alpha=texture2D(u_mask,v_uv).r;
    if(u_maskMode>1.5){
      // Aligned matte edge: dilation previously produced dark outlines at rest.
      alpha=texture2D(u_mask,v_uv).g*u_cover;
    }
  } else if(u_softFrame>0.5){
    float edge=min(min(v_uv.x,1.0-v_uv.x),min(v_uv.y,1.0-v_uv.y));
    alpha=mix(smoothstep(0.0,0.045,edge),1.0,texture2D(u_mask,v_uv).r);
  }
  if(u_layer>=0.0 && u_softFrame>0.5){
    alpha*=smoothstep(0.0,0.025,v_uv.y);
    alpha*=1.0-smoothstep(0.94,1.0,v_uv.y);
  }
  gl_FragColor=vec4(rgb,alpha);
}
