# W02 WE编辑器操作验证报告

## 验证项
- 工程路径：`C:\Program Files (x86)\Steam\steamapps\common\wallpaper_engine\projects\myprojects\qingyang-reading`
- WE版本：2.8.42
- 工程类型：原生Scene（非Web/视频）

## 已验证
1. **project.json** - 配置正确
   - 标题：轻漾 · 阅读与微风
   - type: scene
   - 3个用户属性：局部回弹强度(slider 0-1.5)、演示开关(bool)、轻微呼吸(bool)

2. **scene.json** - 配置正确
   - 正交投影：1152×1536
   - 相机视差：0.08
   - 包含完整Q弹Response脚本（Spring/Response类逐字嵌入）
   - 3个渲染pass，材质绑定正确

3. **资源文件** - 齐全
   - 3个纹理：qy-background.tex (6.3MB), qy-mask.tex (7.1MB), qy-original.tex (7.1MB)
   - 3个材质JSON：qingyang.json, qingyang-motion.json, qingyang-state.json
   - 4个shader：motion.vert/frag, state.vert/frag
   - 编译缓存：blobsSM40目录下DXS文件
   - 预览图：preview.jpg (43KB)

4. **进程状态** - 正常
   - wallpaper64.exe 运行中，窗口标题包含工程名
   - wallpaperui.exe 多进程运行中

## 未完成（需用户手动确认）
- 编辑器内保存/重开操作（避免抢前台，未强制弹出）
- GPU渲染可视化确认
