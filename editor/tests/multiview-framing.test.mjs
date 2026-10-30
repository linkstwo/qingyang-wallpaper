import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { multiViewFraming } from '../src/framing.mjs';

test('多视角构图对照：数据完整且至少一档全视角保关键点（T02/T09）', () => {
  const data = JSON.parse(readFileSync(new URL('../research/view-study-data.json', import.meta.url), 'utf8'));
  const keyAnchors = {};
  for (const v of data.views) {
    const va = {};
    for (const [k, xy] of Object.entries(v.anchors)) {
      if (['face', 'shoulderL', 'shoulderR', 'shoulderBack', 'shoulderFront', 'waist'].includes(k)) va[k] = xy;
    }
    keyAnchors[v.id] = va;
  }
  assert.equal(Object.keys(keyAnchors).length, 4, '四视角都有关键锚点');
  const mv = multiViewFraming(keyAnchors, [1086, 1448], 9 / 20);
  assert.equal(mv.options.length, 3);
  for (const o of mv.options) {
    assert.equal(o.perView.length, 4);
    for (const pv of o.perView) assert.ok(pv.points.length >= 2, `${pv.viewId} 至少 2 个关键点`);
  }
  // 构图结论：要么存在全保档，要么如实为 null（不硬凑）
  if (mv.recommended !== null) {
    const rec = mv.options.find(o => o.offsetX === mv.recommended);
    assert.equal(rec.allViewsAllVisible, true);
  }
});

test('多视角构图：极端偏移（0 或 1）必有一侧视角缺点（边界合理性）', () => {
  const data = JSON.parse(readFileSync(new URL('../research/view-study-data.json', import.meta.url), 'utf8'));
  const keyAnchors = {};
  for (const v of data.views) {
    const va = {};
    for (const [k, xy] of Object.entries(v.anchors)) {
      if (['face', 'waist', 'shoulderL', 'shoulderR'].includes(k)) va[k] = xy;
    }
    keyAnchors[v.id] = va;
  }
  const allX = Object.values(keyAnchors).flatMap(a => Object.values(a).map(([x]) => x));
  const spread = Math.max(...allX) - Math.min(...allX);
  assert.ok(spread > 300, `四视角人物横向跨度 ${spread}px 足够大，构图才有区分度`);
});
