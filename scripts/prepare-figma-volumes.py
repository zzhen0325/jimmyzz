"""Build closed, pillowy shells from exact Figma silhouettes (NumPy + Pillow).
Thickness follows the distance to the boundary; the surfaces have curved centers.
"""
from pathlib import Path
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1];out=root/'output/home-figma-models'
for name,height in [('asterisk',.22),('c-mark',.34),('arrow',.23)]:
    alpha=np.asarray(Image.open(out/f'{name}.png').convert('RGBA'))[:,:,3]
    mask=np.pad(alpha>128,2);n=mask.shape[0]
    # Eight-neighbour chamfer distance, with subpixel edge offset.
    distance=np.where(mask,1000.,0.)
    for _ in range(85):
        old=distance.copy()
        for dy,dx,cost in [(1,0,1),(-1,0,1),(0,1,1),(0,-1,1),(1,1,2**.5),(1,-1,2**.5),(-1,1,2**.5),(-1,-1,2**.5)]:
            distance=np.minimum(distance,np.roll(np.roll(old,dy,0),dx,1)+cost)
    yy,xx=np.mgrid[:n,:n];x=(xx-(n-1)/2)/128;y=((n-1)/2-yy)/128
    center=.09*np.sin(x*2.3)+.05*y*y if name=='arrow' else .035*np.cos(y*2.8)
    depth=height*np.sqrt(np.tanh(np.maximum(distance-.65,0)/128/.12))
    ids=np.full(mask.shape,-1,dtype=int);ids[mask]=np.arange(mask.sum())
    front=np.column_stack((x[mask],y[mask],(center+depth)[mask]))
    back=np.column_stack((x[mask],y[mask],(center-depth)[mask]))
    count=len(front);vertices=np.concatenate([front,back]);faces=[];edges={}
    for j in range(n-1):
        for i in range(n-1):
            a,b,c,d=ids[j,i],ids[j,i+1],ids[j+1,i+1],ids[j+1,i]
            if min(a,b,c,d)<0:continue
            face=(d,c,b,a);faces.append(face);faces.append(tuple(v+count for v in reversed(face)))
            for u,v in zip(face,face[1:]+face[:1]):
                key=tuple(sorted((u,v)))
                if key in edges:del edges[key]
                else:edges[key]=(u,v)
    for u,v in edges.values():faces.append((v,u,u+count,v+count))
    used=sorted(set(v for f in faces for v in f));remap={old:new for new,old in enumerate(used)}
    with (out/f'{name}.obj').open('w') as file:
        for i in used:file.write('v %.6f %.6f %.6f\n'%tuple(vertices[i]))
        for face in faces:file.write('f '+' '.join(str(remap[i]+1) for i in face)+'\n')
    print(name,len(used),len(faces))
