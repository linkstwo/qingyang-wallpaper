# 轻漾 · Wallpaper Engine 原生场景

本路线由用户于2026-10-27明确授权。复用远程分支42bbea28的reading-v2原图、背景、遮罩及身体/胸部/发梢运动参数，不改原Android工程、包名、版本或签名。

## 已有成果

- 原生Scene，入口scene.json；不是Web壁纸或录屏视频。
- 原图、背景、遮罩无损生成RGBA8888原生纹理，原PNG只读。
- 可编辑局部材质变形：双胸部区域、独立发梢、身体及手纸/座位约束包络。
- 双9×1 RG16F反馈缓冲保存独立身体/胸部/发梢弹簧状态。设备视差姿态的变化率提供有界激励，姿态本身保留为观察方向输入。
- 身体2.4Hz、胸部2.3/2.55Hz、发梢1.6/1.9Hz及阻尼沿用当前Q弹参数。原Spring/Response逐字包含作后续对照，GPU求解路径不是已完成的逐帧等价移植。
- 18秒慢倾斜/保持/快晃/停止演示开关、局部回弹强度及微弱呼吸开关。

## 重建与打开

Windows使用用户指定Python3.12.10，需Pillow：

```powershell
& 'C:\Users\Administrator\AppData\Local\Programs\Python\Python312\python.exe' scripts/export_wallpaper_engine.py --output 'C:\Program Files (x86)\Steam\steamapps\common\wallpaper_engine\projects\myprojects\qingyang-reading'
```

Wallpaper Engine → 壁纸编辑器 → 文件 → 打开 → 轻漾 · 阅读与微风。实际安装目录以本机为准。生成目录保留scene.json、project.json、preview.jpg、provenance.json及原生纹理。不要把编辑器内的修改直接覆盖回脚本模板；先对比并合并来源。

## 当前验证边界

已实际在Wallpaper Engine2.8.42/Windows原生弹出窗口看到用户角色、服装、脸、图纸及背景；最终GPU反馈版本也实际出图。早期两个HLSL编译错误已修，后续打开未出现新增着色器日志。

未验证：GPU反馈在实际连续动作中是否正确保持/回弹/收敛、半精度长期稳定、30/60/120fps一致性、与既有JS求解器的数值差别、材质变形手纸接触误差、安卓导出兼容、手机运动输入及锁屏/唤醒/耗电。

本版是主视角附近的逆向材质变形首版，未移植0.6.0多曲面侧背窄条，也不代表连续转向/肩背目标完成。原生设备视差不是原始陀螺仪角速度；不能宣称已经接通相同传感器算法。

下一步先验证原生连续动作和停止收敛，再在编辑器导出可交互安卓包并检查真实资源与GLSL兼容；最后投送手机，走系统壁纸入口验收。不得用预渲染视频代替交互包。
