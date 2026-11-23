Short answer: no, don't use me to run through jobs. Fix Role Radar's token use instead, and keep me for judgment calls.

I haven't seen Role Radar's run logs here, so I can't name the exact leak yet. Judging from how a daily scan like this usually works, the likely cause is that the model reads every listing in full, every weekday, including ones it has already seen.

**Why not me for the job triage**
- I'm a planning agent. Per job I'd cost more than a scoring step, and I'd be doing work a script can do.
- You'd still have no fixed score. A scan only helps if the same job gets the same 0-100 against `criteria.yaml` every time. Prose judgment from me drifts.
- You have no metered API (Claude plan only). Every run draws from the same plan limit as your Hearth and portfolio work. That makes a cheap scan matter more.

**Where the tokens usually go, in order of savings**
1. Re-scoring jobs already seen. Store a job id and a hash of its text. Skip anything unchanged since the last scan. This is typically the biggest cut.
2. Using the model for filters code can do. Title, seniority, location, remote and salary-floor checks can be plain rules. Only jobs that pass go to Claude.
3. Sending whole postings. Trim to title, company, location and the requirements section before scoring.
4. Long context re-read each run. Keep the criteria and instructions short, one file, and no dumping of past results into the prompt.
5. One job per call. Score in batches of 10-20 per call with a fixed output format.

My bet is that 1 and 2 alone cut usage by more than half. These are engineering changes that belong in the Role Radar repo, not here.

**What I'd do**
- Step 1, 0.5 session, in Role Radar: measure first. Log tokens per run and the number of jobs scored vs. skipped. Done when one weekday run shows both numbers. Without this, we're guessing.
- Step 2, 1 session: add the seen-job skip and the rule-based prefilter. Done when a repeat scan of the same listings scores zero jobs and tokens drop against the step 1 number.
- Step 3, 0.5 session: batch scoring. Done when the score for the same job is identical to the one-per-call score on a saved set.
- Where I do help: a weekly 10-minute pass on the top 5 scored jobs, to decide which to apply to and in what order. That's judgment, and it's cheap.

**Not now**
- Rewriting Role Radar on a different stack. The cost is in what gets sent to the model, not the language.
- Any paid API route. It breaks your plan-only rule.
- A separate "job-running agent" in studio-agents. A script plus a short criteria file is cheaper and more consistent.

**Biggest risk:** prefilter rules that drop good roles silently. Handle it by logging every skipped job with its reason, and spot-checking 10 skipped ones after the first week (RR-2 below).

**Decisions for you**
- Start with the measurement step in the Role Radar thread? Yes. Without numbers, we're guessing.
- Should the prefilter be strict (cheaper) or loose (fewer missed roles)? Loose to start: let it pass any job that's close, and tighten after a week of data.

```spec
verdict: needs-decision
bet: Chase keeps Role Radar's weekday scan but at a fraction of the tokens; it worked when a repeat scan scores zero already-seen jobs and the per-run token count falls against the measured baseline
step: M1.1 | Log tokens per run plus jobs scored and skipped | one weekday run shows both numbers | 0.5 session
step: M1.2 | Skip seen jobs by id and text hash, add rule-based prefilter | repeat scan scores zero jobs and tokens fall against baseline | 1 session
step: M1.3 | Batch scoring of 10 to 20 jobs per call with a fixed output format | batch score matches one-per-call score on a saved set | 0.5 session
criterion: RR-1 | auto | Given a job id and text hash already scored, when the scan runs again, then 0 jobs are sent for scoring
criterion: RR-2 | auto | Given a prefilter that skips 3 jobs, when the scan ends, then 3 skipped rows are logged each with a reason
criterion: RR-3 | auto | Given the same saved set of 10 jobs, when scored in a batch of 10 and one at a time, then every score matches
criterion: RR-4 | auto | Given a scan with no listings (empty input), when it runs, then the result is empty, 0 jobs are scored and the run logs 0 tokens
cut: Rewrite on another stack | the cost is in what is sent to the model, not the language
cut: Paid API route | breaks the no-metered-API rule
cut: New job-running agent in studio-agents | a script with a short criteria file is cheaper and consistent
risk: Prefilter silently drops good roles | RR-2
handoff: qa-tdd | failing tests for RR-1 to RR-4 in the Role Radar repo | red for the right reason
handoff: engineer | build M1.1 to M1.3 after the tests exist | RR-1 to RR-4 green 3x
decision: Start with the measurement step in the Role Radar thread | yes, without numbers we are guessing
decision: Prefilter strict or loose | loose first, tighten after a week of skipped-job logs
```
