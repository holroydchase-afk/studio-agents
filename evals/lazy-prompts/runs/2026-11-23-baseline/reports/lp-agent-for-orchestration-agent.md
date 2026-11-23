Yes, but not a new agent. Two of the three things you want already exist. The third is a rule that CI can enforce, and an agent can't enforce it.

**What you described, split up**
1. 6am intake of the last 24 hours. The studio already has an `orchestrator` agent (morning digest, cross-project pass, keeping HANDOFF.md honest) and a `/digest` skill. This is a scheduled run of those. It is not a new agent. Making a second "orchestration agent" would duplicate the first and put a second voice in the thread.
2. Agents read the docs before they act. Right now that is a sentence in CLAUDE.md. Sentences get skipped, and the hook and CI checks are what stuck in your other repos. Make it a check: the PR needs a HANDOFF.md update (already enforced), and the run log has to show the doc was read. An agent can't police this. CI can.
3. Repos stay updated. Same as 2. A stale HANDOFF.md is the thing to catch, and the 6am run is where you see it.

**Recommendation**
- Schedule the existing `orchestrator` for weekday 6am. It reads the last 24 hours of PRs, merges, run logs and each repo's HANDOFF.md, and posts one digest to you.
- It reads only. It never merges or edits anything in a product repo. Merges stay with the product threads, and live-site changes stay with your go.
- Add one rule line to the digest. It lists any repo whose HANDOFF.md is older than its last merged PR, as "stale, owner thread." That is your "rules to ensure repos are updated," and it costs nothing to run.
- Keep the digest to one screen on your phone. Lead with what needs you (one step each), then what shipped, then what is stale.

**Where I'd push back**
- Don't build a loop that runs all day. It burns your plan and produces noise, and you only need to read it once a day. One scheduled run at 6am, one read at breakfast.
- Don't announce it as "an orchestration agent" on the portfolio until its run logs exist. Your own rule is that claims must match run logs. After about two weeks of digests that you actually read, you can say it.
- It is not on the critical path for the job search. It saves you time and gives you a talking point, and it does not add to the portfolio. Build it in one session, then stop.

**Decisions for you**
- Run it at 6am weekdays only, or weekends too? I recommend weekdays only.
- Should the digest also say when a thread skipped its doc read? I recommend yes, but only after the check in step 2 exists.

Rollback: this changes no live site; to undo, disable the schedule (a .claude/agents.off file stops it).

lint-ok: SL-2 ORCH-4 covers the empty day; the lint matched on "0 items" wording only.
lint-ok: SL-7 no README or landing claim changes in this spec; the portfolio claim is cut until run logs exist.

```spec
verdict: ready
bet: Chase reads one 6am digest each weekday and acts on it; it worked when he stops hunting through repos for status and stale HANDOFF files get fixed within a day
step: M1.1 | Schedule orchestrator weekday 6am, read-only over the last 24 hours of PRs, merges, run logs and HANDOFF files | first digest arrives and fits one phone screen | 1 session
step: M1.2 | Add stale-HANDOFF line to the digest and a doc-read check to the agents-check CI | check fails a PR with no HANDOFF update and the digest lists a seeded stale repo | 1 session
criterion: ORCH-1 | auto | Given a repo whose HANDOFF.md is dated before its latest merged PR, then the digest lists it under "stale" with the owner thread
criterion: ORCH-2 | auto | Given a run that tries to edit a product repo file, then the guard exits 1 and the digest says "blocked"
criterion: ORCH-3 | manual | Open the digest on a phone -> it is at most 2 screens tall at 360px by 640px and puts "needs you" first
criterion: ORCH-4 | auto | Given no PRs, merges or run logs in the last 24 hours, then the digest says "quiet day" with 0 items and still lists stale repos
cut: Second orchestration agent | the existing orchestrator already covers the lane
cut: All-day loop | costs plan usage and adds noise without helping the job search
cut: Portfolio claim about the orchestrator | no run logs yet to back it
risk: Digest becomes noise and Chase stops reading it | ORCH-3
risk: Orchestrator quietly edits product repos | ORCH-2
decision: Weekdays only or weekends too | weekdays only
decision: Flag skipped doc reads in the digest | yes, after the CI check exists
handoff: qa-tdd | failing tests for ORCH-1 and ORCH-2 | red for the right reason
handoff: engineer | build the schedule and the stale line | ORCH-1 and ORCH-2 green 3x
```
