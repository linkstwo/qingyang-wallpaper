// paper-partition-4combo-audit.mjs — doubao-owned 4-combo paper partition audit
// paperPartition × forearmVolume, measure body/paper verts, projection error, pin error, triangle flips.
import fs from 'node:fs';
import {buildObservedScene} from '../active/character-prototype/preview/observed-scene.mjs';
import {poseConnectedProxy} from '../active/character-prototype/preview/structural-pose.mjs';
import {projectWorld} from '../active/character-prototype/preview/scene-model.mjs';

const sub = (a,b) => a.map((v,i)=>v-b[i]);
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const norm = a => Math.hypot(...a);

function checkTriangles(beforePositions, afterPositions, supportWeights, label) {
  const triCount = beforePositions.length / 3 / 3;
  let flippedTris = 0, degenerateTris = 0;
  let minDot = 1, minAreaRatio = 1;
  for (let t=0; t<triCount; t++) {
    const v0 = t*3, v1 = t*3+1, v2 = t*3+2;
    const p0 = beforePositions.slice(v0*3, v0*3+3);
    const p1 = beforePositions.slice(v1*3, v1*3+3);
    const p2 = beforePositions.slice(v2*3, v2*3+3);
    const q0 = afterPositions.slice(v0*3, v0*3+3);
    const q1 = afterPositions.slice(v1*3, v1*3+3);
    const q2 = afterPositions.slice(v2*3, v2*3+3);
    const nBefore = cross(sub(p1,p0), sub(p2,p0));
    const nAfter = cross(sub(q1,q0), sub(q2,q0));
    const A = norm(nBefore), B = norm(nAfter);
    if (A < 1e-10 || B < 1e-10) { degenerateTris++; continue; }
    const dot = (nBefore[0]*nAfter[0]+nBefore[1]*nAfter[1]+nBefore[2]*nAfter[2])/(A*B);
    const areaRatio = B/A;
    if (dot < 0) flippedTris++;
    if (areaRatio < 0.1) degenerateTris++;
    if (dot < minDot) minDot = dot;
    if (areaRatio < minAreaRatio) minAreaRatio = areaRatio;
  }
  return {triCount, flippedTris, degenerateTris, minDot: minDot.toFixed(4), minAreaRatio: minAreaRatio.toFixed(4)};
}

const combos = [
  {paperPartition: false, forearmVolume: false, label: 'old-default (pp=false, fv=false)'},
  {paperPartition: true, forearmVolume: false, label: 'new-partition (pp=true, fv=false)'},
  {paperPartition: false, forearmVolume: true, label: 'forearm-volume (pp=false, fv=true)'},
  {paperPartition: true, forearmVolume: true, label: 'new-partition+forearm (pp=true, fv=true)'}
];

const results = [];
for (const c of combos) {
  console.log('Auditing:', c.label);
  try {
    const scene = buildObservedScene({paperPartition: c.paperPartition, forearmVolume: c.forearmVolume});
    // Zero pose: check projection accuracy
    let maxProjErr = 0;
    for (const s of [scene.body, scene.paper]) {
      for (let i=0; i<s.vertices; i++) {
        const p = s.positions.slice(i*3, i*3+3);
        const uv = s.uv.slice(i*2, i*2+2);
        const q = projectWorld(p);
        const err = Math.hypot(q[0]-uv[0]*1152, q[1]-uv[1]*1536);
        if (err > maxProjErr) maxProjErr = err;
      }
    }
    // Pose at extreme combo
    const posedBody = poseConnectedProxy(scene.body, {yaw:-.06, pitch:.04, roll:.035});
    const posedPaper = poseConnectedProxy(scene.paper, {yaw:-.06, pitch:.04, roll:.035});
    // Triangle check
    const bodyTri = checkTriangles(scene.body.positions, posedBody.positions, scene.body.supportWeights, 'body');
    const paperTri = checkTriangles(scene.paper.positions, posedPaper.positions, scene.paper.supportWeights, 'paper');
    results.push({
      label: c.label,
      status: 'OK',
      bodyVertices: scene.body.vertices,
      paperVertices: scene.paper.vertices,
      bodyTriangles: bodyTri.triCount,
      paperTriangles: paperTri.triCount,
      maxZeroPoseProjectionError: maxProjErr.toFixed(4),
      maxPaperPinError: posedPaper.maxPinnedError.toFixed(6),
      maxBodyPinError: posedBody.maxPinnedError.toFixed(6),
      bodyFlippedTris: bodyTri.flippedTris,
      paperFlippedTris: paperTri.flippedTris,
      bodyDegenerateTris: bodyTri.degenerateTris,
      paperDegenerateTris: paperTri.degenerateTris,
      bodyMinNormalDot: bodyTri.minDot,
      bodyMinAreaRatio: bodyTri.minAreaRatio,
      paperPartition: c.paperPartition,
      forearmVolume: c.forearmVolume
    });
    console.log('  OK body='+scene.body.vertices, 'paper='+scene.paper.vertices);
  } catch(e) {
    results.push({
      label: c.label,
      status: 'FAIL',
      error: e.message.slice(0, 200),
      paperPartition: c.paperPartition,
      forearmVolume: c.forearmVolume
    });
    console.log('  FAIL:', e.message.slice(0, 100));
  }
}

const output = {
  auditTime: new Date().toISOString(),
  auditor: 'doubao',
  note: '4-combo paperPartition × forearmVolume audit. nearest_vertex_distance (not crack width).',
  combos: results
};

const outPath = new URL('./paper-partition-4combo-audit.json', import.meta.url);
fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');
console.log('Wrote:', outPath.pathname);
