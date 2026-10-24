# 轻漾 Android 工程

当前开发版本 **0.5.4 / versionCode13**，包名 `com.tangtang.motionwallpaper`。源码分支 `feature/cloud-framing-response`，继承现有 EGL 生命周期修复。先看 [最新交接](../docs/CLOUD_RESULT-0.5.4.md) 和 [构建说明](../docs/BUILD.md)。

应用与 WallpaperService 共用生产 GLES 着色器、网格和物理。已加入锁屏可见窗口构图、人物大小、融合姿态控制、有限深度视差和身体/软组织/发梢惯性。仍是主视角附近的2.5D，不是完整人体3D或360度转身。

## 操作

- 默认舒展肩背，人物大小90%、上下位置10%；锁屏仍裁剪背部时调小，头部被裁时下移。大小、位置与视角模式会保存到壁纸。
- 慢转手机观察并保持方向；快速轻晃或前后推拉观察惯性，再停下检查收敛。
- 「立体观察 / 仅回弹」可以对照观看；「校准回正」以当前持握姿态为中性。
- 点「设为动态壁纸」进入系统选择器，具体锁屏/桌面选项由手机系统提供。

## 构建与签名

Node20+、JDK17、Gradle8.7、Android SDK34和Build Tools34.0.0。

```sh
node android-app/tools/export_mesh.mjs --check
python3 tests/run_lifecycle.py
python3 tests/run_response.py
node tests/structure-regression.mjs
cd android-app
./gradlew assembleRelease
```

发布密钥与 signing.properties 只在原本机保存。有原签名配置时输出签名release；云端没有密钥时输出 app-release-unsigned.apk，只用于编译验证，不能直接安装或覆盖升级。dsh应沿用现有发布密钥签名，不换密钥、不要求卸载旧版。当前云端未连接手机，没有完成真实锁屏和性能验收。

## 主要源码

- MotionWallpaperService / RenderLoop / EglCore：可见性、Surface、EGL与省电生命周期。
- WallpaperViewport / Framing / SceneSettings：实际显示窗口、构图和持久化设置。
- Attitude / MotionInput / SensorFeed：相对融合姿态、屏幕旋转映射、重力回退、角/线性惯性输入。
- Physics / Spring：120Hz固定步长、分级回弹、三轴局部弹簧。
- MeshAssets / SceneRenderer：加载同源网格/深度/接触权重，使用共享GLSL绘制。
- ../character-prototype/preview/structure.mjs：可编辑深度代理与CPU几何参考。

修改网格、深度或着色器后运行 `node android-app/tools/export_mesh.mjs`；`--check` 逐字节检查Android副本。原四图与人物纹理保持只读。以前0.5.0的黑屏故障与签名历史保留在Git历史和evidence目录，不能当成当前操作指南。
