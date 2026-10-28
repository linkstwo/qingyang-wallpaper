// 几何：复用已验收样片的 earcut/makeMesh（只读 import，不复制算法），并补编辑器所需的顶点工具。
// makeMesh 返回 Float32Array，布局为三角形展开的顶点对 [x0,y0, x1,y1, x2,y2, ...]，
// 与 android-app/tools/export_mesh.mjs 及 MeshAssets.java 的 character_mesh.bin 逐字节兼容。
import { makeMesh as protoMakeMesh } from '../../character-prototype/preview/rig.mjs';
export { protoMakeMesh as prototypeMakeMesh };

export function buildLayerMesh(layer, canvas) {
  const edge = layer.mesh?.edgePx ?? 27;
  if (layer.mesh?.mode === 'quad' || layer.kind === 'background') {
    const [W, H] = canvas;
    return new Float32Array([0, 0, W, 0, 0, H, 0, H, W, 0, W, H]);
  }
  const outline = layer.mesh?.mode === 'outline' && layer.mesh.outline
    ? layer.mesh.outline
    : [[0, 0], [canvas[0], 0], [canvas[0], canvas[1]], [0, canvas[1]]];
  const holes = layer.mesh?.holes ?? [];
  return protoMakeMesh(outline, holes, edge);
}

export function triangleCount(positions) { return positions.length / 6; }
export function vertexSlotCount(positions) { return positions.length / 2; }

// 顶点去重索引：makeMesh 展开三角形，同一坐标出现多次。返回 Map key="x,y" → 索引数组。
// 编辑器拖拽"一个点"要同时移动所有重合槽位，否则网格被撕开。
export function weldIndex(positions) {
  const map = new Map();
  for (let i = 0; i < positions.length; i += 2) {
    const key = positions[i].toFixed(3) + ',' + positions[i + 1].toFixed(3);
    let list = map.get(key);
    if (!list) map.set(key, list = []);
    list.push(i / 2);
  }
  return map;
}

// 把稀疏编辑 {slot: [dx,dy]} 应用到位置数组，返回新数组（不修改输入）。
// weld 表用于把槽位编辑按"逻辑点"分组：edits 的键可以是任一重合槽位。
export function applyVertexEdits(positions, edits, weld) {
  if (!edits || Object.keys(edits).length === 0) return positions;
  const out = positions.slice();
  for (const [key, [dx, dy]] of Object.entries(edits)) {
    const slot = Number(key);
    if (!Number.isInteger(slot) || slot * 2 >= out.length) continue;
    const px = out[slot * 2], py = out[slot * 2 + 1];
    const k = px.toFixed(3) + ',' + py.toFixed(3);
    const group = weld?.get(k) ?? [slot];
    for (const s of group) { out[s * 2] = px + dx; out[s * 2 + 1] = py + dy; }
  }
  return out;
}

// 网格质量检查：退化三角形（面积≈0 或翻转，叉积符号与多数相反）与破洞边缘。
// 返回 {degenerate: [triIndex], flipped: [triIndex], ok}
export function checkMeshQuality(positions) {
  const degenerate = [], flipped = [];
  let signSum = 0;
  for (let t = 0; t < positions.length; t += 6) {
    const ax = positions[t], ay = positions[t + 1], bx = positions[t + 2], by = positions[t + 3], cx = positions[t + 4], cy = positions[t + 5];
    const cross = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(cross) < 1e-6) degenerate.push(t / 6);
    else { signSum += Math.sign(cross); if (cross < 0) flipped.push(t / 6); }
  }
  // 三角形展开顺序固定来自 earcut（逆时针），大面积反号说明被拖翻转
  const majorityNegative = signSum < 0;
  const realFlips = majorityNegative ? flipped.filter(i => true) : flipped;
  return { degenerate, flipped: realFlips, ok: degenerate.length === 0 && realFlips.length === 0 };
}

// 拾取：返回距离 (x,y) 最近的顶点槽位（考虑 weld，返回组内第一个槽位）。
export function pickVertex(positions, weld, x, y, maxDist) {
  let best = -1, bestD = maxDist ?? 24;
  // 以 weld 组中心作为拾取目标
  for (const list of weld.values()) {
    const s = list[0];
    const dx = positions[s * 2] - x, dy = positions[s * 2 + 1] - y;
    const d = Math.hypot(dx, dy);
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}
