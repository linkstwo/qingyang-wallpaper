# 0.5.6 原密钥签名交付

2026-10-25，Asia/Singapore。版本0.5.6 / versionCode15，包名com.tangtang.motionwallpaper。

复用已保存的未签名APK，未重新构建、未改生产源码/资产/版本。当前Codex AI桥读取成功，已读取1865/1868原签名交接；旧404只描述此前会话。

## 可安装交付

[下载qingyang-0.5.6.apk](https://chatgpt.com/library?file_id=libfile_7cf285975d448191b54ad985b60b4a0a&account_id=personal)

- APK：9602273字节，SHA-256：8168d498ddb86fcad98441d103c765785c59fcbb0abe94bf724e669e917c3c71
- 原未签名APK SHA-256：8107bd2dc59d9f7b329fb6ac27e84cc56cf6e335b11b4ec53d33551dfc190da6
- 证书SHA-256：0a8f4734e62f984c94bd38d63a0ac15dd06cf9bfb5041175f51fb3ae114ceaab
- 原密钥哈希与交接完全相同，密钥文件未改；私钥/口令不入仓库。

## 独立验证

apksigner verify --verbose --print-certs通过；与上一已签名0.5.5包直接比较证书一致。实测0.5.5为v3-only，本包沿用此方案；早期0.5.2的v2记录不代表0.5.5实际方案。版本、包名、minSdk28、非debug、zipalign4、ZIP CRC通过。签名前后18个ZIP条目的内容逐字节相同；背向参考资产及FramingStudyActivity保留。未签名包拒绝，故意改写的已签名副本也拒绝，反向验证成立。

同包名、同证书、versionCode14→15，具备覆盖升级条件；未连接手机实装，不把此推定写成安装成功。旧版无需为签名原因预先卸载。

## 手机侧动作与边界

打开APK → 手机显示轻漾更新/安装界面 → 完成后应用版本显示0.5.6。应用内【全屏肩背构图对照】可以看固定背向参考。背向尚未接入动态网格，肩背同屏默认构图与连续多角度仍未完成。

未验：真实手机安装/升级、原生UI、锁屏裁切、全生命周期、性能/耗电/温升。此次只完成签名交付，不冒报这些结果。

下一步按EXECUTION_STATE.json继续十图像素检查和姿势/区域配准，保留现工程及0.5.5回退包。机器记录：[build-0.5.6-signed.json](../validation/build-0.5.6-signed.json)。
