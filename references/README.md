# 人物原图与角度参考

四张图片已随仓库保存，云端可直接读取原PNG，无需再找聊天附件。文件名表示制作用途；它们是AI生成、姿势略有变化的参考，不是同一瞬间严格配准的四机位扫描。

| 文件 | 用途 |
|---|---|
| [main-front-three-quarter.png](originals/main-front-three-quarter.png) | 当前制作主图，原人物、脸、服装、坐姿及手与图纸关系都以此为准 |
| [front-variant.png](originals/front-variant.png) | 前侧变体，辅助体块/服装结构参考 |
| [side-reference.png](originals/side-reference.png) | 侧向参考，辅助轮廓理解 |
| [back-reference.png](originals/back-reference.png) | 背向参考，后发/背部形状参考 |

每个文件的真实尺寸、字节数与SHA-256见 [asset-manifest.json](asset-manifest.json)。原图只读，脚本会校验原图、预览图和APK资产副本；主图副本必须字节相等。

不直接把四图拼接/切换成转向。先逐张看脸、姿势、手部的差异，再决定哪些形状可参考。本轮目标为主视角附近的小幅2.5D，背面不要求动画化。

## 主图

![当前主图](originals/main-front-three-quarter.png)

## 其余三个参考角度

![前侧变体](originals/front-variant.png)

![侧向参考](originals/side-reference.png)

![背向参考](originals/back-reference.png)
