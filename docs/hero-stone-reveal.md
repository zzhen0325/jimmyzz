# Hero final-frame stone reveal

The final decoded frame of `public/assets/videos/11.mp4` activates five independent hover targets. The mapping is Think → orange triangle, Plan → blue circles tile, Do → green arrow, Review → coral asterisk, Repeat → yellow sunburst. Moving away fades back; seeking away from the final frame clears the overlay immediately. Coordinates follow the video's center/top object-cover transform. The original scrolling, risograph treatment, and draggable windows remain in place.

Implementation: `src/components/hero-stone-reveal.tsx`.
Asset: `public/assets/images/hero-stone-atlas.png` (transparent PNG; generated with the built-in image_gen tool from the user's reference). Atlas divisions are calibrated to the generated object spacing; each region is trimmed to its alpha bounds at load time.

Final generation prompt:

> Extract and complete these five stone shapes into one transparent PNG sprite sheet, landscape 1536x512. One horizontal row, five equal-width cells. Left to right: orange triangle with triple loops; blue rectangular tile with four circles; green octagon with oval right arrow; red rectangular tile with asterisk; yellow circle with sunburst. Preserve the exact reference colors, engravings and rough stone appearance. Fill in the occluded edges of blue and red tiles. Separate all five objects completely, no overlaps, no floor, no shadows beyond objects, no labels. Each object centered in its cell, fitted within 90% of cell width and 90% of canvas height. Actual transparent background.

Validation: TypeScript, component ESLint, browser checks for all five mappings, pointer leave, and pre-final-frame gating. Browser screenshots are in `output/playwright/stone-*.png`.
