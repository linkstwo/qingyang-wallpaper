// 错误直接显示在页面状态行（研究工具自诊断，与 view-workbench 同约定）
window.addEventListener('error', e => { const el = document.querySelector('#state'); if (el) el.textContent = '页面错误: ' + e.message + ' @' + (e.lineno ?? '?'); });
window.addEventListener('unhandledrejection', e => { const el = document.querySelector('#state'); if (el) el.textContent = '异步错误: ' + String(e.reason && e.reason.message || e.reason).slice(0, 160); });
import { VIEW_STUDY_DATA } from './view-study-data.mjs';

// 身位对与锚点对应（跨图锚名不同的手工映射；若接融结果扭曲=对应猜错，翻转即可）
const PAIRS = {
  'fv-mf': { from: 'fv', to: 'mf', map: { face: 'face', bun: 'bun', shoulderL: 'shoulderL', shoulderR: 'shoulderR', chest: 'chest', waist: 'waist', handPaper: 'handPaper' } },
  'mf-sd': { from: 'mf', to: 'sd', map: { face: 'face', bun: 'bun', shoulderL: 'shoulderFront', shoulderR: 'shoulderBack', chest: 'chest', waist: 'waist', handPaper: 'handPaper' } },
  'sd-bk': { from: 'sd', to: 'bk', map: { face: 'face', bun: 'bun', shoulderFront: 'shoulderR', shoulderBack: 'shoulderL', chest: 'chest', waist: 'waist', handPaper: 'handPaper' } },
};
const [W, H] = [1086, 1448];
const COLS = 44, ROWS = 56;          // 网格密度：≈25px 间距，兼顾平滑与每帧重建开销
const IDW_EPS2 = 900, IDW_MAXD = 320; // IDW ε²=30px，位移限幅 320px

