from PIL import Image
import pymupdf as fitz
from pathlib import Path
import io,json
root=Path.cwd();tmp=root/'tmp/pdfs';files=sorted(tmp.glob('segment-*.png'))
def encode(w,q):
 blobs=[]
 for f in files:
  im=Image.open(f)
  if w!=im.width:im=im.resize((w,round(im.height*w/im.width)),Image.Resampling.LANCZOS)
  b=io.BytesIO();im.save(b,format='JPEG',quality=q,subsampling=2,optimize=True);blobs.append(b.getvalue())
 size=sum(map(len,blobs));print('TEST',w,q,size,flush=True);return blobs,size
w=2500
blobs,size=encode(w,65)
if size>19_800_000:
 w=2000;blobs,size=encode(w,70)
low,high=35,94
best=None
for _ in range(6):
 q=(low+high)//2;blobs,size=encode(w,q)
 if size<=19_800_000:best=(q,blobs);low=q+1
 else:high=q-1
q,blobs=best
out=fitz.open()
for f,b in zip(files,blobs):
 im=Image.open(f);p=out.new_page(width=1920,height=im.height*1920/2500);p.insert_image(p.rect,stream=b)
f=root/'output/pdf/0913_compressed.pdf';out.save(f,garbage=4,deflate=True)
info={'width':w,'quality':q,'pages':len(out),'bytes':f.stat().st_size};print('DONE',info,flush=True);(tmp/'compression-info.json').write_text(json.dumps(info))
