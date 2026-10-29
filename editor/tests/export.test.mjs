import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const NODE = process.execPath;
const EXPORT = path.join(repo, 'editor', 'export', 'export-android-assets.mjs');
const PRISTINE = path.join(repo, 'editor', 'tmp', 'reading-v2-pristine.qingyang.json');
const ASSETS = path.join(repo, 'android-app', 'app', 'src', 'main', 'assets');

test('pristine 工程导出与 Android 现有 assets 逐字节一致（G5 核心）', () => {
  assert.ok(existsSync(PRISTINE), 'tmp pristine 工程存在（由 scripts/make-pristine-project.mjs 生成）');
  const out = execFileSync(NODE, [EXPORT, PRISTINE, ASSETS, '--check'], { encoding: 'utf8' });
  assert.match(out, /PASS/);
});

test('带顶点编辑的工程 --check 被正确拒绝（反向用例）', () => {
  const edited = path.join(repo, 'editor', 'examples', 'reading-v2.qingyang.json');
  assert.ok(existsSync(edited));
  let failed = false;
  try {
    execFileSync(NODE, [EXPORT, edited, ASSETS, '--check'], { encoding: 'utf8', stdio: 'pipe' });
  } catch { failed = true; }
  assert.equal(failed, true, '编辑后的工程与未编辑 assets 应不一致');
});

test('导出 report 结构完整：bins/sha256/contactRecheckPassed', () => {
  const outDir = path.join(repo, 'editor', 'tmp', 'export-out');
  execFileSync(NODE, [EXPORT, PRISTINE, outDir], { encoding: 'utf8' });
  const report = JSON.parse(readFileSync(path.join(outDir, 'editor-export-report.json'), 'utf8'));
  assert.equal(report.counts.characterTriangles, 16384);
  assert.equal(report.bins.length, 3, 'character_mesh + character_pins + foreground_mesh');
  assert.equal(report.contactRecheckPassed, true);
  for (const bin of report.bins) assert.match(bin.sha256, /^[0-9A-F]{64}$/);
});

test('qingyang-params.json 与 Android RenderParams.java 字段约定一致（参数接线）', () => {
  const outDir = path.join(repo, 'editor', 'tmp', 'export-out');
  execFileSync(NODE, [EXPORT, PRISTINE, outDir], { encoding: 'utf8' });
  const params = JSON.parse(readFileSync(path.join(outDir, 'qingyang-params.json'), 'utf8'));
  assert.equal(params.format, 'qingyang-render-params');
  assert.equal(params.version, 1);
  // RenderParams.applyJson 读取的全部键
  for (const key of ['headY0', 'headY1', 'headDepth', 'headCheekGain', 'bells', 'depth', 'inertia', 'squeeze',
    'turnRatioY', 'inertiaBase', 'hairYRatio', 'headBodyGain', 'bgRatio', 'fgRatio',
    'springBody', 'springChest', 'springHair', 'springHairTip', 'gains', 'limits']) {
    assert.ok(params[key] !== undefined, `缺字段 ${key}`);
  }
  assert.equal(params.bells.length, 7);
  assert.deepEqual(params.bells.map(b => b.id), ['neck', 'chest', 'shoulder', 'torso', 'cheek', 'hairRoot', 'hairTip']);
  assert.equal(params.depth.length, 7);
  assert.equal(params.inertia.length, 7);
  // RenderParams 的 limits 约定名（body/chest/hair/hairTip，非编辑器的 bodyPixels*）
  assert.ok(Number.isFinite(params.limits.body) && Number.isFinite(params.limits.hairTip));
  for (const s of ['springBody', 'springChest', 'springHair', 'springHairTip']) {
    assert.ok(Number.isFinite(params[s].frequency) && Number.isFinite(params[s].damping) && Number.isFinite(params[s].limit), `${s} 三参数齐全`);
  }
});
