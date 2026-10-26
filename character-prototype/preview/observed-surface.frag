precision highp float;
uniform sampler2D u_source,u_mask;uniform float u_masked,u_debug,u_neutralProjection;uniform vec2 u_viewport;varying vec3 v_sourceUv;
void main(){vec2 uv=v_sourceUv.xy/v_sourceUv.z;
 // At exactly the source camera/rest pose, all front triangles sample the
 // same calibrated screen ray. This avoids perspective interpolation rounding
 // changing source colour when only the mesh tessellation changes.
 if(u_neutralProjection>.5)uv=vec2((gl_FragCoord.x/u_viewport.x-.14)*1600.0/1152.0,(.96-gl_FragCoord.y/u_viewport.y)*1740.0/1536.0);
 float alpha=u_masked>.5?texture2D(u_mask,uv).r:1.0;if(alpha<.005)discard;vec3 debugColor=u_debug>1.5?(u_masked>.5?vec3(.1,.85,.25):vec3(.1,.4,1.)):vec3(1.);gl_FragColor=vec4(u_debug>.5?debugColor:texture2D(u_source,uv).rgb,alpha);}
