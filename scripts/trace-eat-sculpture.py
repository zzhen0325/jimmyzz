"""Trace the existing transparent eat reference into solid relief contours.
Requires Pillow, numpy and opencv-python-headless; run from the repository root.
"""
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
image = np.array(Image.open(root / 'public/assets/images/floating/eat-figure.png').convert('RGBA'))
alpha = image[:, :, 3] > 180
ink = alpha & (image[:, :, :3].max(axis=2) < 105)

def trace(mask, minimum):
    contours, hierarchy = cv2.findContours(mask.astype(np.uint8) * 255, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    def points(contour):
        return cv2.approxPolyDP(contour, 1.25, True).reshape(-1, 2).tolist()
    shapes = []
    for i, contour in enumerate(contours):
        if hierarchy[0][i][3] != -1 or cv2.contourArea(contour) < minimum:
            continue
        holes = []
        child = hierarchy[0][i][2]
        while child != -1:
            if cv2.contourArea(contours[child]) > minimum:
                holes.append(points(contours[child]))
            child = hierarchy[0][child][0]
        shapes.append({'outline': points(contour), 'holes': holes})
    return shapes

data = {'width': image.shape[1], 'height': image.shape[0], 'body': trace(alpha, 100), 'ink': trace(ink, 35)}
(root / 'src/lib/eat-sculpture-contours.json').write_text(json.dumps(data, separators=(',', ':')) + '\n')
print(f"Traced {len(data['body'])} body and {len(data['ink'])} relief shapes")
