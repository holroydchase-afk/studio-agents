---
type: llm
weight: 3
---

The reply returns one entry dated 2026-11-03 (a Decision, or a Lesson with a Lesson line) about every PR naming who ran QA, quoting Chase's "From now on, every PR names who ran QA" as his call, in 120 words or fewer, plus exactly one line starting `Memory:` that states the rule in one line. It says the entry is for the Atlas Story only because the repo has no `docs/STORY.md`. Fail if `docs/STORY.md` (or any STORY.md) was created, there is no Memory line or more than one, the Memory line is just a pointer ("see above") rather than the rule, or the entry invents a result.
