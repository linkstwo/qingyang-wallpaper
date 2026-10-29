// C12：连续视角范围研究——基于编辑器区域场公式的视角弧响应（纯逻辑，Node 可测）。
// 结论语义（诚实标注，不冒充）：
// - 当前 2.5D 表面变形仅在"主视角附近小角度"连续（θ = view.x * turnGain 映射），
//   超出 ±RANGE 角度后没有新的轮廓/遮挡真实生成，只有同曲面继续滑移。
// - side/back 参考图与主图姿态不一致（非同瞬间多机位），无法直接插值出真实侧背。

import { regionUniforms } from './gl-scene.mjs';
export { regionUniforms };

// 编辑器默认（=样片 app.mjs）视角→表面位移映射的线性范围估计：
// 视角 |view|<=1，躯干 depth≈19px、head 深度≈11+13*cheek、limfit 上限像素独立限幅。
// 以"位移不超过位移上限（如躯干 5px）"为可信范围：view.x ∈ [-1,1] 全程由弹簧限幅保护，
// 但几何上"不出现明显拉伸/压缩伪影"的经验范围取 ±0.35 视角（对应约 ±19px 顶部深度差）。
export const CONTINUOUS_RANGE = 0.35;

export function viewArcPoint(viewX, layer) {
  // 与 gl-scene VERT 相同公式的 JS 版（character 层）：返回关键锚点的横向位移估计
  const ru = regionUniforms(layer);
  const [_, __, depthHead, depthCheek] = ru.head;
  const depth = (id) => ru.depth[regionIndex(id)];
  const regionIndex = (id) => ({ head: 0, neck: 1, chest: 2, shoulder: 3, torso: 4, cheek: 5, hairRoot: 6, hairTip: 7 }[id] ?? 0);
  const anchors = [
    { id: 'face', x: 430, y: 340 }, { id: 'shoulder', x: 815, y: 528 },
    { id: 'torso', x: 700, y: 780 }, { id: 'hairRoot', x: 246, y: 367 },
  ];
  const bell = (px, py, b) => { const dx = (px - b[0]) / b[2], dy = (py - b[1]) / b[3]; return Math.exp(-(dx * dx + dy * dy) * 2); };
  const ssy = (y, r) => 1 - smoothstep(r[0], r[1], y);
  const smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  return anchors.map(a => {
    const head = ssy(a.y, ru.head);
    const neck = bell(a.x, a.y, ru.bell0);
    const chest = bell(a.x, a.y, ru.bell1);
    const shoulder = bell(a.x, a.y, ru.bell2);
    const torso = bell(a.x, a.y, ru.bell3);
    const cheek = bell(a.x, a.y, ru.bell4);
    const d = depth('torso') * torso + depth('shoulder') * shoulder + depth('chest') * chest + head * (depth('head') + depthCheek * cheek);
    const turnX = viewX * d + (a.x - ru.squeeze[2]) * (ru.squeeze[0] * viewX) * head;
    return { id: a.id, turnX: +turnX.toFixed(2), depth: +d.toFixed(2) };
  });
}

function smoothstep(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

// 材质/素材缺口清单（C12 诚实交付的一部分）。
export const VIEW_ARC_GAPS = [
  { gap: '缺少真实多角度序列', detail: '四张参考图姿态不一致（非同瞬间多机位），不能当作 3D 扫描或直接交叉淡化；side/back 均为独立摆姿。' },
  { gap: '无深度/几何代理', detail: '没有肩背腰的深度图或几何代理网格，连续视角下新遮挡（如背部转出）无法从单图生成。' },
  { gap: '中间角度缺失', detail: 'front→side 之间无 15°/30°/45° 实拍，任何插值都属于补绘推断，需标注为非真实。' },
  { gap: '背面内容空白', detail: 'back-reference 与主图服装/发型细节不对应，>60° 的背面连续性无法保证。' },
];
