# Reference material studies

18 closed-volume props interpreted from the two user-supplied reference boards.
Geometry is built using swept surfaces, voxel unions and lathed profiles, with
full rear surfaces. None are image planes or silhouette extrusions.

- Iridescent lattice: perforated swollen grid, lavender/lime/seafoam vertex colors and live thin-film iridescence.
- Three lemon forms: softly rounded matte polymer.
- Mint starburst and aqua squiggle: glossy mint and satin aqua polymer.
- Chrome pebble and chrome curl: polished silver metal.
- Pink blob: coated soft resin with mild light transmission.
- Coral tower: corrugated tapering helix with ceramic glaze.
- Cobalt twist and branch: glossy saturated blue finish.
- Two cloth forms: packed woven normal texture, high roughness and fabric sheen.
- Orange pendant: soft orange polymer with fine surface grain.
- Blue resin seed: translucent cobalt resin with a packed wrinkle normal map.
- Clear clover and amber spindle: transmission, IOR, physical thickness and absorption.

Generate using `Blender -b --python scripts/build-material-studies.py`.
The script also writes an editable scene and two preview sheets to
`output/material-studies/`. All normal maps and colors are embedded in the GLBs.
The final live Three.js material tuning is in `src/lib/reference-prop-materials.ts`.
Size controls are in `home3DConfig.materialStudies`.

These props deliberately bypass matcap baking and back-layer plaster mixing to
preserve the requested material finishes. Existing image/gun/logo exclusions remain.

## Additional reference sculptures

`chrome-wrapped-lemon.glb`: displaced full lemon volume, packed peel normal map, fused polygonal chrome cage and drop.
`cherry-chess-knight.glb`: variable-section curved neck/head loft, fused ears/mane/plinth, recessed eyes, cherry clearcoat finish.

Build with `/Applications/Blender.app/Contents/MacOS/Blender -b --python scripts/refine-home-sculptures.py` after generating the original home-props scene. This also replaces the bird with a continuously remeshed body/wing/tail and fused rider sculpt. Editable scene and previews live in `output/refined-sculptures/`.

## Lime translucent resin

`lime-resin-bubble.glb` is a closed, continuously rounded oval/tail with incised curved marks. `study-lime-resin` combines yellow-green volume attenuation, rough transmission, a polished clear coat and slight thin-film color at grazing angles. It keeps its physical material at all depths.

Build: `/Applications/Blender.app/Contents/MacOS/Blender -b --python scripts/build-lime-resin.py`. Source scene and preview: `output/lime-resin/`. Runtime tuning: `src/lib/reference-prop-materials.ts`.
