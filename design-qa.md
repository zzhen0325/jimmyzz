# Sphere reconstruction QA — 2026-09-06

final result: passed

Scope: the Sphere effect only. Previous full-site QA is retained below.

## Source and implementation evidence

- Source visual truth: `output/sphere-qa/reference.jpg` and the user-provided parameter-panel screenshot; live source https://motion.superopc.app/.
- Implementation screenshot: `output/sphere-qa/implementation.jpg`; live implementation http://localhost:3000/#gallery.
- Mobile implementation: `output/sphere-qa/mobile.jpg`.
- Desktop captures were emitted together in one browser-tool comparison result. Full views include the complete sphere and surrounding context; focused inspection compared overlapping front-center cards and dimmer rear-edge cards.
- Source capture 1800×890 image pixels; implementation 1785×883 image pixels (browser screenshot output). Browser CSS canvas measured 1785×890. Compared at the same apparent card scale, with the minor viewport-height difference acknowledged. No pixel-equality metric claimed.
- Mobile CSS viewport 390×844, 375px content width after scrollbar; screenshot 375×812. No horizontal document overflow. Source mobile was inspected with its panel open and sphere clipped laterally; local intentionally fits the sphere within the portfolio layout.
- State: active 51-card Sphere preset, dark background. Different portfolio assets, random card scales and animation phases prevent identical-frame comparison.

## Findings and fixes

1. [P1, fixed] DOM opacity allowed cards to show through one another. Replaced with a WebGL image shader that blends RGB toward background only behind the center plane. Re-capture shows opaque foreground occlusion, without the previous translucent collage effect.
2. [P1, fixed] Manual z-index rounding and hover z-index override caused incorrect layer changes. Three.js now sorts parallel image/border planes in camera depth, with no forced hover foreground order. Drag/click inspection confirms front-facing selection and stable occlusion.
3. [P2, fixed] Rotation order, hover-paused auto-spin, and pointer-follow tilt diverged from source. Reconstructed XYZ view quaternion multiplied by X-axis spin; +0.5 rad/sec, continued spin during hover, drag-controlled orientation.
4. [P2, fixed] CSS 17% corner radius and fixed gray border differed from source. Shader radius is 8.5% of the side; border width and dominant-image color follow the source rules. Re-capture shows the source's tighter corners and thin colored borders.

## Fidelity surfaces

- Typography/copy: portfolio heading, label and controls retained by scope. Interaction copy now says drag, hover and click; no obsolete wheel/scroll-expansion wording.
- Layout/spacing: centered spherical volume, 51 square cards, source world dimensions and camera. Portfolio section framing retained. Narrow-screen camera fit is an intentional adaptation.
- Colors/opacity: sRGB textures, linear-color depth blend, foreground alpha preserved, dominant-color borders. Portfolio background #090909 is intentionally retained.
- Assets: real local portfolio images, center-cover square crop, native texture decoding; no generated or placeholder imagery.
- Motion/layers: billboard alignment, world-space depth fade, native transparent sorting, hover smoothing, and local-axis spin verified against the public runtime and rendered reference.

## Interaction and technical checks

- Keyboard Enter on canvas opens a foreground work in the existing lightbox; close restores the gallery.
- Drag rotates without opening the lightbox; a subsequent click opens a visible foreground work.
- Flat/grid and sphere switching tested at mobile width. Pause/nudge controls retained; pause state displayed correctly.
- Desktop and 390px viewport inspected; controls remain visible, no horizontal overflow.
- Browser reported Three.js r184 on the live canvas. Console inspected: no WebGL or shader compilation errors; unrelated extension-injected hydration/listener diagnostics present.
- TypeScript, ESLint and `git diff --check` passed.

## Remaining limits

No exact upstream component was identified. The original source runs Three.js r171; the local project uses r184. Random asset sizes/phases and different imagery mean this is a reconstruction of the inspected rendering rules, not a pixel-identical copy. Background and mobile fit are intentional integration differences.

---

# Design QA — Jimmy clone

## Evidence

- Source visual truth: `output/playwright/source/desktop-00-top.jpg`, `output/playwright/source/mobile-00-top.jpg`, `output/playwright/source/desktop-full.jpg`, `output/playwright/source/mobile-full.jpg`, all route captures and interaction-state captures under `output/playwright/source/`.
- Final implementation: `output/playwright/final-approved-desktop-top.jpg`, `output/playwright/final-approved-mobile-top.jpg`, `output/playwright/final-approved-desktop-full.jpg`, `output/playwright/final-approved-mobile-full.jpg`.
- Full-view comparison evidence: `output/playwright/qa-final-desktop-full-comparison.jpg`, `output/playwright/final-compare-mobile-full.jpg`, `output/playwright/compare-desktop-sections-final.jpg`, `output/playwright/compare-mobile-sections-final.jpg`.
- Focused comparison evidence: `output/playwright/qa-final-desktop-top-comparison.jpg`, `output/playwright/qa-final-mobile-top-comparison.jpg`, `output/playwright/compare-work-desktop-final.jpg`, `output/playwright/compare-meridian-mobile-final.jpg`.
- Viewports: desktop `1600 × 900`, tablet `1000 × 900`, mobile `390 × 844`, DPR 1.
- State: anonymous visitor, dark theme, source and clone at the same route/scroll/interaction state.

