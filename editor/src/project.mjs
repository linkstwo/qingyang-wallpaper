// 轻漾 2.5D 编辑器：工程文档模型。
// 工程文件是唯一可编辑事实来源（JSON、带格式版本号）；渲染/物理/导出全部由它驱动。
// 区域场/弹簧默认值提取自已验收样片 character-prototype/preview/app.mjs（只读复用，不修改原型）。

export const PROJECT_FORMAT = 'qingyang-editor-project';
export const PROJECT_VERSION = 1;

// 从 app.mjs vertex shader 提取的区域场默认参数（原图 1086x1448 像素坐标）。
// kind: 'bell'（高斯钟形）| 'smoothstepY'（纵向平滑台阶）
export const DEFAULT_REGIONS = [
  { id: 'head',     kind: 'smoothstepY', y0: 340, y1: 495, depth: 11, depthHeadGain: 13, inertia: 0.30, squeezeX: -0.006 },
  { id: 'neck',     kind: 'bell', cx: 630, cy: 410, rx: 220, ry: 180, depth: 0,  inertia: 0.22 },
  { id: 'chest',    kind: 'bell', cx: 577, cy: 785, rx: 165, ry: 205, depth: 20, inertia: 0 },
  { id: 'shoulder', kind: 'bell', cx: 815, cy: 528, rx: 170, ry: 210, depth: 11, inertia: 0 },
  { id: 'torso',    kind: 'bell', cx: 721, cy: 789, rx: 310, ry: 430, depth: 19, inertia: 0.68, squeezeY: 0.008 },
  { id: 'cheek',    kind: 'bell', cx: 392, cy: 333, rx: 170, ry: 155, depth: 0,  inertia: 0 },
  { id: 'hair',     kind: 'bell', cx: 246, cy: 367, rx: 110, ry: 210, depth: 0,  inertia: 0 },
];

export const DEFAULT_SQUEEZE = { headX: -0.006, torsoY: 0.008, pivotX: 560, pivotY: 650 };
export const DEFAULT_INERTIA_BASE = { body: 0.32, hairGain: 1.0, hairYRatio: 0.35 };

// 每层默认参数。turnViewRatio: u_view*vec2(3,2) 背景层位移比；对 layer1 由 depth 场接管。
export function defaultLayer(name, textureFile, maskFile) {
  return {
    id: 'layer-' + Math.random().toString(36).slice(2, 9),
    name,
    kind: 'character',            // character | background | foreground
    visible: true,
    locked: false,
    texture: textureFile ? { file: textureFile, sha256: null } : null,
    mask: maskFile ? { file: maskFile, featherPx: 3, cover: 1.0, mode: 'mask' } : null,
    mesh: { mode: 'full-canvas', outline: null, holes: [], edgePx: 27 },
    pins: [],                     // {name, outline:[[x,y]...], feather} —— 接触固定区
    // 坐姿支撑（与 main 分支 contact-rig.mjs contactPin 的 smooth(1240,1360,y) 一致）
    seatSupport: null,            // {y0, y1}
    vertexEdits: {},              // {"顶点索引": [dx,dy]} 手工网格编辑（稀疏）
    regions: structuredClone(DEFAULT_REGIONS),
    squeeze: { ...DEFAULT_SQUEEZE },
    inertiaBase: { ...DEFAULT_INERTIA_BASE },
    spring: { frequency: 1.6, damping: 0.22, limit: 1.0 },
    springGains: { body: 1.4, chestX: 3.4, chestY: 4.2, chestCoupling: 60, chestCouplingY: 75, hair: 2.2 },
    limits: { bodyPixels: 5, chestPixels: 7, hairPixels: 10 },
    turnViewRatio: [3, 2],
  };
}

export function createProject({ name = '未命名工程', canvas = [1086, 1448] } = {}) {
  return {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    meta: { name, created: new Date().toISOString(), modified: null, notes: '' },
    canvas: [...canvas],
    subjectId: 'editor-v1',
    layers: [],
  };
}

