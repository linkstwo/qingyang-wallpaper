"""Actual pale-cloth boundary coverage and neutral production composite regression."""
from pathlib import Path
import io,json,subprocess
import numpy as np
from PIL import Image,ImageChops,ImageStat
import render_gles as g
old=Image.open(io.BytesIO(subprocess.check_output(['git','show','2a277fdead480d1be0c1957dd448160839416516:character-prototype/preview/mask.png'],cwd=g.ROOT))).convert('L')
current=np.array(Image.open(g.assets/'mask.png').convert('RGB'));source=np.array(Image.open(g.assets/'original.png').convert('RGB'));m=np.array(old)>127
# Outside the old matte, pale contour pixels in the left chest ROI must be erased from the base.
near=np.zeros_like(m)
for dx in range(-2,3):
 for dy in range(-2,3):
  if dx*dx+dy*dy<=4:near|=np.roll(np.roll(m,dx,axis=1),dy,axis=0)
roi=np.zeros_like(m);roi[600:950,450:650]=True
edge=roi & near & ~m & (source.mean(axis=2)>150)
assert edge.sum()>10,'fixture lacks pale contour pixels'
coverage=float((current[:,:,1][edge]>250).mean());assert coverage>.99,('old curved edge remains in static base',coverage)
# The opaque moving region must cover the erasure boundary at rest, avoiding a dark halo.
neutral=g.render();reference=g.render(fill_override=0)
difference=ImageChops.difference(neutral,reference).crop((110,400,400,800));delta=max(ImageStat.Stat(difference).mean[:3]);assert delta<.05,('neutral composite changes source chest',delta)
result={'paleBoundaryPixels':int(edge.sum()),'sourceErasureCoverage':coverage,'neutralChestMeanRgbDifference':delta,'phoneTested':False}
(g.ROOT/'validation/contour-fix.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
