import pymupdf as fitz
from PIL import Image, ImageOps, ImageDraw
from pathlib import Path
import io,json
root=Path('/Users/bytedance/Desktop/seeseezz/zz/jimmyzz')
tmp=root/'tmp/pdfs'
doc=fitz.open('/Users/bytedance/Desktop/0913.pdf')
thumbs=[]
for i,page in enumerate(doc):
 path=tmp/f'final-page-{i+1:02d}.png'
 if not path.exists():
  pix=page.get_pixmap(matrix=fitz.Matrix(1.25,1.25),alpha=False)
  pix.save(str(path))
  del pix
 im=Image.open(path)
 thumb=im.copy();thumb.thumbnail((640,360)); thumbs.append(thumb)
 print('Rendered',i+1,im.size,flush=True)
contact=Image.new('RGB',(640*3,390*6),'#eeeeee'); d=ImageDraw.Draw(contact)
for i,im in enumerate(thumbs):
 x=(i%3)*640;y=(i//3)*390;contact.paste(im,(x,y));d.text((x+8,y+365),str(i+1),fill='black')
contact.save(tmp/'contact.jpg')
for quality in [95,92,89,86,83,80,77,74,70,65,60]:
 blobs=[]
 for i in range(len(doc)):
  im=Image.open(tmp/f'final-page-{i+1:02d}.png'); b=io.BytesIO();im.save(b,format='JPEG',quality=quality,subsampling=0,optimize=True);blobs.append(b.getvalue())
 size=sum(map(len,blobs))
 print('Quality',quality,'image bytes',size,flush=True)
 if size < 19_800_000:break
out=fitz.open()
for i,blob in enumerate(blobs):
 r=doc[i].rect;p=out.new_page(width=r.width,height=r.height);p.insert_image(r,stream=blob)
out.set_metadata({'title':'0913','producer':'High-resolution visual compression'})
dest=root/'output/pdf/0913_compressed.pdf'
out.save(dest,garbage=4,deflate=True)
print('DONE',dest.stat().st_size,str(dest),flush=True)
