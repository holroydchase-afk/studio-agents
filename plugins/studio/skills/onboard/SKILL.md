---
name: onboard
description: Bring a project into Chase's studio per pm-tools docs/ONBOARDING.md: check the repo, set up what's missing in one PR, schedule shifts, start the story log, and hand Chase the project-instructions paste. Use when Chase says "onboard" or runs /onboard (add "refresh" for an existing project).
---

# Onboard

You are this project's staff PM, bringing it into Chase's studio. The source of truth is `docs/ONBOARDING.md` in holroydchase-afk/pm-tools (public). This skill runs it. It is safe to run again: check first, then do only what's missing.

Mode: **new** (default) for a project with no studio setup yet, **refresh** when Chase says "refresh" or the repo already has `HANDOFF.md` and `.claude/agents/`.

Act now. Don't ask questions; pick sensible defaults and log them under "Decisions to review" in HANDOFF.md.

## 1. Read (quietly)
- Attach holroydchase-afk/pm-tools and holroydchase-afk/studio-agents read-only to the session (both public), or clone them. If neither works, say so in your first line and read them through any GitHub tool you have.
- pm-tools `docs/ONBOARDING.md` (all of it), `STUDIO-STATUS.md`, `STACK.md`; studio-agents `README.md` ("When to use which agent") and `docs/planning-ids.md`.
- This project: its name, attached repo(s), project memory, project instructions if you can see them, and the chat so far (what the product is and why Chase started it).

## 2. Check (one line each: done, missing or n/a)
Repo attached; `CLAUDE.md` with hard rules and the **Studio agents** section; `HANDOFF.md` with "Portfolio / public presence"; `PLAN.md` with planning IDs and a product code in planning-ids.md; `.claude/agents/` (studio agents, current with studio-agents main); `.claude/settings.json` HANDOFF hook; `handoff-check.yml`; `ci.yml` on PRs; `pages.yml` (web apps with a public demo); `dependabot.yml`; README with CI badge; the repo listed in STUDIO-STATUS; night, morning and afternoon shifts scheduled; the "Atlas Story: <project>" artifact; project instructions containing STUDIO RULES, STUDIO KIT and AGENTS BY DEFAULT.

No repo attached: give Chase one copy box with the repo name (public, MIT, no README), the link https://github.com/new and the click path to attach it in this project's settings. Meanwhile do steps 3 and 5 in project files, and push once the repo exists.

## 3. Scope (new mode, or when PLAN.md is missing)
- **staff-pm** writes `PLAN.md`: M1 = recruiter-demoable v1 (ONBOARDING section 5), tasks M1.1 onward, each with done-criteria. Use the product's code from planning-ids.md; if it has none, pick a 2-4 letter code and send it in the INTAKE (step 6).
- **staff-pm** drafts the CLAUDE.md hard rules from pm-tools `templates/CLAUDE.md`; **privacy-security** reviews them for this product's risks (personal data, money, location, a public repo).

## 4. Setup PR
One branch and one PR: `M0.1: studio setup` (new) or `studio refresh` (refresh). Everything missing from step 2 that lives in the repo, following ONBOARDING section 3:
- From a studio-agents clone: `scripts/sync.sh <repo>` (skip orchestrator and focus-coach) and `scripts/install-rules.sh <repo>`.
- Paste studio-agents `templates/CLAUDE-agents.md` into CLAUDE.md.
- `HANDOFF.md` from pm-tools `templates/HANDOFF.md`, plus "Portfolio / public presence" with a link to STUDIO-STATUS.
- CI, Pages, dependabot and README per STACK.md. Private repo: skip Pages and record why in HANDOFF.md.
- Run the repo's checks; CI green before you call it done. Never merge, deploy or publish. The PR ends with an `Agents:` line.

## 5. Shifts and story
- Shifts per ONBOARDING section 6: night 2:15am, morning 7:20am, afternoon 12:20pm America/New_York, in the thread that owns the build. Keep any that already exist and only add the missing ones. Then start M1.1 (new mode) or the HANDOFF.md exact next step (refresh).
- Story: create the private artifact "Atlas Story: <project name>" if missing, with a first entry on why Chase started this product, mined from the chat (ONBOARDING section 7). Refresh: add an entry only if something notable happened.

## 6. INTAKE for Product Studio
One INTAKE block (ONBOARDING section 8) asking Product Studio to add this repo to STUDIO-STATUS (ownership table), Build Slate and the digest, plus the planning code if new. Skip anything STUDIO-STATUS already lists.

## 7. Reply to Chase (one phone screen)
Introduce yourself by role on first contact. Then:
1. The checklist from step 2 as a short done/fixed/left list.
2. PR link, what's scheduled, the story link.
3. **Project instructions** paste, if they are missing or out of date: paste 1 from ONBOARDING "The two pastes", copied verbatim into one fenced block, with the click path (Project settings → Instructions; replace what's there).
4. The INTAKE block in its own fenced block, with "paste into Product Studio".
5. Anything else you need from Chase as one step each, after checking STUDIO-STATUS so you don't re-ask.

## Rules
Studio rules apply: copy boxes for anything Chase pastes, one-step asks with a recommendation, "verified" only for what you ran, never edit repos other projects own (portfolio, pm-tools, studio-agents go through the INTAKE). Use the agents named above, and update HANDOFF.md in the same PR.
