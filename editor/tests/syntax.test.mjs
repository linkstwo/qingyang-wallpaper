import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

test('浏览器入口语法守卫：main.mjs / index.html 引用的模块全部可解析且语法正确', () => {
  // main.mjs 只在浏览器加载（node:test 不 import 它），历史上出现过"改坏模板字符串导致启动静默失败"，
  // 用 node --check 守住入口语法。
  const here = path.dirname(fileURLToPath(import.meta.url));
  const files = [
    path.join(here, '..', 'src', 'main.mjs'),
    path.join(here, '..', 'src', 'project.mjs'),
    path.join(here, '..', 'src', 'gl-scene.mjs'),
    path.join(here, '..', 'src', 'input-recorder.mjs'),
    path.join(here, '..', 'src', 'framing.mjs'),
    path.join(here, '..', 'src', 'view-arc.mjs'),
    path.join(here, '..', 'src', 'contacts.mjs'),
    path.join(here, '..', 'src', 'geometry.mjs'),
    path.join(here, '..', 'src', 'physics.mjs'),
    path.join(here, '..', 'src', 'history.mjs'),
    path.join(here, '..', 'src', 'mask-editor.mjs'),
    path.join(here, '..', 'export', 'export-android-assets.mjs'),
    path.join(here, '..', 'server.mjs'),
  ];
  for (const f of files) {
    const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
    assert.equal(r.status, 0, `${path.basename(f)} 语法错误:\n${r.stderr}`);
  }
});
