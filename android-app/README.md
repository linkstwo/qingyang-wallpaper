# 轻漾 · 2.5D 感应动态壁纸（Android 工程）

> **2026-10-24最新反馈：用户iQOO Z9 Turbo锁屏为黑色。应用预览成功不能证明WallpaperService有图。**
> 云端先读../docs/CLOUD_TASK.md与../docs/BLACK_SCREEN.md。本轮只改善导出/构建可移植性，Java仍保留故障基线。
> 四张原图在../references/originals。仓库不包含signing.properties、私钥或本地SDK路径；云端构建见../docs/BUILD.md。


2026-10-24 由 dsh 重建。原轻漾 v0.4.0 的**源码 ZIP 已丢失**（只找回安装包），所以这不是"修原工程"，
而是按已有桌面2.5D样片重写的一个独立可编译工程；反编译出来的旧代码只作**只读设计参考**，
不参与编译。

- 包名：`com.tangtang.motionwallpaper`（沿用原轻漾包名）
- 版本：**versionName 0.5.0 / versionCode 9**（原 0.4.0 / 8）
- 交付包：`..\dist\轻漾-2.5D-0.5.0.apk`，6,332,852 字节，
  SHA256 `C8A61B9894269651E778E11AA7558FB411648071D896202A994835DEFA859DB7`
- 签名指纹（SHA-256）：`0A8F4734E62F984C94BD38D63A0AC15DD06CF9BFB5041175F51FB3AE114CEAAB`
  （新 key，**与原 0.4.0 不同** ⇒ 手机上必须先卸载旧版才能装，否则报
  `INSTALL_FAILED_UPDATE_INCOMPATIBLE`；这条已在模拟器上实测复现）

## 怎么装（老板侧）

1. 手机上**先卸载**旧的「轻漾壁纸」（原签名私钥随源码一起丢了，Android 不允许换签名的覆盖安装）；
2. 把 `轻漾-2.5D-0.5.0.apk` 传到手机，点安装（允许"安装未知应用"）；
3. 打开「轻漾壁纸」→ 看到人物预览和两个按钮 → 点【设为动态壁纸】→ 在系统选择里选
   **轻漾 · 感应动态壁纸** → 选"主屏幕和锁屏"或"锁屏"。

手机拿着怎么倾斜都算"正中"（进入壁纸那一刻取重力基线）。想重新取中性姿态：回应用点【校准回正】。

## 目录结构

```
android-app/
├─ app/src/main/
│  ├─ AndroidManifest.xml          壁纸服务 + 入口页声明
│  ├─ java/com/tangtang/motionwallpaper/
│  │  ├─ MotionWallpaperService.java  动态壁纸服务：可见+亮屏+Surface 就绪才渲染；熄屏/不可见立刻停
│  │  ├─ RenderLoop.java             壁纸渲染线程：EGL + 1/120s 定步长物理 + 静止降到 10fps
│  │  ├─ EglCore.java                最小 EGL14 封装
│  │  ├─ SceneRenderer.java          GLES2 绘制核心（分层/遮罩/形变着色器，与样片一致）
│  │  ├─ MeshAssets.java             加载导出的 .bin 网格（三角数校验）
│  │  ├─ Physics.java                视角跟手 + 身体/胸部/头发分级弹簧（样片同一套参数）
│  │  ├─ Spring.java                 半隐式欧拉 + 子步进，对应样片 rig.mjs
│  │  ├─ SensorFeed.java             三轴取数：重力/线性加速度/陀螺仪，缺融合则退回加速度计自算
│  │  ├─ MotionInput.java            旋转适配的倾斜/挥动量，含基线校准与"够不够劲"判定
│  │  ├─ MainActivity.java           入口页
│  │  └─ PreviewView.java            应用内预览（与壁纸共用同一渲染器与物理）
│  ├─ res/                           strings/themes/xml(wallpaper)/drawable(icon 矢量，沿用原图)
│  └─ assets/                        original.png、mask.png、background.png + 3 个 .bin 网格 + mesh-report.json
├─ tools/
│  ├─ export_mesh.mjs               从样片真源码导出 .bin（**只读**引用 character-prototype/preview）
│  └─ compare_shots.py              对照截图脚本（像素差统计，仅验证用）
├─ signing/qingyang-release.keystore  签名私钥（另备份见下）
├─ signing.properties               密钥口令与别名（构建用，不打进 APK）
├─ verification/                    模拟器实测截图与日志证据
└─ build.gradle.kts / settings.gradle.kts / gradle.properties / local.properties
```

## 怎么重新出包

