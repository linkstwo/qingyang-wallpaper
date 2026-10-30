// C13：手机画幅安全框——裁剪窗口几何与人物关键点可见性（纯逻辑，Node 可测）。
// 画布坐标 = 原图 1086x1448。手机壁纸为全屏纵横比，编辑画布 3:4 更宽 → 横向裁剪窗口。
// 关键锚点来自样片已验证的接触复核点 + 腰部估计（记录为假定，待真机确认）。

export const ANCHORS = [
  { id: 'face',     x: 430, y: 340, label: '脸',   estimated: false },
  { id: 'shoulder', x: 815, y: 528, label: '肩',   estimated: false },
  { id: 'torso',    x: 700, y: 780, label: '躯干', estimated: false },
  { id: 'elbow',    x: 815, y: 1010, label: '肘',  estimated: false },
  { id: 'waist',    x: 560, y: 1150, label: '腰',   estimated: true },  // 假定位置：躯干与坐姿支撑之间
];

export const FRAMING_PRESETS = [
  { id: '9-20',    label: '9:20（直板旗舰全屏）', ratio: 9 / 20 },
  { id: '9-19.5',  label: '9:19.5（iPhone 类）', ratio: 9 / 19.5 },
  { id: '16-9',    label: '16:9（横屏）', ratio: 16 / 9 },
  { id: '1-1',     label: '1:1（方幅）', ratio: 1 },
];

// 裁剪窗口：画布 W x H（1086x1448）内嵌最大 ratio 窗口，offsetX ∈ [0,1] 控制横向位置。
// 窗口宽 = min(W, H*ratio)；横屏 16:9 时 ratio>1 → 窗口宽=全画布、高=宽/ratio（上下裁）。
export function cropWindow(canvas, ratio, offsetX = 0.5) {
  const [W, H] = canvas;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  if (ratio >= W / H) {
    // 窗口比画布更"宽"：全宽，上下裁
    const h = Math.min(H, W / ratio);
    return { x0: 0, x1: W, y0: (H - h) / 2, y1: (H + h) / 2, mode: 'crop-vertical' };
  }
  const w = H * ratio;
  const x0 = clamp01(offsetX) * (W - w);
  return { x0, x1: x0 + w, y0: 0, y1: H, mode: 'crop-horizontal' };
}

// 关键点可见性：完全在窗口内 = 可见；窗口边到点距离 < margin = 半可见（边缘裁切）。
export function anchorVisibility(window, margin = 40) {
  return ANCHORS.map(a => {
    const insideX = a.x >= window.x0 && a.x <= window.x1;
    const insideY = a.y >= window.y0 && a.y <= window.y1;
    const fully = insideX && insideY;
    const distEdge = fully ? 0 : Math.max(
      window.x0 - a.x, a.x - window.x1,
      window.y0 - a.y, a.y - window.y1, 0
    );
    return { ...a, visible: fully, edgeDistance: Math.round(distEdge), clipped: !fully && distEdge <= margin };
  });
}

// 对照方案：三档横向偏移（左移保人物/居中/右移），输出各组可见性数据（G6 要求"两组对照"）。
export function framingComparison(canvas, ratio, offsets = [0.2, 0.5, 0.8]) {
  return offsets.map(offsetX => {
    const win = cropWindow(canvas, ratio, offsetX);
    return { offsetX, window: win, anchors: anchorVisibility(win) };
  });
}

// 汇总：该方案是否保住"腰不彻底切掉"（waist 必须可见或仅边缘裁切）。
export function waistVerdict(option) {
  const waist = option.anchors.find(a => a.id === 'waist');
  return waist.visible ? 'waist-fully-visible' : waist.clipped ? 'waist-edge-clipped' : 'waist-cut';
}

// ---- T02/T09：多视角构图对照 ----
// 每个视角的人物位置不同（锚点已像素校验），同一裁剪窗口下关键点可见性随视角变化。
// keyAnchors: 该视角实际可见锚点子集（从 view-study 数据取，像素校验过的）。
export function multiViewFraming(viewKeyAnchors, canvas, ratio, offsets = [0.2, 0.5, 0.8]) {
  const options = offsets.map(offsetX => {
    const win = cropWindow(canvas, ratio, offsetX);
    const perView = Object.entries(viewKeyAnchors).map(([viewId, anchors]) => {
      const vis = Object.entries(anchors).map(([name, [x, y]]) => {
        const inside = x >= win.x0 && x <= win.x1;
        const edge = inside ? 0 : Math.max(win.x0 - x, x - win.x1, 0);
        return { name, xy: [x, y], visible: inside, clipped: !inside && edge <= 40 };
      });
      return { viewId, points: vis, allVisible: vis.every(p => p.visible) };
    });
    return { offsetX, window: win, perView, allViewsAllVisible: perView.every(pv => pv.allVisible) };
  });
  const best = options.find(o => o.allViewsAllVisible) ?? null;
  return { ratio, options, recommended: best ? best.offsetX : null };
}

// ---- T02 权衡选项 A：按视角跟移窗口 ----
// 结论背景：四视角人物位置差异使固定窗口无法全保（见 multiViewFraming）。
// 跟移方案：每档窗口中心对准该视角人物质心（锚点均值），档间过渡时窗口位置线性插值。
export function followWindowOffset(anchors, canvas, ratio, fallback = 0.5) {
  const [W, H] = canvas;
  const pts = Object.values(anchors);
  if (!pts.length) return fallback;
  const cx = pts.reduce((s, [x]) => s + x, 0) / pts.length;
  // 窗口宽（横裁模式）与允许的中心范围
  const w = Math.min(W, H * ratio);
  const minCenter = w / 2, maxCenter = W - w / 2;
  if (maxCenter <= minCenter) return fallback; // 全宽（竖裁模式）无横向自由度
  const clamped = Math.max(minCenter, Math.min(maxCenter, cx));
  return (clamped - w / 2) / (W - w); // → offsetX ∈ [0,1]
}

export function followWindowPath(viewAnchorsById, canvas, ratio, order) {
  const path = {};
  for (const id of order) {
    path[id] = followWindowOffset(viewAnchorsById[id] ?? {}, canvas, ratio);
  }
  return path;
}

// 跟移窗口对象（与 cropWindow 同结构，横裁模式）
export function followCropWindow(canvas, ratio, offsetX) {
  const [W, H] = canvas;
  const w = Math.min(W, H * ratio);
  const x0 = Math.max(0, Math.min(W - w, offsetX * (W - w)));
  return { x0, x1: x0 + w, y0: 0, y1: H, mode: 'crop-horizontal-follow' };
}
