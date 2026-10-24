precision highp float;
  attribute vec2 a_source;
  attribute float a_pin;
  uniform vec2 u_size,u_view,u_body,u_chest,u_hair,u_ndcScale,u_ndcOffset;
  uniform float u_layer,u_motionGain,u_tipMode;
  varying vec2 v_uv;
  float bell(vec2 p,vec2 c,vec2 r){vec2 d=(p-c)/r;return exp(-dot(d,d)*2.0);}
  void main(){
    vec2 p=a_source, q=p;
    v_uv=p/u_size;
    if(u_layer< -0.5){}
    else if(u_layer<0.5){q+=u_view*vec2(3.0,2.0);}
    else if(u_layer<1.5){
      // Character + paper is one continuous textured surface. Region fields
      // preserve clothing continuity; paper/hands/seat have explicit zero weights.
      float active=1.0-a_pin;
      float head=1.0-smoothstep(340.0,495.0,p.y);
      float neck=bell(p,vec2(630.0,410.0),vec2(220.0,180.0));
      float chest=bell(p,vec2(577.0,785.0),vec2(165.0,205.0));
      float shoulder=bell(p,vec2(815.0,528.0),vec2(170.0,210.0));
      float torso=bell(p,vec2(721.0,789.0),vec2(310.0,430.0));
      float cheek=bell(p,vec2(392.0,333.0),vec2(170.0,155.0));
      float legacyHair=bell(p,vec2(246.0,367.0),vec2(110.0,210.0));
      // Front loose strand: fixed roots, progressively freer tips, away from glasses/face.
      float tipT=clamp((p.y-275.0)/205.0,0.0,1.0);
      float strand=(p.x-(191.0+53.0*tipT))/36.0;
      float tip=exp(-2.0*strand*strand)*smoothstep(285.0,465.0,p.y)*(1.0-smoothstep(480.0,515.0,p.y));
      float hair=mix(legacyHair,tip,u_tipMode);
      float depth=19.0*torso+11.0*shoulder+20.0*chest+head*(11.0+13.0*cheek);
      vec2 turn=vec2(u_view.x*depth, u_view.y*depth*0.63);
      // Small cross-section compression changes width while retaining the source face.
      turn.x+=(p.x-560.0)*(-0.006*u_view.x)*head;
      turn.y+=(p.x-650.0)*u_view.y*0.008*torso;
      vec2 inertia=u_body*(0.32+0.68*torso+0.22*neck);
      inertia+=u_chest*chest;
      inertia+=u_hair*hair;
      inertia+=u_body*0.3*head;
      q+=(turn+inertia*u_motionGain)*active;
    }
    else if(u_layer>2.5){q+=u_view*vec2(4.0,2.5);}
    gl_Position=vec4(q.x*u_ndcScale.x+u_ndcOffset.x,q.y*u_ndcScale.y+u_ndcOffset.y,0.0,1.0);
  }
