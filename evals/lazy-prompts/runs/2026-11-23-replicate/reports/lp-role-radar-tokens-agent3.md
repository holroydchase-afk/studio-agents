Hi Chase, I'm your staff PM. Short answer: no, don't hand the job runs to me. Me reading jobs in a chat spends the same plan tokens, plus my context, and you'd have to be there. The fix is to stop sending every posting to the model.

**Goal fit:** this serves "land a senior/staff PM job" and the rule "no paid API, agents run inside plan sessions". Tokens are your scarce budget, and Role Radar eats the same budget as Hearth and the portfolio work.

**Caveat:** I only had your note, not the repo or run logs. I don't know the real per-scan numbers, so the first step is measuring, not guessing.

**Buy, reuse, build or skip:** reuse. Don't build a new scanner or a new agent. Change what the existing weekday scan sends to the model.

**What I recommend (one route):** make the scan a cheap filter first, then spend the model only on survivors.
1. Code, no model: fetch, dedupe against roles already seen, drop on hard criteria from `criteria.yaml` (title, level, location, seniority keywords).
2. Model: score only what's left, one short pass, with a daily cap (say 15 roles), and only fetch the full description when the title passes.
3. Cache by role ID so a posting is never scored twice.

**Rejected:** me running through future jobs by hand each day. It costs the same tokens, adds your time, and doesn't fix the cause.

**Critical path**
1. M1.1, 1 session (agent, one night): measure. Log per scan: roles fetched, roles sent to the model, tokens used. Done when one real weekday scan has those three numbers in HANDOFF.
2. M1.2, 1 session: add the prefilter, dedupe cache and daily cap. Done when a replayed scan sends far fewer roles to the model and the top-scored roles match the old run.
3. M1.3, 0.5 session: re-measure and compare. Done when the before/after numbers are recorded. If the scan is still more than about 10% of your weekly budget, drop to 3 scans a week.

**Not doing:** switching job boards, rewriting the scoring, any metered API, new dashboards. None of them touches the cause.

**Biggest risk:** the prefilter drops a good role. Handled by a "dropped today" list you can skim for 30 seconds, and a way to mark a drop wrong so the rule gets loosened (RR-3).

**Decision for Chase:** OK to cap the model at about 15 roles a day? I recommend yes. Say "yes" and I start M1.1. Nothing is deployed, and the repo is public, so only demo data goes into tests.

lint-ok: SL-3 nothing ships live; the change is scan logic only, and a bad change is undone by reverting the merge commit
lint-ok: SL-6 no sign-in or privacy change; the scan is single-owner and uses demo data in tests

**Handoffs**
- qa-tdd: failing tests for the filter, dedupe and cap, using made-up demo roles only.
- engineer: build M1.2 after the tests are red.
- privacy-security: none needed, no new data or vendors.

```spec
verdict: needs-decision
bet: Chase keeps Role Radar running every weekday without it crowding out other work; it worked when a scan uses a small fraction of the model budget and the top roles still match
step: M1.1 | Measure one real scan: roles fetched, sent to the model, tokens | numbers recorded in HANDOFF | 1 session
step: M1.2 | Add prefilter, dedupe cache and daily cap | RR-1 and RR-2 green | 1 session
step: M1.3 | Re-measure and compare with M1.1 | before and after numbers recorded | 0.5 session
criterion: RR-1 | auto | Given 40 demo roles where 25 fail the hard criteria, then only 15 are sent to the model
criterion: RR-2 | auto | Given a fixed clock of Mon 2026-11-23 and a role ID scored the day before and seen again that day, then the model is called 0 times for it
criterion: RR-4 | auto | Given a fixed clock of Mon 2026-11-23 and an empty list of 0 roles fetched, then 0 roles are sent to the model and the scan ends without error
criterion: RR-3 | auto | Given 1 dropped demo role marked wrong with a reason, then the rule is flagged for review and the role is scored on the next scan (1 flag)
cut: Switching job boards | does not touch the token cost
cut: Rewriting the scoring | not the cause until M1.1 shows it is
risk: Prefilter drops a good role | RR-3
decision: Cap the model at about 15 roles a day | yes
handoff: qa-tdd | failing tests for RR-1, RR-2 and RR-3 with demo data | red for the right reason
handoff: engineer | build M1.2 | RR-1 and RR-2 green 3x
```
