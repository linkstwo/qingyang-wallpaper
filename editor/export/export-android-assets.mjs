// 编辑器工程 → Android 资产管线导出器。
// 与 android-app/tools/export_mesh.mjs 相同的二进制格式（Float32LE、三角形展开顶点 + 每顶点 pin 权重），
// 但数据源是编辑器工程文件（editor/*.qingyang.json），使编辑器编辑结果可被现有 Android 管线消费。
// 用法：
//   node export-android-assets.mjs <工程文件> <输出目录>            # 导出
//   node export-android-assets.mjs <工程文件> <比对目录> --check    # 只比对不写
// 算法模块直接复用 character-prototype/preview（只读），保证与现有管线同源。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { makeMesh } from '../../character-prototype/preview/rig.mjs';
import { polygonPin } from '../../character-prototype/preview/contact-rig.mjs';
import { loadProject } from '../src/project.mjs';
import { applyVertexEdits, weldIndex } from '../src/geometry.mjs';

const [, , projectFile, outDirArg, ...rest] = process.argv;
const CHECK = rest.includes('--check');
if (!projectFile || !outDirArg) {
  console.error('用法: node export-android-assets.mjs <工程.qingyang.json> <输出目录> [--check]');
  process.exit(2);
}
const OUT = path.resolve(outDirArg);
if (!CHECK) fs.mkdirSync(OUT, { recursive: true });

const project = loadProject(fs.readFileSync(projectFile, 'utf8'));
const [W, H] = project.canvas;
const ROOT_REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const charLayer = project.layers.find(l => l.kind === 'character');
const fgLayer = project.layers.find(l => l.kind === 'foreground');
if (!charLayer) throw new Error('工程缺少 character 图层');

const seatSmooth = (a, b, y) => { const t = Math.max(0, Math.min(1, (y - a) / (b - a))); return t * t * (3 - 2 * t); };

function layerPinAt(layer, x, y) {
  let pin = 0;
  if (layer.seatSupport) pin = seatSmooth(layer.seatSupport.y0, layer.seatSupport.y1, y);
  for (const region of layer.pins ?? []) {
    if (!Array.isArray(region?.outline) || region.outline.length < 3) continue;
    pin = Math.max(pin, polygonPin(x, y, region.outline, region.feather ?? 28));
  }
  // 与 contact-rig.mjs 相同的纸张外缘 18px 锁定语义
  for (const region of layer.pins ?? []) {
    if (region.name !== 'blueprint') continue;
    let d = Infinity;
    const o = region.outline;
    for (let i = 0, j = o.length - 1; i < o.length; j = i++) {
      const [ax, ay] = o[j], [bx, by] = o[i];
      const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
      const t = len2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2)) : 0;
      d = Math.min(d, Math.hypot(x - ax - t * dx, y - ay - t * dy));
    }
    if (d < 18) pin = Math.max(pin, 1);
  }
  return pin;
}

function output(name, bytes) {
  const destination = path.join(OUT, name);
  if (CHECK) {
    if (!fs.existsSync(destination) || !fs.readFileSync(destination).equals(bytes)) {
      throw new Error(`不一致或缺失: ${name}${fs.existsSync(destination) ? '' : '（文件不存在）'}`);
    }
  } else fs.writeFileSync(destination, bytes);
}

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
function writeBin(name, arr) {
  const buf = Buffer.alloc(arr.length * 4);
  for (let i = 0; i < arr.length; i++) buf.writeFloatLE(arr[i], i * 4);
  output(name, buf);
  return { name, bytes: buf.length, sha256: sha(buf) };
}

// 人物网格：与 export_mesh.mjs 相同的全画布细分；顶点编辑（若有）在导出前应用。
const basePositions = makeMesh([[0, 0], [W, 0], [W, H], [0, H]], [], charLayer.mesh?.edgePx ?? 27);
const weld = weldIndex(basePositions);
const positions = applyVertexEdits(basePositions, charLayer.vertexEdits ?? {}, weld);
const pins = Float32Array.from({ length: positions.length / 2 }, (_, i) => layerPinAt(charLayer, basePositions[i * 2], basePositions[i * 2 + 1]));

const report = {
  source: path.basename(projectFile),
  projectFormat: `${project.format}-${project.version}`,
  canvas: [W, H],
  vertexEditsApplied: Object.keys(charLayer.vertexEdits ?? {}).length,
  bins: [
    writeBin('character_mesh.bin', positions),
    writeBin('character_pins.bin', pins),
  ],
  counts: {
    characterTriangles: positions.length / 6,
    characterVertices: positions.length / 2,
  },
  springs: charLayer.spring,
  limits: charLayer.limits,
  regions: charLayer.regions,
  pins: {
    min: Math.min(...pins),
    max: Math.max(...pins),
    pinnedCount: Array.from(pins).filter(v => v > 0.9999).length,
  },
  images: [],
};

// 前景网格（若有）
if (fgLayer?.mesh?.mode === 'outline' && fgLayer.mesh.outline) {
  const fg = makeMesh(fgLayer.mesh.outline, [], fgLayer.mesh.edgePx ?? 80);
  report.bins.push(writeBin('foreground_mesh.bin', applyVertexEdits(fg, fgLayer.vertexEdits ?? {}, weldIndex(fg))));
  report.counts.foregroundTriangles = fg.length / 6;
}

// 纹理副本：工程引用的纹理按名称复制/校验
function resolveTexture(file) {
  // 支持引用原型资产（相对仓库）或工程旁文件
  const candidates = [
    path.join(path.dirname(projectFile), file),
    path.join(path.dirname(projectFile), '..', 'character-prototype', 'preview', file),
    path.join(path.dirname(projectFile), '..', '..', 'character-prototype', 'preview', file),
    path.join(ROOT_REPO, 'character-prototype', 'preview', file),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error(`找不到纹理: ${file}`);
}
for (const name of ['original.png', 'mask.png', 'background.png']) {
  const src = resolveTexture(name);
  const bytes = fs.readFileSync(src);
  output(name, bytes);
  report.images.push({ name, bytes: bytes.length, sha256: sha(bytes), identical: true });
}

// 接触点独立复核（与 export_mesh.mjs 相同基准点）
const fixed = [['paper', 120, 1010], ['paper edge', 300, 1100], ['far fingers', 170, 920], ['far palm', 260, 930], ['near fingers', 205, 1190], ['near palm', 310, 1190], ['seated support', 500, 1400]];
const free = [['face', 430, 340], ['shoulder', 815, 528], ['torso', 700, 780], ['elbow', 815, 1010]];
report.contactRecheck = [...fixed, ...free].map(([name, x, y]) => ({ name, pin: layerPinAt(charLayer, x, y) }));
report.contactRecheckPassed = report.contactRecheck.every(({ name, pin }) => fixed.some(([n]) => n === name) ? pin > 0.9999 : pin < 0.001);

if (!CHECK) output('editor-export-report.json', Buffer.from(JSON.stringify(report, null, 2)));
if (!CHECK) console.log(JSON.stringify(report, null, 2));
if (CHECK) console.log('PASS: 导出内容与比对目录逐字节一致。');
if (CHECK && !report.contactRecheckPassed) { console.error('FAIL: 接触点复核未通过'); process.exit(1); }
