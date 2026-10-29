// 多角度研究：相似变换对齐、逐点残差、重叠区栅格分析（纯逻辑，Node 可测）。
// 数据来源 editor/research/view-study-data.json（人工目测锚点，无标定）。

// 估计相似变换（缩放+平移，无旋转）：最小二乘。pairs = [[A 点, B 点]...]
export function estimateSimilarTransform(pairs) {
  if (!pairs || pairs.length < 2) throw new Error('至少 2 对对应点');
  const n = pairs.length;
  const ax = pairs.reduce((s, [a]) => s + a[0], 0) / n;
  const ay = pairs.reduce((s, [a]) => s + a[1], 0) / n;
  const bx = pairs.reduce((s, [, b]) => s + b[0], 0) / n;
  const by = pairs.reduce((s, [, b]) => s + b[1], 0) / n;
  let num = 0, den = 0;
  for (const [a, b] of pairs) {
    num += (a[0] - ax) * (b[0] - bx) + (a[1] - ay) * (b[1] - by);
    den += (a[0] - ax) ** 2 + (a[1] - ay) ** 2;
  }
  if (den < 1e-9) throw new Error('锚点退化（重合）');
  const scale = num / den;
  const tx = bx - scale * ax;
  const ty = by - scale * ay;
  const residuals = pairs.map(([a, b]) => {
    const dx = scale * a[0] + tx - b[0], dy = scale * a[1] + ty - b[1];
    return Math.hypot(dx, dy);
  });
  return {
    scale, tx, ty,
    meanResidual: residuals.reduce((s, r) => s + r, 0) / n,
    maxResidual: Math.max(...residuals),
    residuals,
  };
}

// 应用变换
export function applyTransform(t, [x, y]) { return [t.scale * x + t.tx, t.scale * y + t.ty]; }

// 链式合成：A→B 再 B→C ⇒ A→C
export function composeTransform(t1, t2) {
  return {
    scale: t1.scale * t2.scale,
    tx: t1.scale * t2.tx + t1.tx,
    ty: t1.scale * t2.ty + t1.ty,
  };
}

// 轮廓栅格化（采样步长）+ 两个变换后轮廓的集合分析：重叠 / 仅A / 仅B（栅格单元）
export function regionAnalysis(outlineA, transformA, outlineB, transformB, canvas, cell = 16) {
  const cols = Math.ceil(canvas[0] / cell), rows = Math.ceil(canvas[1] / cell);
  const gridA = rasterize(outlineA, transformA, cols, rows, cell, canvas);
  const gridB = rasterize(outlineB, transformB, cols, rows, cell, canvas);
  let overlap = 0, onlyA = 0, onlyB = 0;
  for (let i = 0; i < gridA.length; i++) {
    if (gridA[i] && gridB[i]) overlap++;
    else if (gridA[i]) onlyA++;
    else if (gridB[i]) onlyB++;
  }
  const total = overlap + onlyA + onlyB;
  return {
    cell, cols, rows, gridA, gridB,
    overlap, onlyA, onlyB,
    overlapRatio: total ? overlap / total : 0,
    // 归一化中心（供标注层画块）
    overlapCentroid: gridCentroid(gridA, gridB, cols, rows, cell),
    onlyACentroid: gridCentroid(gridA, null, cols, rows, cell),
    onlyBCentroid: gridCentroid(gridB, null, cols, rows, cell),
  };
}

function rasterize(outline, transform, cols, rows, cell, canvas) {
  const grid = new Uint8Array(cols * rows);
  // 逐边扫描：把多边形边按 2px 步长采样，标记所在格
  const mark = (x, y) => {
    if (x < 0 || y < 0 || x >= canvas[0] || y >= canvas[1]) return;
    const c = Math.min(cols - 1, Math.floor(x / cell)), r = Math.min(rows - 1, Math.floor(y / cell));
    grid[r * cols + c] = 1;
  };
  const pts = outline.map(p => applyTransform(transform, p));
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(2, Math.ceil(len / 2));
    for (let s = 0; s <= steps; s++) {
      mark(x1 + (x2 - x1) * s / steps, y1 + (y2 - y1) * s / steps);
    }
  }
  // 扫描线填充：每行求交点奇偶填充
  for (let r = 0; r < rows; r++) {
    const y = r * cell + cell / 2;
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
        xs.push(x1 + (y - y1) / (y2 - y1) * (x2 - x1));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const c0 = Math.max(0, Math.floor(xs[k] / cell)), c1 = Math.min(cols - 1, Math.floor(xs[k + 1] / cell));
      for (let c = c0; c <= c1; c++) grid[r * cols + c] = 1;
    }
  }
  return grid;
}

function gridCentroid(ga, gb, cols, rows, cell) {
  let sx = 0, sy = 0, n = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const inA = ga[r * cols + c];
      const inB = gb ? gb[r * cols + c] : 1;
      const hit = gb ? (inA && inB) : inA;
      if (hit) { sx += c * cell; sy += r * cell; n++; }
    }
  }
  return n ? [Math.round(sx / n), Math.round(sy / n), n] : null;
}

// 视角插值：t ∈ [0, views-1]。返回 {fromView, toView, frac}。
export function viewLerp(t, viewCount) {
  const clamped = Math.max(0, Math.min(viewCount - 1, t));
  const from = Math.floor(clamped);
  const to = Math.min(viewCount - 1, from + 1);
  return { fromView: from, toView: to, frac: clamped - from };
}