main().catch(e => { const el = document.querySelector('#state'); const st = String(e && e.stack || e).split('\n').slice(0, 4).join(' | '); if (el) el.textContent = '启动错误: ' + st.slice(0, 240); console.error(e); });
function main() { return (async () => {
  const state = document.querySelector('#state');
  const data = VIEW_STUDY_DATA;
  const byId = Object.fromEntries(data.views.map(v => [v.id, v]));

  // 全分辨率优先（编辑器服务器静态直出），失败退缩略 dataURL——两路都有就永不黑屏
  const images = new Map();
  for (const v of data.views) {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error(v.id + ' 加载失败'));
      img.src = v.file;
      setTimeout(() => rej(new Error(v.id + ' 加载超时(8s)')), 8000);
    }).catch(async () => {
      const t = new Image();
      await new Promise((res, rej) => { t.onload = res; t.onerror = () => rej(new Error(v.id + ' 缩略也失败')); t.src = v.thumbDataUrl; setTimeout(() => rej(new Error(v.id + ' 缩略超时')), 6000); });
      copyImage(t, img);
    });
    images.set(v.id, img);
  }
  function copyImage(src, dst) { dst.width = src.width; dst.height = src.height; dst.src = src.src; }

  const gl = document.querySelector('#gl').getContext('webgl', { antialias: true, preserveDrawingBuffer: true });
  if (!gl) throw new Error('WebGL 不可用');
  const cv = gl.canvas; cv.width = W; cv.height = H;
  const VS = `attribute vec4 a_pu; uniform vec2 u_res; varying vec2 v_uv;
    void main(){ vec2 c=(a_pu.xy/u_res)*2.0-1.0; gl_Position=vec4(c.x, -c.y, 0.0, 1.0); v_uv=a_pu.zw; }`;
  const FS = `precision mediump float; uniform sampler2D u_tex; uniform float u_alpha; varying vec2 v_uv;
    void main(){ vec4 c=texture2D(u_tex, v_uv); gl_FragColor=vec4(c.rgb*u_alpha, c.a*u_alpha); }`;
  const prog = build(gl, VS, FS); gl.useProgram(prog);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // 预乘输出（FS 已乘 alpha）
  gl.uniform2f(gl.getUniformLocation(prog, 'u_res'), W, H);
  const U_TEX = gl.getUniformLocation(prog, 'u_tex'), U_ALPHA = gl.getUniformLocation(prog, 'u_alpha'), A_PU = gl.getAttribLocation(prog, 'a_pu');
  const tex = id => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images.get(id)); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
  const textures = { fv: tex('fv'), mf: tex('mf'), sd: tex('sd'), bk: tex('bk') };

  // 网格：节点在 from 图空间的规则网格 + 三角索引（复用）
  const NX = COLS + 1, NY = ROWS + 1, node = (i, j) => j * NX + i;
  const basePos = new Float32Array(NX * NY * 2);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const o = node(i, j) * 2; basePos[o] = i * W / COLS; basePos[o + 1] = j * H / ROWS; }
  const idx = new Uint16Array(COLS * ROWS * 6);
  { let k = 0; for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) { const a = node(i, j), b = a + 1, c = a + NX, d = c + 1; idx[k++] = a; idx[k++] = b; idx[k++] = c; idx[k++] = b; idx[k++] = d; idx[k++] = c; } }
  const ibo = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  const vbo = gl.createBuffer();
  const bufFrom = new Float32Array(NX * NY * 4), bufTo = new Float32Array(NX * NY * 4);

  function pairData(key) {
    const p = PAIRS[key], V = byId[p.from], T = byId[p.to];
    const pairs = Object.entries(p.map).map(([k, tk]) => ({ name: k, a: V.anchors[k], b: T.anchors[tk] })).filter(q => q.a && q.b);
    // 每节点 IDW 位移 + 人物轮廓内权重（3×3 超采样软化）
    const disp = new Float32Array(NX * NY * 2), mw = new Float32Array(NX * NY);
    const outlines = [V.outline, T.outline].filter(Boolean);
    for (let n = 0; n < NX * NY; n++) {
      const px = basePos[n * 2], py = basePos[n * 2 + 1];
      let sw = 0, dx = 0, dy = 0;
      for (const q of pairs) { const w = 1 / ((px - q.a[0]) ** 2 + (py - q.a[1]) ** 2 + IDW_EPS2); sw += w; dx += w * (q.b[0] - q.a[0]); dy += w * (q.b[1] - q.a[1]); }
      let ddx = sw > 0 ? dx / sw : 0, ddy = sw > 0 ? dy / sw : 0;
      const len = Math.hypot(ddx, ddy); if (len > IDW_MAXD) { ddx *= IDW_MAXD / len; ddy *= IDW_MAXD / len; }
      disp[n * 2] = ddx; disp[n * 2 + 1] = ddy;
      if (outlines.length) { let inside = 0; const cs = 14; for (let sy = -1; sy <= 1; sy++) for (let sx = -1; sx <= 1; sx++) { const x = px + sx * cs, y = py + sy * cs; for (const o of outlines) if (inPoly(x, y, o)) { inside++; break; } } mw[n] = inside / 9; }
      else mw[n] = 1;
    }
    return { key, pairs, disp, mw, from: p.from, to: p.to, meanDelta: pairs.reduce((s, q) => s + Math.hypot(q.b[0] - q.a[0], q.b[1] - q.a[1]), 0) / pairs.length };
  }
  function inPoly(x, y, poly) { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside; } return inside; }

  let current = null;
  function setPair(key) { current = pairData(key); }
  function draw(t, opts) {
    const useMask = opts.maskWeight;
    // 精确交叉融合：底层（from）画满 alpha=1，上层（to）画 alpha=t → 结果恒等于 (1-t)·from + t·to。
    // 若两层各画 1-t/t，over 合成会把上层衰减成 t·(1-t)（实测 0.5/0.25 + 25% 黑底透出）。
    const alphaFrom = 1, alphaTo = t;
    for (let n = 0; n < NX * NY; n++) {
      const px = basePos[n * 2], py = basePos[n * 2 + 1];
      const w = useMask ? current.mw[n] : 1;
      const ox = current.disp[n * 2] * t * w, oy = current.disp[n * 2 + 1] * t * w;
      const oF = n * 4, oT = n * 4;
      bufFrom[oF] = px + ox; bufFrom[oF + 1] = py + oy; bufFrom[oF + 2] = px / W; bufFrom[oF + 3] = py / H;
      bufTo[oT] = px + ox; bufTo[oT + 1] = py + oy; bufTo[oT + 2] = (px + current.disp[n * 2]) / W; bufTo[oT + 3] = (py + current.disp[n * 2 + 1]) / H;
    }
    gl.viewport(0, 0, W, H); gl.clearColor(0.05, 0.05, 0.06, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    drawLayer(textures[current.from], bufFrom, alphaFrom);
    drawLayer(textures[current.to], bufTo, alphaTo);
    document.querySelector('#tval').textContent = (+t).toFixed(2);
  }
  function drawLayer(texture, buf, alpha) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1f(U_ALPHA, alpha);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, buf, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(A_PU); gl.vertexAttribPointer(A_PU, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
  }
  function build(gl, vsSrc, fsSrc) {
    const c = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram(); gl.attachShader(p, c(gl.VERTEX_SHADER, vsSrc)); gl.attachShader(p, c(gl.FRAGMENT_SHADER, fsSrc)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p)); return p;
  }

  // 锚点叠加层
  const oc = document.querySelector('#overlay'); const octx = oc.getContext('2d');
  function overlay(t) {
    oc.width = oc.clientWidth; oc.height = oc.clientHeight;
    const sx = oc.width / W, sy = oc.height / H;
    octx.clearRect(0, 0, oc.width, oc.height);
    if (!document.querySelector('#anchors').checked || !current) return;
    octx.font = '11px system-ui';
    for (const q of current.pairs) {
      const x = (q.a[0] + t * (q.b[0] - q.a[0])) * sx, y = (q.a[1] + t * (q.b[1] - q.a[1])) * sy;
      octx.strokeStyle = 'rgba(120,255,170,.9)'; octx.beginPath(); octx.arc(x, y, 4, 0, Math.PI * 2); octx.stroke();
      octx.fillStyle = 'rgba(120,255,170,.9)'; octx.fillText(q.name, x + 6, y - 4);
    }
  }

  // 交互
  const slider = document.querySelector('#t');
  setPair(document.querySelector('#pair').value);
  document.querySelector('#pair').onchange = e => { setPair(e.target.value); render(+slider.value / 1000); };
  slider.oninput = () => { document.querySelector('#auto').checked = false; render(+slider.value / 1000); };
  for (const id of ['anchors', 'maskw']) document.querySelector('#' + id).onchange = () => render(+slider.value / 1000);
  let autoT = 0;
  function render(t, opts) {
    draw(t, { maskWeight: document.querySelector('#maskw').checked });
    overlay(t);
  }
  function frame(now) {
    if (document.querySelector('#auto').checked) {
      autoT = 0.5 - 0.5 * Math.cos(now / 1000 * 0.8);
      slider.value = Math.round(autoT * 1000);
      render(autoT);
    }
    requestAnimationFrame(frame);
  }
  render(0);
  requestAnimationFrame(frame);
  state.textContent = `就绪 · ${Object.keys(PAIRS).length} 组身位对 · 全分辨率=${images.get('fv').width === W ? '是' : '否（缩略回退）'} · 拖动滑杆或自动摆动观察接融`;
  // 自动化验收钩子
  window.__poseBlend = {
    setT: v => { document.querySelector('#auto').checked = false; slider.value = Math.round(v * 1000); render(v); },
    info: () => ({ pair: current.key, from: current.from, to: current.to, pairs: current.pairs.length, meanDeltaPx: +current.meanDelta.toFixed(1) }),
    ready: true,
  };
})(); }
