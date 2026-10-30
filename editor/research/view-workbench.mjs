// 错误直接显示在页面状态行（研究工具自诊断）
window.addEventListener('error', e => { const el = document.querySelector('#state'); if (el) el.textContent = '页面错误: ' + e.message + ' @' + (e.lineno ?? '?'); });
window.addEventListener('unhandledrejection', e => { const el = document.querySelector('#state'); if (el) el.textContent = '异步错误: ' + String(e.reason && e.reason.message || e.reason).slice(0, 160); });
import { estimateSimilarTransform, applyTransform, composeTransform, regionAnalysis, viewLerp } from '../src/view-study.mjs';
import { multiViewFraming, followWindowPath, followCropWindow, cropWindow } from '../src/framing.mjs';
import { VIEW_STUDY_DATA } from './view-study-data.mjs';

main().catch(e => { const el = document.querySelector("#state"); const st = String(e && e.stack || e).split('\n').slice(0, 4).join(' | '); if (el) el.textContent = '启动错误: ' + st.slice(0, 240); console.error(e); });
function main() { window.__wb = ['main-entered']; return (async () => {
  window.__wb.push('start');
  const data = VIEW_STUDY_DATA;
  const [W, H] = [1086, 1448];
  const images = new Map();
  // 缩略图以 dataURL 内联（543x724），零网络依赖——IAB 页面上下文的图片网络加载不可靠
  for (const v of data.views) {
    const img = new Image();
    // IAB 的 img.decode() promise 在页面上下文会挂死（dataURL 也挂），改用 onload 老事件
    await new Promise((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error(v.id + ' 缩略图加载失败'));
      img.src = v.thumbDataUrl;
      setTimeout(() => rej(new Error(v.id + ' 缩略图加载超时(6s)')), 6000);
    });
    images.set(v.id, img);
    window.__wb.push('img:' + v.id);
  }
  const byId = Object.fromEntries(data.views.map(v => [v.id, v]));

  // 逐对变换（以 from 图空间为基准）：to → from 的变换
  const pairResults = {};
  for (const pair of data.pairs) {
    const A = byId[pair.from], B = byId[pair.to];
    const pts = pair.commonAnchors.map(k => [A.anchors[k], B.anchors[k]]);
    // to 图 → from 图 空间（把 B 对齐到 A）
    const t = estimateSimilarTransform(pts.map(([a, b]) => [b, a]));
    pairResults[pair.from + '>' + pair.to] = { ...t, pair };
  }
  // 链式：全部对齐到 fv 空间
  const toFv = { fv: { scale: 1, tx: 0, ty: 0 } };
  for (const p of ['mf', 'sd', 'bk']) {
    const prev = { mf: 'fv', sd: 'mf', bk: 'sd' }[p]; // p 的前一个视角
    const key = prev + '>' + p; // pairResults 以 from>to 为键
    toFv[p] = composeTransform(pairResults[key], toFv[prev]);
  }

  // 对齐质量表
  const pt = document.querySelector('#pairtable');
  pt.innerHTML = '<tr><th>对</th><th>缩放</th><th>平均残差 px</th><th>最大残差 px</th><th>可用于</th></tr>';
  for (const [key, r] of Object.entries(pairResults)) {
    if (!r || typeof r.scale !== 'number' || !r.pair) { console.warn('跳过异常对', key, r); continue; }
    const usable = r.meanResidual < 40 ? '<span class="ok">平滑过渡</span>' : r.meanResidual < 80 ? '<span class="warn">谨慎过渡</span>' : '<span class="err">仅整档切换</span>';
    pt.innerHTML += '<tr><td>' + r.pair.from + ' → ' + r.pair.to + '</td><td>' + r.scale.toFixed(3) + '</td><td>' + r.meanResidual.toFixed(1) + '</td><td>' + r.maxResidual.toFixed(1) + '</td><td>' + usable + '</td></tr>';
  }

  const cv = document.querySelector('#stage'), ctx = cv.getContext('2d');
  const scale = cv.width / W;

  function drawView(viewId, alpha, ghost) {
    const img = images.get(viewId);
    const t = toFv[viewId];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.transform(t.scale, 0, 0, t.scale, t.tx, t.ty);
    ctx.drawImage(img, 0, 0, W, H);
    ctx.restore();
    if (ghost) drawOutline(viewId, t);
  }

  function drawOutline(viewId, t) {
    const v = byId[viewId];
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.strokeStyle = viewId === 'fv' ? 'rgba(80,220,255,0.7)' : viewId === 'mf' ? 'rgba(124,252,0,0.7)' : viewId === 'sd' ? 'rgba(255,213,74,0.7)' : 'rgba(255,120,120,0.7)';
    ctx.lineWidth = 2 / scale / t.scale;
    ctx.beginPath();
    const pts = v.outline.map(p => applyTransform(t, p));
    pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
    ctx.stroke();
    // 锚点（绿=像素校验 PASS，黄=SUSPECT；校验见 anchor-verification.json）
    for (const [k, p] of Object.entries(v.anchors)) {
      const [x, y] = applyTransform(t, p);
      const ver = v.anchorVerification?.[k];
      ctx.fillStyle = !ver ? ctx.strokeStyle : ver.verdict === 'PASS' ? 'rgba(124,252,0,0.95)' : 'rgba(255,213,74,0.95)';
      ctx.beginPath();
      ctx.arc(x, y, 4 / scale / t.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `${14 / scale / t.scale}px sans-serif`;
      ctx.fillText(k + (ver ? '·' + ver.classified : ''), x + 6 / t.scale, y);
    }
    ctx.restore();
  }

  function draw() {
    const t = Number(document.querySelector('#slider').value) / 100;
    document.querySelector('#tval').textContent = t.toFixed(2);
    const { fromView, toView, frac } = viewLerp(t, data.views.length);
    const fromId = data.views[fromView].id, toId = data.views[toView].id;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#101114';
    ctx.fillRect(0, 0, cv.width, cv.height);
    const labels = document.querySelector('#showLabels').checked;
    const ghost = document.querySelector('#showGhost').checked;
    if (fromView === toView) {
      drawView(fromId, 1, labels);
    } else {
      // 后图先画（在下），前图淡出（在上）→ 前图独有区随 alpha 消失
      drawView(toId, frac, labels && ghost);
      drawView(fromId, 1 - frac, labels && ghost);
    }
    // T02 权衡：构图模式（固定窗口 vs 按视角跟移窗口）
    try {
      const mode = document.querySelector('input[name=fmode]:checked')?.value ?? 'fixed';
      const keyAnchorsAll = {};
      for (const v of data.views) {
        const va = {};
        for (const [k, xy] of Object.entries(v.anchors)) {
          if (['face', 'shoulderL', 'shoulderR', 'shoulderBack', 'shoulderFront', 'waist'].includes(k)) va[k] = xy;
        }
        keyAnchorsAll[v.id] = va;
      }
      const ratio = 9 / 20;
      let win, label;
      if (mode === 'follow') {
        const path = followWindowPath(keyAnchorsAll, [W, H], ratio, data.views.map(v => v.id));
        const off = path[fromId] + (path[toId] - path[fromId]) * frac;
        win = followCropWindow([W, H], ratio, off);
        label = '跟移窗口：' + fromId + '→' + toId + ' 偏移 ' + (off * 100).toFixed(0) + '%（窗口中心跟随人物质心，档间线性插值）';
      } else {
        win = cropWindow([W, H], ratio, 0.5);
        label = '固定窗口：居中 50%';
      }
      // 画窗口 + 关键点落窗检查（当前两个视角的锚点）
      ctx.save();
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.strokeStyle = 'rgba(255, 210, 80, 0.95)';
      ctx.lineWidth = 3 / scale;
      ctx.strokeRect(win.x0, win.y0, win.x1 - win.x0, win.y1 - win.y0);
      for (const vid of [fromId, toId]) {
        for (const [k, xy] of Object.entries(keyAnchorsAll[vid])) {
          const inside = xy[0] >= win.x0 && xy[0] <= win.x1;
          ctx.fillStyle = inside ? 'rgba(124,252,0,0.95)' : 'rgba(255,90,90,0.95)';
          ctx.beginPath();
          ctx.arc(xy[0], xy[1], 4 / scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      document.querySelector('#fmodeLabel').textContent = label;
      // 跟移模式下每档全档可见性（应全绿——这就是方案验证）
      if (mode === 'follow') {
        const mt2 = document.querySelector('#followtable');
        if (mt2) {
          const path = followWindowPath(keyAnchorsAll, [W, H], ratio, data.views.map(v => v.id));
          let html = '<tr><th>档位</th><th>窗口偏移</th><th>关键点</th><th>结论</th></tr>';
          for (const v of data.views) {
            const w2 = followCropWindow([W, H], ratio, path[v.id]);
            const lost = Object.entries(keyAnchorsAll[v.id]).filter(([, xy]) => xy[0] < w2.x0 || xy[0] > w2.x1).map(([k]) => k);
            html += '<tr><td>' + v.id + '</td><td>' + (path[v.id] * 100).toFixed(0) + '%</td><td>' + (lost.length ? '<span class="warn">缺 ' + lost.join(',') + '</span>' : '<span class="ok">全部在窗内</span>') + '</td><td>' + (lost.length ? '<span class="warn">仍需权衡</span>' : '<span class="ok">跟移有效</span>') + '</td></tr>';
          }
          mt2.innerHTML = html;
        }
      }
    } catch (e) { console.warn('follow framing:', e); }
    // T02/T09 多视角构图对照（9:20 三档，四视角关键点可见性矩阵）
    try {
      const keyAnchors = {};
      for (const v of data.views) {
        const va = {};
        for (const [k, xy] of Object.entries(v.anchors)) {
          if (['face', 'shoulderL', 'shoulderR', 'shoulderBack', 'shoulderFront', 'waist'].includes(k)) va[k] = xy;
        }
        keyAnchors[v.id] = va;
      }
      const mv = multiViewFraming(keyAnchors, [W, H], 9 / 20);
      const mt = document.querySelector('#mvtable');
      if (mt) {
        let html = '<tr><th>9:20 偏移</th>' + data.views.map(v => '<th>' + v.id + '</th>').join('') + '<th>结论</th></tr>';
        for (const o of mv.options) {
          html += '<tr><td>' + Math.round(o.offsetX * 100) + '%</td>';
          for (const pv of o.perView) {
            const lost = pv.points.filter(p => !p.visible).map(p => p.name);
            html += '<td>' + (pv.allVisible ? '<span class="ok">全可见</span>' : '<span class="warn">缺 ' + lost.join(',') + '</span>') + '</td>';
          }
          html += '<td>' + (o.allViewsAllVisible ? '<span class="ok">四视角全保</span>' : '<span class="err">有遮挡</span>') + '</td></tr>';
        }
        html += '<tr><td colspan="6">推荐偏移：' + (mv.recommended !== null ? Math.round(mv.recommended * 100) + '%（四视角关键点全可见）' : '无——需要权衡（见上表）') + '</td></tr>';
        mt.innerHTML = html;
      }
    } catch (e) { console.warn('mv framing:', e); }
    // 段内区域分析
    if (fromView !== toView) {
      const key = fromId + '>' + toId;
      const pairR = pairResults[key];
      const A = byId[fromId], B = byId[toId];
      const reg = regionAnalysis(A.outline, { scale: 1, tx: 0, ty: 0 }, B.outline, toFv[toId], [W, H]);
      const rt = document.querySelector('#regiontable');
      rt.innerHTML = `<tr><td>${fromId} → ${toId}（缩放 ${pairR.scale.toFixed(3)}）</td><td>重叠 ${reg.overlap} 格 (${(reg.overlapRatio * 100).toFixed(0)}%)</td><td>仅 ${fromId}（淡出）${reg.onlyA} 格</td><td>仅 ${toId}（淡入）${reg.onlyB} 格</td></tr>`;
      if (ghost) {
        // 只画"仅后图"块（淡入的遮挡区）
        ctx.save();
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        ctx.fillStyle = 'rgba(255,213,74,0.18)';
        for (let r = 0; r < reg.rows; r++) {
          for (let c = 0; c < reg.cols; c++) {
            if (reg.gridB[r * reg.cols + c] && !reg.gridA[r * reg.cols + c]) {
              ctx.fillRect(c * reg.cell, r * reg.cell, reg.cell, reg.cell);
            }
          }
        }
        ctx.restore();
      }
      document.querySelector('#state').textContent =
        `视角 ${t.toFixed(2)} = ${fromId}(${(100 - frac * 100).toFixed(0)}%) × ${toId}(${(frac * 100).toFixed(0)}%) —— 档位间为对齐插值，档位处为真实原图；黄色块=后图独有（遮挡补绘推断区）`;
    } else {
      document.querySelector('#regiontable').innerHTML = '<tr><td>整档（真实原图）</td></tr>';
      document.querySelector('#state').textContent = `视角 ${t.toFixed(2)} = ${fromId}（真实原图档位）`;
    }
  }

  // 档位按钮
  const segbar = document.querySelector('#segbar');
  data.views.forEach((v, i) => {
    const s = document.createElement('span');
    s.className = 'seg';
    s.textContent = `${i}·${v.label}`;
    s.onclick = () => { document.querySelector('#slider').value = i * 100; draw(); };
    segbar.append(s);
  });
  document.querySelector('#slider').addEventListener('input', draw);
for (const r of document.querySelectorAll('input[name=fmode]')) r.addEventListener('change', draw);
  document.querySelector('#showLabels').addEventListener('change', draw);
  document.querySelector('#showGhost').addEventListener('change', draw);
  draw();
})(); }
