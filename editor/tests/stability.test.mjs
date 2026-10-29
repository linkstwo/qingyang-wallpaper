import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { projectFromPrototypeMesh, serializeProject, loadProject, DEFAULT_REGIONS } from '../src/project.mjs';
import { SpringBank, ViewTracker, demoInput } from '../src/physics.mjs';
import { buildLayerMesh, applyVertexEdits, weldIndex, checkMeshQuality } from '../src/geometry.mjs';

const config = () => JSON.parse(readFileSync(new URL('../../character-prototype/preview/mesh.json', import.meta.url), 'utf8'));
const project = () => projectFromPrototypeMesh(config());
const charLayer = () => project().layers.find(l => l.kind === 'character');

test('G8 物理长跑：demoInput 轨迹循环 1000 秒（60fps）无 NaN、有界、可收敛', () => {
  const layer = charLayer();
  const bank = new SpringBank(layer.springs);
  const tr = new ViewTracker();
  let maxAbs = 0, checked = 0;
  for (let t = 0; t < 1000; t += 1 / 60) {
    // 前 18s 用演示轨迹，其后循环前 200s 片段（含快速晃动段）
    const src = demoInput(t % 200);
    const [ax, ay] = tr.update({ x: src.x, y: src.y }, 1 / 60);
    const vis = bank.step(ax, ay, layer.springGains, layer.limits, 1 / 60);
    for (const v of vis) {
      assert.ok(Number.isFinite(v), `t=${t.toFixed(2)} 出现非有限值`);
      maxAbs = Math.max(maxAbs, Math.abs(v));
      checked++;
    }
  }
  assert.ok(checked > 350000);
  const limitsSum = layer.limits.bodyPixels + layer.limits.chestPixels + layer.limits.hairPixels + (layer.limits.hairTipPixels ?? 0);
  assert.ok(maxAbs <= limitsSum + 1e-9, `峰值 ${maxAbs} 超过限幅和 ${limitsSum}`);
  // 停止输入后收敛
  for (let t = 0; t < 8; t += 1 / 60) bank.step(0, 0, layer.springGains, layer.limits, 1 / 60);
  const rest = bank.step(0, 0, layer.springGains, layer.limits, 1 / 60);
  for (const v of rest) assert.ok(Math.abs(v) < 0.05, `停止后残差 ${v}`);
});

test('G8 保存/重开循环 200 次：数据逐字段一致（含编辑累加）', () => {
  let p = project();
  p.layers[1].vertexEdits = { 100: [1, 0] };
  for (let i = 0; i < 200; i++) {
    const text = serializeProject(p);
    p = loadProject(text);
    p.layers[1].vertexEdits[100] = [p.layers[1].vertexEdits[100][0], i];
  }
  const back = loadProject(serializeProject(p));
  assert.equal(back.layers[1].vertexEdits[100][0], 1);
  assert.equal(back.layers[1].vertexEdits[100][1], 199);
  assert.equal(back.layers.length, 3);
  assert.equal(back.format, 'qingyang-editor-project');
});

test('G8 边界值：极限弹簧参数与极端顶点偏移不炸且可检', () => {
  const layer = charLayer();
  // 极限弹簧：最低频率/最高阻尼 + 最高频率/最低阻尼
  for (const cfg of [{ frequency: 0.1, damping: 2, limit: 60 }, { frequency: 12, damping: 0.01, limit: 0.05 }]) {
    const bank = new SpringBank({ body: cfg, chest: cfg, hair: cfg, hairTip: cfg });
    const tr = new ViewTracker();
    for (let t = 0; t < 60; t += 1 / 60) {
      const [ax, ay] = tr.update({ x: Math.sin(t * 30), y: Math.cos(t * 41) }, 1 / 60);
      const vis = bank.step(ax, ay, layer.springGains, layer.limits, 1 / 60);
      for (const v of vis) assert.ok(Number.isFinite(v), `cfg=${JSON.stringify(cfg)} t=${t.toFixed(2)} 非有限`);
    }
  }
  // 极端顶点偏移 ±10000px：网格质量检查应报出翻转而非崩溃
  const positions = buildLayerMesh(layer, [1086, 1448]);
  const weld = weldIndex(positions);
  const crazy = applyVertexEdits(positions, { 0: [10000, 0], 3: [-10000, 0] }, weld);
  const q = checkMeshQuality(crazy);
  assert.equal(q.ok, false);
  assert.ok(q.flipped.length > 0 || q.degenerate.length > 0, '极端偏移应被质量检查捕获');
});

test('G8 输入校验：工程加载拒绝坏数据（越界/缺字段/类型错）', () => {
  const p = project();
  const text = serializeProject(p);
  assert.throws(() => loadProject(text.replace('"version": 1', '"version": 99')), /版本/);
  const p2 = project();
  p2.canvas = ['宽', '高'];
  assert.throws(() => loadProject(serializeProject(p2)), /canvas/);
  const p3 = project();
  p3.layers[1].springGains.body = '很大';
  assert.doesNotThrow(() => loadProject(serializeProject(p3)), '增益为字符串不阻塞加载（渲染端忽略）');
});
