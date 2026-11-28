# SPEC-EVALPM-CAPTURE: turn every product improvement into an eval case

Chase (Nov 26): he will be improving the products heavily over the next days and wants many evals out of that. This adds a lightweight capture path to EvalPM (`evalpm/`). IDs `EVPM-C<n>`. Lane: logic plus docs, touches nothing live.

## Why

An improvement is the best eval material there is: a real task, a before, an after, and the owner's verdict. Today that evidence is lost the moment the PR merges. If logging one takes under a minute, the suites grow by themselves and every agent change can be re-run against them.

Done when: `capture add` on three improvements and one missed bug, then `capture build`, gives a suite tasks file the existing pipeline accepts (`check` passes), with Chase's verdict as the key and nothing the agent sees leaking the before, the after or the verdict.

## Design (lean: one new file, no new dependencies)

`evalpm/capture.mjs`, dispatched as `evalpm capture <add|list|build|stamp|check>`. Everything it writes lives under `--root` (default the current folder), in `evals/captures/<agent>/`. No model calls.

A capture is one JSON file `evals/captures/<agent>/<id>.json`:

| field | meaning |
|---|---|
| `id` | lowercase letters, digits, dashes |
| `kind` | `improvement` or `bug` |
| `prompt` | what the agent was asked (what the agent will see in the suite) |
| `before`, `after` | improvement only: the earlier and the accepted result, as text or `@file` |
| `verdict` | improvement only: Chase's call, `better`, `worse` or `tie` |
| `missed` | bug only: what the agent missed |
| `note` | optional, one line |
| `split` | `dev` or `heldout`, fixed by the id (first byte of its sha256, divisible by 3 means dev) so it never changes |
| `date` | day it was captured |

`build --agent A` writes `evals/captures/<agent>.tasks.json` for a `cases` suite. Per capture:
- `bug`: rubric `Pass only if the reply raises this problem, which a past review missed: <missed>`.
- `improvement` with `better`: rubric `Pass only if the reply does what the accepted result does: <after>. It fails if it repeats the problem in the earlier result: <before>`.
- `improvement` with `worse` (a regression Chase rejected): rubric `Pass only if the reply avoids what the rejected result does: <after>, and keeps what the earlier result did: <before>`.
- `tie`: no case; counted as skipped.
The task `text` is the prompt only. Chase's verdict is stored in a `capture` field `{ kind, verdict }` for the answer key and is never in `text`.

`stamp --agent A --agent-file F` records the sha256 of the agent file after a run. `check --agent A --agent-file F` exits 1 with `agent changed since last run` when the hash differs (or there is no stamp), so CI or a hook can force a re-run on every agent change.

## Acceptance criteria

- EVPM-C1: `capture add` writes the file above; refuses (exit 1, one line saying why) a bad id, a missing prompt, an improvement without before, after or a valid verdict, a bug without `missed`, a duplicate id (unless `--replace`), and any text over 4000 characters.
- EVPM-C2: public-repo safety. URLs in any text become `(link removed)`; text that looks like a key (`sk-` followed by 16 or more letters or digits, or a `ghp_` token) is refused with exit 1 and the text is never echoed.
- EVPM-C3: `@file` for `--before` and `--after` reads the file; a missing file exits 1.
- EVPM-C4: `capture list --agent A` prints counts by kind and verdict, the dev and heldout counts and how many are new since the last `build`.
- EVPM-C5: `capture build` writes the tasks file in the shape `check` accepts (id, split, text, rubric), skips ties and says how many, is stable (same input gives byte-identical output), and exits 1 with a one-line reason when there are no cases.
- EVPM-C6: leak guard: no task `text` contains any word run of 6 or more words from a capture's `before`, `after`, `missed` or `note`, unless that run is also in the prompt.
- EVPM-C7: `stamp` and `check` as above; `check` exits 0 and prints `agent unchanged since last run` when the hash matches.
- EVPM-C8: a built tasks file plus a suite config passes `evalpm check`, and `evalpm freeze` then `verify` work on it (the pipeline needs no change).
- EVPM-C9: help and README list the new commands in one short section, "Grow your suite from your own improvements", with a worked example.

## Not doing

A UI, auto-capture from git, screenshots, API-key runs, scoring the verdict (calibration already does that), cross-agent sharing.

## Privacy

Captures can hold product text. The README says: keep captures in a private repo or strip them first; the tool only removes URLs and refuses key-shaped strings, it does not detect personal data.
