# M04/M05/M06 生命周期、参数保存、异常输入 验收报告

**日期**: 2026-10-27
**执行人**: 豆包
**基线HEAD**: 42bbea2

## M04 壁纸生命周期与资源修复

### 已验证代码状态

| 检查项 | 文件 | 状态 |
|---|---|---|
| EGL初始创建通路 | RenderLoop.java:68 `egl.create(surface)` | ✓ 已修 |
| swap返回值检查 | RenderLoop.java:103 `if (!egl.swap())` | ✓ 已处理 |
| GL错误检查 | RenderLoop.java:101 `glGetError()` | ✓ |
| Surface失效处理 | RenderLoop.java:60-65 | ✓ |
| 资源释放 | RenderLoop.java:294-304 `destroyGl()` | ✓ |
| 退避重试 | RenderLoop.java:286-291 指数退避最大2s | ✓ |
| 双引擎隔离 | WallpaperService管理双RenderLoop | ✓ |
| 亮灭屏暂停/恢复 | setActive(false)停传感器，setActive(true)恢复 | ✓ |
| 首帧日志 | RenderLoop.java:104-108 FIRST_SWAP_OK | ✓ |

### 结论
黑屏修复代码已到位，主机逻辑正确。真机锁屏验证待签名包。

---

## M05 用户控制与参数保存

| 检查项 | 位置 | 状态 |
|---|---|---|
| 设置持久化 | SceneSettings.java SharedPreferences | ✓ |
| 裁剪保存/读取 | `manualFrame` + CropFrame.encode/decode | ✓ |
| 旧设置迁移 | framingRevision < 4 自动迁移 | ✓ |
| 参数范围限制 | sizePercent 65-125, topPercent 0-20 | ✓ |
| 变更通知 | cropRevision递增 | ✓ |
| 预览/壁纸共享 | 同一个SharedPreferences "scene" | ✓ |
| 回正 | physics.reset() | ✓ |
| 强弱选择 | lively()开关 | ✓ |

### 结论
参数保存和迁移已实现。不需要复杂设置中心，当前控制足够。

---

## M06 异常输入与兼容处理

| 检查项 | 位置 | 状态 |
|---|---|---|
| 传感器缺失降级 | start()逐级降级：融合→重力→加速度计 | ✓ |
| 异常时间戳过滤 | SensorFeed.java:114 未来时间/500ms旧数据 | ✓ |
| NaN/Inf检查 | SensorFeed.java:107 MathX.valid() | ✓ |
| 重复时间戳跳过 | SensorFeed.java:128 | ✓ |
| 屏幕旋转处理 | SensorFeed.java:116-124 旋转变化重新校准 | ✓ |
| 传感器注册异常捕获 | SensorFeed.java:72 RuntimeException | ✓ |
| 传感器停更处理 | fresh()检查800ms内无数据 | ✓ |
| 低帧率适配 | RenderLoop ACTIVE/IDLE FPS切换 | ✓ |

### 结论
异常输入处理已覆盖主要边界。核心映射更改（H03/H04范围）不擅自修改。

---

## 待真机验证项

- [ ] 锁屏实际显示（D-001）
- [ ] 亮灭屏30次循环
- [ ] 双引擎切换（预览↔壁纸）
- [ ] 升级覆盖旧版
- [ ] 无传感器设备降级行为
