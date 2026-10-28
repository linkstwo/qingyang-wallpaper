# 轻漾｜Android 2.5D 感应动态壁纸

这是面向 iQOO Z9 Turbo 的 Android 动态壁纸工程。保留原角色和服装，慢倾斜带来有限连续转向与场景视差，快晃带来身体、胸部和发梢的惯性回弹。

## 工作原理

手机传感器提供重力、线性加速度和陀螺仪数据；姿态输入决定观察视角，快速运动为弹簧系统提供激励。OpenGL ES 2.0 使用原图贴图、分层网格和局部权重绘制视差与形变，身体、局部区域和发梢按不同参数回弹并逐渐收敛。

```text
手机姿态 / 运动
       ↓
MotionInput 输入处理 → Physics 视角跟随与弹簧回弹
       ↓
SceneRenderer 网格形变 + 场景视差
       ↓
应用内预览 / Android WallpaperService
```

这是在二维原图上实现有限空间感的 **2.5D**：没有完整三维角色模型，也不能任意转到原图没有提供的角度。浏览器原型用于调整网格与表现，Android 端通过壁纸服务显示；两边共用导出的网格资产，但渲染与物理代码需要分别维护。

阅读入口：[姿态与回弹](android-app/app/src/main/java/com/tangtang/motionwallpaper/Physics.java)、[GLES 渲染](android-app/app/src/main/java/com/tangtang/motionwallpaper/SceneRenderer.java)、[Android 工程说明](android-app/README.md)。

## 当前范围与状态

以下状态对应本仓库当前 `main` 分支保留的源码与验收记录，不代表其他本地分支或后续安装包。

长期目标是手机转动如同换角度观察角色，角色轮廓与遮挡随之自然变化的裸眼立体感；现有主视角表面形变仍只是早期起点。

**当前不是可交付完成版：0.5.0 用户真机反馈锁屏黑屏。优先修复壁纸显示，再调 Q 弹和发梢。** 应用内预览能动不代表锁屏通过。

云端接手先读 [AGENTS.md](AGENTS.md)，再执行 [云端任务](docs/CLOUD_TASK.md)。全部代码、原图和参考资料都随仓库提供，不依赖本机 D 盘、AI 桥或聊天附件。

| 内容 | 路径 |
|---|---|
| 当前可构建 Android 源码 | [android-app](android-app/) |
| 可编辑 2.5D 网格与桌面预览 | [character-prototype/preview](character-prototype/preview/) |
| 四张原图、视角标记和哈希 | [references/README.md](references/README.md) |
| 黑屏静态定位与验收条件 | [docs/BLACK_SCREEN.md](docs/BLACK_SCREEN.md) |
| 构建、资产更新、签名与检查 | [docs/BUILD.md](docs/BUILD.md) |
| 已知故障 APK 与历史桌面证据 | [evidence/README.md](evidence/README.md) |
| 跨对话要求和信息可见性 | [docs/CONTEXT.md](docs/CONTEXT.md) |

## 快速开始

需要 Node.js 20+、JDK 17、Android SDK 34 / Build Tools 34.0.0、Python 3.12。

```sh
node android-app/tools/export_mesh.mjs --check
python3 scripts/verify_assets.py
cd android-app
./gradlew assembleDebug
```

桌面查看：`python3 character-prototype/serve_preview.py --port 8643`，打开 `http://127.0.0.1:8643/`。此页面用于比较人物效果，不能当作手机锁屏验收。

工程是自定义 2.5D，未包含完成的 Cubism 动作模型。旧 0.4.0 APK 的反编译材料与工具没有放入仓库，也不参与编译。签名私钥和口令只留本地；云端调试用 debug 包，正式覆盖升级回本地用原 0.5.0 密钥签名。
