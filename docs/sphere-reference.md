# Sphere reference reconstruction — 2026-09-06

Scope: replace the portfolio's 3D Tilt Wheel with the active Sphere preset at https://motion.superopc.app/. Keep the portfolio's own 24 images, text, controls and lightbox. Render 51 cards by cycling the 24 assets.

## Evidence

Inspected the user's open reference tab, its parameter panel, desktop/mobile screenshots, and the public browser runtime:

- https://motion.superopc.app/_next/static/chunks/1bjimjbzwgxin.js
- https://motion.superopc.app/_next/static/chunks/2y0q0mep84xuo.js

The reference uses Three.js r171 with custom image shaders. The implementation uses the project's existing Three.js r184 dependency and a separately written shader restricted to this preset. GSAP supplies frame scheduling and button-step easing. It does not reproduce unrelated source modes, export features, or controls.

## Verified rules

- Fibonacci sphere radius 10, 51 points including both poles (`y = 1 - 2i/(N-1)`).
- Camera FOV 45 degrees, camera distance `11.5 / tan(22.5°)`.
- View quaternion from XYZ Euler (-108°, -119°, 0°), multiplied by a local-X spin quaternion. Speed +0.5 radians/sec. “Reverse” means reverse engineering, not reverse playback.
- Sphere scale 0.55; hover scale 1.10. Hover does not pause rotation.
- Each card has a stable random base scale in [0.85, 1.25], base side 2.5 times image scale 1.30, square center-cover crop.
- Billboard quaternion cancels the parent rotation. Front-facing cards remain parallel to the camera.
- Card hover scale 1.50. Exponential smoothing `1 - 0.0025^dt` for both hover scales. No forced foreground render order.
- Back-hemisphere fade is `0.75 * smoothstep(0, 10, -worldZ)`. Front hemisphere fade is zero. This blends **linear RGB with background color**, leaving texture alpha unchanged.
- Rounded mask uses radius `0.5 * 0.17 = 0.085` of the square side, not CSS border-radius 17%. Alpha mask cutoff 0.02; rounded edge smoothing width 0.005 UV.
- Transparent image/border materials with depth test enabled, depth write disabled; normal Three.js camera-depth sorting. Border plane sits 0.01 units behind the image. No manual integer z-index switching.
- Border world thickness is `3 * 0.03 / cardBaseScale` before parent transformations. Its color is the dominant image color (3-bit/channel buckets, 48px sample), shifted ±0.1 HSL lightness with clamp [0.08, 0.92].
- Pointer drag changes view angles by 0.006 rad/px; it does not open an image. Hover alone does not tilt the entire sphere. Scroll no longer changes its orientation.

## Integration differences

- Original portfolio imagery and #090909 background retained instead of reference media and #000000. This changes apparent color balance, while all depth/occlusion rules remain the same.
- The source clips the sphere horizontally on a 390px phone. The local camera pulls back on narrow screens to keep the gallery and controls usable.
- Portfolio pause, nudge, grid, lightbox, keyboard access and reduced-motion fallback are retained. Offscreen rendering is suspended and WebGL resources are disposed on unmount.
- Random per-card scales and elapsed animation phases differ between loads. Screenshots compare shape, density, occlusion and fade, not identical pixels.

## Component search

No exact upstream component was established. Related first-party listings:

- https://www.framer.com/marketplace/components/3d-images-sphere/
- https://www.jolyui.dev/docs/components/creative/image-sphere
- https://21st.dev/community/components/tonyzebastian/image-sphere

These were not used as replacements because the inspected source runtime provides more direct evidence for the requested behavior.
