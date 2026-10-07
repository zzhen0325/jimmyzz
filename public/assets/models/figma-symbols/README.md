# Homepage sculpted props

Source: Figma file `Fa7MwAlImSZD7D8D29vvgf`, frame `177:9287`.

| Asset | Source | Construction |
| --- | --- | --- |
| asterisk.glb | 177:9228, asterisk.svg | Closed puffed shell following the exact six-petal silhouette and central opening |
| c-mark.glb | 177:9226, c-mark.svg | Thick curved satin shell, open C-shaped center, modeled front and back |
| arrow.glb | 177:9224, arrow.svg | Swelling surfaces around a bent centerline, original blue/black artwork as UV color |
| vinyl.glb | 177:9230, vinyl-source.svg | Lathed dual-sided record, radial grooves, rolled rim, stepped label and spindle bore |
| bird-courier.glb | User-supplied bird/postman illustration | 56 modeled parts: body, layered wings, tail, rider, cap, limbs, letter, bag, beak and charms |

SVG files are source exports. `vinyl-type.png` is the original embedded artwork;
`vinyl-face.png` is rendered from the exported SVG for the record's UV material.
No screenshot is used as a model face or silhouette asset.

Build in order:

1. `node scripts/rasterize-figma-model-sources.cjs` (requires `sharp`).
2. `python scripts/prepare-figma-volumes.py` (requires NumPy and Pillow).
3. `Blender -b --python scripts/build-home-figma-models.py`.

The Blender script exports GLBs here and an editable scene plus perspective previews
under `output/home-figma-models/`. Models use Y-up and +Z-front without glTF axis conversion.
Homepage size controls are in `home3DConfig.sculptedProps`; all five are actual physics
objects rather than camera-facing image planes.

The refined bird is exported by `scripts/refine-home-sculptures.py` after the base generator. Its body, wings and tail form one remeshed surface; the rider's head, body and arms are also fused. Accessories retain their own materials. Rerun this finishing script after rebuilding the base scene.
