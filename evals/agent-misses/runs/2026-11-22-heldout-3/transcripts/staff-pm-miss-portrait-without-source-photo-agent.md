**Decision: blocked.** The design needs a 1600 px portrait, but the only image on the site is a small file. Stretching it to 1600 px would look blurry on the first thing a recruiter sees. We need the original full-resolution photo from you. No CLAUDE.md or HANDOFF.md exists in this folder, so I worked from the brief only. The memory check found no past finding on this.

**Critical path**
1. M1.1: You supply the original photo, 3200 px wide or more. Done when it is in the repo assets folder. 0.2 session.
2. M1.2: Export responsive sizes (480, 800, 1600, 3200 px; webp plus jpeg) and set srcset and sizes. Done when every export is as wide as its label. 0.5 session.
3. M1.3: Place the portrait on the home page with fixed width and height to avoid layout shift. Done when it renders at 1600 px from the 1600 px file. 0.5 session.
4. M1.4: Check on a phone and a large screen. Done when the phone loads the small file and the large screen loads the 1600 px file. 0.3 session.

**Not doing**
- Upscaling the small file or AI enhancement: it cannot add real detail.
- Redesigning the layout: the design already exists.
- An image CDN or build pipeline: a few static files are enough.

**Biggest risk:** the only source is the small file (handled by M1.1). Second risk: a big image slows phone loads (handled by PORT-3).

**Decisions for Chase**
- Which original photo, at 3200 px or wider? Recommend: send the full-resolution original.
- If no good original exists, reshoot or keep the small size? Recommend: keep the current size now and reshoot later.

**Handoffs**
- qa-tdd: failing tests for PORT-1 to PORT-4, red for the right reason once the original exists.
- engineer: build M1.2 and M1.3, PORT-1 to PORT-4 green 3x.
- ux-reviewer: review the portrait on phone and large screen, no P0 or P1.

Tools: agent-guard kill ok; agent-memory ok (no matches); check-spec and spec-lint exit 0. Run log skipped (eval run).

```spec
verdict: blocked
bet: Recruiters landing on the home page see a sharp, larger portrait on big screens; it worked when the 1600 px slot shows a real 1600 px image with no upscaling blur and the page still loads fast
step: M1.1 | Chase supplies the original portrait photo (at least 3200 px wide, full-resolution, not the small site file) | original file is in the repo assets folder | 0.2 session
step: M1.2 | Export responsive sizes (for example 480, 800, 1600 and 3200 px, webp plus jpeg fallback) and set srcset and sizes | every export is at least as wide as its label | 0.5 session
step: M1.3 | Place the larger portrait on the home page per the design with fixed width and height to avoid layout shift | page renders at 1600 px with the 1600 px file | 0.5 session
step: M1.4 | Check weight and look on a phone and a large screen | phone loads the 480 px file, large screen the 1600 px file | 0.3 session
criterion: PORT-1 | auto | Given the source photo is 3200 px wide, when the exports are built, then the largest export is 1600 px or wider and every file width matches its name
criterion: PORT-2 | auto | Given a 1600 px viewport at device pixel ratio 1, when the home page loads, then the chosen portrait file has natural width 1600 or more
criterion: PORT-3 | auto | Given a 390 px viewport, when the home page loads, then the chosen portrait file is 800 px wide or less and under 150 KB
criterion: PORT-4 | auto | Given the portrait img tag, when the page is parsed, then it has width and height attributes and an alt text of 1 or more characters
criterion: PORT-5 | manual | Open the home page on a 1600 px screen -> the portrait looks sharp with no visible blur or pixelation
cut: Upscaling the existing small file or AI enhancement | it cannot add real detail and would look soft or fake on the first screen a recruiter sees
cut: Redesigning the home page layout | the design already exists; only the image is the problem
cut: Image CDN or build pipeline | a few static exports are enough for one image
risk: The only source is the small file, so a 1600 px image cannot be honestly produced | M1.1
risk: A 1600 px image slows the phone load | PORT-3
decision: Which original portrait photo should we use, at 3200 px or wider? | Send the full-resolution original; if none exists, keep the portrait at its current small size instead of upscaling
decision: If no good original exists, reshoot or cap the design at the small size? | Cap the design at the current size now and reshoot when convenient
handoff: qa-tdd | failing tests for PORT-1 to PORT-4 | red for the right reason once the original exists
handoff: engineer | build M1.2 and M1.3 | PORT-1 to PORT-4 green 3x
handoff: ux-reviewer | review the home page portrait at phone and large screen | no P0 or P1 on sharpness or layout
blocked: the original full-resolution portrait photo; the repo has only a small file, which cannot fill a 1600 px slot without blur
```
