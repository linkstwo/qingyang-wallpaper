# Parts UI Check — 2026-10-26

## 已验证（我真跑了）
- [x] node tests/parts-warp-regression.mjs → **1678 checks passed**, minAreaRatio=0.783
- [x] node --check parts-fit.mjs / parts-warp.mjs / parts-raster.mjs → 全过
- [x] 读源码确认：
  - 翻折保护：minAreaRatio > 0.08 才接受，否则回滚
  - SHA256 校验：草稿绑定 sourceSha256，错图拒绝导入
  - localStorage key: `qingyang-parts-v1:{sha}:{part}`，不串图不串部件
  - 控制点限制在 ROI 中间 15%-85%，不会拖到边界
  - beforeunload 拦截未离开
  - parts-raster.dispose() 存在，切图时释放 WebGL
  - WebGL error check 在每次 draw 后

## 未验证（需浏览器）
- [ ] 实际拖动手感
- [ ] 三张图（main/side/back）切换正常
- [ ] 三部件（arm/shoulder/torso）切换正常
- [ ] 按住 compare 对照原图
- [ ] 导出 JSON 再导入能恢复
- [ ] 拖到极限翻折时的回滚提示

## 发现的小问题
1. parts-fit.mjs line 4: sources 路径 `../../references/originals/` —— 从 preview/ 往上两级到 character-prototype/，再进 references/originals/。路径对，但需要 HTTP 服务，直接 file:// 打开会 fetch 失败
2. parts-raster.mjs line 4: WebGL context 没有 alpha:false 但 canvas 透明，和主渲染混用可能有色差
3. gain=0 时 buildWarp 返回 identity=true，draw() 跳过 warp 直接画原图——正确

## 结论
入口: http://127.0.0.1:8654/character-prototype/preview/parts-fit.html
