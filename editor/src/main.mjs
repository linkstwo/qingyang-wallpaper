// 轻漾 2.5D 编辑器：主控制器。装配 UI、导入资产、画布交互、物理预览、工程读写。
// 依赖：project.mjs（文档模型）、geometry.mjs、contacts.mjs、physics.mjs、history.mjs、gl-scene.mjs、mask-editor.mjs。

import { createProject, projectFromPrototypeMesh, validateProject, serializeProject, loadProject, findLayer, PROJECT_FORMAT, PROJECT_VERSION } from './project.mjs';
import { buildLayerMesh, weldIndex, applyVertexEdits, pickVertex, checkMeshQuality, triangleCount } from './geometry.mjs';
import { layerContactWeights, layerPin } from './contacts.mjs';
import { SpringBank, ViewTracker } from './physics.mjs';
import { demoInput, clamp } from '../../character-prototype/preview/rig.mjs';
import { createRenderer, regionUniforms } from './gl-scene.mjs';
import { History } from './history.mjs';
import { createMaskCanvas, fillPolygon, paintStroke, featherMask, maskCoverage, maskToBlob } from './mask-editor.mjs';
import { createTrack, recordSample, sampleTrack, compareFps } from './input-recorder.mjs';
import { cropWindow, anchorVisibility, framingComparison, waistVerdict, FRAMING_PRESETS } from './framing.mjs';
import { viewArcPoint, CONTINUOUS_RANGE, VIEW_ARC_GAPS } from './view-arc.mjs';

const $ = (sel) => document.querySelector(sel);
const statusEl = $('#statusbar');
let statusTimer = null;
function say(msg, kind = 'info') {
  statusEl.textContent = msg;
  statusEl.dataset.kind = kind;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { if (statusEl.dataset.kind === 'info') statusEl.textContent = '就绪'; }, 6000);
}

// ---------- 全局状态 ----------
const state = {
  project: null,
  selectedLayerId: null,
  tool: 'select',            // select | maskPoly | maskBrush | maskErase
  renderer: null,
  meshes: new Map(),         // layerId → {positions, weld, pins}
  masks: new Map(),          // layerId → {canvas, ctx}
  assets: new Map(),         // name → {image, url}
  history: new History(100),
  editAmount: 0,             // 预览时渐变到 1（编辑态 0.6 保持可见）
  playing: false, demoStart: null, paused: false, fixedTime: null,
  springs: null, tracker: new ViewTracker(),
  visual: [0, 0, 0, 0, 0, 0],
  view: { x: 0, y: 0 },
  maskPoly: [],              // 正在绘制中的多边形
  dragging: null,            // {slot, layerId}
  hoverSlot: -1,
  showMesh: true,
  frameRatio: 'off', frameOffset: 0.5,
  recording: null,            // 录制中的轨迹
  playTrack: null,            // 回放中的轨迹
  playTrackStart: null,
  overlayScale: 1, overlayOX: 0, overlayOY: 0,
};

const PROTOTYPE = '../character-prototype/preview/';

