# 跨平台构建与验证

## 环境

- JDK 17；Gradle 8.7（本工程附wrapper）；Android Gradle Plugin 8.5.0。
- Android SDK platform android-34、build-tools 34.0.0。设置 ANDROID_HOME 或 ANDROID_SDK_ROOT 指向自己的SDK，不能沿用本机D盘/C盘路径。
- Node.js 20+（不需要npm install）；Python 3.12（校验脚本只用标准库）。
- 首次使用wrapper需要从Gradle官方源下载8.7；首次构建需要google()/Maven仓库。缓存不完整时不要使用 --offline。本地已有缓存可离线构建。

## Linux / 云端

```sh
node android-app/tools/export_mesh.mjs --check
python3 scripts/verify_assets.py
node character-prototype/preview/validate-contacts.mjs
cd android-app
chmod +x gradlew
./gradlew --no-daemon assembleDebug
```

产物：android-app/app/build/outputs/apk/debug/app-debug.apk。没有签名私钥也能构建debug。使用unsigned release时运行 `./gradlew assembleRelease`。本轮已将release签名选择改为条件配置：有本地storeFile时沿用原密钥，没有时输出app-release-unsigned.apk，需要之后本地签名；不再因缺本地私钥而阻止云端打包。

## 本地 Windows

```powershell
$env:JAVA_HOME='C:\AndroidSetup\jdk\jdk-17.0.20.1+1'
$env:ANDROID_HOME='C:\AndroidSetup'
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' android-app/tools/export_mesh.mjs --check
& 'C:\Users\Administrator\AppData\Local\Programs\Python\Python312\python.exe' scripts/verify_assets.py
.\android-app\gradlew.bat -p android-app assembleDebug
```

JDK/SDK实际安装路径以当前机器为准。仓库不提交local.properties。

## 更新网格、图像

修改可编辑源后：

```sh
node android-app/tools/export_mesh.mjs
node android-app/tools/export_mesh.mjs --check
node character-prototype/preview/validate-contacts.mjs
```

export_mesh.mjs现在按脚本相对位置寻址，可从任意工作目录调用；--check只比对，不写文件。它会同步原图、mask、background和三个小端float32网格文件、mesh-report.json。

原始四图始终不改。若有意改变派生遮罩/背景，更新references/asset-manifest.json时记录改变理由，并保留来源；不能靠重算哈希掩盖误改原图。Android Shader/Physics 与浏览器端是独立代码，需要明确同步或解释差异。

## 调试黑屏与手机数据

本轮只读 `adb devices -l` 没有发现连接设备。可在用户授权并连接手机后采集以下项目，不收集无关个人数据：

```sh
adb shell dumpsys package com.tangtang.motionwallpaper
adb shell dumpsys wallpaper
adb logcat -d -s QingyangWallpaper QingyangRender QingyangPreview EGL_emulation AndroidRuntime
```

记录手机系统版本、壁纸设置选项、系统预览/桌面/亮屏锁屏分别是否有图。截图/日志不能含通知或其它私密内容。EGL首次建立、draw及swap成功比仅看fps更有说服力。云端无手机时不要伪造这部分。

## 签名

0.5.0证书SHA-256：`0A8F4734E62F984C94BD38D63A0AC15DD06CF9BFB5041175F51FB3AE114CEAAB`。
私钥与signing.properties留本地、均被Git排除。不要重新生成替换它，不在云端提交口令。debug包/其它密钥不能覆盖该发布包；不要要求用户先卸载现用版本来掩盖签名变化。

正式候选验证完以后回本地用现有密钥签名，再由明确发布任务决定versionCode/versionName。本轮准备提交保持0.5.0/9。
