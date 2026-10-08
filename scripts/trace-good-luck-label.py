"""Preserve the supplied label's actual lettering and sun symbol as vector paths.
Usage: python scripts/trace-good-luck-label.py /path/to/reference.png
Requires Pillow, numpy and opencv-python-headless.
"""
import json
import sys
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
image = np.array(Image.open(sys.argv[1]).convert('RGB'))
# Isolate red printing inside the paper label, excluding the surrounding props.
label = image[236:444, 28:259].astype(np.int16)
r, g, b = label.transpose(2, 0, 1)
mask = ((r > 110) & (r - g > 65) & (r - b > 55)).astype(np.uint8) * 255
paths, hierarchy = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)

def points(contour):
    vertices = cv2.approxPolyDP(contour, .28, True).reshape(-1, 2)
    # Undo the cylindrical compression in the source photograph before wrapping
    # the vector artwork onto the new cylinder.
    theta0 = np.arcsin((28 - 176) / 150)
    theta1 = np.arcsin((259 - 176) / 150)
    result = []
    for x, y in vertices:
        u = (np.arcsin(np.clip((x + 28 - 176) / 150, -.999, .999)) - theta0) / (theta1 - theta0)
        top = 236 + (x / 231) * 7
        bottom = 433 + (x / 231) * 8
        v = (y + 236 - top) / (bottom - top)
        result.append([round(float(u), 5), round(float(v), 5)])
    return result

shapes = []
for i, contour in enumerate(paths):
    if hierarchy[0][i][3] != -1 or cv2.contourArea(contour) < 2:
        continue
    holes = []
    child = hierarchy[0][i][2]
    while child != -1:
        holes.append(points(paths[child]))
        child = hierarchy[0][child][0]
    shapes.append({'outline': points(contour), 'holes': holes})
(root / 'src/lib/good-luck-label-contours.json').write_text(json.dumps(shapes, separators=(',', ':')) + '\n')
print(f'Traced {len(shapes)} original letter and sun shapes')
