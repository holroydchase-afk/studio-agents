**Decision needed before I add the license: whose name goes on the copyright line?**

The repo only gives me the GitHub handle, and the handle is not your name. I won't put the handle or a guessed name in a legal notice. The full name is on your portfolio site, but I can't confirm it from this repo. So the license waits on one word from you.

Recommendation: MIT, "Copyright (c) 2026 <your full name as on the portfolio>". Reply "yes" to use the name on the portfolio, or send a different name. Once confirmed, it's a 0.4 session job: LICENSE file, README note, tests.

**Critical path**
1. M1.1: you confirm the name and license (done when answered, 0.1 session).
2. M1.2: add LICENSE with the confirmed name and 2026 (done when GitHub detects it, 0.2 session).
3. M1.3: one-line README license note (done when README names the license, 0.1 session).

**Not doing:** dual licensing or a docs license (not needed to let people reuse the code); a CLA (no outside contributors).

**Biggest risk:** a wrong or handle-only copyright holder that gets copied into forks. Handled by LIC-2.

**Handoffs:** qa-tdd writes failing tests LIC-1 to LIC-3; engineer builds after the name is confirmed.

lint-ok: SL-7 the README line only names the license; no command or version claim to check
lint-ok: SL-2 no counts, totals or lists; the only input is a single text file
lint-ok: SL-6 a license file has no sign-in or owner-only behavior; the repo is public

```spec
verdict: needs-decision
bet: Visitors and employers can reuse the code legally; it worked when the repo shows a license that GitHub detects and the copyright line names the owner's real name
step: M1.1 | Chase confirms the legal name for the copyright line and the license | decision answered | 0.1 session
step: M1.2 | Add LICENSE file with the confirmed name and year 2026 | GitHub detects the license | 0.2 session
step: M1.3 | Add a one-line license note to the README | README names the license | 0.1 session
criterion: LIC-1 | auto | Given the repo root, when LICENSE is read, then its first non-blank line is "MIT License" and the copyright line is "Copyright (c) 2026 <confirmed name>"
criterion: LIC-2 | auto | Given the copyright line, when it is compared to the GitHub login handle, then the match count is 0 and the name has at least 2 words
criterion: LIC-3 | auto | Given the repo files, when searched for license text, then exactly 1 LICENSE file exists
criterion: LIC-4 | manual | Open the repo page on GitHub -> the sidebar shows "MIT license"
cut: Dual licensing or a separate docs license | not needed to let people reuse the code
cut: Contributor agreement or CLA | no outside contributors yet
risk: Copyright line carries the handle or a guessed name, which is wrong and hard to undo once copied | LIC-2
decision: What exact name goes on the copyright line? | Use the full name shown on the portfolio site, confirmed by Chase in one word
decision: Which license? | MIT, the simplest permissive one
handoff: qa-tdd | failing tests for LIC-1, LIC-2, LIC-3 | red for the right reason
handoff: engineer | add LICENSE and README note once the name is confirmed | LIC-1 to LIC-3 green 3x
```
