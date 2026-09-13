"""Extract mesh contours from the supplied red-background Jimmy reference.
Usage: python trace-jimmy-wordmark.py /path/to/reference.png
Requires opencv-python-headless. No raster asset is used by the 3D renderer.
"""
import json
import sys
from pathlib import Path
import cv2
import numpy as np

root = Path(__file__).resolve().parents[1]
source = cv2.imread(sys.argv[1])
if source is None:
    raise SystemExit('Cannot read reference image')
source = cv2.resize(source, (1600, 1600), interpolation=cv2.INTER_AREA)
b, g, r = cv2.split(source.astype(np.int16))
# Include neutral highlights inside the lettering, exclude saturated red paper.
mask = np.uint8((r - g < 65) & (r - b < 65)) * 255
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
contours, hierarchy = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
shapes = []
for index, contour in enumerate(contours):
    if hierarchy[0][index][3] != -1 or cv2.contourArea(contour) < 400:
        continue
    def points(c):
        return cv2.approxPolyDP(c, 1.4, True).reshape(-1, 2).tolist()
    holes = []
    child = hierarchy[0][index][2]
    while child != -1:
        if cv2.contourArea(contours[child]) > 120:
            holes.append(points(contours[child]))
        child = hierarchy[0][child][0]
    shapes.append({'outline': points(contour), 'holes': holes})
all_points = np.array([p for s in shapes for p in s['outline']])
lo, hi = all_points.min(axis=0), all_points.max(axis=0)
data = {'bounds': [*lo.tolist(), *hi.tolist()], 'shapes': shapes}
(root / 'src/lib/jimmy-wordmark-contours.json').write_text(json.dumps(data, separators=(',', ':')) + '\n')
paths = [' '.join('M' + ' '.join(map(str, pts[0])) + ' ' + ' '.join('L' + ' '.join(map(str, p)) for p in pts[1:]) + ' Z' for pts in [s['outline'], *s['holes']]) for s in shapes]
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{lo[0]} {lo[1]} {hi[0]-lo[0]} {hi[1]-lo[1]}"><g fill="#a1a4ab" fill-rule="evenodd">' + ''.join(f'<path d="{p}"/>' for p in paths) + '</g></svg>'
(root / 'public/assets/images/jimmy-wordmark.svg').write_text(svg)
print(f'{len(shapes)} shapes; {sum(len(s["holes"]) for s in shapes)} holes; bounds {data["bounds"]}')
