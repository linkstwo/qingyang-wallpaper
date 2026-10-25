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
  float headWeight(vec2 p){return 1.0-smoothstep(395.0,565.0,p.y);}
  vec2 boundedTurn(vec2 p,float depth){
    vec2 t=projectSurface(p,depth);
    return t/sqrt(vec2(1.0)+t*t/vec2(576.0,400.0))*smoothstep(0.0,45.0,depth);
  }
  vec2 rigidHeadTurn(vec2 p){
    vec2 anchor=vec2(430.0,330.0);
    vec3 r=vec3(anchor-vec2(620.0,1100.0),116.0);
    vec2 axis=perspective(rotateSurface(r+vec3(0.0,100.0,0.0)))-perspective(rotateSurface(r));
    float angle=atan(-axis.x,axis.y),c=cos(angle),s=sin(angle);
    vec2 d=p-anchor;
    return boundedTurn(anchor,116.0)+vec2(c*d.x-s*d.y,s*d.x+c*d.y)-d;
  }
  // Image-space shoulder/elbow/wrist chain, fixed to the existing hand contact.
  float segmentWeight(vec2 p,vec2 a,vec2 b,float radius){
    vec2 v=b-a,d=p-a;
    float t=clamp(dot(v,d)/dot(v,v),0.0,1.0);
    return 1.0-smoothstep(radius,radius+36.0,length(d-t*v));
  }
  vec2 supportElbow(vec2 shoulder){
    vec2 sourceS=vec2(815.0,575.0),sourceE=vec2(815.0,1010.0),wrist=vec2(350.0,1175.0);
    if(all(equal(shoulder,sourceS)))return sourceE;
    float upper=length(sourceE-sourceS),fore=length(wrist-sourceE);
    vec2 v=wrist-shoulder;
    float d=length(v),reach=clamp(d,abs(upper-fore)+0.0001,upper+fore-0.0001);
    vec2 axis=v/d;
    float along=(upper*upper-fore*fore+reach*reach)/(2.0*reach);
    float height=sqrt(max(0.0,upper*upper-along*along));
    return shoulder+axis*along+vec2(axis.y,-axis.x)*height;
  }
  vec2 segmentTransform(vec2 p,vec2 a,vec2 b,vec2 qa,vec2 qb){
    if(all(equal(a,qa))&&all(equal(b,qb)))return p;
    vec2 v=b-a,qv=qb-qa,d=p-a;
    float den=length(v)*length(qv),c=dot(v,qv)/den,s=(v.x*qv.y-v.y*qv.x)/den;
    return qa+vec2(c*d.x-s*d.y,s*d.x+c*d.y);
  }
  vec2 supportedArm(vec2 p,vec2 raw){
    vec2 a=vec2(815.0,575.0),b=vec2(815.0,1010.0),c=vec2(350.0,1175.0);
    float upper=segmentWeight(p,a,b,48.0),fore=segmentWeight(p,b,c,42.0),weight=max(upper,fore);
    if(weight<=0.0)return raw;
    float depth=95.61511749010519;
    float bodyWeight=.32+.68*bell(a,vec2(721.0,789.0),vec2(310.0,430.0))
      +.22*bell(a,vec2(630.0,410.0),vec2(220.0,180.0));
    vec2 inertia=u_body*bodyWeight*u_motionGain;
    vec2 shoulder=a+boundedTurn(a,depth)*u_structureMode
      +mix(inertia,projectInertia(a,depth,vec3(inertia,0.0)),u_structureMode);
    vec2 elbow=supportElbow(shoulder);
    vec2 qa=segmentTransform(p,a,b,shoulder,elbow),qb=segmentTransform(p,b,c,elbow,c);
    vec2 target=qa+(qb-qa)*fore/(upper+fore);
    return raw+(target-raw)*weight;
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
      float strand=(p.x-(191.0+53.0*tipT))/56.0;
      float tip=exp(-2.0*strand*strand)*smoothstep(285.0,465.0,p.y)*(1.0-smoothstep(480.0,650.0,p.y));
      float hair=mix(legacyHair,tip,u_tipMode);
      float headRigid=headWeight(p);
      vec2 turn=mix(boundedTurn(p,a_depth),rigidHeadTurn(p),headRigid)*u_structureMode;
      vec2 inertia=u_body*(0.32+0.68*torso+0.22*neck);
      inertia+=u_chest.xy*chest;
      inertia+=u_hair*hair;
      inertia+=u_body*0.3*head;
      inertia*=u_motionGain;
      // Springs act in local material space; the held view projects all 3 axes.
      vec2 spatialInertia=projectInertia(p,a_depth,vec3(inertia,u_chest.z*chest*u_motionGain));
      vec2 headAnchor=vec2(430.0,330.0);
      float headBody=.32+.68*bell(headAnchor,vec2(721.0,789.0),vec2(310.0,430.0))
        +.22*bell(headAnchor,vec2(630.0,410.0),vec2(220.0,180.0))+.3;
      vec2 headInertia=u_body*headBody*u_motionGain;
      vec2 headSpatial=projectInertia(headAnchor,116.0,vec3(headInertia,0.0));
      vec2 movement=mix(inertia,spatialInertia,u_structureMode);
      vec2 hairLocal=u_hair*hair*u_motionGain;
      vec2 hairSpatial=projectInertia(p,a_depth,vec3(hairLocal,0.0));
      movement=mix(movement,mix(headInertia,headSpatial,u_structureMode)
        +mix(hairLocal,hairSpatial,u_structureMode),headRigid);
      q+= (supportedArm(p,p+turn+movement)-p)*active;
    }
    else if(u_layer>2.5){} // Paper/workbench stay with their pinned contacts.
    gl_Position=vec4(q.x*u_ndcScale.x+u_ndcOffset.x,q.y*u_ndcScale.y+u_ndcOffset.y,0.0,1.0);
  }
