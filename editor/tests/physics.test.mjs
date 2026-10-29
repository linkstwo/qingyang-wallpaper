import test from 'node:test';
import assert from 'node:assert/strict';
import { Spring, SpringBank, ViewTracker, demoInput } from '../src/physics.mjs';

const CFG = { frequency: 2.4, damping: 0.88, limit: 1.2 };
const GAINS = { body: 1.4, chestX: 3.4, chestY: 4.2, chestCoupling: 60, chestCouplingY: 75, hair: 2.2 };
const LIMITS = { bodyPixels: 5, chestPixels: 7, hairPixels: 10 };

test('Spring：脉冲后收敛到 0，无 NaN，限幅生效', () => {
  const s = new Spring(CFG);
  s.step(500, 1 / 120); // 强脉冲
  for (let t = 0; t < 8; t += 1 / 120) s.step(0, 1 / 120);
  assert.ok(Number.isFinite(s.x), 'x 有限');
  assert.ok(Math.abs(s.x) < 0.01, `收敛到≈0，实际 ${s.x}`);
  assert.ok(Math.abs(s.x) <= CFG.limit + 1e-9);
});

test('30/60/120fps 同一连续轨迹误差（G3）：峰值位移相对偏差 < 10%', () => {
  // 与样片 artifacts/numerical-validation.json 同语义：连续输入 demoInput 在不同帧率下积分，
  // 输入每个 dt 重新采样（连续轨迹），差异只来自积分步长而非输入离散化。
  const peak = (fps) => {
    const bank = new SpringBank(CFG);
    const tr = new ViewTracker();
    const G = { ...GAINS }, L = { ...LIMITS };
    let m = 0;
    const dt = 1 / fps;
    for (let t = 0; t < 8; t += dt) {
      const d = demoInput(t);
      const [ax, ay] = tr.update({ x: d.x, y: d.y }, dt);
      m = Math.max(m, Math.abs(bank.step(ax, ay, G, L, dt)[2]));
    }
    return m;
  };
  const p120 = peak(120), p60 = peak(60), p30 = peak(30);
  const spread = (Math.max(p120, p60, p30) - Math.min(p120, p60, p30)) / p120;
  assert.ok(spread < 0.10, `峰值离散 ${spread.toFixed(3)} 应 < 0.10（30fps ${p30.toFixed(3)} / 60fps ${p60.toFixed(3)} / 120fps ${p120.toFixed(3)}）`);
});

test('SpringBank：与 app.mjs 同公式，可视位移带限幅单位（含 hairTip 通道）', () => {
  const bank = new SpringBank(CFG);
  const vis = bank.step(180, 180, GAINS, LIMITS, 1 / 60);
  assert.equal(vis.length, 6);
  for (const [v, lim] of [[vis[0], LIMITS.bodyPixels], [vis[1], LIMITS.bodyPixels], [vis[2], LIMITS.chestPixels], [vis[3], LIMITS.chestPixels], [vis[4], LIMITS.hairPixels], [vis[5], LIMITS.hairTipPixels ?? 0]]) {
    assert.ok(Math.abs(v) <= lim + 1e-9, `位移 ${v} 超限 ${lim}`);
    assert.ok(Number.isFinite(v));
  }
});

test('静止后收敛：无输入 5 秒全部回 0（无持续卡边界）', () => {
  const bank = new SpringBank(CFG);
  bank.step(180, -180, GAINS, LIMITS, 1 / 60);
  for (let t = 0; t < 5; t += 1 / 60) bank.step(0, 0, GAINS, LIMITS, 1 / 60);
  for (const v of bank.step(0, 0, GAINS, LIMITS, 1 / 60)) assert.ok(Math.abs(v) < 0.05, `残差 ${v}`);
});

test('ViewTracker：角加速度限幅 ±180；demoInput 轨迹有界', () => {
  const tr = new ViewTracker();
  let maxA = 0;
  for (let t = 0; t < 3; t += 1 / 120) {
    const [ax, ay] = tr.update({ x: Math.sin(t * 40), y: Math.cos(t * 53) }, 1 / 120);
    maxA = Math.max(maxA, Math.abs(ax), Math.abs(ay));
    assert.ok(Number.isFinite(ax) && Number.isFinite(ay));
  }
  assert.ok(maxA <= 180 + 1e-9, `角加速度 ${maxA} 超限幅`);
  for (let t = 0; t < 20; t += 0.1) {
    const d = demoInput(t);
    assert.ok(Math.abs(d.x) <= 1 && Math.abs(d.y) <= 1);
  }
});

test('快速与缓慢运动行为可区分：快速激发位移显著更大', () => {
  const run = (speed) => {
    const bank = new SpringBank(CFG);
    const tr = new ViewTracker();
    let m = 0;
    for (let t = 0; t < 2; t += 1 / 60) {
      const [ax] = tr.update({ x: Math.sin(t * speed * 2 * Math.PI) * 0.5, y: 0 }, 1 / 60);
      m = Math.max(m, Math.abs(bank.step(ax, 0, GAINS, LIMITS, 1 / 60)[2]));
    }
    return m;
  };
  const slow = run(0.3), fast = run(4);
  assert.ok(fast > slow * 2, `快速 ${fast.toFixed(2)} 应显著大于缓慢 ${slow.toFixed(2)}`);
});
