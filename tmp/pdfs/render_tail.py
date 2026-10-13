import pymupdf as fitz
from pathlib import Path
p=fitz.open('/Users/bytedance/Desktop/0913.pdf')
for i in range(16,7,-1):
 f=Path(f'tmp/pdfs/final-page-{i+1:02d}.png')
 if f.exists():continue
 pix=p[i].get_pixmap(matrix=fitz.Matrix(1.25,1.25),alpha=False)
 pix.save(str(f.with_suffix('.pending.png')));f.with_suffix('.pending.png').replace(f)
 print('Rendered tail',i+1,flush=True)
 del pix
