uniform vec2 g_ParallaxPosition;
attribute vec3 a_Position;
attribute vec2 a_TexCoord;
varying vec2 v_TexCoord;
varying vec2 v_Device;
void main(){gl_Position=vec4(a_Position,1.0);v_TexCoord=a_TexCoord;v_Device=clamp(g_ParallaxPosition*2.0-1.0,vec2(-1.0,-1.0),vec2(1.0,1.0));}
