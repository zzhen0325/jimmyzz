from PIL import Image,ImageDraw
import numpy as np
import pymupdf as fitz
from pathlib import Path
import io,json
root=Path.cwd(); tmp=root/'tmp/pdfs'
segments=[]; thumbs=[]
for i in range(17):
 im=Image.open(tmp/f'w2500-{i+1:02d}.png').convert('RGB')
 cuts=[0]
 if im.height>3500:
  a=np.asarray(im.resize((250,im.height)))
  uniform=(a.max(axis=1).astype(float)-a.min(axis=1)).max(axis=1)<12
  edge=(a.mean(axis=(1,2))<18)|(a.mean(axis=(1,2))>240)
  ok=uniform&edge
  runs=[];start=None
  for y,v in enumerate(ok):
   if v and start is None:start=y
   if start is not None and (not v or y==len(ok)-1):
    if y-start>=4:runs.append((start+y)//2)
    start=None
  while im.height-cuts[-1]>3500:
   options=[y for y in runs if cuts[-1]+1200<=y<=min(cuts[-1]+4200,im.height-900)]
   if not options:
    options=[y for y in runs if cuts[-1]+1200<=y<=im.height-900]
    if not options:break
   cut=min(options,key=lambda y:abs(y-cuts[-1]-2400)); cuts.append(cut)
 cuts.append(im.height)
 print('Source',i+1,'segments',len(cuts)-1,'cuts',cuts,flush=True)
 for k,(a,b) in enumerate(zip(cuts,cuts[1:])):
  part=im.crop((0,a,im.width,b));f=tmp/f'segment-{i+1:02d}-{k:02d}.png';part.save(f)
  segments.append(f)
  t=part.copy();t.thumbnail((240,320));thumbs.append((t,f'{i+1}.{k+1}'))
contact=Image.new('RGB',(240*7,350*((len(thumbs)+6)//7)),'#dddddd');d=ImageDraw.Draw(contact)
for j,(im,label) in enumerate(thumbs):
 x=j%7*240;y=j//7*350;contact.paste(im,(x,y));d.text((x+8,y+325),label,fill='black')
contact.save(tmp/'split-contact.jpg')
for q in [95,92,89,86,83,80,77,74,71,68,65,62,59,55]:
 blobs=[]
 for f in segments:
  im=Image.open(f);b=io.BytesIO();im.save(b,format='JPEG',quality=q,subsampling=0,optimize=True);blobs.append(b.getvalue())
 size=sum(map(len,blobs));print('quality',q,'bytes',size,flush=True)
 if size<19_800_000:break
out=fitz.open()
for f,b in zip(segments,blobs):
 im=Image.open(f);p=out.new_page(width=1920,height=im.height*1920/2500);p.insert_image(p.rect,stream=b)
out.set_metadata({'title':'0913 - compressed','producer':'2500px visual compression'})
f=root/'output/pdf/0913_compressed.pdf';out.save(f,garbage=4,deflate=True)
print('DONE',len(out),f.stat().st_size,flush=True)
(tmp/'compression-info.json').write_text(json.dumps({'width':2500,'quality':q,'pages':len(out),'bytes':f.stat().st_size}))
