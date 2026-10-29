import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { projectFromPrototypeMesh } from '../src/project.mjs';
import { createTrack, recordSample, sampleTrack, replayAtFps, compareFps, abnormalInputGuard, demoInput } from '../src/input-recorder.mjs';

const config = () => JSON.parse(readFileSync(new URL('../../character-prototype/preview/mesh.json', import.meta.url), 'utf8'));
const layer = () => projectFromPrototypeMesh(config()).layers.find(l => l.kind === 'character');

test('录制采样：值变化时保持旧值再跳变；sampleTrack 分段线性插值与保持', () => {
  const tr = createTrack('t1');
  assert.equal(recordSample(tr, 0, 0, 0), true);
  assert.equal(recordSample(tr, 0.1, 0, 0), false, '相同输入去重');
  assert.equal(recordSample(tr, 0.5, 1, -1), true);
  assert.equal(tr.points.length, 3, '[0]=(0,0,0) [0.5]=(0.5,0,0)保持 [0.5]=(0.5,1,-1)跳变');
  assert.deepEqual(sampleTrack(tr, 0.25), { x: 0, y: 0 }, '静止段保持 0（不缓变）');
  assert.deepEqual(sampleTrack(tr, 0.5), { x: 1, y: -1 }, '变化时刻取新值');
  assert.deepEqual(sampleTrack(tr, -1), { x: 0, y: 0 }, '提前保持首值');
  assert.deepEqual(sampleTrack(tr, 9), { x: 1, y: -1 }, '超末保持末值');
  assert.deepEqual(sampleTrack(createTrack('empty'), 1), { x: 0, y: 0 });
});

test('demoInput 轨迹回放：60fps 位移有限且峰值合理', () => {
  const track = createTrack('demo');
  for (let t = 0; t <= 18; t += 1 / 60) {
    const d = demoInput(t);
    recordSample(track, t, d.x, d.y);
  }
  const run = replayAtFps(track, layer(), 60, 18);
  assert.ok(run.frames.length > 1000, `18s@60fps 应 >1000 帧，实际 ${run.frames.length}`);
  for (const f of run.frames) for (const v of f) assert.ok(Number.isFinite(v), '帧数据有限');
  const peak = Math.max(...run.frames.flatMap(f => f.slice(1).map(Math.abs)));
  assert.ok(peak > 1 && peak < 40, `峰值 ${peak.toFixed(2)}px 合理`);
});

test('30/60/120fps 对比（G3）：RMS 差异 < 6% 峰值', () => {
  const track = createTrack('demo');
  for (let t = 0; t <= 8; t += 1 / 120) {
    const d = demoInput(t);
    recordSample(track, t, d.x, d.y);
  }
  const report = compareFps(track, layer());
  assert.equal(report.entries.length, 3);
  for (const e of report.entries) {
    assert.ok(e.rmsRatio < 0.06, `${e.fps}fps RMS比 ${e.rmsRatio} 应 < 6%`);
  }
});

test('异常输入防御：NaN/Infinity/越界 → 钳制后物理全程有限（G3/G8）', () => {
  const result = abnormalInputGuard(layer());
  assert.equal(result.finite, true, '全部帧数值有限');
  assert.ok(Number.isFinite(result.maxDisplacement));
});

test('hairTip 通道：独立弹簧参数产生与 hair 不同的响应（B10 分段）', () => {
  const L = layer();
  L.springs.hair = { frequency: 1.6, damping: 0.22, limit: 1.0 };
  L.springs.hairTip = { frequency: 0.9, damping: 0.12, limit: 1.0 };
  L.springGains.hair = 3.0;
  L.springGains.hairTip = 3.0;
  const track = createTrack('shake');
  for (let t = 0; t <= 4; t += 1 / 60) {
    const u = t;
    recordSample(track, t, Math.sin(u * 2 * Math.PI * 2.5) * 0.6, 0);
  }
  const run = replayAtFps(track, L, 60);
  const hairPeak = Math.max(...run.frames.map(f => Math.abs(f[5])));
  const tipPeak = Math.max(...run.frames.map(f => Math.abs(f[6])));
  assert.ok(tipPeak > hairPeak * 1.3, `发梢峰值 ${tipPeak.toFixed(2)} 应显著大于发根 ${hairPeak.toFixed(2)}（低频大惯性→更大幅度滞后）`);
});
