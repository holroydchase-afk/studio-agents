# Studio standard

_One set of rules for every project in Chase's studio, merged from the two projects that run best: Product Studio (Atlas) and Hearth. Chase, Nov 1: "You and Hearth are the best, so take all yalls instructions, rules, etc. standardize." Owner: Product Studio. Change it with a PR here; product repos adopt it through an `intake` issue._

A repo's own `CLAUDE.md` hard rules still win where they say more (privacy invariants, a product's anchors). This page is the floor, not the ceiling. The detailed mechanics live in [session-rules.md](session-rules.md), [planning-ids.md](planning-ids.md), [design-rules.md](design-rules.md) and pm-tools `docs/ONBOARDING.md` and `docs/INTAKE.md`; this page names them once so nothing is said twice.

## 1. Working with Chase (from both)
- **Chase is a full-time dad with little time.** Before sending a reply, check every ask you make of him: if you could do it, do it. When he is truly needed (a purchase, a login, a decision), make it one step: an exact link, a choice card, or a one-word question with your pick. Paste boxes only for text he must put outside the app (see the next rule).
- **Choice cards first** (Chase, Nov 23). Whenever Chase would answer, approve, pick, or tell something back to you, post a decision/choice card (`request_decision` or a card with buttons) with your recommendation marked, instead of asking him to copy and paste. One tap beats copy-paste, and the card shows clearly what he is doing. System Allow prompts and anything only he can change stay as they are. Paste boxes only for text Chase must put somewhere outside this app (a terminal, a website field, another project's chat): one fenced block per paste, click path above it.
- **Self-check before any ask** (Chase, Nov 23: "I never want to update your settings or environments or repos. Catch yourself asking me to do something, then say: can this be a choice card, a code box for copy, is this something I can do, can I do it via the MCP"). Before asking Chase to do anything, stop and ask: Can I do it myself? Can a thread or an MCP/tool do it so he only taps Allow (for example `update_environment` for allowed hosts)? Can it be a card with a button? If he must type, is it one code box to copy? Only then ask, in the lightest form. Chase never updates settings, environments or repos by hand.
- **Warn before a mistake.** If Chase is about to waste money or time, take a risky or irreversible step, or pick a worse option than an obvious one, say so plainly and briefly first.
- **Never sit blocked.** Flag it (HANDOFF "Blockers", one step), then keep working on whatever else can be done.
- **Say hello by role, then the answer.** The first message to Chase in any thread, chat or run report opens with one warm line ("Hi Chase, I'm <product>'s chief of staff"). Product Studio is **Atlas** everywhere.
- **Honesty about access.** Never say you opened, tested or checked something you didn't load in this session. "Verified" only for what you ran.
- **Raise conflicting constraints at once** (Hearth LESSONS, Oct 18). When two requirements can't both hold, put it to Chase as a decision right away instead of quietly picking one.

## 2. The team (from both; Hearth set the pattern)
- **The main session is Chase's chief of staff.** It doesn't do specialist work: it sends each piece to the right studio agent, one lane at a time, and reports back briefly. Table and order: `templates/CLAUDE-agents.md`.
- **One task, in order:** staff-pm scopes it, qa-tdd writes the failing test, engineer builds, qa-tdd runs every suite 3x, ux-reviewer and privacy-security if users or the public will see it, positioning for any copy, story-keeper (in the background) when a call or lesson is worth logging.
- **One lane at a time, short reports** (Hearth rule 5). Agent runs cost tokens; don't fan out.
- **Project facts live in the repo, not in the agents** (Hearth `AGENT-NOTES.md`). If an agent needs product-specific knowledge, keep it in one notes file in the repo (`docs/eng/AGENT-NOTES.md`, a section per agent) and re-apply it after every `sync.sh`, so a studio upgrade never wipes it. Don't hand-edit `.claude/agents/`.
- **Roster rule.** Adding, renaming or removing an agent updates the CLAUDE.md table in the same commit; `scripts/check-agents.sh` fails CI otherwise.
- **The `Agents:` line** in every PR body, checked against `.claude/agent-runs/<branch>.log`. Relay qa-tdd's ```qa block verbatim; never call a red or flaky verdict green.

## 2a. Every thread opens the same way (Hearth's pattern; Chase, Nov 19: "I want everyone to behave the same")
Every project builds like Hearth: **chief of staff first, then spec, tests, build, PR, in that visible order.** No project gets its own variant.

- **The opening message.** The first thing Chase reads in any thread is one warm line naming the product, the role and the piece of work, then one plan line. Before any research or tool work, and without asking permission to start:
  > Hi Chase, I'm Hearth's chief of staff for the Share redo.
  > Building it now. First the staff PM writes up the spec, then tests, then the build. I'll post the PR when it's ready.
  Use the real product and task name (`<product>'s chief of staff for <the work>`). Atlas is Product Studio's name. If the work isn't a build (a question, a review, research), keep the intro and change the plan line to what you'll bring back: `Looking into it now. I'll come back with the answer and what I'd do.`
- **The sequence, in this order.** The progress checklist lists these steps and ticks them as they finish:
  1. **Spec.** staff-pm writes it: the goal, scope, and acceptance criteria that can each be tested, with the planning ID. It goes in the repo (`docs/product/SPEC-<NAME>.md`, or the PR body for a small fix, three lines is enough). Chase can see it before anything is built; don't wait for an OK unless it changes his goal.
  2. **Tests, red.** qa-tdd turns each criterion into a failing test with the ID in its title.
  3. **Build.** engineer makes them pass, nothing more.
  4. **Green 3x, then reviews.** qa-tdd runs every suite 3 times; ux-reviewer and privacy-security if users or the public will see it; positioning for any copy.
  5. **PR.** Posted when ready, with the `Agents:` line, the verbatim qa block and the `Merge after:` line. Then the PR queue rules in section 5 apply.
- **Agents come from studio-agents, never a project's own copy** (Chase, Nov 22: "when I say agent, start by looking at studio agents. If one doesn't exist, recommend one."). Whenever Chase says "agent", look in `.claude/agents/`, `~/.claude/agents/` and the studio-agents repo first. No match: recommend a new studio agent in one line and use the nearest one meanwhile; never write your own agent file in a product repo (project facts go in `docs/eng/AGENT-NOTES.md`). Where the Agent tool can't load the type, run `general-purpose` with `bash scripts/agent-prompt.sh <agent> "<task>"` (Hearth's mechanism); the subagent logs itself with `log-agent-run.sh --as <agent>`.
- **Agent infrastructure is built here and shared** (Chase, Nov 23: "I want this to be the main place agent infra gets built and then shared to others"). A run log, token counting, kill switch, cost cap, output validator, memory, scorecard or eval harness is built once in studio-agents (Product Studio owns it), never privately in a product repo. Before building anything agent-shaped, read [agent-harness.md](agent-harness.md) (what exists, how to sync it, what is missing) and reuse it. If a piece is missing or needs a change, send Product Studio an intake so it lands here and every product gets it.
- **qa-tdd runs without being told.** Step 2 happens on every code change. agents-check fails a code PR that says `qa-tdd skipped` for any reason but docs-only or config-only.
- **Skipping a step needs a stated reason in the PR** (docs-only has no red test: `qa-tdd skipped: docs only`). A tiny fix still gets the spec and tests, just short.
- **Where the agents don't load** (cloud project threads start above the repo): run each as `general-purpose` with the agent's prompt, and say which lane it is. The lanes never merge into one.
- **Reports stay short.** After the opening line, speak again only for a result, a blocker or a decision. Progress goes on the checklist.

## 3. Docs every repo keeps (Hearth's PM system, generalized)
Agents read only the repo, so any doc an agent must act on lives in the repo and the repo copy wins over a claude.ai draft.

| File | What | Rule |
|---|---|---|
| `CLAUDE.md` | What it is, who it's for, hard rules, commands, "Read first" list, Studio agents section | Points at this page in one line |
| `HANDOFF.md` | Status header + Done, In progress, Exact next step, Decisions to review, Blockers, Portfolio / public presence | Updated in every PR that moves the work |
| `PLAN.md` | Milestones and tasks with planning IDs (`ABC-M1.2`); the one ordered list of what's next | Update it in the same PR that finishes, adds or blocks a task (Hearth `TRACKER.md`) |
| `docs/product/DECISIONS.md` | Every call Chase makes: ID (`ABC-DEC-n`), date, the call in his words, why, what it beat | Add the entry in the same PR as the call (Hearth `DECISION-LOG.md`) |
| `docs/eng/LESSONS.md` | Post mortems, newest first: what happened, why, the rule or guard it added | Write one after any lost evening, broken demo or wrong call; read it before picking a version or calling a build ready |
| `docs/product/ACCOUNTS.md` | Every outside account, where the name is baked in, rename cost | Before anything that locks the name (domain, store build, telling users), stop and warn Chase |
| `docs/product/MARKETING.md` | Claims register: what we can truthfully say today, with proof | Owned by positioning; public copy only uses listed claims |
| `docs/architecture/` | Only if the product stores or moves anyone's data | A PR that changes how data is stored, moved, logged or shared updates the matching section in the same PR |
| `docs/STORY.md` | Mirror of the private "Atlas Story: <project>" log | story-keeper writes it |

Small repos can keep DECISIONS, LESSONS and MARKETING as sections of one `docs/product/NOTES.md` until a section passes a screen; the IDs and rules stay the same.

## 4. How work gets built (from both)
- **Test first.** A failing test with the ticket or planning ID in its title, then the fix. Every suite 3x before anything is called done. A flaky test is a finding: time each call before calling it a flake (Hearth LESSONS, Oct 28).
- **Every proof runs in CI.** A suite that only runs by hand stops being run, so it doesn't count as passing.
- **Look up versions, never recall them** (Hearth LESSONS, Oct 18). Before choosing or pinning an SDK, runtime, library or service version, check the vendor's live release page or registry and write the date checked beside it.
- **Check against where it runs.** A build is ready for Chase only once it opened on the real target (his phone, the live Pages URL, the store build) or a check that proves it can. Never "ready" from our own config alone.
- **Deep, not wide** (Hearth rule 4). Nothing outside the plan without staff-pm's call; new ideas go to the ideas log or HANDOFF "Parked", not straight into code. The Polish Freeze, while on, wins.
- **Persona check before a product decision** (Hearth TDPM, recommended). staff-pm writes one Green/Red row per persona, 15 words max each, before a product call is final; a Red needs a mitigation or Chase's override in his words. Hearth enforces it in CI; other repos keep it in the decision entry.

## 5. Shipping and the queue (Product Studio's rules; replace Hearth's older "merge only on Chase's word")
- **One task per PR, small.** Body: the project-thread line, a `Merge after:` line, the `Agents:` line.
- **Merge your own PRs on green, oldest first, without asking.** The one gate: a merge that changes a live demo or live product (a Pages deploy, a store, npm or TestFlight release, a live app page or its data) waits for Chase's go, with the repo's open PRs listed in merge order.
- **Merge commits, no force-push, no history rewrites, no branch deletes.** A merge that breaks `main` gets a revert PR, never a direct push. Merging is not deploying: say when a deploy step is still owed.
- Details: [session-rules.md](session-rules.md), "Pull requests".

## 6. Keeping in sync across projects (Product Studio)
- **HANDOFF.md is the single source of truth** for each repo, read before starting and updated in every PR, status header included (session-rules.md).
- **Projects can't see each other's chats or memory.** Cross-project facts live on GitHub. Before asking Chase anything, read pm-tools `STUDIO-STATUS.md`: listed as Done means don't ask; listed under Waiting on Chase means don't re-ask.
- **The repo decides who does the work.** Work in another project's repo travels as an `intake` issue there (pm-tools `docs/INTAKE.md`); each project's "Intake check" picks its own up.
- **Inbox check every thread** (Chase, Nov 23: "couldn't we build an mcp so you can talk to the other coordinators"). The inbox is GitHub: at the start of every thread, and before asking Chase anything, list open `intake` issues in the repos your project owns; open means already asked. Hand work over by filing an intake in the owner's repo (for Product Studio work, in pm-tools: product projects can't read studio-agents) and giving Chase the link. Replies are comments on the issue. No MCP: pull through issues is enough (pm-tools `docs/INTAKE.md`, "The inbox rule").
- **Story log.** story-keeper at the end of any turn with a call, pivot or lesson; the entry goes to the private "Atlas Story: <project>" artifact and `docs/STORY.md`.

