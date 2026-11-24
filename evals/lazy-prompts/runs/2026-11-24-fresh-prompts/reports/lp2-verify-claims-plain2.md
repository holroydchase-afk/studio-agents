Yes, but I haven't verified any claim yet. I can't open your repos, the live site, the run logs or the scores from here, so nothing below has been checked against them. I've only read the rules in your CLAUDE.md files and what you told me about where things stand.

**How I'd do it.** A full walkthrough of everything in one go would be too long, and you'd skim it. I'd go one product per night, about an hour each. For each product I'd cover:
- **Claims table.** Each public claim, the evidence behind it (test, log, score or file), and a verdict: backed, partly backed, or unbacked.
- **Gaps.** A few plain-language explanations of the concepts behind it that a hiring manager might probe.
- **Walkthrough.** How it works, in the order you'd explain it in an interview.

**Where I'd start.** The portfolio site comes first, because it's what recruiters read. Every other product's claims hang off it.

**Claims I'd check first.** These are the highest-risk ones. They come from the rules in your repos and from the status you gave me, not from anything I've confirmed:
- **Hearth:** "no AI training, no ads or trackers, data stays in the US." I'd check this against the actual vendors and the architecture docs. Also, the beta only started Nov 22, so any "used by grandparents" wording is premature.
- **ccwatts:** "no network calls," and "every number has a range and a method version." The first can be tested. The second needs a look at the actual output. Your repo says npm publishing needs your explicit go, so I'd confirm the published version matches what the site says.
- **Energy Scanner:** "photos never leave the device." I'd check the built demo's network requests, not just the code.
- **Crew Clock:** the public demo has no backend URL. I'd read the built output to confirm.
- **Charlie:** the "Not financial advice. Paper trading only." line on every trade surface, and the demo making no network calls except Pyodide.
- **Studio agents:** descriptions like "agents ran 3x" or "reviewed by ux-reviewer." Your rule is that claims must match the run logs and scores. This is the most likely place for overclaiming, because agent counts and verdicts drift.
- **Role Radar:** how it describes the scoring, and whether any demo data could be mistaken for real data.

**Two gaps I can teach now.** Interviewers will probe these:
- **Evidence tiers.** "A test proves it" is stronger than "the code does it," which is stronger than "the doc says it." A portfolio claim should name its tier, and anything in the weakest tier should be softened.
- **Metrics versus outcomes.** "3x green suites" shows process, not user value. Only Hearth has real users. For the others, say "built and demoed" rather than "adopted."

**One thing to flag.** If any claim fails the check, I'd fix the wording in a PR. A change to the live site waits for your go, as usual.

**One question for you.** Start with the portfolio site, then Hearth? Reply "yes" and I'll begin. For repo-level checks I'd need to be in a session that can open your repos.