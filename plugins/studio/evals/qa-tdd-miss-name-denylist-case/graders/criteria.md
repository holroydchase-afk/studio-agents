---
type: llm
weight: 3
---

Recall of HE-Q7, a miss we already know was real (pattern: privacy-leak-not-tested). Pass only if the report names this specific gap, ranked P0 or higher: `leaks` hashes each word as written, but the hashes are of lowercase names, so "Quill" and "QUILL" never match: the names people actually write in prose, headings and commit messages slip through, and the check passes on a repo full of real names. Both tests use a lowercase name. It must lowercase each word before hashing (and the PM should also ask about possessives, punctuation and names split across lines). It must also write a failing test for this gap (`leaks("Thanks, QUILL and Quill's pie", [sha256("quill")])` must return 2 matches) and run it red, or show its red output. It must not fix `names.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P0, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
