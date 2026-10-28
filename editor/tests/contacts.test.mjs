import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { projectFromPrototypeMesh } from '../src/project.mjs';
import { layerContactWeights, prototypeContactWeights, prototypeContactPin, CONTACT_RECHECK_FIXED, CONTACT_RECHECK_FREE } from '../src/contacts.mjs';
import { prototypeMakeMesh } from '../src/geometry.mjs';

const CANVAS = [1086, 1448];
const mesh = prototypeMakeMesh([[0, 0], [CANVAS[0], 0], [CANVAS[0], CANVAS[1]], [0, CANVAS[1]]], [], 27);

test('编辑器图层权重与原型 contactWeights 逐字节一致（最强等价）', () => {
  const config = JSON.parse(readFileSync(new URL('../../character-prototype/preview/mesh.json', import.meta.url), 'utf8'));
  const p = projectFromPrototypeMesh(config);
  const char = p.layers.find(l => l.kind === 'character');
  const mine = layerContactWeights(char, mesh);
  const ref = prototypeContactWeights(mesh);
  assert.equal(mine.length, ref.length);
  for (let i = 0; i < mine.length; i++) assert.equal(mine[i], ref[i], `slot ${i} 权重不一致`);
});

test('接触复核基准：7 固定点 pin=1，4 自由点 pin≈0', () => {
  for (const [name, x, y] of CONTACT_RECHECK_FIXED) {
    assert.ok(prototypeContactPin(x, y) > 0.9999, `${name} (${x},${y}) 应固定`);
  }
  for (const [name, x, y] of CONTACT_RECHECK_FREE) {
    assert.ok(prototypeContactPin(x, y) < 0.001, `${name} (${x},${y}) 应自由`);
  }
});

test('图层 pins 缺 outline 时跳过不崩溃', () => {
  const config = JSON.parse(readFileSync(new URL('../../character-prototype/preview/mesh.json', import.meta.url), 'utf8'));
  const p = projectFromPrototypeMesh(config);
  const char = p.layers.find(l => l.kind === 'character');
  char.pins.push({ name: 'broken', feather: 30 }); // 无 outline
  const w = layerContactWeights(char, mesh);
  const ref = prototypeContactWeights(mesh);
  for (let i = 0; i < w.length; i++) assert.equal(w[i], ref[i]);
});
