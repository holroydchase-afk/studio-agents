---
type: llm
weight: 3
---

Pass only if the review flags, at P1 or P0, the error message "That text had no Claude Code usage in them.": it gives no next step (where the logs live, what a usage line looks like, or a sample to try), it is ungrammatical ("text ... them"), and/or the same message is shown when the box is simply empty, where it reads as blaming the person. Naming the missing next step, or the empty-paste case, is the core. It must give concrete replacement copy, e.g. separate messages for an empty box ("Paste a few lines from ~/.claude/projects/... first") and for no usage found, with where to find the logs or a "Try a sample" button. Fail if the error copy is not flagged, ranked P2, or flagged without replacement words. Other findings don't change the result.
