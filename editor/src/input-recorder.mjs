// B9：输入轨迹录制/回放/帧率对比（纯逻辑，Node 可测；浏览器端由 main.mjs 驱动采样）。
// 轨迹 = {name, points:[[t, x, y]...], created}，t 秒、x/y ∈ [-1,1]（视角归一化坐标）。

import { SpringBank, ViewTracker, demoInput } from './physics.mjs';
export { demoInput };

export function createTrack(name, created = new Date().toISOString()) {
  return { name, created, points: [] };
}

// 录制采样：值变化时先补一个"旧值保持到当前时刻"的点，再记录新值 →
// 回放插值在静止段保持原值、在变化时刻跳变（与真实指针行为一致）。
export function recordSample(track, t, x, y) {
  const last = track.points[track.points.length - 1];
  const ts = +t.toFixed(4);
  if (!last) { track.points.push([ts, x, y]); return true; }
  if (last[1] === x && last[2] === y) return false;
  track.points.push([ts, last[1], last[2]]);
  track.points.push([ts, x, y]);
  return true;
}

// 轨迹求值：分段线性插值；同时间戳多点（跳变对）取最后一个值；t 超出末点后保持末值。
export function sampleTrack(track, t) {
  const pts = track.points;
  if (!pts || pts.length === 0) return { x: 0, y: 0 };
  if (t <= pts[0][0]) return { x: pts[0][1], y: pts[0][2] };
  for (let i = 1; i < pts.length; i++) {
    if (t < pts[i][0]) {
      const [t0, x0, y0] = pts[i - 1], [t1, x1, y1] = pts[i];
      const u = t1 > t0 ? (t - t0) / (t1 - t0) : 1;
      return { x: x0 + (x1 - x0) * u, y: y0 + (y1 - y0) * u };
    }
    if (t === pts[i][0]) {
      let j = i;
      while (j + 1 < pts.length && pts[j + 1][0] === t) j++;
      return { x: pts[j][1], y: pts[j][2] };
    }
  }
  const last = pts[pts.length - 1];
  return { x: last[1], y: last[2] };
}

// 用指定帧率对轨迹做完整物理回放，返回位移序列（每帧 [t, bx,by,cx,cy,hair,hairTip]）。
// 与编辑器实时渲染同一套 SpringBank/ViewTracker 公式 → 回放即所见。
export function replayAtFps(track, layer, fps, duration = null) {
  const dt = 1 / fps;
  const end = duration ?? (track.points.length ? track.points[track.points.length - 1][0] : 0);
  const bank = new SpringBank(layer.springs ?? layer.spring);
  const tr = new ViewTracker();
  const frames = [];
  const G = layer.springGains, L = layer.limits;
  for (let t = 0; t <= end + 1e-9; t += dt) {
    const { x, y } = sampleTrack(track, t);
    const [ax, ay] = tr.update({ x, y }, dt);
    frames.push([+t.toFixed(4), ...bank.step(ax, ay, G, L, dt)]);
  }
  return { fps, dt, frames };
}

// 30/60/120fps 对比：以最高 fps 序列为基准，计算其他帧率的位移 RMS 差异（G3 指标）。
export function compareFps(track, layer, fpsList = [30, 60, 120]) {
  const runs = fpsList.map(fps => replayAtFps(track, layer, fps));
  const base = runs[runs.length - 1]; // 最高 fps 为基准
  const peak = Math.max(...base.frames.flatMap(f => f.slice(1).map(Math.abs)), 1e-9);
  const report = { baseFps: base.fps, peak, entries: [] };
  for (const run of runs) {
    let sumSq = 0, n = 0;
    for (const [t, ...vals] of run.frames) {
      const b = nearestFrame(base.frames, t);
      for (let i = 0; i < vals.length; i++) { sumSq += (vals[i] - b[i + 1]) ** 2; n++; }
    }
    const rms = Math.sqrt(sumSq / Math.max(1, n));
    report.entries.push({ fps: run.fps, frames: run.frames.length, rmsVsBase: +rms.toFixed(5), rmsRatio: +(rms / peak).toFixed(5) });
  }
  return report;
}

function nearestFrame(frames, t) {
  let lo = 0, hi = frames.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (frames[mid][0] < t) lo = mid + 1; else hi = mid; }
  const a = frames[Math.max(0, lo - 1)], b = frames[lo];
  return Math.abs(a[0] - t) <= Math.abs(b[0] - t) ? a : b;
}

// 异常输入测试：NaN/Infinity/越界输入必须被钳制且物理保持有限（G3/G8 防御）。
export function abnormalInputGuard(layer, samples = [[0, NaN, 0], [0.1, Infinity, 0], [0.2, 0, -5], [0.3, 0, 5], [0.4, 3, -3]]) {
  const bank = new SpringBank(layer.springs ?? layer.spring);
  const tr = new ViewTracker();
  const clamp1 = (v) => Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0;
  const track = createTrack('abnormal');
  track.points = samples.map(([t, x, y]) => [t, clamp1(x), clamp1(y)]);
  const { frames } = replayAtFps(track, layer, 60);
  const finite = frames.every(f => f.every(Number.isFinite));
  return { finite, maxDisplacement: Math.max(...frames.flatMap(f => f.slice(1).map(Math.abs))) };
}