// 从 character-prototype 的 mesh.json 建立初始工程（导入现有 2.5D 资产）。
// 注意：mesh.json 顶层 pins 是两个矩形 region（旧字段，不参与接触权重）；
// 真正的接触固定区在 contact-rig.mjs 内联导出的 contacts（blueprint/far-hand/near-hand），
// 与 android-app/tools/export_mesh.mjs 里 contactWeights 使用的数据一致。
import { contacts as prototypeContacts } from '../../character-prototype/preview/contact-rig.mjs';

export function projectFromPrototypeMesh(config) {
  const p = createProject({ name: 'reading-v2 导入', canvas: config.canvas });
  p.subjectId = config.subjectId ?? p.subjectId;
  p.meta.notes = '从 character-prototype/preview/mesh.json 导入；viewportPins=' + JSON.stringify(config.pins ?? []);
  const character = defaultLayer('人物', 'original.png', 'mask.png');
  character.kind = 'character';
  character.regions = structuredClone(DEFAULT_REGIONS);
  character.pins = structuredClone(prototypeContacts);
  character.seatSupport = { y0: 1240, y1: 1360 };
  if (config.springs) {
    const s = config.springs.body ?? config.springs.hair ?? Object.values(config.springs)[0];
    if (s) character.spring = { ...character.spring, ...s };
  }
  if (config.limits) character.limits = { ...character.limits, ...config.limits };
  const background = defaultLayer('背景补绘', config.background ?? 'background.png', null);
  background.kind = 'background';
  background.mesh = { mode: 'quad', outline: null, holes: [], edgePx: 27 };
  const foreground = defaultLayer('前景（图纸）', 'original.png', null);
  foreground.kind = 'foreground';
  foreground.mesh = {
    mode: 'outline',
    outline: config.foregroundOutline ? structuredClone(config.foregroundOutline) : null,
    holes: [], edgePx: 80,
  };
  p.layers = [background, character, foreground];
  return p;
}

export function validateProject(p) {
  const errors = [];
  if (!p || typeof p !== 'object') return ['工程数据不是对象'];
  if (p.format !== PROJECT_FORMAT) errors.push(`format 应为 ${PROJECT_FORMAT}，实际 ${p.format}`);
  if (p.version !== PROJECT_VERSION) errors.push(`不支持的工程版本 ${p.version}（当前 ${PROJECT_VERSION}）`);
  if (!Array.isArray(p.canvas) || p.canvas.length !== 2 || p.canvas.some(v => !Number.isFinite(v) || v <= 0)) errors.push('canvas 应为 [宽,高]');
  if (!Array.isArray(p.layers) || p.layers.length === 0) errors.push('layers 必须是非空数组');
  for (const layer of p.layers ?? []) {
    if (!layer.id || !layer.name) errors.push(`图层缺少 id/name: ${JSON.stringify(layer.name ?? layer.id ?? '?')}`);
    for (const r of layer.regions ?? []) {
      if (r.kind === 'bell' && [r.cx, r.cy, r.rx, r.ry].some(v => !Number.isFinite(v))) errors.push(`区域 ${r.id} bell 参数不完整`);
      if (r.kind === 'smoothstepY' && ![r.y0, r.y1].every(Number.isFinite)) errors.push(`区域 ${r.id} smoothstepY 参数不完整`);
    }
    for (const [i, pin] of (layer.pins ?? []).entries()) {
      if (!Array.isArray(pin.outline) || pin.outline.length < 3) errors.push(`接触区 #${i} (${pin.name ?? '?'}) outline 至少 3 个点`);
    }
    const sp = layer.spring ?? {};
    if (![sp.frequency, sp.damping, sp.limit].every(Number.isFinite)) errors.push(`图层 ${layer.name} 弹簧参数不完整`);
  }
  return errors;
}

export function serializeProject(p) {
  const clone = structuredClone(p);
  clone.meta.modified = new Date().toISOString();
  return JSON.stringify(clone, null, 1);
}

export function loadProject(text) {
  let p;
  try { p = JSON.parse(text); } catch (e) { throw new Error('工程文件不是合法 JSON: ' + e.message); }
  const errors = validateProject(p);
  if (errors.length) throw new Error('工程文件校验失败:\n- ' + errors.join('\n- '));
  return p;
}

// 查找图层
export function findLayer(p, id) { return p.layers.find(l => l.id === id) ?? null; }
