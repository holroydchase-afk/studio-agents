# First run, 2026-11-24

**Result: plain Claude won 3 of 4, the persona agent won 1 of 4.** Four artifacts is far too few to say more, there was one grader per pair, and Chase has not checked any pair. Do not read this as the agent being worse or better in general.

| Artifact | Winner | One-line reason from the grader |
|---|---|---|
| Portfolio home page | plain | agent's points were sharper but repeated, and its fixes invented facts |
| ccwatts README | agent | sharper unique points, but plain's findings were real; the agent's P0 treated quote splitting as a rendering bug |
| persona-twins README | plain | concrete reader problems; the agent leaned on heavy asks |
| pm-tools README | plain | ten distinct lines with usable fixes; the agent repeated quotes and asked for placeholder metrics |

All 40 findings passed the quote-id check (every id is in the index); `check-stakeholder` does not check that a quote shows the problem.

## What went wrong for the agent arm (to fix, not to explain away)
1. The three personas repeat each other: the same quote (q43, q4, q5, q20 and others) came up two or three times in the merged 10. The merge has no de-duplication, and the agent file does not ask for it.
2. Fixes state facts that are not in the quote index (for example calling a product built, or giving a date or numbers). A fix must not add facts the owner did not give.
3. Findings treat the intake's one-quote-per-sentence splitting (line breaks, split table rows) as rendering bugs in the README. That is an intake defect, not the agent's.
4. The arms were not equal: the agent arm is a merge of 30 findings cut to 10 by round-robin.

## What was not tested
Round 2, `check-stakeholder --prev`, the verdict, the agreement table, the other persona sets, and any real reader. Arms used the same model for the reviewers (the default) and Opus for the grader.

## Next
Fix 1 to 3 test-first, then rerun on fresh artifacts and have Chase mark a few pairs.

## Data

```json
{
 "date": "2026-11-24",
 "n": 4,
 "plain_wins": 3,
 "agent_wins": 1,
 "ties": 0,
 "rows": [
  {
   "artifact": "home",
   "winner": "plain",
   "scores": {
    "plain": {
     "specific": 3,
     "quote_fit": 3,
     "fix": 3,
     "coverage": 4,
     "honest": 3
    },
    "agent": {
     "specific": 4,
     "quote_fit": 4,
     "fix": 3,
     "coverage": 2,
     "honest": 2
    }
   },
   "reason": "B raises sharper reader-level points (greeting as H1, unexplained metric methods, vague agents), but it repeats q43 and q30 twice each and its fixes invent facts: it calls Crew Clock built, says none of the products has real users, gives a Patter end date, and makes up measurement numbers. A has weaker quote fits (q54, q36) and one misread count, but it covers ten distinct issues across the page, including the filter states, the Coming soon tiles and jargon, with fewer invented claims."
  },
  {
   "artifact": "ccwatts",
   "winner": "agent",
   "scores": {
    "agent": {
     "specific": 4,
     "quote_fit": 4,
     "fix": 4,
     "coverage": 2,
     "honest": 4
    },
    "plain": {
     "specific": 4,
     "quote_fit": 3,
     "fix": 4,
     "coverage": 4,
     "honest": 2
    }
   },
   "reason": "B has sharper unique points (Try it buried, possible circular tuning, unsourced 90% cache-read claim), but its P0 and two other findings treat line breaks from the sentence-per-quote format as real README rendering bugs, so they are likely invented and would waste the owner's time. A wastes slots by repeating q43 three times and q11 twice, but its findings are real and its fixes are usable, including the strongest fix for the Stop hook (move it to settings.local.json)."
  },
  {
   "artifact": "persona-twins",
   "winner": "plain",
   "scores": {
    "plain": {
     "specific": 4,
     "quote_fit": 4,
     "fix": 4,
     "coverage": 4,
     "honest": 4
    },
    "agent": {
     "specific": 3,
     "quote_fit": 3,
     "fix": 3,
     "coverage": 2,
     "honest": 3
    }
   },
   "reason": "A flags concrete problems a reader would actually hit, such as the dangling 'See the table below', the 'no API key' claim that clashes with the CLI section, the compressed custom-persona steps and the unexplained tags, each with a small usable fix. B uses q4, q26 and q65 twice each with overlapping 'add a worked example or proof' fixes, cites quotes like q62 that do not show a problem, and leans on heavy asks (CI checks, recordings, real-user comparisons) rather than problems in the text."
  },
  {
   "artifact": "pm-tools",
   "winner": "plain",
   "scores": {
    "plain": {
     "specific": 4,
     "quote_fit": 4,
     "fix": 4,
     "coverage": 5,
     "honest": 4
    },
    "agent": {
     "specific": 3,
     "quote_fit": 4,
     "fix": 2,
     "coverage": 2,
     "honest": 2
    }
   },
   "reason": "A covers ten distinct lines with concrete, directly usable fixes, including real reader traps like 'No dependencies' contradicting the npx/npm steps, the undefined 'Claude artifact', and the table rows that look split (though that may come from how the quotes were extracted). B repeats q4, q5 and q20 twice each, and most of its fixes ask for placeholder metrics or invented specifics like 'nine Claude Code subagent prompts' that the README does not support."
  }
 ],
 "grader_model": "opus",
 "arm_model": "default (sonnet)",
 "answer_key": "not yet checked by Chase"
}
```
