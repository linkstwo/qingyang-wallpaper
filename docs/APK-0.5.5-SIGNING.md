# 0.5.5 APK：构建已完成，等待本机原签名

## 实际产物

- 应用：轻漾壁纸，com.tangtang.motionwallpaper，0.5.5 / versionCode14。
- 应用源码提交：bc5205a3e2a7d8565257a08a659585a821b9e791。
- 已实际完成assembleRelease，42个任务执行成功；产物qingyang-0.5.5-unsigned.apk，6,413,314字节。
- SHA-256：14ae1e751d1ca2ce3f4c134fbc5bade0acb67ae0d2c374e916072199a8d0127a。
- 包名/版本/SDK、ZIP完整性、4字节对齐均已核对；APK内8项关键纹理/网格/深度/共享着色器与固定源码提交逐字节相同。
- 当前产物未签名，不能直接安装或覆盖升级。没有生成正式签名APK，也没有手机验收。

此前Java未使用环境HTTPS代理而下载失败。本轮已使用配置好的代理下载并校验官方Gradle8.7、Android SDK34平台和Build Tools34.0.0，并给Gradle启动器/工作JVM设置代理，使构建通过。未修改应用源码来绕过构建错误。不要把旧的Network is unreachable记录当作本轮最终状态。

## 原发布证书

已从仓库故障基线APK实际验证证书，而非仅引用旧说明：

`0A8F4734E62F984C94BD38D63A0AC15DD06CF9BFB5041175F51FB3AE114CEAAB`

原签名配置、私钥和口令仍应保留在本机。当前会话没有桥工具；历史公网OpenAPI入口返回HTTP404，未能读取现用桥上的签名交接或给dsh发送签名任务。

## dsh本机：只签已构建APK

在原有工程拉取最新分支后，保留android-app/signing.properties和其中引用的现有keystore。下载本轮未签名APK到本机。

环境需要JDK17及本机Android Build Tools34.0.0；SDK路径从原工程local.properties的sdk.dir或ANDROID_HOME读取。

方法一：将APK拖到原工程内的 `android-app/tools/Sign-Existing-Key.cmd`。

方法二：在原工程android-app目录运行：

```bat
"%JAVA_HOME%\bin\java.exe" tools\SignExisting.java "C:\Download\qingyang-0.5.5-unsigned.apk" "." "..\validation\build-0.5.5.properties"
```

输入APK路径换成实际下载位置。若签名配置在另一原工程，直接调用Java工具时把第二个参数换成那个android-app目录。

工具读取Java Properties原格式，校验APK SHA-256、使用现有密钥对齐/签名，再校验签名与原发布证书一致；通过后输出输入文件旁的qingyang-0.5.5.apk及SHA-256。口令只通过签名子进程环境传递，不写进命令行或输出。证书不符时不导出正式文件；已有输出不覆盖。

此工具只接受记录中的云端APK。如果本机重新编译了另一份APK，应用原Gradle签名配置直接assembleRelease即可，不套用这份固定云端APK哈希。

## 工具验证与待办

`tests/check_signing_helper.py` 已用临时一次性测试密钥检查：拒绝错误APK、拒绝错误发布证书、清理失败临时文件、测试夹具的对齐/签名/验证、保护已有输出和日志不含口令。测试密钥及测试签名包仅在临时目录使用并清理，没有交付给用户。

这证明工具流程可执行，不代表已经使用用户原密钥签名。必须接通现用桥/本机环境后才能完成真实签名。签名完成后仍需手机检查实际锁屏、发梢快晃、手/图纸接触和熄屏唤醒。
