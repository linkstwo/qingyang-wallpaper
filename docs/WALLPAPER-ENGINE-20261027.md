# Wallpaper Engine 接续节点

用户最新指令：不继续调研，结合GitHub最新进度及桥通知直接制作。来源HEAD42bbea28，原应用候选0.6.0/19，原应用源码ea79388；原候选签名阻塞不阻断新增WE场景。

施工目录D:\QingyangWallpaper-WE，与有未提交改动的D:\QingyangWallpaper隔离。WE安装工程：C:\Program Files (x86)\Steam\steamapps\common\wallpaper_engine\projects\myprojects\qingyang-reading。

本次新增wallpaper-engine/**、scripts/export_wallpaper_engine.py及相关记录；.gitignore只增加新目录允许和生成包排除。未修改原图、Android/JS稳定实现或签名。租约fence16。

桥通知2055/2058已读取，2056开工、2060进展已发；豆包已交付L01/L03/L04/M07及M04/M05/M06审计，来源提交31b7c48未合并至当前云端分支。本轮不复做其普通审计。M01/M03材料要求调整为可供WE复用，不允许整文件覆盖稳定分支。

已实际完成：原生Scene与材质/反馈弹簧源码、无损纹理导出、现有Q弹参考代码嵌入、独立预览窗口真实出图。最终反馈版本已在Wallpaper Engine2.8.42显示阅读图。出图只证明原生路径可绘制，动作正确性尚未验收。

已修复早期HLSL编译两个错误：单标量vec2构造、辅助函数直接引用varying。修复后重新关闭/打开原生窗口验证出图，未见新增着色器错误。

实际UI已进入编辑器“文件→打开”，列表识别“轻漾 · 阅读与微风”；确认打开之前UI操作被打断。不要写成已完成编辑器导出。当前独立预览可能仍打开；这是播放器，不是后台开发进程。

用户中断本次操作，先保存源码/状态。S1/S2仍未整体验收，S3—S8不因新路线打勾。后续目标继续保真、连续转向、身体与胸部相对回弹、独立发梢和手机锁屏；不能把当前局部UV形变当成完成。

下次执行：恢复WE原生动作对照（固定输入、快反向、停止、异常dt、不同帧率），检查反馈FBO及半精度误差；合格后导出安卓交互包并投送。手机未连接/未安装，所有手机验收仍pending。详细入口见../wallpaper-engine/README.md。
