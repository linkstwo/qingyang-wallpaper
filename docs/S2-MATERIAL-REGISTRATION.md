# 原图复核与背部表面试验

10张档案图已逐张查看并核对原始哈希。4张与现有side/back/main-front/front-variant逐像素相同，另外6张是不同构图，不能当作同姿态的10机位扫描。原档案身份及每图等价路径见references/multiview-archive-manifest.json；不在Git重复保存相同图。

阅读主图与front-variant是相同构图，53个人物区域纹理块配对，35个拟合、18个留出。匹配精度为整数像素；极小仿射残差只是网格点拟合值，不能声称亚像素观测或三维精度。原图RGB未更换。背/侧/旧前图分别只有0/0/1个匹配，未通过同构图2D门槛；它们仍可通过单独姿态/相机配准使用，不能据此说完全不可用。

material-chart.mjs建立了背部局部候选UV。3335顶点、6445完整三角形可参与调试，但来源到推断几何的关联是手工估计，confidence全部0。GLES在yaw0/0.8/1.6/2.4/pi时实际可见来源像素0/5/6725/36648/48205，确认纹理随同一表面被遮挡/显露，未做整图淡化。中性仍看不到后面纹理。

实际渲染validation/s2-back-chart-gles.jpg显示身体比例/衣纹仍拉伸、肩颈接缝未配准；此图是失败边界与实现证据，不是可安装效果或用户验收。手机未验、生产视角及0.5.9 APK不变，S1/S2仍in_progress、S3未完成。下一步补非局部自交检查，并细化相机/局部截面与背部UV的共同标定。

复现：python scripts/register_source_images.py；python tests/source-registration-regression.py；node tests/material-chart-regression.mjs；python tests/render_material_chart_gles.py。档案核对另加--archive指向已解压原档案，路径不用入仓。