async function loadImage(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

function selectedLayer() { return findLayer(state.project, state.selectedLayerId); }

// ---------- 网格/几何同步 ----------
function rebuildLayerMesh(layer) {
  const positions = buildLayerMesh(layer, state.project.canvas);
  const weld = weldIndex(positions);
  const pins = layer.kind === 'character' ? layerContactWeights(layer, positions) : new Float32Array(positions.length / 2);
  state.meshes.set(layer.id, { positions, weld, pins });
  return state.meshes.get(layer.id);
}

function pushGeometryToRenderer() {
  const r = state.renderer;
  if (!r) return;
  const charLayer = state.project.layers.find(l => l.kind === 'character');
  const fgLayer = state.project.layers.find(l => l.kind === 'foreground');
  const [W, H] = state.project.canvas;
  r.setQuad(new Float32Array([0, 0, W, 0, 0, H, 0, H, W, 0, W, H]));
  if (charLayer) {
    const m = state.meshes.get(charLayer.id);
    const edited = applyVertexEdits(m.positions, charLayer.vertexEdits ?? {}, m.weld);
    const edits = new Float32Array(m.positions.length);
    for (const [k, [dx, dy]] of Object.entries(charLayer.vertexEdits ?? {})) {
      const s = Number(k);
      if (Number.isInteger(s) && s * 2 < edits.length) { edits[s * 2] = dx; edits[s * 2 + 1] = dy; }
    }
    r.setCharacterData(edited, m.pins, edits);
  }
  if (fgLayer) {
    const m = state.meshes.get(fgLayer.id);
    if (m) r.setForegroundData(applyVertexEdits(m.positions, fgLayer.vertexEdits ?? {}, m.weld));
  }
}

// ---------- 渲染循环 ----------
let lastFrame = performance.now();
function frame(now) {
  const dt = clamp((now - lastFrame) / 1000, 1 / 240, 1 / 20);
  lastFrame = now;
  const layer = selectedLayer();
  // 物理每帧推进：播放源（轨迹/演示）在播放时接管 target；滑杆/指针随时可改 target，
  // 静止时 target=view、角加速度为 0 → 弹簧自然回 0，不产生额外位移。
  if (state.playing && !state.paused) {
    if (state.playTrack !== null) {
      const t = (now - state.playTrackStart) / 1000;
      const d = sampleTrack(state.playTrack, t);
      state.tracker.target = d;
      $('#phase').textContent = `轨迹回放 ${state.playTrack.name} t=${t.toFixed(2)}s`;
    } else if (state.demoStart !== null) {
      const t = (now - state.demoStart) / 1000;
      const d = demoInput(t);
      state.tracker.target = { x: d.x, y: d.y };
      $('#phase').textContent = d.phase;
      if (d.done) { state.demoStart = null; stopPlay(); }
    }
  }
  {
    const [ax, ay] = state.tracker.update(state.tracker.target, dt);
    if (layer?.kind === 'character') {
      state.visual = state.springs.step(ax, ay, layer.springGains, layer.limits, dt);
    }
  }
  state.view = state.tracker.view;
  if (state.renderer && state.project) {
    const charLayer = state.project.layers.find(l => l.kind === 'character');
    const speed = Math.hypot(state.view.x, state.view.y);
    const cover = clamp(speed * 100 + Math.max(...state.visual.map(Math.abs)) * 3, 0, 1);
    state.renderer.render({
      view: state.view, body: [state.visual[0], state.visual[1]], chest: [state.visual[2], state.visual[3]],
      hair: state.visual[4], hairTip: state.visual[5] ?? 0, cover,
      regionUniforms: regionUniforms(charLayer ?? { regions: [] }),
      editAmount: state.editAmount,
      visibility: Object.fromEntries(state.project.layers.map(l => [l.kind === 'background' ? 'bg' : l.kind === 'character' ? 'char' : 'fg', l.visible])),
    });
    drawOverlay();
    const fps = state.playing ? Math.round(1 / dt) : '—';
    $('#stats').textContent = `${triangleCount(state.meshes.get(charLayer?.id ?? '')?.positions ?? new Float32Array(0))} 三角形 · 预览 ${fps} fps · 视角 ${state.view.x.toFixed(3)}, ${state.view.y.toFixed(3)} · 位移 px [${state.visual.map(v => v.toFixed(2)).join(', ')}]`;
  }
  requestAnimationFrame(frame);
}

// ---------- overlay（网格/控制点/蒙版多边形） ----------
function overlayTransform() {
  const stage = $('#stage');
  const [W, H] = state.project.canvas;
  const scale = Math.min(stage.clientWidth / W, stage.clientHeight / H);
  const ox = (stage.clientWidth - W * scale) / 2, oy = (stage.clientHeight - H * scale) / 2;
  state.overlayScale = scale; state.overlayOX = ox; state.overlayOY = oy;
  return { scale, ox, oy };
}

function drawOverlay() {
  const cv = $('#overlay');
  const stage = $('#stage');
  if (cv.width !== stage.clientWidth * devicePixelRatio || cv.height !== stage.clientHeight * devicePixelRatio) {
    cv.width = Math.round(stage.clientWidth * devicePixelRatio);
    cv.height = Math.round(stage.clientHeight * devicePixelRatio);
  }
  const ctx = cv.getContext('2d');
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  if (!state.project) return;
  const { scale, ox, oy } = overlayTransform();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);

  const layer = selectedLayer();
  if (layer && state.showMesh) {
    const m = state.meshes.get(layer.id);
    if (m) {
      const edited = applyVertexEdits(m.positions, layer.vertexEdits ?? {}, m.weld);
      ctx.strokeStyle = 'rgba(80, 220, 255, 0.16)';
      ctx.lineWidth = 1 / scale;
      ctx.beginPath();
      for (let t = 0; t < edited.length; t += 6) {
        ctx.moveTo(edited[t], edited[t + 1]);
        ctx.lineTo(edited[t + 2], edited[t + 3]);
        ctx.lineTo(edited[t + 4], edited[t + 5]);
        ctx.closePath();
      }
      ctx.stroke();
      // 控制点（weld 组中心）
      ctx.fillStyle = 'rgba(80, 220, 255, 0.85)';
      for (const list of m.weld.values()) {
        const s = list[0];
        ctx.fillRect(edited[s * 2] - 2 / scale, edited[s * 2 + 1] - 2 / scale, 4 / scale, 4 / scale);
      }
      // pin=1 的点标红
      ctx.fillStyle = 'rgba(255, 90, 90, 0.9)';
      for (const list of m.weld.values()) {
        const s = list[0];
        if (m.pins[s] > 0.9999) ctx.fillRect(edited[s * 2] - 2 / scale, edited[s * 2 + 1] - 2 / scale, 4 / scale, 4 / scale);
      }
      if (state.hoverSlot >= 0) {
        const s = state.hoverSlot;
        ctx.strokeStyle = '#ffd54a';
        ctx.lineWidth = 2 / scale;
        ctx.beginPath();
        ctx.arc(edited[s * 2], edited[s * 2 + 1], 7 / scale, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // pin 区域轮廓
    ctx.strokeStyle = 'rgba(255, 120, 120, 0.9)';
    ctx.lineWidth = 2 / scale;
    for (const pin of layer.pins ?? []) {
      ctx.beginPath();
      pin.outline.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath();
      ctx.stroke();
    }
  }
  // 手机画幅安全框（C13）
  if (state.frameRatio !== 'off') {
    const preset = FRAMING_PRESETS.find(f => f.id === state.frameRatio);
    if (preset) {
      const win = cropWindow(state.project.canvas, preset.ratio, state.frameOffset);
      ctx.strokeStyle = 'rgba(255, 210, 80, 0.9)';
      ctx.lineWidth = 2 / scale;
      ctx.setLineDash([10 / scale, 6 / scale]);
      ctx.strokeRect(win.x0, win.y0, win.x1 - win.x0, win.y1 - win.y0);
      ctx.setLineDash([]);
      // 关键锚点
      for (const a of anchorVisibility(win)) {
        ctx.fillStyle = a.visible ? 'rgba(120, 255, 140, 0.9)' : a.clipped ? 'rgba(255, 200, 80, 0.9)' : 'rgba(255, 90, 90, 0.9)';
        ctx.beginPath();
        ctx.arc(a.x, a.y, 5 / scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // 正在画的多边形
  if (state.maskPoly.length) {
    ctx.strokeStyle = '#7CFC00';
    ctx.fillStyle = 'rgba(124, 252, 0, 0.15)';
    ctx.lineWidth = 2 / scale;
    ctx.beginPath();
    state.maskPoly.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    if (state.maskPoly.length > 2) ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

// ---------- 历史 ----------
function commit(label) {
  const ok = state.history.commit(serializeProject(state.project));
  if (ok) { refreshHistoryButtons(); say(label + '（已入撤销栈）'); }
  refreshUI();
}
function refreshHistoryButtons() {
  const s = state.history.stats();
  $('#undoBtn').disabled = !state.history.canUndo();
  $('#redoBtn').disabled = !state.history.canRedo();
  $('#histInfo').textContent = `撤销 ${s.undo} / 重做 ${s.redo}`;
}

// ---------- UI 刷新 ----------
function refreshUI() {
  // 图层树
  const tree = $('#layerTree');
  tree.innerHTML = '';
  for (const layer of [...state.project.layers].reverse()) {
    const row = document.createElement('div');
    row.className = 'layer-row' + (layer.id === state.selectedLayerId ? ' selected' : '');
    const name = document.createElement('span');
    name.textContent = layer.name + `（${layer.kind}）`;
    name.onclick = () => { state.selectedLayerId = layer.id; refreshUI(); drawOverlay(); };
    const eye = document.createElement('button');
    eye.textContent = layer.visible ? '👁' : '—';
    eye.title = '显示/隐藏';
    eye.onclick = () => { layer.visible = !layer.visible; commit(layer.visible ? '显示图层 ' + layer.name : '隐藏图层 ' + layer.name); };
    row.append(name, eye);
    tree.append(row);
  }
  buildPropertyPanel();
  refreshTrackSelector();
}

function numInput(label, value, oncommit, step = 0.01, min = -1e6, max = 1e6) {
  const wrap = document.createElement('label');
  wrap.className = 'prop-row';
  const span = document.createElement('span');
  span.textContent = label;
  const input = document.createElement('input');
  input.type = 'number';
  input.step = String(step);
  input.value = String(value);
  input.onchange = () => {
    const v = Number(input.value);
    if (!Number.isFinite(v)) { say('输入不是数字，已还原', 'warn'); input.value = String(value); return; }
    if (v < min || v > max) { say(`超出范围 [${min}, ${max}]，已还原`, 'warn'); input.value = String(value); return; }
    oncommit(v);
  };
  wrap.append(span, input);
  return wrap;
}

function buildPropertyPanel() {
  const panel = $('#props');
  panel.innerHTML = '';
  const layer = selectedLayer();
  if (!layer) { panel.textContent = '未选择图层'; return; }
  const h = document.createElement('h3');
  h.textContent = `属性 · ${layer.name}`;
  panel.append(h);

  // 弹簧参数（B8：body/chest/hair/hairTip 四组独立）
  const springsCfg = layer.springs ?? { body: layer.spring, chest: layer.spring, hair: layer.spring };
  const sec1 = document.createElement('h4'); sec1.textContent = '弹簧（四组独立：频率/阻尼/限幅）'; panel.append(sec1);
  for (const groupName of Object.keys(springsCfg)) {
    const box = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = groupName;
    box.append(sum);
    const cfg = springsCfg[groupName];
    box.append(
      numInput('频率 Hz', cfg.frequency, v => { cfg.frequency = v; commit('弹簧 ' + groupName + ' 频率=' + v); }, 0.05, 0.1, 12),
      numInput('阻尼比', cfg.damping, v => { cfg.damping = v; commit('弹簧 ' + groupName + ' 阻尼=' + v); }, 0.01, 0.01, 2),
      numInput('限幅', cfg.limit, v => { cfg.limit = v; commit('弹簧 ' + groupName + ' 限幅=' + v); }, 0.1, 0.05, 10),
    );
    panel.append(box);
  }
  // 位移上限
  const sec2 = document.createElement('h4'); sec2.textContent = '位移上限（像素）'; panel.append(sec2);
  panel.append(
    numInput('躯干', layer.limits.bodyPixels, v => { layer.limits.bodyPixels = v; commit('躯干上限=' + v); }, 1, 0, 60),
    numInput('胸部', layer.limits.chestPixels, v => { layer.limits.chestPixels = v; commit('胸部上限=' + v); }, 1, 0, 60),
    numInput('头发', layer.limits.hairPixels, v => { layer.limits.hairPixels = v; commit('头发上限=' + v); }, 1, 0, 60),
    numInput('发梢', layer.limits.hairTipPixels ?? 14, v => { layer.limits.hairTipPixels = v; commit('发梢上限=' + v); }, 1, 0, 60),
  );
  // 弹簧增益
  const sec3 = document.createElement('h4'); sec3.textContent = '激发增益'; panel.append(sec3);
  if (layer.springGains.hairTip === undefined) layer.springGains.hairTip = 3.0;
  for (const key of Object.keys(layer.springGains)) {
    panel.append(numInput(key, layer.springGains[key], v => { layer.springGains[key] = v; commit('增益 ' + key + '=' + v); }, 0.1, 0, 50));
  }
  // 区域场
  const sec4 = document.createElement('h4'); sec4.textContent = '区域场（形变分布）'; panel.append(sec4);
  for (const region of layer.regions) {
    const box = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = region.id;
    box.append(sum);
    if (region.kind === 'bell') {
      box.append(
        numInput('cx', region.cx, v => { region.cx = v; commit(region.id + '.cx=' + v); }, 5),
        numInput('cy', region.cy, v => { region.cy = v; commit(region.id + '.cy=' + v); }, 5),
        numInput('rx', region.rx, v => { region.rx = v; commit(region.id + '.rx=' + v); }, 5, 1),
        numInput('ry', region.ry, v => { region.ry = v; commit(region.id + '.ry=' + v); }, 5, 1),
      );
    } else {
      box.append(
        numInput('y0', region.y0, v => { region.y0 = v; commit(region.id + '.y0=' + v); }, 5),
        numInput('y1', region.y1, v => { region.y1 = v; commit(region.id + '.y1=' + v); }, 5),
      );
    }
    box.append(
      numInput('depth', region.depth ?? 0, v => { region.depth = v; commit(region.id + '.depth=' + v); }, 0.5),
      numInput('inertia', region.inertia ?? 0, v => { region.inertia = v; commit(region.id + '.inertia=' + v); }, 0.01),
    );
    panel.append(box);
  }
  // 接触区
  const sec5 = document.createElement('h4'); sec5.textContent = '接触固定区（pins）'; panel.append(sec5);
  if (!(layer.pins ?? []).length) { const p = document.createElement('p'); p.className = 'hint'; p.textContent = '无（用蒙版多边形工具在 pin 模式下绘制）'; panel.append(p); }
  for (const pin of layer.pins ?? []) {
    const box = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = `${pin.name}（羽化 ${pin.feather}px）`;
    box.append(sum);
    box.append(numInput('羽化 px', pin.feather, v => {
      pin.feather = v; rebuildLayerMesh(layer); pushGeometryToRenderer(); commit('接触区 ' + pin.name + ' 羽化=' + v);
    }, 1, 0, 300));
    panel.append(box);
  }
  // 网格编辑
  const sec6 = document.createElement('h4'); sec6.textContent = '手工网格编辑'; panel.append(sec6);
  const editCount = Object.keys(layer.vertexEdits ?? {}).length;
  const info = document.createElement('p');
  info.className = 'hint';
  info.textContent = editCount ? `${editCount} 个点已移动` : '无编辑（选择工具下拖动画布上的点）';
  const resetBtn = document.createElement('button');
  resetBtn.textContent = '重置本层全部点编辑';
  resetBtn.onclick = () => {
    if (!editCount) { say('本层没有点编辑可重置', 'warn'); return; }
    layer.vertexEdits = {};
    pushGeometryToRenderer(); commit('重置图层 ' + layer.name + ' 的点编辑');
  };
  const qualityBtn = document.createElement('button');
  qualityBtn.textContent = '检查网格质量';
  qualityBtn.onclick = () => {
    const m = state.meshes.get(layer.id);
    if (!m) return;
    const edited = applyVertexEdits(m.positions, layer.vertexEdits ?? {}, m.weld);
    const q = checkMeshQuality(edited);
    say(q.ok ? '网格质量 OK：无退化/翻转三角形' : `网格问题：退化 ${q.degenerate.length} 个，翻转 ${q.flipped.length} 个`, q.ok ? 'info' : 'warn');
  };
  panel.append(info, resetBtn, qualityBtn);
}

// ---------- 画布交互 ----------
function canvasPoint(e) {
  const stage = $('#stage');
  const r = stage.getBoundingClientRect();
  const { scale, ox, oy } = state.project ? overlayTransform() : { scale: 1, ox: 0, oy: 0 };
  return [(e.clientX - r.left - ox) / scale, (e.clientY - r.top - oy) / scale];
}

function bindCanvasEvents() {
  const stage = $('#stage');
  stage.addEventListener('pointermove', (e) => {
    if (!state.project) return;
    const [x, y] = canvasPoint(e);
    const layer = selectedLayer();
    if (state.tool === 'select' && layer) {
      const m = state.meshes.get(layer.id);
      if (m) {
        if (state.dragging) {
          const [dx, dy] = [x - state.dragging.x0, y - state.dragging.y0];
          layer.vertexEdits = layer.vertexEdits ?? {};
          layer.vertexEdits[state.dragging.slot] = [dx, dy];
          pushGeometryToRenderer();
        } else {
          const edited = applyVertexEdits(m.positions, layer.vertexEdits ?? {}, m.weld);
          state.hoverSlot = pickVertex(edited, m.weld, x, y, 12 / state.overlayScale + 8);
          if (state.hoverSlot >= 0) {
            const pin = m.pins[state.hoverSlot];
            stage.style.cursor = 'grab';
            if (pin > 0.9999) $('#hoverInfo').textContent = `顶点 ${state.hoverSlot} · 接触固定区（pin=1，拖拽它网格不动）`;
            else $('#hoverInfo').textContent = `顶点 ${state.hoverSlot} · pin=${pin.toFixed(2)}`;
          } else { stage.style.cursor = 'default'; $('#hoverInfo').textContent = ''; }
        }
      }
    } else if ((state.tool === 'maskBrush' || state.tool === 'maskErase') && state.dragging && layer) {
      const mask = state.masks.get(layer.id);
      if (mask) {
        paintStroke(mask.ctx, state.dragging.last ?? [x, y], [x, y], state.brushRadius ?? 24, state.tool === 'maskBrush' ? 1 : 0);
        state.dragging.last = [x, y];
        updateMaskTexture(layer);
      }
    }
    if (state.playing && state.tool === 'select') {
      const r = stage.getBoundingClientRect();
      state.tracker.target = { x: clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1), y: clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1) };
    }
    if (state.recording) {
      const r = stage.getBoundingClientRect();
      const x = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1), y = clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1);
      recordSample(state.recording, (performance.now() - state.recording.t0) / 1000, x, y);
    }
  });
  stage.addEventListener('pointerdown', (e) => {
    if (!state.project) return;
    const [x, y] = canvasPoint(e);
    const layer = selectedLayer();
    if (state.tool === 'select' && layer) {
      const m = state.meshes.get(layer.id);
      if (m) {
        const edited = applyVertexEdits(m.positions, layer.vertexEdits ?? {}, m.weld);
        const slot = pickVertex(edited, m.weld, x, y, 12 / state.overlayScale + 8);
        if (slot >= 0) {
          const cur = layer.vertexEdits?.[slot] ?? [0, 0];
          state.dragging = { slot, x0: x - cur[0], y0: y - cur[1], pin: m.pins[slot] };
          stage.style.cursor = 'grabbing';
        }
      }
    } else if (state.tool === 'maskPoly') {
      state.maskPoly.push([x, y]);
      drawOverlay();
    } else if (state.tool === 'maskBrush' || state.tool === 'maskErase') {
      state.dragging = { last: [x, y] };
    }
  });
  stage.addEventListener('pointerup', () => {
    const layer = selectedLayer();
    const drag = state.dragging;
    if (drag && state.tool === 'select' && layer) {
      const edit = (layer.vertexEdits ?? {})[drag.slot];
      const moved = edit && Math.hypot(edit[0], edit[1]) > 0.5;
      state.dragging = null;
      stage.style.cursor = 'default';
      if (moved) {
        if (drag.pin === 1) say('注意：该点在接触固定区（pin=1），渲染权重不会跟随移动', 'warn');
        pushGeometryToRenderer();
        commit(`移动顶点 ${drag.slot}`);
      }
    } else if (drag && (state.tool === 'maskBrush' || state.tool === 'maskErase')) {
      state.dragging = null;
      commit(state.tool === 'maskBrush' ? '蒙版画笔' : '蒙版擦除');
    }
    state.dragging = null;
  });
  stage.addEventListener('dblclick', () => {
    if (state.tool !== 'maskPoly') return;
    const layer = selectedLayer();
    if (!layer) return;
    if (state.maskPoly.length < 3) { say('多边形至少 3 个点', 'warn'); return; }
    const outline = state.maskPoly.map(([x, y]) => [Math.round(x), Math.round(y)]);
    state.maskPoly = [];
    const mode = $('#maskTarget').value;
    if (mode === 'pin') {
      const name = 'pin-' + Math.random().toString(36).slice(2, 6);
      layer.pins = layer.pins ?? [];
      layer.pins.push({ name, outline, feather: layer.pins.length ? 48 : 32 });
      rebuildLayerMesh(layer);
      pushGeometryToRenderer();
      commit(`新增接触固定区 ${name}（${outline.length} 点）`);
    } else {
      const mask = state.masks.get(layer.id);
      if (!mask) { say('该图层没有蒙版，请先在素材面板生成', 'warn'); return; }
      fillPolygon(mask.ctx, outline, 1);
      updateMaskTexture(layer);
      commit(`蒙版多边形填充（${outline.length} 点）`);
    }
  });
}

function updateMaskTexture(layer) {
  const mask = state.masks.get(layer.id);
  if (!mask || !state.renderer) return;
  const { canvas } = mask;
  // 重传蒙版纹理
  const gl = state.renderer.gl;
  gl.activeTexture(gl.TEXTURE1);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.activeTexture(gl.TEXTURE0);
  state._maskTex = tex;
}

// ---------- 工程 IO ----------
async function importPrototype() {
  const config = await fetch(PROTOTYPE + 'mesh.json').then(r => { if (!r.ok) throw new Error('mesh.json 不可读 ' + r.status); return r.json(); });
  const project = projectFromPrototypeMesh(config);
  state.project = project;
  state.selectedLayerId = project.layers.find(l => l.kind === 'character')?.id;
  for (const name of ['original.png', 'mask.png', 'background.png']) {
    state.assets.set(name, { image: await loadImage(PROTOTYPE + name), url: PROTOTYPE + name });
  }
  for (const layer of project.layers) {
    rebuildLayerMesh(layer);
    if (layer.name === '人物') {
      const src = await loadImage(PROTOTYPE + 'mask.png');
      const mask = createMaskCanvas(project.canvas[0], project.canvas[1], src);
      state.masks.set(layer.id, mask);
    }
  }
  state.history.init(serializeProject(project));
  await syncRendererImages();
  pushGeometryToRenderer();
  refreshUI();
  refreshHistoryButtons();
  say(`已导入 character-prototype 资产：${triangleCount(state.meshes.get(state.selectedLayerId).positions)} 个三角形，画布 ${project.canvas.join('x')}`);
  $('#phase').textContent = '就绪 · 播放演示/移动指针预览，或拖拽顶点编辑';
}

async function syncRendererImages() {
  const [W, H] = state.project.canvas;
  const charLayer = state.project.layers.find(l => l.kind === 'character');
  const bgLayer = state.project.layers.find(l => l.kind === 'background');
  const fgLayer = state.project.layers.find(l => l.kind === 'foreground');
  const resolve = (l) => l?.texture?.file ? state.assets.get(l.texture.file)?.image : null;
  const original = resolve(charLayer) ?? resolve(fgLayer);
  const background = resolve(bgLayer);
  const maskImg = state.masks.get(charLayer?.id)?.canvas;
  state.renderer.setImages({ original, background, mask: maskImg, foreground: original }, W, H);
}

async function startRenderer() {
  state.renderer = createRenderer($('#scene'));
  const stage = $('#stage');
  const resize = () => state.renderer.setCanvasSize(stage.clientWidth, stage.clientHeight);
  new ResizeObserver(resize).observe(stage);
  resize();
}

// ---------- 导入素材（PNG/JPG） ----------
function bindAssetImport() {
  $('#assetFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (!/\.(png|jpe?g|webp)$/i.test(file.name)) throw new Error('仅支持 PNG/JPG/WebP');
      const url = URL.createObjectURL(file);
      const image = await loadImage(url);
      const [W, H] = state.project.canvas;
      const asMask = $('#assetAsMask').checked;
      const key = 'user:' + file.name;
      state.assets.set(key, { image, url });
      const layer = selectedLayer();
      if (!layer) throw new Error('先选择一个图层');
      if (asMask) {
        const mask = createMaskCanvas(W, H, image);
        state.masks.set(layer.id, mask);
        layer.mask = { file: key, featherPx: 3, cover: 1.0, mode: 'mask' };
        updateMaskTexture(layer);
        say(`已导入 ${file.name} 作为图层「${layer.name}」蒙版（${image.width}x${image.height}）`);
      } else {
        if (image.width !== W || image.height !== H) say(`注意：图片 ${image.width}x${image.height} 与画布 ${W}x${H} 尺寸不一致，渲染会报错；建议先缩放`, 'warn');
        layer.texture = { file: key, sha256: null };
        await syncRendererImages();
        say(`已导入 ${file.name} 作为图层「${layer.name}」纹理`);
      }
      commit('导入素材 ' + file.name);
    } catch (err) {
      say('导入失败: ' + err.message, 'error');
    } finally { e.target.value = ''; }
  });
}

// ---------- 保存/打开工程 ----------
function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function bindProjectIO() {
  $('#saveBtn').onclick = () => {
    try {
      const errors = validateProject(state.project);
      if (errors.length) { say('工程有问题，保存被拦截:\n' + errors.join('; '), 'error'); return; }
      const text = serializeProject(state.project);
      downloadBlob(new Blob([text], { type: 'application/json' }), (state.project.meta.name || 'qingyang-project') + '.qingyang.json');
      say('工程已保存（JSON，含版本号 ' + PROJECT_VERSION + '）');
    } catch (e) { say('保存失败: ' + e.message, 'error'); }
  };
  $('#openBtn').onclick = () => $('#projectFile').click();
  $('#projectFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const project = loadProject(await file.text());
      state.project = project;
      state.meshes.clear(); state.masks.clear();
      state.selectedLayerId = project.layers.find(l => l.kind === 'character')?.id ?? project.layers[0].id;
      // 恢复资产引用
      for (const layer of project.layers) {
        rebuildLayerMesh(layer);
        if (layer.texture?.file?.startsWith(PROTOTYPE) || ['original.png', 'mask.png', 'background.png'].includes(layer.texture?.file ?? '')) {
          if (!state.assets.has(layer.texture.file)) state.assets.set(layer.texture.file, { image: await loadImage(PROTOTYPE + layer.texture.file), url: PROTOTYPE + layer.texture.file });
        }
        if (layer.mask?.file && !state.assets.has(layer.mask.file)) {
          state.assets.set(layer.mask.file, { image: await loadImage(PROTOTYPE + layer.mask.file), url: PROTOTYPE + layer.mask.file });
        }
        if (layer.kind === 'character' && layer.mask?.file) {
          state.masks.set(layer.id, createMaskCanvas(project.canvas[0], project.canvas[1], state.assets.get(layer.mask.file).image));
        }
      }
      state.springs = new SpringBank(selectedLayer()?.springs ?? selectedLayer()?.spring ?? { frequency: 1.6, damping: 0.22, limit: 1 });
      state.history.init(serializeProject(project));
      await syncRendererImages();
      pushGeometryToRenderer();
      refreshUI(); refreshHistoryButtons();
      say(`工程已打开：${project.meta.name}（${project.layers.length} 层）`);
    } catch (err) { say('打开失败: ' + err.message, 'error'); }
    finally { e.target.value = ''; }
  });
}

// ---------- 工具切换 / 播放控制 ----------
function setTool(tool) {
  state.tool = tool;
  state.maskPoly = [];
  for (const b of document.querySelectorAll('[data-tool]')) b.classList.toggle('active', b.dataset.tool === tool);
  $('#stage').style.cursor = tool === 'select' ? 'default' : 'crosshair';
  say('工具: ' + { select: '选择/拖拽顶点', maskPoly: '多边形（点击加点，双击闭合）', maskBrush: '蒙版画笔', maskErase: '蒙版擦除' }[tool]);
}

function stopPlay() {
  state.playing = false; state.paused = false; state.demoStart = null; state.fixedTime = null; state.playTrack = null;
  $('#playBtn').textContent = '▶ 播放演示';
  $('#phase').textContent = '已停止 · 移动指针继续手动预览';
}

function refreshTrackSelector() {
  const sel = $('#trackSel');
  sel.innerHTML = '';
  for (const [i, track] of (state.project.inputTracks ?? []).entries()) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${track.name}（${track.points.length}点）`;
    sel.append(opt);
  }
}

function bindPlayControls() {
  $('#playBtn').onclick = () => {
    if (state.playing) { state.paused = !state.paused; $('#playBtn').textContent = state.paused ? '▶ 继续' : '⏸ 暂停'; $('#phase').textContent = state.paused ? '已暂停（单步/继续可用）' : '播放中'; return; }
    state.playing = true; state.paused = false;
    state.springs?.reset(); state.tracker.reset();
    state.demoStart = performance.now();
    $('#playBtn').textContent = '⏸ 暂停';
  };
  $('#stepBtn').onclick = () => {
    if (!state.playing) { state.playing = true; state.paused = true; $('#playBtn').textContent = '▶ 继续'; }
    state.paused = true;
    state.fixedTime = (state.fixedTime ?? 0) + 1 / 60;
    const d = demoInput(state.fixedTime);
    state.tracker.target = { x: d.x, y: d.y };
    // 推进物理若干子步
    const layer = selectedLayer();
    if (layer?.kind === 'character') {
      const [ax, ay] = state.tracker.update(state.tracker.target, 1 / 60);
      state.visual = state.springs.step(ax, ay, layer.springGains, layer.limits, 1 / 60);
    }
    $('#phase').textContent = `单步 t=${state.fixedTime.toFixed(2)}s · ${d.phase}`;
  };
  $('#resetBtn').onclick = () => {
    state.springs?.reset(); state.tracker.reset(); state.visual = [0, 0, 0, 0, 0, 0];
    stopPlay();
    $('#phase').textContent = '已复位（视角与弹簧归零）';
  };
  $('#recBtn').onclick = () => {
    if (state.recording) {
      const track = state.recording; state.recording = null;
      state.project.inputTracks = state.project.inputTracks ?? [];
      track.created = new Date().toISOString();
      state.project.inputTracks.push(track);
      refreshTrackSelector();
      commit(`保存输入轨迹「${track.name}」（${track.points.length} 采样点）`);
    } else {
      state.recording = createTrack('录制 ' + new Date().toLocaleTimeString());
      state.recording.t0 = performance.now();
      stopPlay();
      say('录制中：在预览画布上移动指针……再点一次【录制】结束并保存');
    }
  };
  $('#trackSel').addEventListener('change', () => {});
  $('#playTrackBtn').onclick = () => {
    const track = state.project.inputTracks?.[Number($('#trackSel').value)];
    if (!track) { say('没有可选轨迹，先录制一条', 'warn'); return; }
    state.springs?.reset(); state.tracker.reset();
    state.playTrack = track; state.playTrackStart = performance.now();
    state.playing = true; state.paused = false; state.demoStart = null;
    $('#playBtn').textContent = '⏸ 暂停';
    const dur = track.points.length ? track.points[track.points.length - 1][0] : 0;
    setTimeout(() => { if (state.playTrack === track) { state.playTrack = null; stopPlay(); say(`轨迹回放完成（${dur.toFixed(1)}s）`); } }, (dur + 0.8) * 1000);
  };
  $('#fpsCmpBtn').onclick = () => {
    const track = state.project.inputTracks?.[Number($('#trackSel').value)];
    if (!track) { say('没有可选轨迹，先录制一条', 'warn'); return; }
    const layer = selectedLayer();
    if (!layer) return;
    try {
      const report = compareFps(track, layer);
      const line = report.entries.map(e => `${e.fps}fps: RMS差 ${e.rmsVsBase}px (${(e.rmsRatio * 100).toFixed(1)}%)`).join(' · ');
      say(`帧率对比（基准 ${report.baseFps}fps，峰值 ${report.peak.toFixed(2)}px）→ ${line}`);
      downloadBlob(new Blob([JSON.stringify({ track: track.name, report }, null, 1)], { type: 'application/json' }), 'fps-compare-' + Date.now() + '.json');
    } catch (e) { say('对比失败: ' + e.message, 'error'); }
  };
  $('#viewX').addEventListener('input', (e) => {
    const v = Number(e.target.value) / 100;
    $('#viewXVal').textContent = v.toFixed(2);
    state.tracker.target = { x: v, y: Number($('#viewY').value) / 100 };
  });
  $('#viewY').addEventListener('input', (e) => {
    const v = Number(e.target.value) / 100;
    $('#viewYVal').textContent = v.toFixed(2);
    state.tracker.target = { x: Number($('#viewX').value) / 100, y: v };
  });
  $('#baselineBtn').onclick = () => {
    $('#viewX').value = 0; $('#viewY').value = 0;
    $('#viewXVal').textContent = '0.00'; $('#viewYVal').textContent = '0.00';
    state.tracker.target = { x: 0, y: 0 };
    say('已归零到静态基线视角（0,0）——当前画面即静态基线；拖滑杆可对比连续视角形变');
  };
  $('#frameRatio').addEventListener('change', (e) => { state.frameRatio = e.target.value; });
  $('#frameOffset').addEventListener('input', (e) => { state.frameOffset = Number(e.target.value) / 100; });
  $('#framingBtn').onclick = () => {
    const preset = FRAMING_PRESETS.find(f => f.id === state.frameRatio);
    if (!preset || state.frameRatio === 'off') { say('先选择一个画幅预设', 'warn'); return; }
    const opts = framingComparison(state.project.canvas, preset.ratio);
    const lines = opts.map(o => `偏移${Math.round(o.offsetX * 100)}%: ` + o.anchors.map(a => `${a.label}${a.visible ? '✓' : a.clipped ? '边裁' : '切'}`).join(' ') + ` → ${waistVerdict(o)}`);
    say('画幅 ' + preset.label + ' 三档对照：\n' + lines.join('\n'));
    downloadBlob(new Blob([JSON.stringify({ preset: preset.label, comparison: opts, verdicts: opts.map(waistVerdict) }, null, 1)], { type: 'application/json' }), 'framing-compare-' + preset.id + '.json');
  };
  $('#editAmount').addEventListener('input', (e) => {
    state.editAmount = Number(e.target.value) / 100;
    $('#editAmountVal').textContent = state.editAmount.toFixed(2);
  });
  $('#showMesh').addEventListener('change', (e) => { state.showMesh = e.target.checked; });
  $('#brushRadius').addEventListener('input', (e) => { state.brushRadius = Number(e.target.value); $('#brushVal').textContent = e.target.value + 'px'; });
  $('#maskTarget').addEventListener('change', () => {});
}

function bindHistory() {
  $('#undoBtn').onclick = () => {
    const s = state.history.undo();
    if (!s) { say('没有可撤销的操作', 'warn'); return; }
    state.project = loadProject(s);
    state.selectedLayerId = state.project.layers.some(l => l.id === state.selectedLayerId) ? state.selectedLayerId : state.project.layers[0].id;
    for (const layer of state.project.layers) rebuildLayerMesh(layer);
    state.springs = new SpringBank(selectedLayer()?.springs ?? selectedLayer()?.spring ?? { frequency: 1.6, damping: 0.22, limit: 1 });
    pushGeometryToRenderer(); refreshUI(); refreshHistoryButtons();
    say('已撤销');
  };
  $('#redoBtn').onclick = () => {
    const s = state.history.redo();
    if (!s) { say('没有可重做的操作', 'warn'); return; }
    state.project = loadProject(s);
    for (const layer of state.project.layers) rebuildLayerMesh(layer);
    state.springs = new SpringBank(selectedLayer()?.springs ?? selectedLayer()?.spring ?? { frequency: 1.6, damping: 0.22, limit: 1 });
    pushGeometryToRenderer(); refreshUI(); refreshHistoryButtons();
    say('已重做');
  };
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? $('#redoBtn').click() : $('#undoBtn').click(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); $('#redoBtn').click(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); $('#saveBtn').click(); }
  });
}

// ---------- 启动 ----------
async function boot() {
  try {
    bindCanvasEvents(); bindAssetImport(); bindProjectIO(); bindPlayControls(); bindHistory();
    for (const b of document.querySelectorAll('[data-tool]')) b.onclick = () => setTool(b.dataset.tool);
    state.brushRadius = Number($('#brushRadius').value);
    setTool('select');
    await startRenderer();
    await importPrototype();
    const layer = selectedLayer();
    state.springs = new SpringBank(layer.springs ?? layer.spring);
    state.editAmount = Number($('#editAmount').value) / 100;
    document.body.dataset.ready = 'true';
    // 只读自动化钩子：供自动化测试/验收脚本读取工程状态（不含可变更入口）
    window.__qingyangEditor = {
      ready: () => document.body.dataset.ready === 'true',
      serialize: () => serializeProject(state.project),
      stats: () => {
        const charLayer = state.project.layers.find(l => l.kind === 'character');
        const m = state.meshes.get(charLayer?.id ?? '');
        return {
          triangles: m ? triangleCount(m.positions) : 0,
          layers: state.project.layers.length,
          selected: state.selectedLayerId,
          history: state.history.stats(),
          edits: Object.keys(charLayer?.vertexEdits ?? {}).length,
        };
      },
    };
    requestAnimationFrame(frame);
  } catch (e) {
    $('#phase').textContent = '启动失败: ' + e.message;
    $('#phase').classList.add('error');
    console.error(e);
  }
}
boot();
