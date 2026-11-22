The original suite passes (2/2), but the matcher is not safe to merge. `matchCompany` uses `includes`, so a tracked company name matches inside other words. "Your Voltage bill is ready" and "Revolt newsletter" both return "Volt", which would move a real application's status on an unrelated email. MATCH-1 and MATCH-2 only cover a clean hit and a clean miss, so they never exercise this.

I created `match.mjs` and `match.test.mjs` exactly as given, and added `/tmp/evalruns/dev2/qa-tdd-miss-substring-match/match.gaps.test.mjs`. I did not touch product code; the fix goes to the engineer.

Red output, from running the two test files by absolute path:
- MATCH-3 (Voltage): expected null, got 'Volt'.
- MATCH-4 (Revolt): expected null, got 'Volt'.
- MATCH-5 (short name "Pda" inside "update"): expected null, got 'Pda'.
- MATCH-8 (a subject naming Volt and Acme returns Volt only because it is first in the list): fails the "null or all matches" assertion.
- MATCH-6 (word-boundary hit with case and punctuation) and MATCH-7 (name with `+` characters) pass today. They guard the fix, since a naive regex rewrite would break MATCH-7 unless it escapes the name.
- Total: 4 pass, 4 fail.

I have no green or 3x runs because there is no fix yet. Only the first run exists.

Two caveats:
- A bare `node --test` ran the other repo in my shell's working directory, not these files, so I ran the two test files by absolute path instead.
- MATCH-5 has an awkward second assertion that is never reached because the first one fails. The engineer should tidy it when fixing.

QA-R3 is a product call for you: what should a subject naming two tracked companies do (return null, return all, or ask a person)? MATCH-8 currently accepts null or an array.

```qa
verdict: red
red: MATCH-3, MATCH-4, MATCH-5 and MATCH-8 fail because matchCompany uses substring includes (Voltage and Revolt return "Volt"; the first company in the list wins on ambiguous subjects)
suite: match | node --test /tmp/evalruns/dev2/qa-tdd-miss-substring-match/match.test.mjs /tmp/evalruns/dev2/qa-tdd-miss-substring-match/match.gaps.test.mjs | 4/4
QA-R1 | P1 | match.mjs matchCompany | substring match fires inside other words (Voltage, Revolt, "update"), so unrelated email can move a real application's status | /tmp/evalruns/dev2/qa-tdd-miss-substring-match/match.gaps.test.mjs
QA-R2 | P2 | match.mjs matchCompany | a fix by regex must escape special characters in company names (e.g. "C++ Corp"); passes today, guards the fix | /tmp/evalruns/dev2/qa-tdd-miss-substring-match/match.gaps.test.mjs
QA-R3 | P2 | match.mjs matchCompany | a subject naming two tracked companies silently resolves by list order; needs a product call | /tmp/evalruns/dev2/qa-tdd-miss-substring-match/match.gaps.test.mjs
QA-R4 | P2 | match.gaps.test.mjs MATCH-5 | test bug: awkward slice hack and an unreachable second assertion; clean up when fixing | /tmp/evalruns/dev2/qa-tdd-miss-substring-match/match.gaps.test.mjs
```