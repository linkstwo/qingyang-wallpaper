# M07 统一导出、打包、原签名和覆盖升级交付 报告

**日期**: 2026-10-27
**执行人**: 豆包
**状态**: 脚本就绪，待口令签名

## 已完成

1. **签名工具验证**: `SignExisting.java` 已具备完整流程
   - 校验输入APK sha256与记录一致
   - zipalign 4字节对齐
   - 原keystore v3签名
   - 验证证书sha256与发布证书一致
   - zipalign -c 复核对齐
   - 输出最终APK sha256

2. **0.6.0构建记录**: 创建 `validation/build-0.6.0.properties`
   - versionName=0.6.0, versionCode=19
   - unsignedSha256=2eaae055...
   - apkBytes=8013350
   - 证书sha256与0.5.9一致
   - 28项资产逐字节比对通过

3. **导出脚本**: `android-app/tools/export_round_one.mjs` 已存在
   - preBuild自动生成.bin和side-back.png
   - 只读素材重建，不重复落Git

## 阻塞项

**签名口令缺失**: 原keystore已上传但storePassword/keyPassword不在当前可读范围。
- 需要用户授权读取桥接历史中的签名交接，或提供安全口令来源
- 缺口令时不换密钥、不重新生成
- 口令不进Git、不进桥消息

## 签名执行命令（口令就绪后）

```
java SignExisting.java qingyang-0.6.0-unsigned.apk android-app validation/build-0.6.0.properties
```

## 覆盖升级验证步骤

1. 安装0.5.9原签名APK
2. 直接安装0.6.0签名APK（不卸载）
3. 验证应用正常打开，壁纸设置保留
4. 验证壁纸正常显示

## 下一步

- 等待口令授权 → 执行签名 → 交付可安装APK
- 签名完成后补M09真机验收清单
