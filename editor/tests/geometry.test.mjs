import test from 'node:test';
import assert from 'node:assert/strict';
import { prototypeMakeMesh, buildLayerMesh, weldIndex, applyVertexEdits, checkMeshQuality, pickVertex, triangleCount } from '../src/geometry.mjs';

const CANVAS = [1086, 1448];

test('makeMesh：全画布 16384 三角形，两次生成逐字节一致', () => {
  const a = prototypeMakeMesh([[0, 0], [CANVAS[0], 0], [CANVAS[0], CANVAS[1]], [0, CANVAS[1]]], [], 27);
  const b = prototypeMakeMesh([[0, 0], [CANVAS[0], 0], [CANVAS[0], CANVAS[1]], [0, CANVAS[1]]], [], 27);
  assert.equal(triangleCount(a), 16384);
  assert.deepEqual([...a], [...b]);
});

test('buildLayerMesh：background=quad(2 三角形)，character=全画布，foreground=outline', () => {
  const bg = buildLayerMesh({ kind: 'background', mesh: { mode: 'quad' } }, CANVAS);
  assert.equal(bg.length, 12);
  const ch = buildLayerMesh({ kind: 'character', mesh: { mode: 'full-canvas' } }, CANVAS);
  assert.equal(triangleCount(ch), 16384);
  const fg = buildLayerMesh({ kind: 'foreground', mesh: { mode: 'outline', outline: [[44, 763], [300, 1100], [500, 1448]] } }, CANVAS);
  assert.ok(triangleCount(fg) >= 1);
});

test('weldIndex：重合顶点归组，编辑同步组内全部槽位', () => {
  const mesh = prototypeMakeMesh([[0, 0], [10, 0], [10, 10], [0, 10]], [], 3);
  const weld = weldIndex(mesh);
  // 顶角 (0,0) 至少出现在 2 个三角形中
  const corner = weld.get('0.000,0.000');
  assert.ok(corner && corner.length >= 2, '角落顶点被焊接为一组');
  const edited = applyVertexEdits(mesh, { [corner[0]]: [5, 0] }, weld);
  for (const slot of corner) {
    assert.equal(edited[slot * 2], mesh[slot * 2] + 5);
    assert.equal(edited[slot * 2 + 1], mesh[slot * 2 + 1]);
  }
  // 非 weld 组内点不动
  const moved = new Set(corner);
  for (let s = 0; s < mesh.length / 2; s++) {
    if (moved.has(s)) continue;
    assert.equal(edited[s * 2], mesh[s * 2], `槽位 ${s} 不应被移动`);
    assert.equal(edited[s * 2 + 1], mesh[s * 2 + 1]);
  }
});

test('checkMeshQuality：正常网格 OK；翻转三角形被报出', () => {
  const mesh = prototypeMakeMesh([[0, 0], [10, 0], [10, 10], [0, 10]], [], 3);
  assert.equal(checkMeshQuality(mesh).ok, true);
  // 手工构造一个翻转：把一个顶点拉过对边
  const flipped = Float32Array.from([0, 0, 10, 0, 20, -5]);
  const q = checkMeshQuality(flipped);
  assert.equal(q.ok, false);
  assert.equal(q.flipped.length, 1);
});

test('pickVertex：拾取最近 weld 组', () => {
  const mesh = prototypeMakeMesh([[0, 0], [10, 0], [10, 10], [0, 10]], [], 3);
  const weld = weldIndex(mesh);
  const s = pickVertex(mesh, weld, 0.4, 0.4, 5);
  assert.ok(s >= 0);
  assert.ok(Math.abs(mesh[s * 2]) < 3 && Math.abs(mesh[s * 2 + 1]) < 3);
  assert.equal(pickVertex(mesh, weld, 50, 50, 2), -1);
});
