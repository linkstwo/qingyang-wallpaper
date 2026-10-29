import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateSimilarTransform, applyTransform, composeTransform, regionAnalysis, viewLerp } from '../src/view-study.mjs';
import { readFileSync } from 'node:fs';

test('相似变换：纯平移/纯缩放精确恢复', () => {
  const t1 = estimateSimilarTransform([[[10, 20], [110, 20]], [[30, 20], [130, 20]], [[10, 40], [110, 40]]]);
  assert.ok(Math.abs(t1.scale - 1) < 1e-9 && Math.abs(t1.tx - 100) < 1e-9 && Math.abs(t1.ty) < 1e-9);
  assert.ok(t1.meanResidual < 1e-9);
  const t2 = estimateSimilarTransform([[[10, 10], [20, 20]], [[30, 10], [60, 20]], [[10, 30], [20, 60]]]);
  assert.ok(Math.abs(t2.scale - 2) < 1e-9);
  assert.ok(t2.meanResidual < 1e-9);
});

test('相似变换：带噪声点集残差为正且反映噪声量级', () => {
  const t = estimateSimilarTransform([[[0, 0], [0.5, 0]], [[100, 0], [100, -0.5]], [[50, 80], [50, 80.5]], [[80, 30], [79.5, 30]]]);
  assert.ok(t.scale > 0.99 && t.scale < 1.01);
  assert.ok(t.meanResidual > 0.1 && t.meanResidual < 5, `残差 ${t.meanResidual}`);
});

test('链式合成：A→B→C 等价 A→C', () => {
  const tAB = estimateSimilarTransform([[[0, 0], [10, 0]], [[50, 0], [60, 0]], [[0, 40], [10, 40]]]);
  const tBC = estimateSimilarTransform([[[10, 0], [30, 5]], [[60, 0], [80, 5]], [[10, 40], [30, 45]]]);
  const tAC = composeTransform(tAB, tBC);
  const direct = estimateSimilarTransform([[[0, 0], [30, 5]], [[50, 0], [80, 5]], [[0, 40], [30, 45]]]);
  const p = applyTransform(tAC, [25, 20]);
  const q = applyTransform(direct, [25, 20]);
  assert.ok(Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.01);
});

test('viewLerp：区间插值与端点钳制', () => {
  assert.deepEqual(viewLerp(0, 4), { fromView: 0, toView: 1, frac: 0 });
  assert.deepEqual(viewLerp(1, 4), { fromView: 1, toView: 2, frac: 0 });
  assert.deepEqual(viewLerp(1.5, 4), { fromView: 1, toView: 2, frac: 0.5 });
  assert.deepEqual(viewLerp(3, 4), { fromView: 3, toView: 3, frac: 0 });
  assert.deepEqual(viewLerp(-2, 4), { fromView: 0, toView: 1, frac: 0 });
  assert.deepEqual(viewLerp(9, 4), { fromView: 3, toView: 3, frac: 0 });
});

test('区域分析：同轮廓完全重叠；平移轮廓产生独有区', () => {
  const I = { scale: 1, tx: 0, ty: 0 };
  const square = [[100, 100], [300, 100], [300, 300], [100, 300]];
  const same = regionAnalysis(square, I, square, I, [1086, 1448], 16);
  assert.equal(same.onlyA, 0);
  assert.equal(same.onlyB, 0);
  assert.ok(same.overlap > 100);
  const shifted = regionAnalysis(square, I, square, { scale: 1, tx: 200, ty: 0 }, [1086, 1448], 16);
  assert.ok(shifted.onlyA > 0 && shifted.onlyB > 0, '平移后两侧各有独有区');
  assert.ok(shifted.overlap > 0, '仍有部分重叠');
});

test('研究数据文件：4 视角 3 对，锚点齐全且坐标在画布内', () => {
  const data = JSON.parse(readFileSync(new URL('../research/view-study-data.json', import.meta.url), 'utf8'));
  assert.equal(data.views.length, 4);
  assert.equal(data.pairs.length, 3);
  for (const v of data.views) {
    assert.ok(v.outline.length >= 10, `${v.id} 轮廓至少 10 点`);
    for (const [x, y] of Object.values(v.anchors)) {
      assert.ok(x > 0 && x < 1086 && y > 0 && y < 1448, `${v.id} 锚点在画布内`);
    }
  }
  for (const pair of data.pairs) {
    const from = data.views.find(v => v.id === pair.from);
    const to = data.views.find(v => v.id === pair.to);
    for (const k of pair.commonAnchors) {
      assert.ok(from.anchors[k] && to.anchors[k], `${pair.from}>${pair.to} 共有锚点 ${k} 两侧都有`);
    }
  }
});

test('实际数据逐对对齐：残差可计算且缩放接近 1（同人物同景别）', () => {
  const data = JSON.parse(readFileSync(new URL('../research/view-study-data.json', import.meta.url), 'utf8'));
  const byId = Object.fromEntries(data.views.map(v => [v.id, v]));
  for (const pair of data.pairs) {
    const pts = pair.commonAnchors.map(k => [byId[pair.to].anchors[k], byId[pair.from].anchors[k]]);
    const t = estimateSimilarTransform(pts);
    assert.ok(t.scale > 0.5 && t.scale < 2, `${pair.from}>${pair.to} 缩放 ${t.scale.toFixed(3)} 合理`);
    assert.ok(Number.isFinite(t.meanResidual));
  }
});
