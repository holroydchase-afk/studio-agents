**Answer:** Build the Studio Console, but generate it from run logs and scores so it cannot claim more than the evidence. Today that is 2 agents with scores (qa-tdd, staff-pm) and 6 shown as "no runs yet". Keep it hidden until you say go. The "8 agents" overclaim that got it hidden last time is blocked by a test, not by care.

**Critical path** (about 4 sessions)
1. M1.1 Open the hidden page, training plan and scores, and list what has evidence (0.5). Those files are not in this repo, so I worked from HANDOFF.md only.
2. M1.2 Data file from run logs and scores only (1).
3. M1.3 Page renders it with a computed count line, still hidden (1).
4. M1.4 Claims register entry per line, plus a "disputed" mark so you can flag a row wrong (0.5).
5. M1.5 ux-reviewer and privacy-security pass (0.5).
6. M1.6 You say go, unhide, check the live page, home card, nav, HANDOFF and register (0.5).

**Not doing:** live polling, cost and token charts, pages for the 6 agents with no runs, agent bios.

**Biggest risk:** the page drifts back into overclaiming as agents are added. CON-8 fails the build if a line has no register entry and evidence link.

**Decisions for you:** unhide after M1.5 or wait for more agents to have logs (keep hidden); show the plain-arm score beside the with-agent one (yes).

Spec: docs/product/SPEC-STUDIO-CONSOLE.md. Run log: docs/runs/2026-11-22-staff-pm.md. check-spec, spec-lint, check-agent-run and the cost guard all pass; cost shows 0 because the harness showed no count (escalated: yes).

```spec
verdict: needs-decision
bet: A recruiter reading the Console trusts the studio because every line links to a run log or score; it worked when Chase can unhide it and no line is something he would have to retract
step: M1.1 | Open the hidden page, training plan and scores; list each Missing capability and each agent with real evidence | list saved in the spec, matches HANDOFF (2 agents) | 0.5 session
step: M1.2 | Data file built from run logs and scores only: one row per agent, state, arm, n, limits, evidence link | CON-1 to CON-4 green | 1 session
step: M1.3 | Page renders the rows with a computed count line, still hidden | CON-5 to CON-7 green, hidden flag on | 1 session
step: M1.4 | Claims register entries for each line, plus dispute mark | CON-8 and CON-9 green | 0.5 session
step: M1.5 | ux-reviewer and privacy-security pass on the hidden build | no P0 or P1 | 0.5 session
step: M1.6 | Chase says go; unhide; check live page, home card, nav, HANDOFF, register | CON-10 manual pass after the switch | 0.5 session
criterion: CON-1 | auto | Given run logs for qa-tdd and staff-pm only, then the data has 2 evidenced rows and 6 "no runs yet" rows
criterion: CON-2 | auto | Given an agent with no run log, when the page is built, then its state is "no runs yet" and it shows 0 scores and no capability text
criterion: CON-3 | auto | Given a score of 3 of 5 cases with agent and 2 of 5 plain, then the row shows "3/5 with agent, 2/5 plain, n=5" and a limits line
criterion: CON-4 | auto | Given a capability marked Missing in the training plan, then 0 rows or sentences name it as a capability
criterion: CON-5 | auto | Given 2 evidenced agents, then the count line reads "2 agents with run logs" and the string "8 agents" appears nowhere
criterion: CON-6 | auto | Given a run log file that is malformed or empty, then that agent shows "log unreadable", the build exits 0 and other rows are unchanged
criterion: CON-7 | auto | Given the hidden flag on, then 0 links to it exist in the nav, sitemap or home page and the output has the tag "noindex"
criterion: CON-8 | auto | Given any evidenced line, then it has a claims register entry id and an evidence link, and the build fails with 0 entries missing allowed
criterion: CON-9 | auto | Given a row marked wrong with the reason "stale score", then it shows "disputed" and the score is hidden; marking it twice still shows one dispute
criterion: CON-10 | manual | After unhide, open the live page on a small phone -> the count line reads "2 agents with run logs" and every row opens its evidence
criterion: CON-12 | manual | Open the page at 360px by 640px -> it is at most 3 screens tall with 2 agents and 6 no-runs rows
criterion: CON-11 | auto | Given a pinned clock of 2026-11-22, then each row shows "last run" as that run's date and a run older than 30 days shows "stale"
cut: Live status polling | no real runs to poll; a static build proves the bet
cut: Cost and token charts | not a claim any evidence supports yet
cut: Pages for the 6 agents with no runs | would repeat the past overclaim
cut: Agent bios and role copy | positioning later, only after scores exist
risk: The page drifts back into overclaiming as agents are added | CON-8
risk: Scores come from a small sample and read as proof | CON-3
risk: Unhide breaks a public surface nobody rechecked | CON-10
decision: Unhide the Console after M1.5, or keep it hidden until more agents have run logs | Keep hidden; unhide only when you say go, after M1.5
decision: Show the plain-arm score beside the with-agent score | Yes, it is what the register requires
handoff: qa-tdd | failing tests for CON-1 to CON-9 and CON-11 (CON-12 manual) | red for the right reason
handoff: engineer | build M1.2 and M1.3 | CON-1 to CON-9 green 3x
handoff: ux-reviewer | review hidden build | no P0 or P1
handoff: privacy-security | review data file and page | no P0 or P1
handoff: positioning | wording of lines after scores exist | every line in the claims register
```
