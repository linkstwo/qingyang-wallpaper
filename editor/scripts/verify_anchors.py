# -*- coding: utf-8 -*-
"""T01 锚点像素级复核：验证 view-study-data.json 里的人工目测锚点确实落在预期的身体部位上。

方法：每个锚点取周围 21x21 区域平均色，按启发式规则分类
（皮肤/白色背心/深色裤子/头发/纸张白/背景灰），与人工预期对比，输出 PASS/SUSPECT。
产物：editor/research/anchor-verification.json（供编辑器工作台显示校验结果）。
"""
import io, json, base64
from PIL import Image

ROOT = r'D:/QingyangEditor'
data = json.load(io.open(ROOT + r'/editor/research/view-study-data.json', encoding='utf-8'))

# 人工预期：锚点 -> 允许的材料分类（身体部位合理性）
EXPECT = {
    'face': {'skin', 'dark'},          # 脸（可能采到发丝边缘）
    'bun': {'dark'},
    'shoulderL': {'skin', 'vest'},     # 肩（背心带与皮肤交界）
    'shoulderR': {'skin', 'vest'},
    'shoulderBack': {'skin', 'vest'},
    'shoulderFront': {'skin', 'vest'},
    'chest': {'vest', 'vest-shadow', 'skin'},
    'waist': {'dark', 'vest', 'skin'},
    'handPaper': {'paper', 'skin'},
}

def classify(r, g, b):
    # dark = 深色材料（头发或深色工装裤）——两者颜色不可分，语义由锚点位置区分
    mx, mn = max(r, g, b), min(r, g, b)
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    sat = mx - mn
    if lum > 200 and sat < 45 and b >= r - 10:
        return 'paper'
    if r > 118 and r >= g >= b and (r - b) > 22:
        return 'skin'   # 含阴影/逆光下的暗面皮肤
    if lum > 165 and sat < 70:
        return 'vest'
    if 115 <= lum <= 168 and sat < 45 and r >= g and r > b - 12 and r > 100:
        return 'vest-shadow'  # 湿背心暗面（阴影/湿润区），颜色介于背心与背景之间
    if lum < 90:
        return 'dark'
    return 'background'

results = {'format': 'qingyang-anchor-verification', 'version': 1, 'views': []}
total = passed = 0
for v in data['views']:
    im = Image.open(ROOT + '/references/originals/' + v['file'].split('/')[-1]).convert('RGB')
    px = im.load()
    out_view = {'id': v['id'], 'anchors': []}
    for name, (x, y) in v['anchors'].items():
        # 21x21 均值（跳过越界）
        rs = gs = bs = n = 0
        for dy in range(-10, 11, 2):
            for dx in range(-10, 11, 2):
                xx, yy = x + dx, y + dy
                if 0 <= xx < im.width and 0 <= yy < im.height:
                    r, g, b = px[xx, yy]
                    rs += r; gs += g; bs += b; n += 1
        r, g, b = rs // n, gs // n, bs // n
        cat = classify(r, g, b)
        expected = EXPECT.get(name, {'skin', 'vest', 'dark', 'paper'})
        ok = cat in expected
        total += 1
        passed += ok
        out_view['anchors'].append({
            'name': name, 'xy': [x, y], 'rgb': [r, g, b],
            'classified': cat, 'expected': sorted(expected),
            'verdict': 'PASS' if ok else 'SUSPECT',
        })
    results['views'].append(out_view)

results['summary'] = {'total': total, 'passed': passed, 'suspect': total - passed,
                      'passRate': round(passed / total, 3)}
io.open(ROOT + r'/editor/research/anchor-verification.json', 'w', encoding='utf-8').write(
    json.dumps(results, ensure_ascii=False, indent=1))
print('PASS', passed, '/', total, '| passRate', results['summary']['passRate'])
for v in results['views']:
    for a in v['anchors']:
        if a['verdict'] == 'SUSPECT':
            print(' SUSPECT', v['id'], a['name'], a['xy'], '->', a['classified'], a['rgb'])
