Yes, I'll make every repo behave like Hearth for the intro, the plan line and the TDD order. I haven't changed anything yet. One word from you ("go") starts it.

**What I found.** I only had the CLAUDE.md text in front of me, so this is from reading those files, not from opening the repos.
- **Already the same as Hearth:** ccwatts, Role Radar, Energy Scanner, Charlie, Crew Clock and studio-agents. Each has the "Open every thread the same way" rule (the "Hi Chase, I'm <Product>'s chief of staff for <the work>" line, then "Building it now…"). They also have the TDD order and the `Agents:` line.
- **Missing the intro and plan-line rule:** PM tools and the portfolio site (holroydchase-afk.github.io). They also lack the "agents must really be in the run log" rule. The portfolio also lacks the "paste qa-tdd's verdict as-is" rule.
- **Wording slips:** the intro example in Hearth, Energy Scanner, Role Radar and Crew Clock still says "Charlie's chief of staff". Each should name its own product.

**What I'd do.**
1. Put one canonical "Open every thread" and TDD block in the studio-agents template. Then push it to each repo with `scripts/sync.sh` and `install-rules.sh`, not by hand-editing each file.
2. Open one small PR per repo. Each is docs-only, so it names `qa-tdd skipped: docs only`, and each updates `HANDOFF.md`.
3. Keep Hearth's own extras where they are: `grandparent-ux`, the persona check and the grandparent UX rules. Those are product rules, not behavior to copy to the other repos.

**Two things to know first.**
- Don't edit each repo's CLAUDE.md separately. The next sync would overwrite the edits and the repos would drift again.
- The portfolio repo deploys on any push to `main`. The CLAUDE.md change is harmless, but I'll leave that PR open for your go instead of merging it. I'll merge the rest on green, oldest first.

**What I haven't checked.**
- Whether each repo's `.claude/agents/` and agent-run hook are actually in place.
- Whether `scripts/agent-prompt.sh` and `check-agents.sh` exist in every repo. PM tools and the portfolio may not have them.
- Whether any open PRs are already doing this.
- I'll check all of that first and resume anything already started.

Go?