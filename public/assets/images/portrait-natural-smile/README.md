# Natural smile variant

Generated with the built-in image_gen tool on 2026-10-11.

Inputs: original fluted-portrait-frames/sheet-02.webp and sheet-03.webp; user-provided sunglasses smile reference.

Prompt set:
- Transition: identity-preserving edit of the original 8-column, 4-row sheet. Keep head positions, scale, rotation, hair, sunglasses, blue background and original motion. Preserve frowning rows. Transition the last two rows toward a relaxed, slightly open smile with a subtle strip of upper teeth, using the supplied expression reference. No body, neck, clothing, checkerboard, text or grid lines.
- Smile: identity-preserving edit of the original final 8-column, 4-row sheet. Match the final expression of the edited transition sheet. Keep front-facing heads, cell positions and blue background. Stabilize the slightly open natural smile across all cells.

Outputs: transition.png and smile.png, each 1774 × 887. Sampling uses the actual image dimensions divided into 8 × 4 cells. Original resources are retained unchanged. Playback uses original frames 0–49, edited transition frames 50–63, and edited smile frames 64–66. These are generative edits, not pixel-identical mouth-only composites; fine details and temporal consistency can vary.
