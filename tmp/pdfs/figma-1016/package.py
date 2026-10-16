from pathlib import Path
from PIL import Image, ImageDraw
import pymupdf as fitz
import json,io
root=Path('/Users/bytedance/Desktop/seeseezz/zz/jimmyzz');tmp=root/'tmp/pdfs/figma-1016'
frames=json.loads((tmp/'frames.json').read_text())
files=[tmp/f'page-{i:02d}.png' for i in range(1,51)]
for f in files:
 with Image.open(f) as im:im.verify()
print('All 50 source images verified',flush=True)
thumbs=[]
for f in files:
 im=Image.open(f).convert('RGB');im.thumbnail((280,500));thumbs.append(im)
sheet=Image.new('RGB',(280*5,530*10),'#ddd');d=ImageDraw.Draw(sheet)
for i,im in enumerate(thumbs):
 x=i%5*280;y=i//5*530;sheet.paste(im,(x,y));d.text((x+8,y+505),str(i+1),fill='black')
sheet.save(tmp/'source-contact.jpg')
def encode(q):
 blobs=[]
 for f in files:
  im=Image.open(f).convert('RGBA');bg=Image.new('RGB',im.size,'white');bg.paste(im,mask=im.getchannel('A'))
  if bg.width!=2500:bg=bg.resize((2500,round(bg.height*2500/bg.width)),Image.Resampling.LANCZOS)
  b=io.BytesIO();bg.save(b,format='JPEG',quality=q,subsampling=2,optimize=True);blobs.append(b.getvalue())
 size=sum(map(len,blobs));print('Quality',q,'bytes',size,flush=True);return blobs,size
lo,hi=30,96;best=None
while lo<=hi:
 q=(lo+hi)//2;blobs,size=encode(q)
 if size<19_850_000:best=(q,blobs);lo=q+1
 else:hi=q-1
assert best,'Could not fit size budget'
q,blobs=best
out=fitz.open()
for f,blob in zip(frames,blobs):
 p=out.new_page(width=f['width'],height=f['height']);p.insert_image(p.rect,stream=blob)
out.set_metadata({'title':'0913 - 1016 - 50 pages','producer':'Figma export, 2500px'})
path=root/'output/pdf/0913_1016_50pages_under20MB.pdf';out.save(path,garbage=4,deflate=True)
assert path.stat().st_size<20_000_000
print('DONE',json.dumps({'path':str(path),'quality':q,'bytes':path.stat().st_size,'pages':len(out),'width':2500}),flush=True)
(tmp/'result.json').write_text(json.dumps({'quality':q,'bytes':path.stat().st_size,'pages':len(out),'width':2500}))
p=fitz.open(path)
assert len(p)==50
sheet=Image.new('RGB',(1400,5300),'#ddd');d=ImageDraw.Draw(sheet)
for i,page in enumerate(p):
 assert page.get_images()[0][2]==2500
 s=min(280/page.rect.width,500/page.rect.height);pix=page.get_pixmap(matrix=fitz.Matrix(s,s),alpha=False)
 im=Image.frombytes('RGB',(pix.width,pix.height),pix.samples);x=i%5*280;y=i//5*530;sheet.paste(im,(x,y));d.text((x+8,y+505),str(i+1),fill='black')
sheet.save(tmp/'final-contact.jpg')
for i in [1,3,16,26]:
 page=p[i];pix=page.get_pixmap(matrix=fitz.Matrix(1,1),alpha=False);pix.save(tmp/f'check-{i+1:02d}.png')
print('All 50 final pages rendered and verified',flush=True)
