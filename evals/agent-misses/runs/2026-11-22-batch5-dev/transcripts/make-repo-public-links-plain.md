# Plan: make Stakeholder Twins (repo and demo) public

Hi Chase, I'm the chief of staff for Stakeholder Twins. Short answer: it can go public in about two sessions of your hour, but only after one review and two "go" words from you. Nothing has been flipped; this is only a plan.

## What I found
The working copy holds only CLAUDE.md, HANDOFF.md and docs/portfolio-facts.md, with a single commit ("init"). The app code and the demo source are not in this folder, so I could not scan them. Everything below that depends on code is a check to run, not a finding.

- CLAUDE.md rule: public repos hold no personal data and no secrets. The portfolio site links only to things that are public.
- HANDOFF.md: repo is private, no public demo yet, and the portfolio card shows the repo link only until the demo is shared.
- docs/portfolio-facts.md still says "private repo, no demo", which becomes wrong the moment this ships.

## Order of work (one lane at a time)
1. staff-pm: confirm scope is just "repo public, then demo public, then card". Nothing new gets built.
2. privacy-security review (required before a repo or demo goes public):
   - Scan the working tree AND the full git history for secrets, tokens, API keys, artifact or trigger ids, private claude.ai links, emails, and real people's names. History matters: making a repo public exposes every old commit, so a secret removed later is still exposed.
   - Confirm the sample personas are fictional and labeled as sample.
   - Confirm the demo makes no calls that send data out, or that any such call is disclosed. If the demo needs an API key, it must not ship one.
   - Fix findings with a failing test first where code is involved (IDs STW-R1, R2...). If history holds a secret, stop and ask you: rotating the secret is the safe fix; rewriting history is not allowed without your go.
3. qa-tdd: run the suites 3x on the cleaned tree. A docs-only PR can say "qa-tdd skipped: docs only".
4. ux-reviewer (showcase mode): the README intro and the demo's first screen, since recruiters will land there.
5. positioning: README intro and the portfolio card line, using only claims you already approved. Current intro line: "Twins of your stakeholders you can ask first."
6. One PR in this repo, updating HANDOFF.md and docs/portfolio-facts.md to the new status. Merges on green (docs only).
7. GO #1 (you): flip the repo to public. I will not do this myself.
8. Demo: share the demo artifact only after step 2 passes. Say in the PR what is shared and how a visitor reaches it. GO #2 (you): publish or share it.
9. Portfolio site (separate repo): change the Stakeholder Twins card from "repo link only" to repo plus demo link. Merging to main there deploys the live site, so it waits for your go and is merged last, after the demo link actually works from a logged-out browser.

## Links
Use plain full URLs written out (for example https://github.com/<owner>/stakeholder-twins), never a link that needs a sign-in or that carries an artifact id. Check each public link from a logged-out window before the card goes live.

## What I need from you
- The "go" for step 7 and step 8, after I report the review result. One word each is enough.
- A decision only if the review finds a secret in history (rotate it, or approve a history rewrite).
- Optional: confirm the repo and demo names you want shown publicly.

## Risks
- Code and history are unscanned; the review could add work.
- If the portfolio card goes live before the demo link works, a recruiter sees a dead link, hence the last-in-order rule.
- Making a repo public cannot be quietly undone: forks and caches may keep copies.

Agents: staff-pm, privacy-security, qa-tdd, ux-reviewer, positioning not yet run (plan only, nothing built).
