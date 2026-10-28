import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject, projectFromPrototypeMesh, validateProject, serializeProject, loadProject, defaultLayer } from '../src/project.mjs';
import { readFileSync } from 'node:fs';

const config = () => JSON.parse(readFileSync(new URL('../../character-prototype/preview/mesh.json', import.meta.url), 'utf8'));

test('projectFromPrototypeMesh 生成合法 schema（含 3 图层）', () => {
  const p = projectFromPrototypeMesh(config());
  assert.equal(p.format, 'qingyang-editor-project');
  assert.equal(p.version, 1);
  assert.equal(p.layers.length, 3);
  assert.deepEqual(validateProject(p), []);
});

test('createProject 空工程被校验器拒绝（工程必须有图层）', () => {
  assert.throws(() => loadProject(serializeProject(createProject())), /layers/);
});

test('serialize → load 回环不丢数据', () => {
  const p = projectFromPrototypeMesh(config());
  p.layers[1].vertexEdits = { 100: [3, -4] };
  const text = serializeProject(p);
  const back = loadProject(text);
  assert.equal(back.meta.name, p.meta.name);
  assert.deepEqual(back.layers[1].vertexEdits, p.layers[1].vertexEdits);
  assert.deepEqual(back.layers.find(l => l.kind === 'character').pins, p.layers.find(l => l.kind === 'character').pins);
  assert.deepEqual(validateProject(back), []);
});

test('坏输入被拒绝：非 JSON / 错 format / 空图层 / 非法区域 / 非法接触区', () => {
  assert.throws(() => loadProject('{oops'), /JSON/);
  assert.throws(() => loadProject('{"format":"other","version":1,"canvas":[1,1],"layers":[]}'), /format/);
  assert.throws(() => loadProject('{"format":"qingyang-editor-project","version":1,"canvas":[1,1],"layers":[]}'), /layers/);
  const bad = projectFromPrototypeMesh(config());
  bad.layers[1].regions.push({ id: 'broken', kind: 'bell' });
  assert.throws(() => loadProject(serializeProject(bad)), /区域 broken/);
  const badPin = projectFromPrototypeMesh(config());
  badPin.layers[1].pins.push({ name: 'tiny', outline: [[0, 0], [1, 1]] });
  assert.throws(() => loadProject(serializeProject(badPin)), /接触区/);
});

test('defaultLayer 数值字段类型固定，contactWeight 基准来自 contact-rig contacts', () => {
  const layer = defaultLayer('t', null, null);
  assert.equal(layer.pins.length, 0);
  assert.equal(layer.seatSupport, null);
  const p = projectFromPrototypeMesh(config());
  const char = p.layers.find(l => l.kind === 'character');
  assert.equal(char.pins.length, 3, 'contact-rig.mjs 内联 contacts 有 3 个区域');
  assert.deepEqual(char.seatSupport, { y0: 1240, y1: 1360 }, '坐姿支撑与 main contactPin 一致');
  assert.equal(char.pins.filter(r => r.name === 'blueprint').length, 1);
});
