// 编辑器自动化测试入口：node --test editor/tests/
// 或直接: node editor/tests/run.mjs
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const result = spawnSync(process.execPath, ['--test', ...[
  'syntax.test.mjs', 'project.test.mjs', 'geometry.test.mjs', 'contacts.test.mjs',
  'physics.test.mjs', 'history.test.mjs', 'export.test.mjs', 'input-recorder.test.mjs',
  'framing.test.mjs', 'stability.test.mjs', 'multiview-framing.test.mjs', 'follow-window.test.mjs', 'big-edit-stress.test.mjs', 'view-study.test.mjs',
].map(f => path.join(here, f))], { stdio: 'inherit' });
process.exit(result.status ?? 1);
