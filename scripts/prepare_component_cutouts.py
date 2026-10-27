"""Conservative observed-pixel cutouts, not anatomical registration or new views."""
from pathlib import Path
import hashlib,json
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'references/derived/side-b-component-manifest.json').read_text())
# Coordinates are local to the lossless crops. Leave uncertain silhouette/hair
# collars out instead of inventing hidden skin. No blur, rescale, mirror or RGB edits.
polygons={
 'side-b-nape-shoulder':[[8,65],[58,52],[91,53],[126,75],[160,90],[187,110],[211,139],[235,177],[242,199],[8,199]],
 'side-b-upper-arm':[[0,2],[35,2],[62,17],[87,44],[103,78],[117,117],[130,161],[142,205],[148,229],[0,229]]
}
rows=[]
for component in manifest['components']:
 source=ROOT/component['path'];assert hashlib.sha256(source.read_bytes()).hexdigest()==component['outputSha256']
 rgb=Image.open(source).convert('RGB');alpha=Image.new('L',rgb.size);ImageDraw.Draw(alpha).polygon(polygons[component['id']],fill=255)
 rgba=rgb.copy().convert('RGBA');rgba.putalpha(alpha)
 output=source.with_stem(source.stem+'-cutout');rgba.save(output)
 restored=Image.open(output);assert restored.convert('RGB').tobytes()==rgb.tobytes()
 assert 0<sum(v>0 for v in alpha.tobytes())<rgb.width*rgb.height
 rows.append({'id':component['id']+'-cutout','path':str(output.relative_to(ROOT)),'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'cropPath':component['path'],'cropSha256':component['outputSha256'],'originalSourceSha256':component['sourceSha256'],'originalCropRect':component['cropRect'],'size':list(rgb.size),'alphaPolygonLocal':polygons[component['id']],'alphaValues':[0,255],'opaquePixels':sum(v>0 for v in alpha.tobytes()),'rgbExactIncludingTransparentPixels':True,'boundary':'conservative manual subset; omitted uncertain skin/hair collar','acceptedCrossViewRegistration':False,'confidence':0})
result={'version':1,'independentDonorViews':1,'newCameraAnglesClaimed':0,'components':rows,'limitations':['Only observed visible skin/strap pixels, no inferred hidden texture.','Cutout boundary is conservative and not a final segmentation.','Pose/shoulder joins remain unaccepted; not production assets.']}
(ROOT/'references/derived/side-b-cutout-manifest.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
