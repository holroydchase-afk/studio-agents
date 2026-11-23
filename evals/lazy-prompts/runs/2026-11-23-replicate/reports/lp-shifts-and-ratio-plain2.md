Yes to the shifts and the ratio. One part of "max my sessions" won't help, so I'd skip it.

**Skip this:** more or longer Claude sessions only adds portfolio output. Your bottleneck is your one hour, and that hour is where applications get submitted. You said you're over-weighted on portfolio, so extra agent hours would make that worse.

**What I'd set up instead (defaults, so you don't have to design anything):**

- **Day shift (Claude, while you're offline):** a weekday morning run does the Role Radar scan, then runs intake on the top roles, so tailored resumes and drafts are waiting for you. Your hour then starts with submitting, not prepping.
- **Your hour, moved earlier:** one fixed slot, hard stop at 9:30pm. First 40 minutes are applications only. The last 20 are portfolio, and only once the day's goal is met.
- **Night shift (2:15am run):** hardening only (tests, QA, UX fixes, handoff upkeep). No new features. You stop being the reason the portfolio grows.
- **Ratio:** about 80/20 applications to portfolio until you have a set number of submitted applications. I'd say 3 a day on weekdays.
- **Rolling goal:** a missed day carries over, capped at 2 extra, so a bad night doesn't become a guilt pile.
- **The block:** the studio already has a `focus-coach` agent that is meant to push back on portfolio, tooling and new-project asks during an application window or after the evening cutoff. I'd wire it to the daily goal. If today's applications aren't done, I say "applications first" and offer the next role to submit, instead of starting portfolio work. You can override with one word, and I'll log it.

I wouldn't build a new tracker for this. That would be more portfolio work. The count can live in one line at the top of the studio HANDOFF.md, and I'd update it when you tell me "submitted 2".

**One thing I need from you:** is 3 applications a day and a 9:30pm cutoff right? Reply "go" to take both, or send your own numbers. On go, I'll make one small PR in studio-agents (focus-coach rules plus the goal line) and one scheduled-run change for the morning run. Neither touches a live demo or the site. I'll list the open PRs in merge order before I merge anything.
