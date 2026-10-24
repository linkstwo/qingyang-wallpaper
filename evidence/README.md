# 故障基线与证据边界

- `baseline/qingyang-0.5.0.apk`：用户报告锁屏黑屏的现有包，保留作比较，**不是推荐安装的修复包**。
- SHA-256：`c8a61b9894269651e778e11aa7558fb411648071d896202a994835defa859db7`。
- 包名 `com.tangtang.motionwallpaper`，versionName 0.5.0 / versionCode 9，发布证书摘要见docs/BUILD.md。
- `desktop-contact-tilt-hold.png`、`desktop-contact-shake.png`是此前浏览器样片截图，只证明桌面效果，不能证明Android锁屏显示。
- `baseline/source-files.json`保存云端准备前Android应用Java与Gradle基线哈希，用于确认本轮没有顺手调物理/修Java造成复现漂移。

用户真机结果：iQOO Z9 Turbo安装后锁屏黑色，没有原人物图。已有律动方向认可，要求更Q弹、发梢可摆。尚无本轮真机截图/logcat/系统版本，不能伪造设备证据。

旧DS记录有应用预览启动、传感器数值和安装验证；没有成功显示真机锁屏的证明。不要把这些历史结论升级为“整个功能通过”。
