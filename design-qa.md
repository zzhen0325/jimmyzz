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
