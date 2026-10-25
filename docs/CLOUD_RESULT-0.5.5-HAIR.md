# 0.5.5 / 14：发梢形变安全边界修复

基于 ab69656ada60996787f89df31818d48051a207d9，继续 feature/cloud-framing-response，保留已有头颈与肩肘腕支撑。本轮按用户要求修复发梢极限翻折，源码版本提高为0.5.5 / versionCode14；尚无新APK。

## 复现与原因

旧版在身体、局部软组织、发梢同时达到限位并叠加1.45倍构图增益时，source约(246.05,486.44)处三角形面积比达到-0.537827，出现翻折。先用旧提交复现这个负例，再验证修复，未修改断言阈值来隐藏失败。

原发梢权重在y=480～515、仅35个原图像素内从1下降为0，同时横向高斯宽度只有36。极限位移下，末端与侧缘的位移梯度过陡，连续网格被局部压反。降低整个弹簧幅度会掩盖这个问题并损失正常动作，因此本轮调整的是空间权重包络。

## 修改

- 末端释放区从480～515改为480～650，平滑过渡长度35→170像素。横向宽度36→56，降低侧缘的位移梯度。
- 保留原发根285～465的渐变和可见自由端的中心线幅度。正常中心线285～480上，3组视角/相同非零输入与旧版CPU位移完全一致；y=480中心仍为满权重1。
- 原弹簧频率、阻尼、力、输出限幅和构图增益没有修改。发根仍固定，末端在进入手臂/纸张区域前平滑归零。
- CPU参考中的hairWeight集中到structure.mjs，response.mjs重新导出同一函数；共享GLSL使用相同包络，Android资产通过导出同步。
- 保留原图、服装、网格、深度二进制、接触权重、姿态/传感器、头颈与手臂支撑。中性画面和网页旧响应对照经实际GLES逐像素比对保持相同。

这改变的是发梢运动分布的侧缘与末端，不应声称所有运动像素与旧版相同。可见中心线幅度和物理节奏保留，周围过渡区更宽、更平滑。

## 验证

| 项目 | 结果 |
| --- | --- |
| 原失败24组同时限位扫描 | 旧版最小面积比-0.537827；当前+0.202373，全部被测三角形保持正向。手臂支撑区域最小值仍为0.268241 |
| 扩展全网格扫描 | 240组，包含仅回弹/立体模式与0、25%、50%、75%、100%发梢幅度；最小面积比0.202373 |
| 发梢区域独立符号扫描 | 1795个相关三角形，4608组；身体XY、局部XYZ、发梢XY方向独立组合，视角3×3、两种模式及1/1.45增益；最小面积比0.163725 |
| 正常动作 | 受测中心线最大位移差0；Java/JS物理轨迹保持原结果；原发梢峰值X3.1968/Y0.7070 source px（既有合成输入） |
| 生产GLES点位 | 扩展到2880点，包含原翻折点、侧缘、释放区、发根和两种极限方向；最大栅格误差0.6969像素 |
| 原图中性与旧响应对照 | 实际GLES新旧中性图逐像素相同，legacy对照图逐像素相同 |
| 脸与接触 | 仅发梢运动时所选脸部与手部ROI平均RGB变化为0；450组手臂支撑、头部形状/颈部连接、固定接触检查通过 |
| 原检查 | 52项真实RenderLoop/EglCore主机生命周期检查；10132项响应断言；13原资产/4对副本；网格/深度/共享着色器导出检查通过 |
| Android构建 | 本轮尝试assembleRelease，在Gradle8.7下载阶段报Network is unreachable，未进入完整Android打包；没有0.5.5 APK、签名或手机安装 |

上述面积比检查只代表所列输入集合，不是对无限组合、任意自定义参数或所有手机硬件的数学保证。完整手机手感、实际锁屏、移动GPU性能和耗电仍未验；本轮未扩大视角或改为完整三维模型。

## 对照证据与复现

- validation/hair-safety.json：负例、扩展扫描、中心线差值与包络参数。
- validation/arm-limit-scan.json：原24组回归，保留失败基线；当前allMeshHardLimitPassed=true只指该扫描。
- validation/hair-safety-scan.jpg：前两列为生产GLES裁图，后两列为CPU网格诊断；红三角是翻折。旧版两个极限画面分别有3/5个发梢翻折三角，当前均为0。不是手机截图。
- validation/hair-scan.json、projection-gles.json：实际渲染与点位核对。

```sh
node android-app/tools/export_mesh.mjs --check
python3 scripts/verify_assets.py
python3 tests/run_lifecycle.py
python3 tests/run_response.py
node tests/head-structure-regression.mjs
node tests/arm-support-regression.mjs
node tests/structure-regression.mjs
node tests/arm-limit-scan.mjs
node tests/hair-safety-regression.mjs
python3 tests/check_projection_gles.py
python3 tests/render_gles.py
python3 tests/render_hair_scan.py
```

实际渲染需要Mesa EGL与Pillow。测试使用Git中的ab69656固定负例，不删除它、不改成没有缺陷的基线。

## 接续

1. dsh拉取最新分支，沿用原发布密钥构建0.5.5/14。云端没有桥或手机连接，本轮没有向dsh发送消息。
2. 手机检查正常小幅晃动是否保留节奏，快速反向/前后推拉时发梢是否自然；脸、图纸、手部、锁屏裁剪与重复唤醒也继续验。不要把旧0.5.4安装包当成这次修复。
3. 本节点的已知发梢翻折已在扩展回归中关闭；接下来可以继续近臂与躯干、肩背外轮廓、发丝与脸/耳后遮挡边界。需要露出隐藏纹理时先标出实际缺口，再检索或补齐素材，不直接切换四图冒充转向。
