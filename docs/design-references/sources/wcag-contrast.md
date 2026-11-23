# WCAG 2.2: contrast and use of color

- Sources (W3C "Understanding" pages): https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html, .../non-text-contrast.html, .../use-of-color.html
- Fetched: 2026-11-23. contrast-minimum and use-of-color loaded in full. non-text-contrast loaded verbatim for roughly its first two-thirds; the exceptions and focus-indicator details came from a model summary of the remainder, so treat those as less certain and re-check.

## SC 1.4.3 Contrast (Minimum), AA
- Normal text: at least 4.5:1. Large text: at least 3:1.
- Large = 18 pt or more, or 14 pt or more bold (about 24px, or 18.5px bold).
- Ratios are hard thresholds: 4.499:1 fails.
- Exempt: inactive controls, pure decoration, text no one can see, text inside a photo with other significant content, logos.
- Brand guidelines don't exempt text. Placeholder text and text revealed on hover or focus must meet it too.

## SC 1.4.11 Non-text Contrast, AA
- UI components (borders or fills needed to identify a control, and its states) and graphics needed to understand content: at least 3:1 against adjacent colors.
- Exempt: disabled controls, browser-default styling you didn't change, graphics where an exact look is essential (logos, photos), decorative graphics, anything also available as text.
- Focus indicator: at least 3:1 against adjacent colors; removing focus outlines is a failure. (From the summary part.)

## SC 1.4.1 Use of Color, A
- Color can't be the only way to convey meaning, prompt an action or tell elements apart.
- A lightness difference of at least 3:1 alongside color counts as an extra cue; hue alone does not.
- Links in body text need a non-color cue or 3:1 against the surrounding text.

## Studio use
Dark mode is where these fail first: dim secondary text (4.5:1), faint input borders and dividers (3:1), focus rings on dark surfaces (3:1), status shown only by hue. Compute real ratios from real colors; don't judge by eye.
