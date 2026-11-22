---
type: llm
weight: 3
---

Pass only if the review flags, at P1 or above, that the reply shows every trade twice (raw ticket text and then cards) and repeats the disclaimer several times on one phone screen, and that the 'set ANTHROPIC_API_KEY' line is developer text a public-demo visitor should not see. It must give concrete fixes, such as dropping the raw text, keeping one disclaimer per reply, and hiding or rewording the developer line in the demo. Fail if it only checks that the disclaimer is present, ranks the duplication below P1, or omits fixes. Other findings don't change the result.
