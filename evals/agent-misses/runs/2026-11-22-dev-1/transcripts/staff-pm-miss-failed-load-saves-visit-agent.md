# staff-pm-miss-failed-load-saves-visit, with agent (staff-pm subagent report, trimmed to the criteria that matter; the full report had 12 criteria, signals, critical path and handoffs)

**Answer:** Build it, but the badge must never count or reset on a failed load. The obvious build resets last-visit when Feed opens, so a failed or offline load would clear the badge and the grandparent would lose track of new posts.

Definitions: "Seen" means Feed loaded successfully and rendered posts. Opening the tab is not seen.

Acceptance criteria excerpts:
- FEED-5 (auto): Given Feed opens and the network load succeeds and renders, when it finishes, then last-visit is set to the newest loaded post's time (server time) and the badge clears.
- FEED-6 (auto, the key test): Given Feed opens and the load fails, times out or is offline, when the error shows, then last-visit is unchanged and the badge keeps its count. Written red first.
- FEED-7 (auto): Given a partial or paginated load, then last-visit advances only to the newest post actually rendered, so unseen posts stay counted.
- FEED-9 (auto): Given no last-visit (first launch), then no badge shows and last-visit is set after the first successful load.
- FEED-10 (auto): Given the badge count can't be fetched, then show no number rather than a wrong one.
- FEED-11 (manual, old phone): 17pt text, a word ("3 new"), accessible label, not color alone.

Biggest risk: the reset-on-open race. A failed load clears the badge, so people silently miss posts. FEED-6 and FEED-7 handle it. Advance last-visit only after a confirmed render.
