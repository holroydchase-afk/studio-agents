# Material 3 dark theme (from the Material Components Android docs)

- Sources: https://github.com/material-components/material-components-android/blob/master/docs/theming/Color.md (real content; the first ~40K of ~50K characters read verbatim, the rest from a summary that listed no dark tone values) and the README of https://github.com/material-foundation/material-color-utilities (read in full, no dark values in it).
- Fetched: 2026-11-23.
- NOT loaded: every m3.material.io page (empty JS shells, plus a 404 on dark-theme). So there is no official M3 web guidance here, and this file says nothing about pure black: the source is silent on it. Re-check the M3 site before quoting it as "Material says".

## What the source says
1. Dark surfaces are tonal, not shadowed. Components use a stack of surface roles (lowest, low, default, high, highest, plus dim and bright) instead of the old elevation overlay that tinted the surface with the primary color. Higher in the stack means a lighter tone.
2. Dark baseline tones (neutral scale, 0 black to 100 white): background and surface 6; container lowest 4, low 10, default 12, high 17, highest 22; surface bright 24; text on surface 90; secondary text (on surface variant) 80 on a neutral-variant scale; outline 60 and outline variant 30.
3. Accents flip: in dark, primary is tone 80 with its on-color at tone 20; the container is tone 30 with its on-color at tone 90. Light mode uses tone 40 for the primary.
4. Keep tone (lightness) when defining custom colors so contrast pairs still hold, and when you change a container color, change its paired on-color too.
5. Medium and high contrast variants exist for non-dynamic themes; contrast is steered by tone.

## Studio use
For our own dark themes: the page background is a dark gray (about tone 6), not pure black; cards and sheets step lighter in clear levels; body text is about tone 90, not pure white; accent buttons use a light tone with dark text on top. These numbers are Material's baseline, a good starting point, and still need a WCAG ratio check on the real colors.
