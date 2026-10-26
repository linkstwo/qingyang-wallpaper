# T03 纸面来源与腿面接触候选（2026-10-27）

从 cd3eb09072b7351a33e98aa89e9f4fd17406f032 恢复，fence11。已实际修改并运行GLES，非只查状态。AI桥SSE返回404，无法把限定任务交给豆包，云端继续独立实现；不声称已完成对半协作。

## 实现

纸分区实验改为真实24点观察轮廓，取消旧粗纸区与4px覆盖圈的并集，避免将背景/裤子放到纸面。默认实验仍关闭。新增独立候选开关：仅纸张下沿与腿面共享推断支撑深度和运动固定；上沿、手指、躯干不因此焊到纸上。外部纸缘4px运动遮罩背景圈可单独从身体几何剔除，手指/腿面不在剔除链内。源码RGB和生产Android/版本不变。

工作台新增“纸张外缘去背景 / 腿面接触候选”，需先开启纸边来源分区。没有声称浏览器UI已操作；GLES渲染实际完成。

## 实际验证

- node tests/paper-source-partition-regression.mjs：通过。两种前臂模式中性投影误差约2.3e-13px、来源面积误差小于0.002px²、纸运动为0。
- node tests/paper-contact-regression.mjs：通过。333个下沿接触顶点，深度误差小于1e-9，姿态固定误差小于1e-10；上部遮挡边不焊接。
- python3 -m py_compile tests/render_paper_ownership_gles.py 与工作台 node --check 通过。
- 新GLES回放器 tests/render_paper_ownership_gles.py：固定身体零姿态、关闭后壳、yaw -20/-2.2918/0/+2.2918/+20，实际llvmpipe渲染。20度为故障诊断，不是生产支持范围。PAPER_BASELINE_REF 接受完整SHA，从Git精确取旧模块并删除临时模块，可复现旧分区负对照。
- 画面对照：validation/paper-ownership-before.jpg（精确旧HEAD模块）、paper-ownership-exact.jpg、paper-lap-contact.jpg、paper-exterior-trim.jpg。下沿缺口缩小，但右侧遮挡后身体三角缺口与上沿细条仍存在。外缘4px剔除没有解决全部细条，不能报告视觉通过。

T03仍未验收，T04/完整肩背/手机仍未验，无新APK。下一步把细条屏幕像素反查到原图UV，区分轮廓误差与错误深度；按真实来源而非扩大焊接修复。十张原图归档已找回且哈希全部吻合，继续T01六种额外构图部件审核。
