// 从已验收的样片源码导出 Android 端要用的网格资产（只读引用，不改原型工程）
// 目的：安卓端不做三角化，直接加载与浏览器验收时逐字节一致的网格几何与接触权重
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {makeLayeredCharacterMesh,layeredMeshVersion} from '../../character-prototype/preview/layered-mesh.mjs';
import { makeMesh } from '../../character-prototype/preview/rig.mjs';
import { structure, depthWeights } from '../../character-prototype/preview/structure.mjs';
import { bodyContactWeights, contactPin } from '../../character-prototype/preview/contact-rig.mjs';

const PREVIEW = fileURLToPath(new URL('../../character-prototype/preview/', import.meta.url));
const OUT = fileURLToPath(new URL('../app/src/main/assets/', import.meta.url));
const CHECK = process.argv.includes('--check');
if (!CHECK) fs.mkdirSync(OUT, { recursive: true });
function output(name, bytes) {
  const destination = path.join(OUT, name);
  if (CHECK) {
    if (!fs.existsSync(destination) || !fs.readFileSync(destination).equals(bytes)) {
      throw new Error(`Stale or missing Android asset: ${name}. Run export_mesh.mjs without --check.`);
    }
  } else fs.writeFileSync(destination, bytes);
}

const config = JSON.parse(fs.readFileSync(path.join(PREVIEW, 'mesh.json'), 'utf8'));
const [W, H] = config.canvas;

const character = makeLayeredCharacterMesh(config.limits.triangleEdgePixels);
const pins = bodyContactWeights(character);
const foreground = makeMesh(config.foregroundOutline, [], 80);

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
function writeBin(name, arr) {
  const buf = Buffer.alloc(arr.length * 4);
  for (let i = 0; i < arr.length; i++) buf.writeFloatLE(arr[i], i * 4);
  output(name, buf);
  return { name, bytes: buf.length, sha256: sha(buf) };
}

const report = {
  source: 'character-prototype/preview/{rig.mjs,contact-rig.mjs,mesh.json}（只读）',
  canvas: [W, H],
  bins: [
    writeBin('character_mesh.bin', character),
    writeBin('character_pins.bin', pins),
    writeBin('character_depth.bin', depthWeights(character)),
    writeBin('foreground_mesh.bin', foreground),
  ],
  structure,
  topologyVersion:layeredMeshVersion,
  topologyNote:"Observed paper polygon removed from character triangles; only hand/seat depths attach body to support.",
  counts: {
    characterTriangles: character.length / 6,
    characterVertices: character.length / 2,
    foregroundTriangles: foreground.length / 6,
    foregroundVertices: foreground.length / 2,
  },
  springs: config.springs,
  responseNote: 'springs/limits are legacy geometry metadata; runtime response is Physics.java + preview/response.mjs, checked by tests/run_response.py',
  limits: config.limits,
  pins: {
    min: Math.min(...pins),
    max: Math.max(...pins),
    pinnedCount: Array.from(pins).filter((v) => v > 0.9999).length,
  },
  images: [],
};

// 素材副本：复制 + 校验（原文件只读）
for (const name of ['original.png', 'mask.png', 'background.png']) {
  const src = path.join(PREVIEW, name);
  const dst = path.join(OUT, name);
  const bytes = fs.readFileSync(src);
  output(name, bytes);
  const again = fs.readFileSync(dst);
  report.images.push({
    name,
    bytes: bytes.length,
    srcSha256: sha(bytes),
    dstSha256: sha(again),
    identical: sha(bytes) === sha(again),
  });
}

for (const name of ['scene.vert', 'scene.frag']) output(name, fs.readFileSync(path.join(PREVIEW, name)));

// 独立复核：安卓端会用它校验的关键接触点
const fixed=[['paper',100,1000],['holding hand',330,990],['seated support',500,1450]];
const free=[['face',550,305],['shoulder',940,490],['torso',795,800],['elbow',635,920]];
report.contactRecheck = [...fixed, ...free].map(([name, x, y]) => ({ name, pin: contactPin(x, y) }));
report.contactRecheckPassed = report.contactRecheck.every(({ name, pin }) => fixed.some(([n]) => n === name) ? pin > 0.9999 : pin < 0.001);

output('mesh-report.json', Buffer.from(JSON.stringify(report, null, 2)));
console.log(JSON.stringify(report, null, 2));
if (CHECK) console.log('PASS: Android assets exactly match the editable prototype; no files were written.');

// Native load guard must track regenerated topology before an APK can be built.
const native=fs.readFileSync(new URL('../app/src/main/java/com/tangtang/motionwallpaper/MeshAssets.java',import.meta.url),'utf8');
const expected=Number(native.match(/EXPECTED_CHARACTER_TRIANGLES\s*=\s*(\d+)/)?.[1]);
if(expected!==character.length/6)throw Error('Native MeshAssets triangle guard is stale: '+expected+' vs '+character.length/6);