```powershell
$env:JAVA_HOME='C:\AndroidSetup\jdk\jdk-17.0.20.1+1'
C:\AndroidSetup\gradle-8.7\bin\gradle.bat -p D:\QingyangWallpaper\android-app assembleRelease --offline --console=plain
# 产物：app\build\outputs\apk\release\app-release.apk
```

- 本机 Gradle 缓存里有 AGP 8.5.0，所以 `--offline` 能过（当前网络是直连，联网反而慢/可能失败）。
- 纯 Java + 系统 API，**零第三方依赖**（不引 AndroidX、不引 MediaPipe），compileSdk 34 / minSdk 28。

## 网格资产管线（重要）

安卓端**不在手机里做三角化**。`tools/export_mesh.mjs` 用已验收样片的真源码
（`character-prototype/preview/rig.mjs` 的 `makeMesh`、`contact-rig.mjs` 的 `contactWeights`）
把网格与接触权重导出成 `assets/*.bin`，所以手机上画的几何与浏览器验收时**逐字节一致**
（16384 三角形；7 个接触点 pin=1.0、脸/肩/躯干/肘 4 点 pin=0，11/11 通过）。

> **改了样片的 mesh.json / contact-rig.mjs / 原图，就必须重跑 `export_mesh.mjs` 并重新出包**，
> 否则 APK 里还是旧几何。`MeshAssets` 会在加载时校验三角数，资产被换错会直接报错而不是静默画歪。

## 与原反编译恢复物的关系（只读）

- `..\android-recovered\`（JADX 从 0.4.0 APK 恢复的 35 个应用类）**不参与编译**，只借了它的设计：
  `SensorFeed`（重力+线性加速度+陀螺仪取数与旋转适配）、`MotionInput`（相对基线倾斜、角加速度）、
  `MotionWallpaperService`（可见/亮屏/Surface 三重门控 + SCREEN_ON/OFF/USER_PRESENT 广播）、
  `RenderLoop`（HandlerThread + 定时帧 + 固定步长物理）。
- 渲染与物理**用样片那套**（HTML/WebGL 版已验收），不是照抄反编译的 GlRenderer/Physics。

## 历史验证记录（被最新真机黑屏反馈补充）

**DS历史记录**（模拟器 emulator-5554，Android 14 x86_64；不是本轮重新验收）：
- 编译成功、安装成功、启动无崩溃、持续渲染（日志 `QingyangPreview` 每 900ms 一行 fps/视角/回弹）；
- 重力注入：视角 0→1.000 并在倾斜期间**保持**，回正后 -0.336→-0.095→-0.027→-0.007→**-0.001 收敛**；
  过渡期间 hair/chest 出现瞬态（回弹生效）；
- 安装路径实测：旧 0.4.0 能装 → 直接覆盖新版报 `INSTALL_FAILED_UPDATE_INCOMPATIBLE` → 卸载后装新版成功。

**未验证（老板已明确"不用在模拟器上验证"，留给真机）**：
- **真机倾斜的"手感"与方向约定**：当前是"屏幕即窗口"约定（顶部向左倾 → 画面内容向右移）。
  觉得反了就说一声，改 `Physics.updateTarget` 里两个符号即可；
- 陀螺仪那路激励的轴向在改完后**只过了编译与冒烟，没跑传感器验证**（真机一甩就知道，反了同样一行改）；
- 帧率/耗电/温升、锁屏实际观感、不同机型传感器差异。

## 可调项都在哪

| 想改什么 | 改哪里 |
|---|---|
| 倾斜灵敏度（多少度算满量程） | `Physics.TILT_FULL`（当前 0.30 ≈ 17°） |
| 倾斜方向约定（左右/前后反不反） | `Physics.updateTarget()` 的两行 |
| 回弹强度/软硬 | `Physics` 里 5 个 `Spring` 的 frequency/damping/limit |
| 位移幅度（像素） | `Physics.BODY_PIXELS / CHEST_PIXELS / HAIR_PIXELS` |
| 画面裁切（铺满居中裁 vs 完整留白） | `SceneRenderer.resize()` |
| 形变区域与权重场 | `SceneRenderer` 顶点着色器（与样片同一份 GLSL） |

## 签名密钥

- 工程内：`signing/qingyang-release.keystore`，别名 `qingyang`，口令见 `signing.properties`
  （仅保存在本地，不提交到Git或云端）。**丢了就无法覆盖升级**，所以另有一份备份：
  `D:\备份\轻漾签名备份_20261024\`。
- 与追漫的 `zhuiman.keystore` **没有任何关系**，本轮没碰过它。