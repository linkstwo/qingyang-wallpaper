import test from 'node:test';
import assert from 'node:assert/strict';
import { History } from '../src/history.mjs';

test('commit/undo/redo 状态机', () => {
  const h = new History(50);
  h.init('v0');
  h.commit('v1');
  h.commit('v2');
  assert.equal(h.current, 'v2');
  assert.deepEqual(h.stats(), { undo: 2, redo: 0 });
  assert.equal(h.undo(), 'v1');
  assert.equal(h.undo(), 'v0');
  assert.equal(h.undo(), null, '栈底不再撤销');
  assert.equal(h.redo(), 'v1');
  assert.equal(h.redo(), 'v2');
  assert.equal(h.redo(), null);
  // 在 v2 上提交新状态 → redo 分支清空；redo 回放期间 past 累积了 v0,v1,v2 共 3 个
  h.commit('v3');
  assert.deepEqual(h.stats(), { undo: 3, redo: 0 });
  assert.equal(h.current, 'v3');
});

test('相同状态不重复入栈', () => {
  const h = new History(50);
  h.init('v0');
  assert.equal(h.commit('v0'), false);
  assert.deepEqual(h.stats(), { undo: 0, redo: 0 });
});

test('上限截断最老快照', () => {
  const h = new History(3);
  h.init('v0');
  for (const v of ['v1', 'v2', 'v3', 'v4']) h.commit(v);
  assert.equal(h.past.length, 3);
  assert.equal(h.undo(), 'v3');
  assert.equal(h.undo(), 'v2');
  assert.equal(h.undo(), 'v1', 'v0 已被截断');
  assert.equal(h.canUndo(), false);
});
