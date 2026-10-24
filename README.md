# 轻漾 · 原图人物 2.5D 感应壁纸

这是面向 iQOO Z9 Turbo 的 Android 动态壁纸工程。保留原角色和服装，慢倾斜带来有限连续转向与场景视差，快晃带来身体、胸部和发梢的惯性回弹。

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
