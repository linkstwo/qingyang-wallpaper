// 接触/蒙版权重：直接复用已验收样片的 contact-rig.mjs 算法（polygonPin/contactWeights）。
// 编辑器的 pins 定义（图层.pins）驱动同一套计算；权重永远基于"源坐标"（vertexEdits 不参与），
// 与 android-app/tools/export_mesh.mjs 的行为一致。
import { polygonPin, contactPin as protoContactPin, contactWeights as protoContactWeights } from '../../character-prototype/preview/contact-rig.mjs';
export { polygonPin };

// 用图层 pins 计算单个点权重（编辑器内数据驱动版本）。
export function layerPin(layer, x, y) {
  let pin = 0;
  for (const region of layer.pins ?? []) {
    if (!Array.isArray(region?.outline) || region.outline.length < 3) continue;
    pin = Math.max(pin, polygonPin(x, y, region.outline, region.feather ?? 28));
  }
  return pin;
}

const seatSmooth = (a, b, y) => { const t = Math.max(0, Math.min(1, (y - a) / (b - a))); return t * t * (3 - 2 * t); };

// 与 main 分支 contact-rig.mjs contactPin 完全一致的权重计算：
// 坐姿支撑 smooth(y0,y1,y) + 多边形接触区 + 纸张外缘 18px 锁定。
export function layerPinWithBlueprintEdgeLock(layer, x, y) {
  let pin = 0;
  if (layer.seatSupport) pin = seatSmooth(layer.seatSupport.y0, layer.seatSupport.y1, y);
  for (const region of layer.pins ?? []) {
    if (!Array.isArray(region?.outline) || region.outline.length < 3) continue;
    pin = Math.max(pin, polygonPin(x, y, region.outline, region.feather ?? 28));
  }
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

export function layerContactWeights(layer, positions) {
  const w = new Float32Array(positions.length / 2);
  for (let i = 0; i < w.length; i++) w[i] = layerPinWithBlueprintEdgeLock(layer, positions[i * 2], positions[i * 2 + 1]);
  return w;
}

// 兼容导出：与 android-app/tools/export_mesh.mjs 完全相同的权重计算（原型内联 contacts）。
export function prototypeContactWeights(positions) { return protoContactWeights(positions); }
export function prototypeContactPin(x, y) { return protoContactPin(x, y); }

// 导出报告用的固定/自由接触点（与 export_mesh.mjs 同一组坐标，作为回归基准）。
export const CONTACT_RECHECK_FIXED = [['paper', 120, 1010], ['paper edge', 300, 1100], ['far fingers', 170, 920], ['far palm', 260, 930], ['near fingers', 205, 1190], ['near palm', 310, 1190], ['seated support', 500, 1400]];
export const CONTACT_RECHECK_FREE = [['face', 430, 340], ['shoulder', 815, 528], ['torso', 700, 780], ['elbow', 815, 1010]];
