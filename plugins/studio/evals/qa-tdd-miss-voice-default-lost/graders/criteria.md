---
type: llm
weight: 3
---

Recall of CO-Q2, a miss we already know was real (pattern: rename-and-coverage-gaps). Pass only if the report names this specific gap, ranked P2 or higher: When no voice matches the persona, `pickVoice` returns the first voice in the list instead of the one the device marks as default, so a persona with no gender set gets whichever voice happens to be listed first (a female voice for a male character in the real case). The tests only cover personas that have a matching voice. It must also write a failing test for this gap (`pickVoice` for a persona with no gender, or a gender no voice has, must return the voice marked `default: true`) and run it red, or show its red output. It must not fix `voice.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P2, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
