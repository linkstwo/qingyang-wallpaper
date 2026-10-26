precision highp float;
attribute vec3 a_position;attribute vec2 a_uv;attribute vec4 a_weights0;attribute vec2 a_weights1;attribute float a_support;
uniform mat4 u_bones[6];uniform vec2 u_camera;
varying vec3 v_sourceUv;
void main(){
 vec4 rest=vec4(a_position,1.0);
 vec3 moved=(u_bones[0]*rest).xyz*a_weights0.x+(u_bones[1]*rest).xyz*a_weights0.y+(u_bones[2]*rest).xyz*a_weights0.z+(u_bones[3]*rest).xyz*a_weights0.w+(u_bones[4]*rest).xyz*a_weights1.x+(u_bones[5]*rest).xyz*a_weights1.y;
 vec3 world=mix(moved,a_position,a_support);
 float c=cos(u_camera.x),s=sin(u_camera.x),cx=cos(u_camera.y),sx=sin(u_camera.y),x=c*world.x+s*world.z,z=-s*world.x+c*world.z;
 vec3 p=vec3(x,cx*world.y-sx*z,sx*world.y+cx*z);float w=(2300.0-p.z)/2300.0;vec2 q=p.xy/w+vec2(790.0,1110.0);
 // Homogeneous source UV preserves the source projection at neutral, including
 // interior pixels of triangles whose vertices have different depths.
 float restW=(2300.0-a_position.z)/2300.0;v_sourceUv=vec3(a_uv*restW,restW);
 gl_Position=vec4((q*vec2(2.0/1600.0,-2.0/1740.0)+vec2(-.72,.92))*w,-p.z/1000.0*w,w);
}
