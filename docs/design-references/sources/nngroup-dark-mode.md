# NN/g on dark mode

- Sources: https://www.nngroup.com/articles/dark-mode/ (Raluca Budiu, published Feb 2, 2020; a literature review, NN/g ran no study) and https://www.nngroup.com/articles/dark-mode-users-issues/ (Tanner Kohler and Amy Zhang, Aug 27, 2023; survey of 115 mobile users plus usability sessions).
- Fetched: 2026-11-23, both loaded. Neither article discusses astigmatism or "halation" by name, and neither states "avoid pure white on black" outright.

## Findings
- For normal vision, light mode (dark text on light) usually reads faster and proofreads better, and the gap grows as text gets smaller. At night the advantage shrinks; in daylight it disappears.
- Dark mode can help people with cloudy ocular media (e.g. cataracts); people with central vision loss showed no difference. Small, older studies, so treat as directional.
- Users split roughly in thirds: dark, light, mixed. Reasons: eye strain, battery, looks, visual impairment.
- Battery savings only on OLED, and brightness matters as much as mode (about 67% at full brightness, about 14% at 30% in one study).
- Users set dark mode in the OS and expect apps to follow it. Don't force either mode on people with visual impairments.

## Recommendations
1. Follow the OS setting by default; let people override it. Don't make dark the default for everyone.
2. Thin fonts get swallowed on dark backgrounds, even white on black; heavy ones can bleed. Use one text color at different opacities.
3. Avoid saturated colors on dark backgrounds. Meet WCAG 4.5:1 and 3:1.
4. Show depth with lighter surfaces on top of darker ones. A lighter "shadow" on black looks like a glow.
5. Check the usual breakages: transparent-background logos and emoji, scrims that vanish, dividers that disappear, inverted QR codes, links that open light pages, emails that ignore the mode.
6. Dark mode is nice to have, never ahead of basic usability. Best value for long sessions, frequent use and low light.
