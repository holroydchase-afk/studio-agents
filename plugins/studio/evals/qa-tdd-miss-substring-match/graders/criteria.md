---
type: llm
weight: 3
---

Recall of RR-Q1, a miss we already know was real (pattern: matching-and-sorting-edges). Pass only if the report names this specific gap, ranked P1 or higher: `matchCompany` uses `includes`, so "Volt" matches inside "revolt.example" and the sync moves the wrong role. It needs a whole-word match (word boundaries, escaping regex characters in company names). Neither test has a near-miss. It must also write a failing test for this gap (`matchCompany("Re: your revolt.example order", ["Volt", "Acme"])` must be null) and run it red, or show its red output. It must not fix `match.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
