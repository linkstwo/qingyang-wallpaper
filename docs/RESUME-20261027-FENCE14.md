# Fence14 实际开发节点

从实时ccc9e59接手，79cac64通过远端CAS认领并git fetch读回。T03零身体、无后壳、五角度GLES实际重现。原图(240,880)-(580,1240)与540×1176渲染局部(170,680)-(280,845)对照：上部纸边裂口右侧原先被归为人体的棕色区实际是手下车间背景，不是可直接补为身体的纹理。

## 本轮实现

新增默认关闭paperUnderHandBackgroundTrim：保守手下背景多边形从人体材料来源拓扑扣除；两前臂路径、纸外collar组合均走相同明确来源。保留主图RGB/手/裤料/纸面，未生成隐藏纹理、未改Android/签名/物理。工作台有单独开关。

真实前后GLES图见validation/f14-zero-before.jpg、f14-under-hand-trim.jpg及f14-under-hand-detail.jpg。原棕色背景片剔除后与外背景连通；保守边界仍有点状残留，未补齐隐藏区域，不能称纸后缺口整体修复。

PAPER_MATTE_BYTES指向mask.png红通道1152×1536原始字节。node tests/paper-under-hand-material-regression.mjs两种前臂6个原误归背景负例通过，3类手/纸/裤料正例保留；扣除来源面积10859.43056px²，纸面面积保留。首次测试误将开关元数据纳入几何相等断言而失败，修正仅比较body/paper后通过，不隐瞒夹具错误。export_mesh --check通过。完整姿态扫描结果另存，不以其替代视觉验收。

豆包限定审核分派返回SSE404，未收到工作结果。执行环境曾短暂transport disconnected/unavailable，随后恢复，本轮继续工作。

T01—T20未新增整体验收，最新APK仍0.5.9/18。手机不可访问。下一步核对保守边界残留、独立背景深度与纸遮挡关系，继续T01/T04源图解剖对应；不把静态切片/缩放算新角度。
