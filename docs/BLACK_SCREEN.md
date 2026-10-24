# 0.5.0 锁屏黑屏：定位依据与验收

## 已知事实

- 用户在 iQOO Z9 Turbo 安装0.5.0后，锁屏为黑色，没有原人物图。
- 故障 APK SHA-256：`c8a61b9894269651e778e11aa7558fb411648071d896202a994835defa859db7`。
- 本机本轮没有连接手机；没有现场 logcat、系统版本号或锁屏截图。不能断言这是一切机型/驱动问题的唯一原因。

## 静态代码已确认的直接阻断

`android-app/app/src/main/java/com/tangtang/motionwallpaper/RenderLoop.java`：

1. 构造函数创建 `new EglCore()`，此时它的 display/context/surface 都是 EGL_NO_*。
2. `setSurface()` 调 `destroyGl()`，保存 Android Surface/尺寸，设 surfaceReady，再 `schedule()`。
3. `setActive(true)` 开传感器并调 schedule；frame.run 首部检查 `!egl.hasSurface()`，条件成立就直接 return。
4. `resize()` 仅在 egl.hasSurface 已为真时才 createSurface；没有初始创建通路。
5. 整个 RenderLoop 没有 `egl.create(surface)` 调用，也没有其它对它的调用。因而正常初始状态无法走到 renderer.create/draw/swap。

这足以解释“应用预览有图有律动，WallpaperService黑屏”：PreviewView 继承 GLSurfaceView，由其管理另一套 EGL，未使用 RenderLoop。两路虽共用 SceneRenderer/Physics，但生命周期不同。

## 云端修复时还需检查

- 在渲染线程对有效 Surface 初始化 EGL，确认 makeCurrent 后才创建/销毁 GL 资源。
- 当前 frame 直接忽略 `egl.swap()` 返回值；resize 对 createSurface 返回值也未处理。失败需保留错误码和上下文，而非继续报 fps。
- 释放/重建、尺寸变化、壁纸预览与正式壁纸两个引擎、熄屏唤醒的任务顺序，避免资源在错误上下文释放或活动状态卡死。
- 记录首帧真正交换成功；可见且亮屏时有原图，熄屏/不可见仍暂停。错误回退不能悄悄变成永久黑屏。
- 先保留本目录的故障基线，再小步改动。资产已随 APK 打包，但云端仍应运行素材校验并记录纹理解码/上传错误。

## 真正验收

| 场景 | 必须看到/记录 | 不能代替它的证据 |
|---|---|---|
| 应用预览 | 原图、动作正常 | 数值改变 |
| 系统壁纸预览 | 原图真实绘制、EGL首帧交换成功 | 应用预览截图 |
| 正式桌面 | 原图显示、方向连续 | 编译退出码 |
| 亮屏锁屏 | 用户原图出现在锁屏背景 | service 已启动 |
| 反复熄屏唤醒/解锁 | 画面恢复，传感器暂停/恢复正确 | 单次启动成功 |

没有真机就明确写“静态问题已修/构建通过/待真机锁屏验收”，不能写“iQOO黑屏已解决”。