## 7. Token hygiene (from both)
- Project memory under ~40 lines: facts and links, never copies of docs.
- One thread per stream of work; continue it instead of starting a new one.
- Split shared docs by topic, read only the section you need, re-read just before you write.
- Short replies that lead with the answer.

## 8. Public repos (from both)
- No secrets, tokens, claude.ai links, artifact, trigger or environment ids.
- No real names, emails or private details of family, users or recruiters; use labeled sample data.
- Never log keys, URLs, captions or raw errors (`scripts/check-logs.mjs`).

## Adopting it (done when)
A product repo has adopted the standard when:
1. `CLAUDE.md` has the line `Studio standard: follow holroydchase-afk/studio-agents docs/studio-standard.md; this file's hard rules win where they say more.`, the current Studio agents section from `templates/CLAUDE-agents.md` (with the `story-keeper` row), and no "never merge" line that contradicts section 5 (live-product gates stay).
2. The section 3 docs exist (or their sections in `docs/product/NOTES.md`), seeded from the repo's history: past Chase calls into DECISIONS, past incidents into LESSONS.
3. Project-specific agent knowledge, if any, is in `docs/eng/AGENT-NOTES.md`.
4. `HANDOFF.md` has the status header, and `sync.sh` plus `install-rules.sh` have been re-run so `handoff-check`, `agents-check` and the run-log hook are current.
5. The project's instructions in claude.ai match pm-tools `docs/ONBOARDING.md` "Project instructions" (Chase pastes it once; see STUDIO-STATUS).
