# 2B — Two Plums, Tinted

A cohesive identity system built on a constrained plum palette with a single accent. The distinguishing move: a secondary, lighter plum does the work an accent colour usually does, keeping the palette inside one hue.

Read from the live Odoo-adjacent site: plum primary, near-white ground, marketing headlines set large, bold and tightly tracked.

## Palette

| Role | Hex | Use |
| --- | --- | --- |
| Primary | `#5C3D54` | Navigation, primary action, headline emphasis, selected state |
| Secondary plum | `#875A7B` | Tints, chips, illustration fills, hover, secondary buttons |
| Ink | `#201A1E` | Headlines and body text |
| Tint / line | `#EDE5EB` | Dividers, table stripes, card fills |
| Paper | `#FBF9FB` | Page background |
| Success | `#17A67F` | Confirmation, positive delta, diff-add only |

### Palette Rules

- **One structural colour.** `#5C3D54` carries all structure, never decoration.
- **One signal colour.** `#17A67F` is reserved for success and positive change. Everything else that needs emphasis uses the secondary plum.
- **No pure white or black.** Paper sits at very low chroma; ink is a tinted near-black.
- **Warning state is undefined** and needs a colour outside the hue family (see open questions).

## Typography

| Token | Face | Size / line-height | Notes |
| --- | --- | --- | --- |
| Display | Manrope 800 | 42–48 / 1.04, -0.03em | Marketing and page headlines |
| Section | Manrope 800 | 30 / 1.08, -0.02em | Hero and CTA bands |
| Title | Manrope 700 | 25 / 1.1, -0.02em | Card and section titles |
| Body | Source Serif 4 400 | 15–16 / 1.6 | Paragraphs, help text, docs |
| UI | Manrope 600 | 13.5–14 / 1.4 | Buttons, labels, table headers |
| Mono meta | IBM Plex Mono 500 | 10–12 / 1.3, .08–.16em, uppercase | Status chips, record ids, eyebrows |

### Typography Approach

- **Typefaces:** Manrope (display and UI) / Source Serif 4 (reading) / IBM Plex Mono (identifiers and meta).
- **Dense argument pages** (open source, pricing, editions comparison) use serif body to deliberately slow down reading, making the case more visible than the scan.
- **Dense product screens** keep Manrope for labels and Source Serif only for descriptions.
- **Numerals:** Use `font-variant-numeric: tabular-nums` in any vertically scannable column.

## Shape and Density

- **Buttons and chips:** Fully rounded (`border-radius: 999px`).
- **Cards and panels:** `border-radius: 4px`.
- **Body text:** Never below 13px; business screens are dense, so line-height stays at 1.6.
- **Filled plum buttons** on paper; **outlined plum** (35% border opacity) for secondary action.

## Open Questions

### Warning / Error
The palette has no alarm colour. A clay or amber outside the plum family is needed, tuned to at least 4.5:1 contrast on paper at 14px.

### Dark Mode
Needs a warm-dark ramp; the two plums are too close in lightness to survive inversion without a third step.

### Charts
No categorical ramp yet. Six steps should be derived from the plum and success hues, checked for adjacent-pair distinguishability.

### Contrast
- Primary (`#5C3D54`) and ink (`#201A1E`) both clear 7:1 on paper.
- Secondary plum (`#875A7B`) on paper is ~4.9:1: fine for text at 14px+, not for thin strokes or disabled states.
