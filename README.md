# 轻漾 · 原图人物 2.5D 感应壁纸

这是面向 iQOO Z9 Turbo 的 Android 动态壁纸工程。保留原角色和服装，慢倾斜带来有限连续转向与场景视差，快晃带来身体、胸部和发梢的惯性回弹。

长期目标是手机转动如同换角度观察角色，角色轮廓与遮挡随之自然变化的裸眼立体感；现有主视角表面形变仍只是早期起点。

**当前开发版本0.5.4/13，分支feature/cloud-framing-response。** 本轮分两个节点：0.5.3改善锁屏裁剪与回弹；0.5.4加入相对融合姿态、深度网格、有限透视转向与三轴局部惯性联动。代码、release构建和桌面GLES检查通过，实际手机锁屏/手感仍待验；正式包由本机dsh沿用原密钥签名。

后续开发顺序与阶段完成条件见 [当前节点与路线](docs/CHECKPOINT-0.5.4-ROADMAP.md)。

接续先读 [最新结果与dsh交接](docs/CLOUD_RESULT-0.5.4.md)，可单独回看 [裁剪与运动节点](docs/CLOUD_RESULT-0.5.3.md)。代码、四张原图与参考资料随仓库提供。大角度的隐藏表面与自遮挡尚未完成；游戏旋转向量可能长期漂移。

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
python3 tests/run_lifecycle.py
python3 tests/run_response.py
node tests/structure-regression.mjs
cd android-app
./gradlew assembleRelease
```

桌面查看：`python3 character-prototype/serve_preview.py --port 8643`，打开 `http://127.0.0.1:8643/`。此页面用于比较人物效果，不能当作手机锁屏验收。

工程是自定义 2.5D，未包含完成的 Cubism 动作模型。旧 0.4.0 APK 的反编译材料与工具没有放入仓库，也不参与编译。签名私钥和口令只留本地；云端 unsigned release 不能直接安装，正式覆盖升级回本地用原发布密钥签名。
