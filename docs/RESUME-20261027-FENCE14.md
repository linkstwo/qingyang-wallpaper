# Fence14 实际开发节点

从实时ccc9e59接手，79cac64通过远端CAS认领并git fetch读回。T03零身体、无后壳、五角度GLES实际重现。原图(240,880)-(580,1240)与540×1176渲染局部(170,680)-(280,845)对照：上部纸边裂口右侧原先被归为人体的棕色区实际是手下车间背景，不是可直接补为身体的纹理。

## 本轮实现

新增默认关闭paperUnderHandBackgroundTrim：保守手下背景多边形从人体材料来源拓扑扣除；两前臂路径、纸外collar组合均走相同明确来源。保留主图RGB/手/裤料/纸面，未生成隐藏纹理、未改Android/签名/物理。工作台有单独开关。

真实前后GLES图见validation/f14-zero-before.jpg、f14-under-hand-trim.jpg及f14-under-hand-detail.jpg。原棕色背景片剔除后与外背景连通；保守边界仍有点状残留，未补齐隐藏区域，不能称纸后缺口整体修复。

PAPER_MATTE_BYTES指向mask.png红通道1152×1536原始字节。node tests/paper-under-hand-material-regression.mjs两种前臂6个原误归背景负例通过，3类手/纸/裤料正例保留；扣除来源面积10859.43056px²，纸面面积保留。首次测试误将开关元数据纳入几何相等断言而失败，修正仅比较body/paper后通过，不隐瞒夹具错误。export_mesh --check通过。完整姿态扫描结果另存，不以其替代视觉验收。

豆包限定审核分派返回SSE404，未收到工作结果。执行环境曾短暂transport disconnected/unavailable，随后恢复，本轮继续工作。

T01—T20未新增整体验收，最新APK仍0.5.9/18。手机不可访问。下一步核对保守边界残留、独立背景深度与纸遮挡关系，继续T01/T04源图解剖对应；不把静态切片/缩放算新角度。

## 接续T04：同供图组件共享形变

新增component-deform.mjs对共边索引网格只计算一次MLS场，不再对颈肩/上臂两个裁片分别形变。保持所有源UV、材料、三角索引；反射/翻折/退化控制点拒绝，失败不修改原网格。该模块返回供图二维目标坐标，不把它冒充主图注册或人体3D深度。

实际负例：两个各自合法的平移场使同一接缝分离24px；共享字段的51条共边在0/25/55/100%强度逐项共用顶点，最小三角面积比0.93059。反射翻折、重复点、NaN索引/强度均拒绝。尚未检查全局自交，不承诺其通过。

运行node tests/component-deform-regression.mjs与python tests/render_component_junction_gles.py均通过；实际GLES原图/55%形变对照已看，见validation/f14-component-deform-gles.jpg。裁片下边仍有保守矩形截断，不是完整人体，更未与阅读主图对应。新能力尚未接入交互UI/Android。T04仍未验收；下一步将共享形变数据接入部件工具并保留显式的供图/主图对应审核边界。

## 继续T04/T05与工具接入

新增component-collision.mjs：二维供图平面三角重叠检查，覆盖远处片区互穿/包含/重复面；合法共边与点接触不误判。deformComponentJunction已加入此门槛。新增全局负例：两个三角形保持局部面积不变却完全重合，新门槛拒绝。这里的平面检查不等于完整人体三维自交。此前“尚未检查全局自交”仅描述前一提交；现在供图平面重叠已检查，人体3D仍未验。

component-fit.html/.mjs已接入共同控制点拖动、强度/网格/重置与数据导出，入口在parts-fit.html。裁片逐字节SHA与原供图身份/尺寸加载校验。新component-raster.mjs用共享顶点、两材料真实WebGL绘制并预乘过滤，避免每三角Canvas剪切接缝。GLES夹具直接读取该模块导出的顶点/片元shader再编译渲染，并非另抄shader替身。

node tests/component-collision-regression.mjs、component-deform-regression.mjs、python tests/render_component_junction_gles.py通过；两个新UI模块node --check通过。当前无本地浏览器可执行文件，页面指针/导出交互尚未实测，不能声称浏览器或手机通过。供图大小改为从已保存身份清单读真实1086×1448，未沿用测试默认大小。

下一步：完成共享工具交互实测或独立核心几何任务；接着在正确主图像素上标定局部解剖对应，不把供图共同形变算阅读主图肩背连续完成。

## T01像素对应复核与交互执行

逐像素看主图肩部(550,300)-(1100,900)与sideB颈肩裁片：旧upperShoulderSkinCandidate是在两图不同相对位置上的平滑皮肤点，不能当已识别的同一解剖顶点。已在源候选与拟合报告中明确拒绝该对应；旧三角方向相反仅证明那组点对不能作一张仿射贴片，不证明物理肩膀必然翻折。配对标注见validation/f14-shoulder-correspondence-review.jpg；颈根/肩带仍是候选，未验收。

实际执行新UI模块的DOM事件夹具（浏览器API替身）：加载真实裁片字节并校验、拖动共享点、保留源UV、零强度禁止歧义拖动、重置及JSON导出通过；故意篡改裁片字节触发加载失败，未进入ready。真实GLES另验shader，不能把DOM夹具说成浏览器实测。首次夹具尝试赋值Node原生只读crypto失败，删除不必要赋值后通过。

T03补充：两种前臂路径各243个生产组合均未发现筛选内翻折，最小0.17195；45个大角度诊断仍15组失败、最差-0.59807。候选保持默认关闭，不把生产扫描替代画面或手机验收。
