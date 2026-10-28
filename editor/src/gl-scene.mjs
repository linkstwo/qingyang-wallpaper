// WebGL 场景渲染器。
// 形变公式 1:1 移植自已验收样片 character-prototype/preview/app.mjs 的 vertex shader，
// 参数化方式：7 个语义区域（head/neck/chest/shoulder/torso/cheek/hair）各有固定 uniform 槽位，
// 参数值来自工程 JSON（图层.regions / squeeze / inertiaBase），运行时可改、即时生效。
// 新增 a_edit 顶点属性承载手工网格编辑（图层.vertexEdits），u_editAmount 总开关。
// 图层顺序与 app.mjs 相同：背景原图 → 背景+mask(膨胀cover) → 人物(形变) → 前景。

export const REGION_IDS = ['head', 'neck', 'chest', 'shoulder', 'torso', 'cheek', 'hair'];

const VERT = `
precision highp float;
attribute vec2 a_source;
attribute vec2 a_edit;
attribute float a_pin;
uniform vec2 u_size, u_view, u_body, u_chest;
uniform float u_hair, u_layer, u_cover, u_editAmount;
uniform vec4 u_head;      // y0, y1, depthBase, cheekGain
uniform vec4 u_bell0;     // neck   cx,cy,rx,ry
uniform vec4 u_bell1;     // chest
uniform vec4 u_bell2;     // shoulder
uniform vec4 u_bell3;     // torso
uniform vec4 u_bell4;     // cheek
uniform vec4 u_bell5;     // hair
uniform float u_depth[7];   // head,neck,chest,shoulder,torso,cheek,hair 的 depth 权重
uniform float u_inertia[7]; // 对应惯性增益（head=0.30, neck=0.22, torso=0.68, 其余 0）
uniform vec4 u_squeeze;   // headSqueezeX, torsoSqueezeY, pivotX, pivotY
uniform vec4 u_extra;     // turnRatioY(0.63), inertiaBase(0.32), hairYRatio(0.35), headBodyGain(0.30)
varying vec2 v_uv;
float bell(vec2 p, vec4 b){ vec2 d=(p-b.xy)/b.zw; return exp(-dot(d,d)*2.0); }
void main(){
  vec2 p = a_source + u_editAmount*a_edit;
  vec2 q = p;
  v_uv = a_source/u_size;
  if (u_layer > 0.5 && u_layer < 1.5) {
    float active = 1.0 - a_pin;
    float head = 1.0 - smoothstep(u_head.x, u_head.y, p.y);
    float neck = bell(p, u_bell0);
    float chest = bell(p, u_bell1);
    float shoulder = bell(p, u_bell2);
    float torso = bell(p, u_bell3);
    float cheek = bell(p, u_bell4);
    float hair = bell(p, u_bell5);
    float depth = u_depth[2]*torso + u_depth[3]*shoulder + u_depth[1]*chest + head*(u_depth[0] + u_head.w*cheek);
    vec2 turn = vec2(u_view.x*depth, u_view.y*depth*u_extra.x);
    turn.x += (p.x-u_squeeze.z)*(u_squeeze.x*u_view.x)*head;
    turn.y += (p.x-u_squeeze.w)*(u_squeeze.y*u_view.y)*torso;
    vec2 inertia = u_body*(u_extra.y + u_inertia[4]*torso + u_inertia[1]*neck);
    inertia += u_chest*chest;
    inertia += vec2(u_hair, u_hair*u_extra.z)*hair;
    inertia += u_body*u_extra.w*head;
    q += (turn + inertia) * active;
  } else if (u_layer < 0.5) {
    q += u_view*vec2(3.0, 2.0);
  } else if (u_layer > 2.5) {
    q += u_view*vec2(4.0, 2.5);
  }
  gl_Position = vec4(q.x/u_size.x*2.0 - 1.0, 1.0 - q.y/u_size.y*2.0, 0.0, 1.0);
}`;

