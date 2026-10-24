# Work 接续记录：保留现有工程，先修显示

日期：2026-10-24（Asia/Singapore）。用户补充额度不足，本轮停止扩展，复用桥上交接。

## 已核对

基线为 D:/QingyangWallpaper 的0.5.0/9，公开仓库 https://github.com/linkstwo/qingyang-wallpaper 。本工作副本位于 D:/workspace/qingyang-work-20261024，保全72文件及SHA快照，未覆盖主工程。代码继承现有Android与2.5D原型，没有重建应用。

已逐张查看 references/originals 的四张1086×1448图。主图保持原脸/服装/坐姿，另外三张仅作结构参考，姿态不同不能拼成连续转向。历史摘要提及额外10张及总览ZIP，但本轮两次Library检索未找到，不能称已取得。现有四张足以继续有限2.5D；不重启已取消的真3D路线。

## 本轮修复候选 P0

修改 RenderLoop.java、EglCore.java、SceneRenderer.java：建立有效Surface上的EGL/context，确认makeCurrent后才创建GL对象；draw错误或swap失败不计成功首帧；首次显示与恢复亮屏记录FIRST_SWAP_OK。失败保留活动意图，250–2000ms退避重建，屏幕暂停时取消重试并停传感器。普通尺寸变化保留上下文，丢失上下文时清除旧GL句柄，部分初始化失败安全释放。

测试直接编译生产RenderLoop/EglCore，Android调度/EGL/renderer为测试替身。52项主机断言通过，覆盖首帧、暂停恢复、重建、错误恢复、绘制错误、两个引擎与关闭队列；同一测试对保全0.5.0在首帧断言失败。13资产/4对副本哈希、网格导出--check、11接触点通过。最后源码assembleRelease离线编译通过。

候选包 validation/qingyang-0.5.0-p0-candidate.apk 使用原0.5.0发布证书签名，未换密钥/包名/版本；证书SHA256 0a8f4734e62f984c94bd38d63a0ac15dd06cf9bfb5041175f51fb3ae114ceaab。APK SHA256 a3570c3ab61e572c4753fe87eb68bbf0fc72a24360927f149efc48fa5e941b00。这是独立候选，未替换原发布APK、未安装、未在模拟器或iQOO真机运行。编译/主机回归不能当作锁屏画面已验收。

## 后续由执行方按阶段续接

1. P0真机：系统壁纸预览、桌面、亮屏锁屏看见原人物，反复熄屏/唤醒后仍恢复；FIRST_SWAP_OK与画面并看。复用此补丁，不重复重建。
2. P1输入与惯性：SensorFeed已经注册陀螺仪，MotionInput有角速度/角加速度。保留慢倾斜的持续视角，调快速转动独立激励；明确坐标轴、单位、时间戳、停更衰减。先用可重复轨迹量化再调手感。当前线性加速度虽采集，Physics没有直接使用，不声称已联动。
3. P2发梢：目前仅单横向弹簧与Gaussian区域。标注发根/发髻固定、中段/发梢递增权重及独立两轴滞后，避免眼镜、脸随碎发一起变形。
4. P3连续视差/体块：保留原图与图纸/双手/坐姿接触权重，分别约束脸、颈肩、躯干、前后场景；用多角度检查深度和遮挡，在主视角附近逐步扩展，不用四图切换冒充转向。现有身体/胸部弹簧与衣物连续纹理保留；本轮未改物理和网格。

回归：Python 3.12运行 tests/run_lifecycle.py；加--baseline应在首帧断言失败。Windows沿用用户指定Python全路径，Linux用Python3.12/JDK17。补丁不含签名文件、口令、SDK配置和构建缓存。
