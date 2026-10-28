// 生成"未编辑"基线工程（从 character-prototype/preview/mesh.json 导入，无任何手工编辑）。
// 供导出兼容测试使用：它的导出必须与 android-app/app/src/main/assets 现有 bins 逐字节一致。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectFromPrototypeMesh, serializeProject } from '../src/project.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const config = JSON.parse(fs.readFileSync(path.join(repo, 'character-prototype', 'preview', 'mesh.json'), 'utf8'));
const project = projectFromPrototypeMesh(config);
const out = path.join(repo, 'editor', 'tmp', 'reading-v2-pristine.qingyang.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, serializeProject(project));
console.log('pristine project →', out, '（vertexEdits 为空）');