const FRAG = `precision highp float;varying vec2 v_uv;uniform sampler2D u_texture,u_mask;uniform float u_maskMode,u_cover;uniform vec2 u_size;
void main(){float alpha=1.0;if(u_maskMode>0.5){alpha=texture2D(u_mask,v_uv).r;if(u_maskMode>1.5){vec2 d=vec2(3.0)/u_size;alpha=max(alpha,texture2D(u_mask,v_uv+d).r);alpha=max(alpha,texture2D(u_mask,v_uv-d).r);alpha=max(alpha,texture2D(u_mask,v_uv+vec2(d.x,-d.y)).r);alpha=max(alpha,texture2D(u_mask,v_uv+vec2(-d.x,d.y)).r);alpha*=u_cover;}}gl_FragColor=vec4(texture2D(u_texture,v_uv).rgb,alpha);}`;

function compile(gl, type, text) {
  const s = gl.createShader(type);
  gl.shaderSource(s, text); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader 编译失败: ' + gl.getShaderInfoLog(s));
  return s;
}

function uploadTexture(gl, image, W, H) {
  if (image.width !== W || image.height !== H) throw new Error(`素材尺寸未对齐: ${image.width}x${image.height}，应为 ${W}x${H}`);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  return tex;
}

// regions: 工程 JSON 的 7 项数组（顺序任意，按 id 匹配）。返回 uniform 值表。
export function regionUniforms(layer) {
  const byId = Object.fromEntries((layer.regions ?? []).map(r => [r.id, r]));
  const bell = (id) => {
    const r = byId[id];
    if (!r) return [0, 0, 0, 0];
    return [r.cx ?? 0, r.cy ?? 0, r.rx ?? 0, r.ry ?? 0];
  };
  const depth = REGION_IDS.map(id => byId[id]?.depth ?? 0);
  const inertia = REGION_IDS.map(id => byId[id]?.inertia ?? 0);
  const head = byId.head ?? {};
  const squeeze = layer.squeeze ?? {};
  const base = layer.inertiaBase ?? {};
  return {
    head: [head.y0 ?? 340, head.y1 ?? 495, depth[0], head.depthHeadGain ?? 13],
    bell0: bell('neck'), bell1: bell('chest'), bell2: bell('shoulder'),
    bell3: bell('torso'), bell4: bell('cheek'), bell5: bell('hair'),
    depth, inertia,
    squeeze: [squeeze.headX ?? -0.006, squeeze.torsoY ?? 0.008, squeeze.pivotX ?? 560, squeeze.pivotY ?? 650],
    extra: [0.63, base.body ?? 0.32, base.hairYRatio ?? 0.35, head.inertia ?? 0.30],
  };
}

