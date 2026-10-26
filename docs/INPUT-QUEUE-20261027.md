# T10/T13/T15 输入队列修正（独立分支）

基于17b7e345，主分支fence11活跃，未接管或改动纸面/素材。豆包限定审核发送失败：桥返回404；没有收到审核结果。

实际修改SensorFeed：进入、恢复、重新居中及屏幕旋转后的时间戳门槛，拒绝旧会话排队事件；拒绝乱序/重复加速度事件，保护内部低通状态；拒绝超过500ms的本会话延迟批次，避免旧姿态被重新作为基线。保留方向映射、物理参数、素材、版本和签名。

验证：实际生产SensorFeed在轻量Android队列夹具中执行，旧源码在“pre-start sample must not establish a false baseline”断言失败；修复后8项通过，包括旧事件/重复乱序/恢复/居中/真实新陀螺激励/过期衰减。run_response.py通过Java/JS响应一致性与10132项检查。不是Android真机采样或锁屏验收；未构建新APK。

T10/T13/T15均保持未验收。下一步：四个屏幕方向、静止保持、停更和恢复的完整采样轨迹；独立补丁验证后交由主执行者合入，禁止把独立分支租约覆盖主分支租约。


## 完整采样回放
实际SensorFeed+MotionInput+Attitude+Physics+Spring执行50Hz采样、120Hz物理更新，30/60/120fps读取，4种屏幕旋转。16263项检查通过；胸部峰值5.6815453px，保持视角viewX=-0.4041266，各方向/读取帧率一致；保持期间软运动收敛。此处帧率只是读取频率，不能代表设备GPU帧耗时或不均匀渲染dt验收。

run_lifecycle.py通过52项：真实RenderLoop/EglCore与假的Android/EGL/renderer；未测实际SensorManager系统排队、锁屏和功耗。本环境没有Android SDK，未下载工具链或构建新包。原图、原签名及0.5.9候选不变。

下一步：将SensorFeed和相关tests/validation文档选择性合入主分支，**不要合入本分支CONTINUATION_LEASE.json或旧EXECUTION_STATE**。由主分支有效owner保存；T03/T01继续由fence11处理。普通审核桥404，不能声称豆包已验。
