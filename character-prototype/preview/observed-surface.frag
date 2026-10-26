precision highp float;
uniform sampler2D u_source,u_mask;uniform float u_masked;varying vec3 v_sourceUv;
void main(){vec2 uv=v_sourceUv.xy/v_sourceUv.z;float alpha=u_masked>.5?texture2D(u_mask,uv).r:1.0;if(alpha<.005)discard;gl_FragColor=vec4(texture2D(u_source,uv).rgb,alpha);}
