"""对照截图，证明倾斜真的改变了画面（不只看日志）。"""
import sys
from PIL import Image, ImageChops

base = r"D:\QingyangWallpaper\android-app\verification"
names = ["preview-neutral", "preview-tilt-x-pos", "preview-tilt-x-neg", "preview-recentered"]
images = {n: Image.open(f"{base}\\{n}.png").convert("RGB") for n in names}
w, h = images["preview-neutral"].size
print(f"截图尺寸 {w}x{h}")

# GL 预览区域（底部是文字/按钮，会随时间变化，单独排除）
gl_box = (0, 0, w, int(h * 0.75))


def diff(a_name, b_name, box=None):
    a, b = images[a_name], images[b_name]
    if box:
        a, b = a.crop(box), b.crop(box)
    d = ImageChops.difference(a, b)
    hist = d.convert("L").histogram()
    changed = sum(hist[6:])  # 超过 5/255 才算真变化，滤掉抖动的 1-2 级噪声
    total = a.size[0] * a.size[1]
    bbox = d.convert("L").point(lambda v: 255 if v > 5 else 0).getbbox()
    mean = sum(i * c for i, c in enumerate(hist)) / total
    print(f"{a_name:>20} vs {b_name:<20} 变化像素 {changed:>8} ({changed / total * 100:5.2f}%) 平均差 {mean:6.2f} 变化范围 {bbox}")
    return changed, mean


print("\n--- 整屏（含 UI 文字）---")
diff("preview-neutral", "preview-tilt-x-pos")
diff("preview-neutral", "preview-tilt-x-neg")
diff("preview-tilt-x-pos", "preview-tilt-x-neg")
diff("preview-neutral", "preview-recentered")

print("\n--- 只看 GL 画面区（去掉文字区）---")
diff("preview-neutral", "preview-tilt-x-pos", gl_box)
diff("preview-neutral", "preview-tilt-x-neg", gl_box)
diff("preview-tilt-x-pos", "preview-tilt-x-neg", gl_box)
diff("preview-neutral", "preview-recentered", gl_box)

# 给老板看的并排图：中性 | 左倾 | 右倾（缩小到便于查看）
tiles = [images[n].crop(gl_box).resize((w // 4, int(h * 0.75) // 4)) for n in
         ["preview-neutral", "preview-tilt-x-pos", "preview-tilt-x-neg"]]
sheet = Image.new("RGB", (tiles[0].width * 3 + 16, tiles[0].height), (12, 16, 22))
for i, tile in enumerate(tiles):
    sheet.paste(tile, (i * (tile.width + 8), 0))
out = f"{base}\\compare-neutral-tiltleft-tiltright.png"
sheet.save(out)
print(f"\n并排对照图: {out} {sheet.size}")