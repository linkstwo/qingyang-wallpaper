// 蒙版编辑器：多边形绘制 + 画笔修正 + 羽化，输出为画布蒙版（导出 PNG）。
// 蒙版语义与现有样片一致：白=人物（alpha=1），黑=背景。R 通道参与 alpha。
// 不做自动抠图；手绘多边形 + 画笔是唯一正式入口（任务书 A4 要求）。

export function createMaskCanvas(W, H, initialMaskImage) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  if (initialMaskImage) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(initialMaskImage, 0, 0, W, H);
  }
  return { canvas: cv, ctx };
}

// 多边形填充到蒙版（value 1=填入人物 0=擦除）。
export function fillPolygon(maskCtx, outline, value = 1) {
  if (!outline || outline.length < 3) throw new Error('多边形至少 3 个点');
  maskCtx.save();
  maskCtx.globalCompositeOperation = value ? 'source-over' : 'destination-out';
  maskCtx.fillStyle = '#fff';
  maskCtx.beginPath();
  maskCtx.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i++) maskCtx.lineTo(outline[i][0], outline[i][1]);
  maskCtx.closePath();
  maskCtx.fill();
  maskCtx.restore();
}

// 画笔：radius 像素、硬边或软边（soft=高斯笔刷）。
export function paintStroke(maskCtx, from, to, radius, value = 1, soft = true) {
  maskCtx.save();
  maskCtx.globalCompositeOperation = value ? 'source-over' : 'destination-out';
  if (soft) {
    maskCtx.filter = `blur(${Math.max(1, radius / 3)}px)`;
    maskCtx.strokeStyle = 'rgba(255,255,255,0.9)';
  } else {
    maskCtx.strokeStyle = '#fff';
  }
  maskCtx.lineWidth = radius * 2;
  maskCtx.lineCap = 'round';
  maskCtx.lineJoin = 'round';
  maskCtx.beginPath();
  maskCtx.moveTo(from[0], from[1]);
  maskCtx.lineTo(to[0], to[1]);
  maskCtx.stroke();
  maskCtx.restore();
}

// 羽化：对整张蒙版应用 box blur 近似（用 ctx.filter 在中转画布完成）。
// 返回新蒙版画布；半径 0 时原样返回。
export function featherMask(maskCanvas, radiusPx) {
  if (!radiusPx || radiusPx <= 0) return maskCanvas;
  const W = maskCanvas.width, H = maskCanvas.height;
  const tmp = document.createElement('canvas');
  tmp.width = W; tmp.height = H;
  const tctx = tmp.getContext('2d');
  tctx.filter = `blur(${radiusPx}px)`;
  tctx.drawImage(maskCanvas, 0, 0);
  return tmp;
}

// 蒙版统计：覆盖率（白色像素比例）——用于状态提示与测试。
export function maskCoverage(maskCanvas) {
  const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });
  const d = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
  let white = 0, total = d.length / 4;
  for (let i = 0; i < d.length; i += 4) { if (d[i] > 127) white++; }
  return white / total;
}

// 蒙版画布 → PNG Blob
export function maskToBlob(maskCanvas) {
  return new Promise((resolve, reject) => {
    maskCanvas.toBlob(b => b ? resolve(b) : reject(new Error('PNG 导出失败')), 'image/png');
  });
}
