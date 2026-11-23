Hi Chase, I'm your staff PM. Short answer: I'm already an agent, so don't build a second one. What you're describing is the `orchestrator` agent plus a 6am schedule, and both pieces exist or are one step away.

**Goal fit:** serves "optimize Chase's effort" and "resume, never redo". A 6am intake means you spend your one hour deciding, not catching up.

**Buy/reuse/build: reuse.**
- Recommended: `orchestrator` (morning digest, cross-project pass, keeps HANDOFF.md files honest) run on a 6am weekday scheduled run, using the existing `digest` skill for the format. I stay the PM that scopes what the digest surfaces, and I don't merge two agents' jobs into one.
- Rejected: turning me into the 6am agent. My job is scoping and triage; making me do the cross-repo sweep dilutes the lane (you said not to dilute agents).

**On "rules so repos are updated and docs get read":** most of this is already enforced, not a gap.
- A SessionStart hook prints HANDOFF.md, and every CLAUDE.md says read it first.
- The `handoff-check` PR workflow fails a PR that doesn't update HANDOFF.md.
- The one gap I can see: nothing checks that a repo's HANDOFF.md matches what actually merged overnight. That is the orchestrator's "keep HANDOFF honest" job, so it goes in the 6am run as a check, not as a new rule.

**What I don't know:** whether a 6am trigger already exists. Nothing in my context says so. The first step checks it before anything is built.

**Plan (each step about one session):**
1. M1.1 Check for an existing 6am run; if none, create one weekday trigger that runs the orchestrator. Orchestrator owns it. Done when one run produces a digest.
2. M1.2 Digest covers last 24h per repo: merged PRs, open PRs by merge order, HANDOFF drift, blockers needing you as one step each. Done when one real run reads right on your phone.
3. M1.3 Judge it after 5 weekdays: did you act on it without opening the repos? Keep or cut.

**Not doing:** a new agent, new rules or hooks (existing ones cover it), auto-merging from the digest (live-site merges still wait for your go), anything on a metered API (it runs in a Claude session on your plan).

**Biggest risk:** a digest you stop reading. Handled by M1.3's 5-day check and a length cap so it fits one phone screen.

**Decision for you:** approve the 6am weekday time and the digest-only scope. I recommend yes; if I don't hear back I'd start with weekdays only, matching Role Radar's cadence.

Rollback: nothing here is live; to undo, delete the scheduled run.

```spec
verdict: needs-decision
bet: Chase starts each evening hour knowing what merged, what drifted and what needs him; it worked when he acts on the 6am digest without opening repos for five weekdays running
step: M1.1 | Check for an existing 6am run, else create one weekday scheduled run of the orchestrator | one run produces a digest | 0.5 session
step: M1.2 | Digest covers last 24h per repo: merged PRs, open PRs in merge order, HANDOFF drift, blockers as one step each | one real run reads right on a phone | 1 session
step: M1.3 | Review after five weekdays | keep or cut recorded in HANDOFF | 0.5 session
criterion: ORCH-1 | auto | Given a repo whose HANDOFF.md predates its latest merged PR, then the digest lists that repo under "drift" with count 1
criterion: ORCH-2 | auto | Given three open PRs with different ages, then the digest lists them in order 1, 2, 3 by age, oldest first
criterion: ORCH-4 | auto | Given an empty list of merged PRs (zero in 24h), then the digest says "nothing merged" and lists 0 repos under drift
criterion: ORCH-3 | manual | Open the digest on a phone -> it fits 1 screen and each blocker for Chase is "one step"
cut: New agent | orchestrator already covers the lane
cut: New rules or hooks | SessionStart hook and handoff-check already enforce reading and updating HANDOFF
cut: Auto-merge from the digest | live-site merges wait for Chase's go
risk: Chase stops reading the digest | M1.3
decision: 6am weekday run and digest-only scope | yes, weekdays only
handoff: orchestrator | build and run the 6am digest | ORCH-1 and ORCH-2 pass, one real run produced
handoff: qa-tdd | failing tests for ORCH-1 and ORCH-2 | red for the right reason
```
