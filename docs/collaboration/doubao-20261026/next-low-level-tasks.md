# 下一批可交给豆包的低难度任务清单

| # | 文件 | 验收动作 |
|---|------|----------|
| 1 | tests/parts-warp-regression.mjs | 跑 node，看 case 数和 pass/fail |
| 2 | validation/ 下任何 .json | 读出来核对字段完整、数字范围合理 |
| 3 | asset-inventory.csv / full.csv | 新增图片时追加行，SHA256 去重 |
| 4 | docs/ 下交接 .md | 按模板填空，不写结论 |
| 5 | candidate-1946/ 下小修 | node --check + diff，不碰渲染 |
| 6 | 跑 fit_back_camera.py 看 RMS | 报数字，不改轨道 |
| 7 | 生成对照图/联系表 | PIL 缩略图拼版 |
| 8 | 检查 commit / hash 一致性 | git log + shasum 对比 |
| 9 | 桥接消息分类/回执 | 按模板回"收到"并列出待办 |
| 10 | 格式转换 PNG/JPG/WEBP | 有明确格式/压缩/透明度要求才转，保留原图，JPG 会重编码有损 |

不做：路线决定、shader 改逻辑、接生产管线、commit/push、装依赖。
