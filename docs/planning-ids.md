# Planning IDs

One numbering scheme for every studio product, so a plan, a branch, a PR, a tracker card and a handoff all point at the same thing.

## Three levels

| Level | Name | ID | What it is |
|---|---|---|---|
| 1 | Milestone | `M1`, `M2` | A shippable outcome someone outside the studio could notice, such as "recruiter-demoable v1" or "friend beta". |
| 2 | Task | `M1.1`, `M1.2` | One PR-sized piece of work inside a milestone. Usually one branch and one PR. |
| 3 | Step | `M1.2.1` | Only when a task has to be split. Most tasks never need it. |

Numbers are never reused or renumbered. A dropped task keeps its ID and is marked `dropped` in the plan. New work gets the next free number, even if it lands out of order.

## Product codes

Inside a repo, the bare ID is enough (`M1.2`). Anywhere products mix (the tracker, the roadmap, prompts, the portfolio, LinkedIn notes), prefix the product code:

| Code | Product |
|---|---|
| `CCW` | ccwatts |
| `RR` | Role Radar |
| `ES` | Energy Scanner |
| `PMT` | PM tools (Build Slate, roadmap, studio agents) |
| `HRT` | Hearth (family photo app; code stays if the name changes) |
| `WEB` | Portfolio site (chaseholroyd.com) |
| `CHL` | Charlie (stock and options idea helper) |
| `CRW` | Crew Clock (GPS clock-in for contractor crews; working name) |

Example: `CCW-M2.1`, `RR-M1.5`, `ES-M1.3.2`. A new product picks a 2–4 letter code and adds it here.

## Status words

`todo`, `doing`, `blocked`, `done`. Plus `dropped` for work deliberately cut. Nothing else (no "in progress", "WIP", ✅ only).

## Where the IDs go

- **Plan** (`PLAN.md` or the repo's spec): one heading per milestone, one line per task with its status, done-when, and branch.
- **Branch:** `m1.2-short-name`.
- **PR title:** `M1.2: short name`.
- **Commit messages:** mention the ID when the commit belongs to a task.
- **HANDOFF.md:** "Exact next step" names the ID.
- **Tracker cards** (Build Slate, roadmap): prefix the title with the full ID, for example `CCW-M2.1 Real-log run`.

## Not planning IDs

These keep their own schemes and are not renumbered:

- Decisions (`D1`) and proposals in anchor/decision docs.
- Bug priority (`P0`, `P1`, `P2`).
- Acceptance criteria (`<AREA>-<n>`).

When one of those could be confused with a plan ID, cite the file ("ANCHORS D3").

## Migrating an existing repo

Don't rewrite git history or rename old branches. Add an "Old → new IDs" table to `HANDOFF.md`, use the new IDs from now on, and update the plan's labels in place.
