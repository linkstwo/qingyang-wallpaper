import test from 'node:test';
import assert from 'node:assert/strict';
import { cropWindow, anchorVisibility, framingComparison, waistVerdict, ANCHORS } from '../src/framing.mjs';
import { viewArcPoint, CONTINUOUS_RANGE, VIEW_ARC_GAPS } from '../src/view-arc.mjs';
import { readFileSync } from 'node:fs';
import { projectFromPrototypeMesh } from '../src/project.mjs';

const CANVAS = [1086, 1448];

test('cropWindow：9:20 竖幅窗口宽度=H*ratio，偏移 0/0.5/1 对应左右中', () => {
  const w = 1448 * (9 / 20);
  const mid = cropWindow(CANVAS, 9 / 20, 0.5);
  assert.ok(Math.abs((mid.x1 - mid.x0) - w) < 1);
  assert.ok(Math.abs((mid.x0 + mid.x1) / 2 - CANVAS[0] / 2) < 1, '居中');
  const left = cropWindow(CANVAS, 9 / 20, 0);
  assert.equal(left.x0, 0);
  const right = cropWindow(CANVAS, 9 / 20, 1);
  assert.ok(Math.abs(right.x1 - CANVAS[0]) < 1);
});

test('cropWindow：16:9 横幅模式为全宽上下裁', () => {
  const win = cropWindow(CANVAS, 16 / 9, 0.5);
  assert.equal(win.mode, 'crop-vertical');
  assert.equal(win.x1 - win.x0, CANVAS[0]);
  assert.ok(win.y1 - win.y0 < CANVAS[1]);
});

test('anchorVisibility：居中 9:20 窗口保住脸/躯干，肩可能边缘', () => {
  const win = cropWindow(CANVAS, 9 / 20, 0.5);
  const vis = anchorVisibility(win);
  assert.equal(vis.length, ANCHORS.length);
  const face = vis.find(a => a.id === 'face');
  assert.equal(face.visible, true, '脸在画布中央区域应可见');
});

test('framingComparison：三档对照数据完整，且存在保腰方案（G6）', () => {
  const opts = framingComparison(CANVAS, 9 / 20);
  assert.equal(opts.length, 3);
  const verdicts = opts.map(waistVerdict);
  assert.ok(verdicts.some(v => v !== 'waist-cut'), `至少一档不完全切掉腰：${verdicts.join(',')}`);
});

test('viewArcPoint：视角 0 时全部锚点位移为 0；正视角向左/右方向单调', () => {
  const config = JSON.parse(readFileSync(new URL('../../character-prototype/preview/mesh.json', import.meta.url), 'utf8'));
  const layer = projectFromPrototypeMesh(config).layers.find(l => l.kind === 'character');
  const zero = viewArcPoint(0, layer);
  for (const p of zero) assert.equal(p.turnX, 0, '零视角零位移');
  const pos = viewArcPoint(0.35, layer);
  const torsoPos = pos.find(p => p.id === 'torso');
  const neg = viewArcPoint(-0.35, layer);
  const torsoNeg = neg.find(p => p.id === 'torso');
  assert.ok(torsoPos.turnX > 0 && torsoNeg.turnX < 0, `方向对称（${torsoNeg.turnX}, ${torsoPos.turnX}）`);
  assert.ok(Math.abs(torsoPos.turnX + torsoNeg.turnX) < 0.01, '线性场对称');
});

test('研究页素材缺口清单非空且语义诚实', () => {
  assert.ok(VIEW_ARC_GAPS.length >= 3);
  const all = VIEW_ARC_GAPS.map(g => g.gap + g.detail).join('');
  assert.match(all, /姿态不一致|不能插值|无法.*生成/);
  assert.ok(CONTINUOUS_RANGE > 0 && CONTINUOUS_RANGE < 1);
});
