export const componentSurfaceVertexShader=`attribute vec3 a_position;attribute vec2 a_uv;attribute float a_restW;
uniform vec2 u_camera,u_pivot;uniform float u_distance;uniform vec4 u_crop;varying vec3 v_uv;
void main(){float c=cos(u_camera.x),s=sin(u_camera.x),cx=cos(u_camera.y),sx=sin(u_camera.y);
float x=c*a_position.x+s*a_position.z,z=-s*a_position.x+c*a_position.z,y=cx*a_position.y-sx*z,zz=sx*a_position.y+cx*z,w=(u_distance-zz)/u_distance;
vec2 source=vec2(x,y)/w+u_pivot,ndc=(source-u_crop.xy)/u_crop.zw*vec2(2.,-2.)+vec2(-1.,1.);
gl_Position=vec4(ndc*w,0.,w);v_uv=vec3(a_uv*a_restW,a_restW);}`;
export const componentSurfaceFragmentShader=`precision highp float;varying vec3 v_uv;uniform sampler2D u_image;
void main(){gl_FragColor=vec4(texture2D(u_image,v_uv.xy/v_uv.z).rgb,1.);}`;
