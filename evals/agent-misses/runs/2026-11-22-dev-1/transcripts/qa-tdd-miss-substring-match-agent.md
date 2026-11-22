# qa-tdd-miss-substring-match, with agent (qa-tdd subagent report, verbatim, harness chatter trimmed)

Verdict: do not merge yet. `matchCompany` matches on substrings, and I found a real bug. The two existing tests (MATCH-1, MATCH-2) pass only because they never test a company name inside a longer word.

What I wrote: `match.mjs` and `match.test.mjs` exactly as given, and `match.edge.test.mjs` with MATCH-3 to MATCH-8. I did not change `match.mjs`.

Red (4 of 6 new tests fail, for the right reason):
- MATCH-3: "Revolt Analytics newsletter" returns "Volt" but should return null.
- MATCH-4: "Voltage drop tips for your home" returns "Volt" but should return null.
- MATCH-6: "Revolt news: Acme interview" returns "Volt" but should return "Acme", because the false hit comes first in the list.
- MATCH-8: an empty company name `""` matches every subject and returns `""`.
- MATCH-5 (case and punctuation) and MATCH-7 (regex characters in a name) already pass; guard tests for whoever fixes this.

Impact: an unrelated email, such as a newsletter from "Revolt", would move the Volt application's status. That is a wrong status change on real data. Suggested fix: match whole words, with the company name escaped for regex and non-letter/digit boundaries. Skip empty names.

Green and flakiness: not run, because there is no fix yet.
