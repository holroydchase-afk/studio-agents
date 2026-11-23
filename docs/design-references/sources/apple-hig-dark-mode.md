# Apple HIG: Dark Mode and Color

- Sources: https://developer.apple.com/design/human-interface-guidelines/dark-mode.md and .../color.md (the plain URLs return empty JS shells; only the `.md` paths load).
- Fetched: 2026-11-23, full content. HIG pages last updated: Dark Mode Aug 6, 2024; Color Dec 16, 2025.
- Summarized in our own words. Check the source before quoting numbers.

## Rules
1. Follow the system setting. Don't add an in-app appearance toggle: users must set two things and may think the app is broken when it ignores the system.
2. Support both modes, including Auto switching while the app runs. A permanent dark UI is only for rare cases such as immersive media.
3. Dark palettes use dimmer backgrounds and brighter foregrounds. Use semantic colors that adapt (label, separator, system backgrounds) rather than hard-coded values.
4. Contrast: 4.5:1 is the minimum for foreground against background. For custom pairs, aim for 7:1, especially small text.
5. Backgrounds have levels: base is dimmer and recedes, elevated is brighter and advances (popovers, sheets). Use the system's sets; custom ones weaken separation.
6. Every custom color needs light, dark and increased-contrast variants. Increased contrast should differ significantly.
7. Don't rely on color alone for meaning; add text or a shape. One color, one meaning. Don't use separator colors as text or secondary label colors as backgrounds.
8. Images: slightly darken content images with white backgrounds so they don't glow. Icons may need separate dark assets (an outline on a dark glyph over a dark background). Dark-on-dark detail in illustrations is wrong.
9. Test with Increase Contrast and Reduce Transparency, alone and together, and in varied lighting and color profiles.
10. Use color sparingly on glass surfaces; reserve it for primary actions.

## Studio use
Maps to dark-mode audit checks: no light-only hard-coded colors, 4.5:1 minimum (7:1 for small text where we can), visible separation between surface levels, white-background images toned down, no color-only status.
