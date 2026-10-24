precision highp float;
  attribute vec2 a_source;
  attribute float a_pin,a_depth;
  uniform vec2 u_size,u_view,u_body,u_hair,u_ndcScale,u_ndcOffset;
  uniform vec3 u_chest;
  uniform float u_layer,u_motionGain,u_tipMode,u_structureMode;
  varying vec2 v_uv;
  float bell(vec2 p,vec2 c,vec2 r){vec2 d=(p-c)/r;return exp(-dot(d,d)*2.0);}
  // Perspective delta keeps the untouched texture exact at the neutral pose.
  vec3 rotateSurface(vec3 r){
    vec2 v=clamp(u_view,vec2(-1.0),vec2(1.0));
    float yaw=v.x*0.14,pitch=v.y*0.07;
    float cy=cos(yaw),sy=sin(yaw),cx=cos(pitch),sx=sin(pitch);
    vec3 t=vec3(cy*r.x+sy*r.z,r.y,-sy*r.x+cy*r.z);
    return vec3(t.x,cx*t.y-sx*t.z,sx*t.y+cx*t.z);
  }
  vec2 perspective(vec3 p){return p.xy*(2200.0/(2200.0-p.z));}
  vec2 projectSurface(vec2 p,float depth){
    vec3 r=vec3(p-vec2(620.0,1100.0),depth);
    return perspective(rotateSurface(r))-perspective(r);
  }
  vec2 projectInertia(vec2 p,float depth,vec3 delta){
    vec3 r=vec3(p-vec2(620.0,1100.0),depth);
    return perspective(rotateSurface(r+delta))-perspective(rotateSurface(r));
  }
  void main(){
    vec2 p=a_source, q=p;
    v_uv=p/u_size;
    if(u_layer< -0.5){}
    else if(u_layer<0.5){q-=u_view*vec2(5.0,3.0)*u_structureMode;}
    else if(u_layer<1.5){
      // Character + paper is one continuous textured surface. Region fields
      // preserve clothing continuity; paper/hands/seat have explicit zero weights.
      float active=1.0-a_pin;
      float head=1.0-smoothstep(340.0,495.0,p.y);
      float neck=bell(p,vec2(630.0,410.0),vec2(220.0,180.0));
      float chest=bell(p,vec2(577.0,785.0),vec2(165.0,205.0));
      float torso=bell(p,vec2(721.0,789.0),vec2(310.0,430.0));
      float legacyHair=bell(p,vec2(246.0,367.0),vec2(110.0,210.0));
      // Front loose strand: fixed roots, progressively freer tips, away from glasses/face.
      float tipT=clamp((p.y-275.0)/205.0,0.0,1.0);
      float strand=(p.x-(191.0+53.0*tipT))/36.0;
      float tip=exp(-2.0*strand*strand)*smoothstep(285.0,465.0,p.y)*(1.0-smoothstep(480.0,515.0,p.y));
      float hair=mix(legacyHair,tip,u_tipMode);
      vec2 turn=projectSurface(p,a_depth);
      turn/=sqrt(vec2(1.0)+turn*turn/vec2(576.0,400.0));
      turn*=u_structureMode*smoothstep(0.0,45.0,a_depth);
      vec2 inertia=u_body*(0.32+0.68*torso+0.22*neck);
      inertia+=u_chest.xy*chest;
      inertia+=u_hair*hair;
      inertia+=u_body*0.3*head;
      inertia*=u_motionGain;
      // Springs act in local material space; the held view projects all 3 axes.
      vec2 spatialInertia=projectInertia(p,a_depth,vec3(inertia,u_chest.z*chest*u_motionGain));
      q+=(turn+mix(inertia,spatialInertia,u_structureMode))*active;
    }
    else if(u_layer>2.5){} // Paper/workbench stay with their pinned contacts.
    gl_Position=vec4(q.x*u_ndcScale.x+u_ndcOffset.x,q.y*u_ndcScale.y+u_ndcOffset.y,0.0,1.0);
  }
