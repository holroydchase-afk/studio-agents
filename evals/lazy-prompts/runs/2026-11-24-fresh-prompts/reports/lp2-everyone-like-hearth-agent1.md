Hi Chase, I'm your studio chief of staff for the "everyone behaves like Hearth" ask.

**Answer:** Yes, do it. Most repos already match Hearth. The gap is two repos (portfolio, pm-tools) plus copy-paste drift in the rest. I'd fix it with one shared paragraph in studio-agents that every repo syncs, not eight hand-edited copies.

**Goal fit:** This serves "agents behave consistently, and claims match run logs". It also saves you effort, because you stop spotting differences by hand.

**What I found (from the CLAUDE.md files I was given):**
- Already have the "Hi Chase, I'm <Product>'s chief of staff…" intro, the plan line, test-first order and the Agents line: ccwatts, role-radar, energy-scanner, crew-clock, charlie, studio-agents, hearth.
- Missing the intro, plan line, "relay qa-tdd verdict verbatim" and "agent must be in the run log" rules: **portfolio (holroydchase-afk.github.io) and pm-tools**. They also lack story-keeper and release-captain rows.
- Drift: the intro example says "Charlie's chief of staff" in role-radar, energy-scanner, crew-clock and hearth. Hearth's own wording ("for the Share redo") is the right model.
- Not copied: Hearth's persona check, grandparent-ux and 17pt rules. They exist because relatives use Hearth, and no other product has that user.

**Call: reuse.** The paragraph goes in the studio-agents template once, with a product-name placeholder, and `sync.sh` pushes it out. Building a new mechanism or a hook is not worth it. CI can't check a chat line, so I'd use a spot check instead.

**Critical path (about 3.5 sessions):**
1. M1.1: put the four paragraphs into the studio-agents template. `tests/check.sh` fails if a synced repo differs. (1 session)
2. M1.2: sync to portfolio and pm-tools, and re-sync the other six to drop the Charlie example. (1 session)
3. M1.3: add the agent-runs log hook and agents-check to portfolio and pm-tools. (1 session)
4. M1.4: spot check 5 new threads across 5 repos for the intro, the plan line and red-then-green. (0.5 session)

**Not doing:** copying Hearth's persona and grandparent rules; rewriting the agents (they already match); a hook that forces the intro line.

**Biggest risk:** a sync overwrites a repo's own hard rules. The check in SYNC-1 compares only the shared paragraphs.

**Two decisions for you:**
- Template plus sync, not hand copies. My recommendation: yes.
- Apply the same rules to the portfolio repo, since it ships code in `tools/build.py`. My recommendation: yes.

**Hand-offs:** qa-tdd writes failing checks for SYNC-1 to SYNC-4, then engineer builds M1.1 to M1.3, then positioning checks the wording.

**What I did not check:** I could not open any repo. I read only the CLAUDE.md text I was given. I did not see HANDOFF.md files, open PRs or branches, the `.claude/agents/` folders, the CI workflows or the studio-agents template and sync script. Whether the two gaps are real in the files on disk, and whether `sync.sh` can carry the paragraph, is unverified. Nothing has been changed or merged.

```spec
verdict: needs-decision
bet: Chase opens any product thread and gets the same opening and the same test-first order; it worked when a spot check of the next 5 threads across 5 repos shows the intro line, the plan line and a red-then-green qa-tdd run in each
step: M1.1 | Put the Open every thread, One task in order, Relay qa-tdd and Agents-line-must-have-run paragraphs in the studio-agents template once, with a product-name placeholder | template holds one copy and tests/check.sh fails if a synced repo differs | 1 session
step: M1.2 | Sync to the two repos missing them (portfolio and pm-tools), then re-sync the other six to drop the copy-pasted Charlie example | every repo opens with its own product name | 1 session
step: M1.3 | Add the missing agent-runs log hook and agents-check to portfolio and pm-tools | Agents line on a test PR fails when qa-tdd is named but not logged | 1 session
step: M1.4 | Spot check 5 new threads across 5 repos | intro, plan line, red then green seen in each | 0.5 session
criterion: SYNC-1 | auto | Given the six repos with the paragraph, when each CLAUDE.md is compared to the template with the product name filled in, then 0 differ
criterion: SYNC-2 | auto | Given the portfolio and pm-tools CLAUDE.md after sync, then both contain the line "Hi Chase, I'm" and the heading "Open every thread the same way"
criterion: SYNC-3 | auto | Given a code PR whose body names qa-tdd and a log with no qa-tdd line, then agents-check exits 1
criterion: SYNC-4 | auto | Given any synced CLAUDE.md, then the string "Charlie's chief of staff" appears only in the charlie repo
criterion: SYNC-5 | manual | Start a thread in each of 5 repos -> the first message is "Hi Chase, I'm <that product>'s chief of staff for <the work>." followed by the plan line
cut: One rule set that also copies Hearth's persona check, grandparent-ux and 17pt rules | those are about relatives using Hearth; no other product has that user
cut: Rewriting the studio-agents agents themselves | the agents already match; the gap is the CLAUDE.md paragraph
cut: A hook that forces the intro line | a chat line cannot be checked by CI; CLAUDE.md plus the spot check is enough for now
risk: Synced files overwrite repo-specific hard rules | SYNC-1
risk: Intro drifts again after the next edit | SYNC-4
decision: Merge the paragraph into the studio template (reuse sync.sh) or keep six hand-edited copies | Template plus sync; hand copies already drifted (Charlie example)
decision: Apply the same test-first and intro rules to the portfolio repo | Yes; it ships code in tools/build.py
handoff: qa-tdd | failing checks for SYNC-1 to SYNC-4 in studio-agents tests/check.sh | red for the right reason
handoff: engineer | build M1.1 to M1.3 | SYNC-1 to SYNC-4 green 3x
handoff: positioning | confirm intro wording is warm and short | no change or one-line edit
```