## Comparison history

### Pass 1 — blocked

- [P1] Desktop hero wordmark was oversized and clipped.
  - Evidence: `output/playwright/compare-desktop-top-pass1.jpg`.
  - Fix: measured the source title bounds, matched its optical height and width, moved the timeline to the top rail, and set the final wordmark bounds to approximately `x 21–1545`, `y 568–897`.
- [P2] The hero editor card used the wrong source image.
  - Evidence: `output/playwright/local-desktop-top-pass1.jpg`.
  - Fix: replaced the mark with the captured Noah Reyes portrait asset and rechecked desktop/mobile crops.
- [P2] Mobile section rhythm drifted: selected work was too tall while services and booking were too compressed.
  - Evidence: `output/playwright/compare-mobile-sections-final.jpg` and the earlier source/local section captures.
  - Fix: rebalanced mobile project, services, about and booking heights against the same source scroll positions. Final page heights are source `15459px` versus implementation `15625px`.

### Pass 2 — blocked

- [P2] Work-list rows lacked the source thumbnail composition and route heights drifted.
  - Evidence: `output/playwright/compare-work-desktop-qa2.jpg` and `output/playwright/compare-work-mobile-qa2.jpg`.
  - Fix: added real video thumbnails, preserved the hover expansion, matched mobile stacking, and calibrated heights to source desktop `3815px` versus implementation `3809px`, mobile `4636px` versus implementation `4700px`.
- [P2] Project-detail title, metadata and timeline were in the wrong regions.
  - Evidence: `output/playwright/compare-route-meridian-pass1.jpg`.
  - Fix: moved the time rail and REC indicator to the top, metadata to the lower rail, reduced the title, and matched mobile hero height. Final Meridian height is source desktop `4657px` versus implementation `4792px`, mobile `5111px` versus implementation `5128px`.
- [P2] Client marks were rendered as type rather than the captured brand assets.
  - Evidence: source edited-for captures and `output/playwright/final-approved-logo-section.jpg`.
  - Fix: replaced them with the copied transparent Allbirds, Audi, Pexels, Airbnb, Adidas and Noah source marks.

### Pass 3 — passed

- Re-captured the final production build after all fixes.
- Desktop/mobile have no horizontal overflow.
- Browser console and page errors: none.
- Failed local resource requests: none.
- `npm run lint` and `npm run build`: passed.

## Required fidelity surfaces

- Fonts and typography: the captured BDO Grotesk variable font is loaded locally. Display/body weights, line-height, tracking, title wrapping and small timecode labels were compared at desktop and mobile sizes.
- Spacing and layout rhythm: hero, edited-for, three project strips, reels, services, about, rates, reviews, booking and footer preserve source order and near-identical overall heights. Work and detail routes were calibrated separately.
- Colors and tokens: near-black `#090909`, off-white `#f4f2ed`, orange `#db3903`, muted greys, dividers, blur and opacity treatments match the captured source.
- Image quality and asset fidelity: all copied source images, transparent marks, font files and 14 videos are served locally; there are no hotlinks to Framer assets. Video stills may show a different frame at capture time because playback is live, but the source media is identical.
- Copy and content: homepage, services, rates, reviews, booking, work index, four case studies, privacy and terms copy match the source capture.
- Icons: interface and social marks use consistent library icons; source brand marks use the real captured assets.
- Responsiveness: checked at `1600`, `1000` and `390` widths with no overflow, clipped controls or unusable tap targets.
- Accessibility: semantic links/buttons/forms, labels, alt text, keyboard-reachable controls, visible browser validation and `prefers-reduced-motion` support are present.

## Primary interactions tested

- Primary navigation and all eight public routes.
- Floating menu open/close on desktop and mobile.
- Film Runner play/jump state.
- Hero editor-card modal open, playback and close.
- Selected-work hover playback and motion.
- Service video switching.
- Review previous/next carousel.
- Booking form validation and success state.
- Template modal open/close and license selection.
- Previous/next project navigation and back-to-top links.

## Findings

- No actionable P0, P1 or P2 findings remain.

## Follow-up polish

- [P3] A screenshot can catch a different frame in an autoplaying video than the source capture; motion timing and media are otherwise matched.
- [P3] The local template purchase UI intentionally stops before an external payment side effect.

## Implementation checklist

- [x] Source and implementation opened and compared in the same viewports.
- [x] Full-view and focused comparisons reviewed.
- [x] Desktop, tablet and mobile checked.
- [x] All routes and primary interaction states exercised.
- [x] P0/P1/P2 findings fixed and re-captured.
- [x] Console, resources, lint and production build checked.

final result: passed
