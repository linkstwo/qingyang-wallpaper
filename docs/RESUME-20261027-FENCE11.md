# 2026-10-27 fence11 中止恢复

最后一组 functions.exec（纸分区回归、凹纸边姿态扫描结果收取、凹纸边GLES候选）返回 **aborted by user after3.0s**。随后仅保存与释放占用，不启动下一项；无后台开发。未声称额度耗尽，也未持续到10:00。当前APK仍0.5.9/18，未改Android、原图RGB、包名和签名。

## 已完成实际工作

T03：真实纸轮廓替代旧区/遮罩圈并集；像素反查定位上沿纸像素被当身体，两个端点修正后实际GLES上沿细条消失。增加下沿腿面接触候选、共同细分和质量重连，零姿态/后壳关闭与±20/±2.2918/0度对照已生成。纸后大三角身体缺口仍在。实验均默认关闭。

最新实际通过的接触回归：前臂体积关/开分别402/427个共享接触顶点，最大世界坐标间隙9.32e-10、姿态固定误差9.85e-11。退化碎片源面积损失0.0154/0.0144px²，小于0.05检查阈值。源射线中性/转角/前后顺序/空命中反例通过；四个新增纸边负例通过；原纸分区回归最大中性误差约2.34e-13px。

重要失败：整幅45组组合扫描44组翻折；加入顶点和中心matte>=254过滤后仍44组失败，退出码1。合法边重连与退化源碎片过滤没有解决全幅问题，不得报T03/T05验收。

T01：十张归档PNG哈希全吻合；逐图部件选择已整理。同朝向“工业车间里的蓝图时光”无损裁出肩颈/侧背候选，原始RGB精确一致，无镜像/缩放；parts-fit新增可选素材及固定SHA加载检查。三种ROI范围与MLS有效性、1678项旧MLS回归通过。候选近臂前伸，与主图下垂臂姿势不同，不能整臂移植。全部跨图解剖对应仍未接受。

本轮无真实浏览器UI操作：环境有Playwright模块但没有Chromium可执行文件，未下载。无手机验收、构建或新APK。桥SSE返回404，无法分派豆包，未假装已协作。

## 明确WIP

最新 layered-mesh.mjs 新增 makePaperNotchedCharacterMesh：纸与画布左边相接时，直接三角化矩形扣纸后的单个凹多边形，避免逐个耳切三角相减产生近共线片段。仅在paperPartition=true且paperExteriorTrim=false、非前臂体积路径使用。默认/Android导出路径保持原函数。此改动后的最后一组工具被中止，没有收到测试/GLES完成结果，**not_run/unknown**，不是已验证修复。

最新已验证GLES对照在凹多边形WIP之前。paper-upper-edge-comparison.jpg也是WIP之前的对照，不用它证明WIP成功。相关候选文档保留逐步实验结果，需以本恢复入口为最新状态。

## 下一条具体动作

1. 重新跑 node tests/paper-source-partition-regression.mjs。
2. 从mask.png输出1152×1536 L字节到临时文件，PAPER_EXTERIOR_TRIM=0 PAPER_MATTE_BYTES=<raw> PAPER_SCAN_REPORT=paper-notch-visible-pose-scan.json node tests/paper-contact-pose-scan.mjs。与已有44/45失败对照。扫描退出1是失败，不能当通过。
3. PAPER_PARTITION=1 PAPER_LAP_CONTACT=1 PAPER_EXTERIOR_TRIM=0 PAPER_REPORT=paper-notch-candidate python3 tests/render_paper_ownership_gles.py，实际看图。共同细分/薄片剔除的角度和姿态结果也须继续核对。
4. 凹多边形只覆盖非前臂体积模式；若有效，再按相同源区域接口接入前臂分层，不能未经验证把UI所有组合打勾。
5. 纸后真正缺失身体仍需有来源的遮挡几何/材质；优先同朝向肩颈/躯干配准，T04不能直接复制旧镜像侧图轨道。

T01/T03/T04与总目标均未整体验收。后续按用户授权窗口和实时HEAD接续，不能把旧active记录当永久占用。