export function createRenderer(glCanvas) {
  const gl = glCanvas.getContext('webgl', { alpha: false, antialias: true, preserveDrawingBuffer: true });
  if (!gl) throw new Error('当前浏览器没有提供 WebGL');
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('program 链接失败: ' + gl.getProgramInfoLog(gl));
  gl.useProgram(program);
  const U = {};
  for (const n of ['size', 'view', 'body', 'chest', 'hair', 'layer', 'cover', 'editAmount', 'head', 'bell0', 'bell1', 'bell2', 'bell3', 'bell4', 'bell5', 'depth', 'inertia', 'squeeze', 'extra', 'maskMode'])
    U[n] = gl.getUniformLocation(program, 'u_' + n);
  U.texture = gl.getUniformLocation(program, 'u_texture');
  U.mask = gl.getUniformLocation(program, 'u_mask');
  const loc = { pos: gl.getAttribLocation(program, 'a_source'), edit: gl.getAttribLocation(program, 'a_edit'), pin: gl.getAttribLocation(program, 'a_pin') };
  gl.enableVertexAttribArray(loc.pos);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.uniform1i(U.texture, 0);
  gl.uniform1i(U.mask, 1);
  gl.uniform1f(U.editAmount, 1.0);

  const buffers = {
    quad: { buf: gl.createBuffer(), count: 0 },
    character: { buf: gl.createBuffer(), count: 0 },
    pins: { buf: gl.createBuffer(), count: 0 },
    edits: { buf: gl.createBuffer(), count: 0 },
    foreground: { buf: gl.createBuffer(), count: 0 },
  };
  let textures = { original: null, background: null, mask: null, foreground: null };
  let canvasW = 0, canvasH = 0;

  function setQuad(data) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.quad.buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    buffers.quad.count = data.length / 2;
  }
  function setCharacterData(positions, pins, edits) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.character.buf);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    buffers.character.count = positions.length / 2;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.pins.buf);
    gl.bufferData(gl.ARRAY_BUFFER, pins, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.edits.buf);
    gl.bufferData(gl.ARRAY_BUFFER, edits, gl.STATIC_DRAW);
  }
  function setForegroundData(positions) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.foreground.buf);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    buffers.foreground.count = positions.length / 2;
  }

  function setImages({ original, background, mask, foreground }, W, H) {
    canvasW = W; canvasH = H;
    gl.uniform2f(U.size, W, H);
    if (textures.original) gl.deleteTexture(textures.original);
    if (textures.background) gl.deleteTexture(textures.background);
    if (textures.mask) gl.deleteTexture(textures.mask);
    if (textures.foreground) gl.deleteTexture(textures.foreground);
    textures = {
      original: original ? uploadTexture(gl, original, W, H) : null,
      background: background ? uploadTexture(gl, background, W, H) : null,
      mask: mask ? uploadTexture(gl, mask, W, H) : null,
      foreground: foreground ? uploadTexture(gl, foreground, W, H) : null,
    };
    gl.activeTexture(gl.TEXTURE1);
    if (textures.mask) gl.bindTexture(gl.TEXTURE_2D, textures.mask);
    gl.activeTexture(gl.TEXTURE0);
  }

  function draw(mesh, tex, layer, maskMode = 0) {
    gl.uniform1f(U.layer, layer);
    gl.uniform1f(U.maskMode, maskMode);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    if (layer === 1) {
      gl.enableVertexAttribArray(loc.pin);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.pins.buf);
      gl.vertexAttribPointer(loc.pin, 1, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(loc.edit);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.edits.buf);
      gl.vertexAttribPointer(loc.edit, 2, gl.FLOAT, false, 0, 0);
    } else {
      gl.disableVertexAttribArray(loc.pin);
      gl.vertexAttrib1f(loc.pin, 0);
      gl.disableVertexAttribArray(loc.edit);
      gl.vertexAttrib2f(loc.edit, 0, 0);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
    gl.vertexAttribPointer(loc.pos, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
  }

  // state: {view:{x,y}, body:[bx,by], chest:[cx,cy], hair, cover, regions(uniforms from regionUniforms), visibility:{bg,char,fg}, editAmount}
  function render(state) {
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    gl.uniform2f(U.view, state.view.x, state.view.y);
    gl.uniform2f(U.body, state.body[0], state.body[1]);
    gl.uniform2f(U.chest, state.chest[0], state.chest[1]);
    gl.uniform1f(U.hair, state.hair);
    gl.uniform1f(U.cover, state.cover ?? 0);
    gl.uniform1f(U.editAmount, state.editAmount ?? 1.0);
    const ru = state.regionUniforms;
    gl.uniform4f(U.head, ...ru.head);
    gl.uniform4f(U.bell0, ...ru.bell0);
    gl.uniform4f(U.bell1, ...ru.bell1);
    gl.uniform4f(U.bell2, ...ru.bell2);
    gl.uniform4f(U.bell3, ...ru.bell3);
    gl.uniform4f(U.bell4, ...ru.bell4);
    gl.uniform4f(U.bell5, ...ru.bell5);
    gl.uniform1fv(U.depth, ru.depth);
    gl.uniform1fv(U.inertia, ru.inertia);
    gl.uniform4f(U.squeeze, ...ru.squeeze);
    gl.uniform4f(U.extra, ...ru.extra);
    gl.clearColor(0.1, 0.1, 0.1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const bgVisible = state.visibility?.bg !== false && textures.background;
    const charVisible = state.visibility?.char !== false && textures.original;
    const fgVisible = state.visibility?.fg !== false && textures.foreground;
    if (bgVisible) {
      draw(buffers.quad, textures.original, 0, 0);
      draw(buffers.quad, textures.background, 0, 2);
    }
    if (charVisible) draw(buffers.character, textures.original, 1, 1);
    if (fgVisible) draw(buffers.foreground, textures.foreground, 3, 0);
  }

  function setCanvasSize(w, h) { glCanvas.width = Math.round(w); glCanvas.height = Math.round(h); }
  function stats() { return { triangles: buffers.character.count / 3, vertices: buffers.character.count }; }

  return { gl, setQuad, setCharacterData, setForegroundData, setImages, setCanvasSize, render, stats };
}
