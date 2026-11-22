# UX baseline: "before" screenshots (Nov 19, 2026)

Baseline inputs for the UX agent evals ("Raise the UX agent from 7 to 9"). Each product was checked out at its last commit on or before Nov 19 (before the recent UX fixes), run locally on demo or sample data, and captured with Playwright. No real personal data: every shot comes from the product's own public demo, mock or sample mode.

File names: `<screen>__<phone|laptop>__<light|dark>.png`. Phone is 390 px wide, laptop is 1440 px wide, full page height. Images are quantized to 128 colors to keep the repo small (fine for layout, spacing and text review, not for color-exact checks).

| Folder | Commit (date) | Mode | Images | Notes |
|---|---|---|---|---|
| `portfolio-site` | `bef6201` (Nov 18) | static pages | 52 | 13 pages (home, about, building, 4 product pages, resume, studio, 404 ...). Third-party hosts blocked, so fonts may differ. |
| `hearth` | `178a96c` (Nov 19) | `EXPO_PUBLIC_HEARTH_DEMO=1` web export | 48 | Gallery, Share, Feed, More and each More row (Messages, Groups, Events, Easy view, Light or dark, Me, Help). Native app screens (iPhone/Android) are not covered. |
| `charlie` | `61c0c84` (Nov 17) | FastAPI, `CHARLIE_DATA=mock`, fictional sample resume | 48 | All 6 tabs, once with no profile (`empty-`, includes the first-run disclaimer modal) and once with a profile (`profiled-`). Not the Pyodide static demo. |
| `role-radar` | `35a453d` (Nov 18) | demo build | 36 | 9 tabs (Home, New, Pipeline, Ruled out, All, Recruiters, Criteria, Watchlist, Scan rules). |
| `crew-clock` | `a6f1704` (Oct 30; no newer commit) | `--demo` build | 40 | Sign-in, location consent, crew home, punch flow, 5 boss tabs. Map tiles are blocked in the sandbox, so the map tab has no tiles. |
| `energy-scanner` | `24afa17` (Nov 10) | vite build, bundled sample image | 10 | Start (evening), palm reading, photo scan start, aura grey, aura rainbow. Phone and laptop only: the app is dark by design, with no light variant. |
| `ccwatts` | `1ad86d0` (Nov 18) | built playground page | 12 | Landing, sample data, 7 days, all time, demo drawer. CLI terminal output is not covered. |
| `hero-backgrounds` | `ecafd0a` (Nov 20) | static `index.html` | 4 | The repo was created Nov 20, so this is its first commit, the only baseline possible. |

Not captured: `fruit-palettes` (its only commit on Nov 20 is a LICENSE file, nothing to run).

`tools/` holds the capture scripts (Playwright, run from a scratch dir with `NODE_PATH` pointing at a global playwright). Re-running them on a later commit gives the "after" set under the same names.
