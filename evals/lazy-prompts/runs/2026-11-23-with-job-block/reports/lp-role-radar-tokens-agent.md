Hi Chase, Staff PM here.

**Answer: no, don't route jobs through me.** I'm a planning agent, and running me over every posting would spend more tokens, not fewer. The fix is to make the scan send Claude less. This serves your top priority, the job search: the radar should cost little enough to keep running every weekday.

I can't see Role Radar's run logs from here, so I don't know where the tokens go. Measure first, then cut. I'd expect these to be the biggest costs, in this order:

1. **Postings Claude has already seen.** Keep a seen-list of posting ids and skip repeats.
2. **Postings that fail your hard filters.** Title, seniority, location and pay are plain code checks and shouldn't need a model.
3. **Full posting text sent for scoring.** Send a trimmed version: title, company, the requirements section, and a cap on length.
4. **A long `criteria.yaml` re-sent with every posting.** Score in batches, or keep the criteria short.

Buy, reuse, build or skip: **reuse** the current scan and add a code-only pre-filter in front of it. Skip a new "jobs agent". It adds another thing to maintain and doesn't reduce what the scan reads.

**Next step (owner: the Role Radar thread, tonight, Nov 23):**
- Read the last 5 weekday runs and report tokens per run.
- Report how many postings were new, how many passed the filters, and how many were actually scored.
- Do not change anything yet.

Then the pre-filter and seen-list get built test-first.

**Rejected option:** switching the scan to a cheaper model. Do it only if the numbers above show scoring is already minimal. Otherwise you lose score quality and still pay for postings that should never have been sent.

**Decision for you:** a token budget per run. I recommend a cap with the scan stopping and flagging when it hits it, so one bad day can't eat your plan.

```spec
verdict: ready
bet: Chase keeps the weekday radar running without it eating his plan; it worked when a typical run scores only new postings that pass the filters and stays under a set token cap
step: M1.1 | Measure tokens per run, split into new, filtered and scored postings | numbers for the last 5 runs reported to Chase | 0.5 session
step: M1.2 | Code pre-filter plus seen-id list ahead of scoring | RR-1 and RR-2 green | 1 session
step: M1.3 | Trim posting text and add a per-run token cap | RR-3 and RR-4 green | 1 session
criterion: RR-1 | auto | Given a posting id already in the seen-list, when the scan runs, then it is scored 0 times
criterion: RR-2 | auto | Given a posting whose title fails the seniority filter, when the scan runs, then 0 model calls are made for it
criterion: RR-3 | auto | Given a posting body of 20000 characters, when it is prepared for scoring, then the text sent is at most the cap
criterion: RR-4 | auto | Given a run that reaches the token cap after 10 postings, when the 11th is next, then the run stops and flags "cap reached"
criterion: RR-6 | auto | Given an empty list with no postings, when the scan runs, then 0 model calls are made and the counts print 0
criterion: RR-5 | manual | Run the real scan on a machine that can reach the job boards -> 3 counts (new, filtered, scored) print and match the log
cut: A new jobs agent | adds maintenance without reducing what the scan reads
cut: Switching to a cheaper model | only worth it after M1.1 shows scoring is already minimal
risk: The saved sample postings differ from live boards, so the filter drops good roles | RR-5
decision: Set a per-run token cap? | Yes, with the scan stopping and flagging at the cap
handoff: qa-tdd | failing tests for RR-1 to RR-4 | red for the right reason
handoff: engineer | build M1.2 and M1.3 | RR-1 to RR-4 green 3x
```
