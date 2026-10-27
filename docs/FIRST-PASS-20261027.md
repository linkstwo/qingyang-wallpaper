# 首轮完整联调

用户优先级：先跑通，不等待非阻塞精修。豆包待办见DOUBAO-DEFERRED-FIRST-PASS.md。

主图/纸面使用既有160/224支撑候选。侧背只用side-b真实躯干窄条，沿主图外肩/近臂轮廓接推断曲面；当前人工近似对应，不冒充真实多视角重建。曲面和主图共享身体平移场，胸部Q弹/脸/发根仍用旧求解器；相机范围独立于物理。Android新增可回退首轮联调开关，保留旧模式资产。

首轮源路径已接入，尚待实际整场景GLES和APK构建。当前最新已交付仍0.5.9/18。未有手机验收或新增T任务整体验收。

已选择性导入PR3的7个Java源文件和相关主机回归，没有导入独立分支租约或旧状态；PR仍保持草稿。实际96资源/57生命周期检查通过。

生成：node android-app/tools/export_mesh.mjs；只读复核：node android-app/tools/export_mesh.mjs --check。首轮.bin和side-back.png由源码/只读素材重建，不重复落Git；preBuild会自动生成。

## 实际整场景GLES

已使用生产scene.vert/frag与真实导出缓冲绘制五个角度；侧背原图局部在揭示侧可见，正面主体与Q弹保留。附first-pass-gles.json。仍是人工近似连接，首轮候选，未冒充可信全背或真机验收。Android编译工作流随此源码提交触发，结果以实际Actions运行记录为准。
