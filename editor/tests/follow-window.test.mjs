import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { followWindowOffset, followWindowPath, followCropWindow } from '../src/framing.mjs';

const CANVAS = [1086, 1448];
const data = JSON.parse(readFileSync(new URL('../research/view-study-data.json', import.meta.url), 'utf8'));

test('跟移窗口：每档窗口对准质心后，全部关键点都在窗内（T02 选项 A 成立）', () => {
  const keyAnchors = {};
  for (const v of data.views) {
    const va = {};
    for (const [k, xy] of Object.entries(v.anchors)) {
      if (['face', 'shoulderL', 'shoulderR', 'shoulderBack', 'shoulderFront', 'waist'].includes(k)) va[k] = xy;
    }
    keyAnchors[v.id] = va;
  }
  const path = followWindowPath(keyAnchors, CANVAS, 9 / 20, data.views.map(v => v.id));
  for (const v of data.views) {
    const win = followCropWindow(CANVAS, 9 / 20, path[v.id]);
    const lost = Object.entries(keyAnchors[v.id]).filter(([, xy]) => xy[0] < win.x0 || xy[0] > win.x1).map(([k]) => k);
    assert.deepEqual(lost, [], `${v.id} 跟移后仍缺点: ${lost.join(',')}`);
  }
});

test('跟移偏移在 [0,1] 内且四视角偏移确实不同（人物位置差异的真实反映）', () => {
  const keyAnchors = {};
  for (const v of data.views) {
    const va = {};
    for (const [k, xy] of Object.entries(v.anchors)) {
      if (['face', 'waist', 'shoulderL', 'shoulderR'].includes(k)) va[k] = xy;
    }
    keyAnchors[v.id] = va;
  }
  const path = followWindowPath(keyAnchors, CANVAS, 9 / 20, data.views.map(v => v.id));
  for (const off of Object.values(path)) assert.ok(off >= 0 && off <= 1);
  const offs = Object.values(path);
  assert.ok(Math.max(...offs) - Math.min(...offs) > 0.1, `四视角偏移差 ${(Math.max(...offs) - Math.min(...offs)).toFixed(2)} 应显著`);
});

test('跟移窗口几何：宽度=H*ratio，offset=0/1 时贴边', () => {
  const w = 1448 * (9 / 20);
  const left = followCropWindow(CANVAS, 9 / 20, 0);
  assert.equal(left.x0, 0);
  assert.ok(Math.abs(left.x1 - left.x0 - w) < 1);
  const right = followCropWindow(CANVAS, 9 / 20, 1);
  assert.ok(Math.abs(right.x1 - CANVAS[0]) < 1);
});
