# 独立Android生命周期续推

主线9a24a706上fence14心跳新鲜，正在处理T03/T04。本轮从此HEAD建work/night-20261027-0753-android，不覆盖主线。分支独立租约fence1；初始时间误写23:56，现按首次时钟23:53:02Z纠正。

T15：PreviewView首次创建失败后保留未就绪renderer，后续只resize而draw直接返回，冻结页不能自恢复。现在释放部分GL分配，250—2000ms退避重试，冻结页也请求恢复帧，暂停取消重试；捕获绘制异常/GL错误，上下文重建清旧冲量。

真实PreviewView+Physics、Android/GL/renderer替身18项故障注入通过；9a24a706旧源码负例在“部分分配未释放”断言退出1。原RenderLoop/EglCore52项、真实SensorFeed8项及轨迹16263项通过。并非真实Surface/驱动/手机验收，T15仍未整体验收，纸面/肩背未验，无新APK。豆包限定审核分派SSE404，无返回结果。

下一项：修复RenderLoop在无效/替换Surface期间传感器和旧物理状态；再查异常传感器时间戳。当前运行继续，不因节点停止。

## 下一连贯改动：Surface门控与GL资源所有权

RenderLoop：有效Surface/EGL首帧前不注册传感器；替换Surface先停旧传感器并清旧冲量。新增无Surface激活、有效后启动、无效替换停止、替换清冲量4条断言；旧源在第一条实际失败，修后56项生命周期通过。预览18项与Java/JS响应10132项仍通过。

继续找到资源泄漏：SceneRenderer贴图上传报GL错误时，纹理ID尚未返回字段就抛出，release无法回收；片元编译失败也使已分配顶点shader无处回收。提取小型GlAssets管理临时句柄，成功才转交所有权；解码Bitmap始终finally回收，两个着色器资源先读齐再分配。生产GlAssets在13种分配/编译/链接/上传错误与Java异常路径、29条断言中均无未转交句柄残留；正常返回句柄仍保留供renderer使用。GLES为计数替身，尚未真实Android构建或驱动验收。
