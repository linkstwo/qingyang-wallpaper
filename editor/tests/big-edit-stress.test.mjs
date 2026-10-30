import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { projectFromPrototypeMesh, serializeProject, loadProject } from '../src/project.mjs';
import { prototypeMakeMesh, weldIndex, applyVertexEdits, checkMeshQuality } from '../src/geometry.mjs';

const CANVAS = [1086, 1448];
const mesh = prototypeMakeMesh([[0, 0], [CANVAS[0], 0], [CANVAS[0], CANVAS[1]], [0, CANVAS[1]]], [], 27);
const config = () => JSON.parse(readFileSync(new URL('../../character-prototype/preview/mesh.json', import.meta.url), 'utf8'));

test('D15 大顶点编辑：1000/8000 点编辑性能与正确性（weld 同步、质量可检）', () => {
  const weld = weldIndex(mesh);
  const groups = [...weld.values()];
  assert.ok(groups.length > 5000, `weld 组数 ${groups.length}`);
  for (const count of [1000, 8000]) {
    const t0 = performance.now();
    const edits = {};
    for (let i = 0; i < count; i++) {
      const slot = groups[(i * 7) % groups.length][0];
      edits[slot] = [Math.sin(i) * 6, Math.cos(i * 1.3) * 6];
    }
    const edited = applyVertexEdits(mesh, edits, weld);
    const elapsed = performance.now() - t0;
    assert.ok(elapsed < 2000, `${count} 点编辑 ${elapsed.toFixed(0)}ms 应 <2s`);
    // 抽查：每个编辑槽位及其 weld 组全部同步
    const sample = Object.keys(edits)[0];
    const slot = Number(sample);
    const px = mesh[slot * 2], py = mesh[slot * 2 + 1];
    const k = px.toFixed(3) + ',' + py.toFixed(3);
    for (const s of (weld.get(k) ?? [slot])) {
      assert.equal(edited[s * 2], mesh[s * 2] + edits[slot][0]);
      assert.equal(edited[s * 2 + 1], mesh[s * 2 + 1] + edits[slot][1]);
    }
    // 质量检查能跑完（大量位移会出翻转，但不出错）
    const q = checkMeshQuality(edited);
    assert.ok(Number.isFinite(q.degenerate.length + q.flipped.length));
  }
});

test('D15 大编辑工程序列化：8000 点编辑的保存/加载 <3s 且体积合理', () => {
  const p = projectFromPrototypeMesh(config());
  const char = p.layers.find(l => l.kind === 'character');
  const weld = weldIndex(mesh);
  const groups = [...weld.values()];
  const edits = {};
  for (let i = 0; i < 8000; i++) {
    const slot = groups[(i * 11) % groups.length][0];
    edits[slot] = [+((i % 7) - 3), +((i % 5) - 2)];
  }
  char.vertexEdits = edits;
  const t0 = performance.now();
  const text = serializeProject(p);
  const back = loadProject(text);
  const elapsed = performance.now() - t0;
  assert.ok(elapsed < 3000, `序列化+加载 ${elapsed.toFixed(0)}ms 应 <3s`);
  assert.equal(Object.keys(back.layers.find(l => l.kind === 'character').vertexEdits).length, 8000);
  assert.ok(text.length < 4_000_000, `工程体积 ${(text.length / 1e6).toFixed(2)}MB 应 <4MB`);
});
