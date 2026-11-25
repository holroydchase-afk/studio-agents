# Round 2: agent vs plain Claude, fresh public READMEs (2026-11-25)

Method as in evals/stakeholder/README.md. Agent arm = 3 persona calls, merged by the rule 5 (de-duplicate by quote, keep highest severity, no invented facts), capped at 10. Plain arm = one call, capped at 10. One blind Opus grader per pair (grader_model: opus), arm hidden, order shuffled. Agents on Sonnet.

**Result: agent won 2 of 4, plain won 2 of 4.** No lift claim. Chase has not checked any pair, so the answer key is not yet human.

| Artifact | Winner | Grader reason |
|---|---|---|
| energy-scanner | plain | B finds problems that are really in the README: the usage steps sit under the 'Run it locally' heading, 'neutral machine' conflicts with the Always Grey switch, 'photos never leave' sits beside Share/Save, the color scale is split between two places and the 'negotiation' line repeats. Its fixes only move, merge or cut text that is already there, though calling the heading issue P0 is a stretch. A rates nine items P1 and most ask for evidence the README doesn't contain (outcomes, devices, CI runs, test links). Its q2 and q31 items repeat each other, and several quotes, such as q48 and q35, don't show a flaw. |
| crew-clock | agent | B targets the substantive credibility gaps a reader cares about (not-live status, demo-only tamper check, unproven claims about tests and keys, shelved features), while half of A's findings are code-block and alt-text formatting complaints that likely reflect how the text was flattened, not the README itself. B loses points for repeating the demo-only tamper point three times (items 5, 7, 9), a weak quote fit on q14, and fixes that ask the owner to supply new numbers. A's fixes stay tighter to what the artifact shows. |
| role-radar | agent | Both flag the same core unbacked claims (q4 daily use, q88 '110 boards', q87 savings, q162 placement). Beyond those, B adds useful claim-vs-evidence points (q100 reuse vs the unbuilt kit in q189, the q3 headline, linking a real scan run), though its q119 'mock-up' item overclaims (q119 says the real page runs on a fake DB) and its q39 predictive-validity ask goes beyond the artifact. A correctly catches the third-person 'Chase' slip in q164, but three of its ten items (q33, q68, q168 markup) may be artifacts of the line-split extraction rather than real rendering bugs, and its q125 fix is vague. |
| hearth | plain | Both catch the main contradictions: the q3 encryption headline that leaves out server-held keys, and 'Measured, not guessed' against the unmeasured phone speed. B also finds the Umami note that undercuts 'no trackers' and the truncated alt text, and its fixes only reorder, reword or cut what the page already shows. Many of A's fixes need facts or content the artifact doesn't give: a script name, per-agent run logs, before and after timings, a Monday-use line and a readiness bar. B pads a little by counting the measured contradiction twice (items 2 and 3) and with a weak MLS item, but it is still the more usable review. |

Caveats: n=4, one grader per pair, graders note some findings may be artifacts of how markdown was flattened to text, and the agent arm is 3x the calls of plain. Round 1 was plain 3, agent 1.

## Data

```json
{
 "energy-scanner": {
  "winner_arm": "plain",
  "scores": {
   "A": {
    "specific": 3,
    "quote_fit": 2,
    "fix": 2,
    "coverage": 3,
    "honest": 2
   },
   "B": {
    "specific": 4,
    "quote_fit": 4,
    "fix": 4,
    "coverage": 4,
    "honest": 4
   }
  },
  "key": {
   "A": "agent",
   "B": "plain"
  }
 },
 "crew-clock": {
  "winner_arm": "agent",
  "scores": {
   "A": {
    "specific": 4,
    "quote_fit": 3,
    "fix": 4,
    "coverage": 3,
    "honest": 3
   },
   "B": {
    "specific": 4,
    "quote_fit": 4,
    "fix": 3,
    "coverage": 4,
    "honest": 3
   }
  },
  "key": {
   "A": "plain",
   "B": "agent"
  }
 },
 "role-radar": {
  "winner_arm": "agent",
  "scores": {
   "A": {
    "specific": 4,
    "quote_fit": 3,
    "fix": 3,
    "coverage": 3,
    "honest": 3
   },
   "B": {
    "specific": 4,
    "quote_fit": 3,
    "fix": 3,
    "coverage": 4,
    "honest": 3
   }
  },
  "key": {
   "A": "plain",
   "B": "agent"
  }
 },
 "hearth": {
  "winner_arm": "plain",
  "scores": {
   "A": {
    "specific": 4,
    "quote_fit": 3,
    "fix": 2,
    "coverage": 3,
    "honest": 3
   },
   "B": {
    "specific": 4,
    "quote_fit": 4,
    "fix": 4,
    "coverage": 4,
    "honest": 4
   }
  },
  "key": {
   "A": "agent",
   "B": "plain"
  }
 }
}
```
