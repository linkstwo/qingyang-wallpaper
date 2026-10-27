# L05 维护入口与历史状态整理报告

**日期**: 2026-10-27
**执行人**: 豆包
**当前分支**: feature/cloud-framing-response
**当前HEAD**: 31b7c48（豆包第一批交付后）

## 最新恢复入口

**新接手开发者从这里开始读：**

1. `AGENTS.md` - 工程约束和验证规则
2. `docs/EXECUTION_STATE.json` - 完整执行状态（最重要）
3. `docs/FIRST-PASS-20261027.md` - 首轮联调状态
4. `docs/DOUBAO-DEFERRED-FIRST-PASS.md` - 豆包待办队列
5. `validation/M07-REPORT.md` - 签名阻塞状态

## 当前阶段

- **阶段**: S2 in_progress
- **最新可安装版本**: 0.5.9/18（已签名发布）
- **最新候选**: 0.6.0/19（已编译，未签名）
- **阻塞**: 原keystore口令缺失

## 活跃模块

| 模块 | 负责人 | 状态 |
|---|---|---|
| H01 连续肩背结构 | Codex | 进行中 |
| H02 核心遮挡与支撑 | Codex | 进行中 |
| H03 姿态到相机映射 | Codex | 进行中 |
| H04 身体与局部物理联动 | Codex | 进行中 |
| M01-M09 | 豆包 | 部分完成 |
| L01-L05 | 豆包 | 完成 |

## 已退役/试验模块（不要从这里恢复）

- `trial-side-*` 研究页 - 隔离试验，已确认连续肩背失败
- `parts-fit.html` - 部件工作台，仅作者参考，不代表肩背完成
- 旧S2结构代理（19226顶点推断网格）- confidence=0，不是最终方案
- 旧main分支 - 不要用旧main覆盖当前分支

## 文件命名约定

- `docs/RESUME-*-FENCE*.md` - 历史恢复节点，按时间倒序
- `docs/CLOUD_RESULT-*.md` - 各版本云端结果
- `validation/*.json` - 验证数据
- `validation/*-REPORT.md` - 豆包任务报告
- `references/derived/` - 派生素材（只读原图）
- `android-app/app/src/main/assets/` - 运行时资产

## 关键路径

- 源码: `android-app/app/src/main/java/com/tangtang/motionwallpaper/`
- 原型: `character-prototype/preview/`
- 导出脚本: `android-app/tools/export_mesh.mjs`
- 签名工具: `android-app/tools/SignExisting.java`
