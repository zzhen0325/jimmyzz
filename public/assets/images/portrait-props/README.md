# Portrait collage props

Created with built-in image_gen, 2026-10-11. Both PNG files retain generated transparency.

Reference: user-provided cat / laptop / iced coffee collage.

Prompt set:
- laptop.png: Single isolated photorealistic open silver laptop cutout inspired by the reference. Back of raised lid, sliver of black keyboard and silver base, three-quarter view, lid on right and base projecting lower left. Complete laptop, crisp metal edges, true transparent background. No cat, person, hands, coffee, icons, ground plane, shadow or text.
- coffee.png: Single isolated photorealistic iced black coffee in a transparent takeaway cup, like the reference. Dark coffee, shiny ice cubes at open top, caramel color at base, no lid or straw. Slightly elevated three-quarter view, entire cup upright and visible, true transparent background. No cat, hands, paws, laptop, icons, branding, ground plane or shadow.

Implementation: independent image layers anchored at UV positions on the portrait surface. Deformation changes each anchor position, but never scales, skews or rotates the images. Overall portrait translation moves both props. Their bounds are included in the column movement constraints.

## Hand-held variants

Generated using built-in image_gen, using each original PNG as its edit target:
- coffee-held.png: Add one realistic light-warm-skinned adult hand wrapped around the lower half of the cup, naturally curled fingers and thumb in contact. Short wrist enters from lower right. Preserve upright coffee, ice and cup. True alpha, no extra props, face, body or sleeves.
- laptop-held.png: Add one realistic light-warm-skinned adult hand supporting the laptop base from below, visible fingers gripping its near left edge. Short wrist enters from lower left. Preserve the open laptop view, materials and proportions. True alpha, no other props, face, body or sleeves.

These variants are active in the component. Props use z-index 20 above the portrait outline, coordinate guides and handles; pointer-events remain disabled so controls underneath still receive input.
