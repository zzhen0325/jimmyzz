import pymupdf as fitz
from PIL import Image
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
Image.MAX_IMAGE_PIXELS=None
src='/Users/bytedance/Desktop/0913.pdf'
def render(i):
 f=Path(f'tmp/pdfs/w2500-{i+1:02d}.png')
 if f.exists():return i+1
 old=Path(f'tmp/pdfs/page-{i+1:02d}.png')
 if i<4 and old.exists():
  im=Image.open(old);im.resize((2500,round(im.height*2500/im.width)),Image.Resampling.LANCZOS).save(f)
 else:
  p=fitz.open(src);pix=p[i].get_pixmap(matrix=fitz.Matrix(2500/1920,2500/1920),alpha=False);pix.save(str(f))
 return i+1
if __name__=='__main__':
 with ProcessPoolExecutor(max_workers=2) as pool:
  for i in pool.map(render,range(17)):print('2500px ready',i,flush=True)
