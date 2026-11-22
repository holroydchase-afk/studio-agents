**Decision:** Don't build a "live" feed into the demo. Build a daily price snapshot (fetched out-of-band, per-symbol failure isolated) that the static demo reads and labels "Prices as of <date/time>, delayed, sample fundamentals". Live in the browser breaks the hard rule (static demo, labeled sample data, no network), and live adapters can't be verified from cloud sessions.

**Bet:** A recruiter opening the demo sees idea cards with prices that are visibly current, and nothing breaks when one ticker fails. Signal: 3 consecutive weekday snapshots with >=95% of the ~40 watchlist symbols priced, and demo shows an as-of date within 1 trading day.

**The real problem (from docs/adapters.md):** the adapter is "called once per symbol in a loop" over ~40 symbols. As written, one bad symbol (timeout, 404, malformed chain, rate limit) stops the loop, so all cards go stale. The spec's core requirement is isolation, not freshness.

**Critical path**
1. CHL-F1 Spec + criteria (this doc into `docs/product/SPEC-PRICES.md`). Done when Chase OKs the snapshot approach. 1 session, with decision D1.
2. CHL-F2 qa-tdd red tests on fixtures (below). Done when all `auto` criteria fail for the right reason. 1 session.
3. CHL-F3 Engineer: `fetch_all(symbols)` wrapper with per-symbol timeout, try/except, result record `{symbol, status, price, fetched_at, error_code}`; writes `samples/prices.json`. Done when F2 green 3x. 1 session.
4. CHL-F4 Cards read `prices.json`, show price + as-of, stale/missing states. Done when UX-1..3 pass. 1 session.
5. CHL-F5 Scheduled run (weekday, after close) from a host that can reach Cboe, commits snapshot. Cannot be verified in cloud; mark "live adapter unverified" until one real run is seen. 1 session + Chase's go.
6. ux-reviewer + privacy-security on the demo build; positioning check of the "delayed" wording. 1 session.

**Acceptance criteria (Given/When/Then)**
- FEED-1 (auto): Given 40 symbols where #7 raises a timeout, When fetch_all runs, Then the other 39 return `ok` and #7 is `failed` with an error code.
- FEED-2 (auto): Given #7 returns a malformed chain, Then same as FEED-1 (parse errors isolated).
- FEED-3 (auto): Given every symbol fails, Then the run exits non-zero, writes no new snapshot, and the previous one is kept.
- FEED-4 (auto): Given a hanging symbol, Then it is cut at the per-symbol timeout (default 10s) and total run <= 40 x timeout / concurrency; default concurrency 4.
- FEED-5 (auto): Given a failed symbol with a prior price, Then the snapshot keeps the old price with its old `fetched_at` (never relabeled as new).
- FEED-6 (auto): Given a snapshot, Then every price has `fetched_at` and `source`; fixture-built snapshots carry `source: "fixture"`.
- FEED-7 (auto): Given the demo build, Then it makes no network call other than Pyodide (existing test) and contains no key or credentials.
- UX-1 (manual): Given a card with a fresh price, Then it shows price + "as of <date>, delayed".
- UX-2 (auto): Given a price older than 2 trading days or missing, Then the card shows "Price unavailable (last: <date>)" and never a blank or $0.
- UX-3 (auto): Given any card with a price, Then "Not financial advice. Paper trading only." still appears (existing rule) and the demo is labeled sample.
- UX-4 (manual): Given October fundamentals next to a fresh price, Then the card marks fundamentals "sample, Oct" so mixed freshness isn't implied as current.

**Not doing**
- Browser-side live fetch: breaks the static/no-network hard rule, and CORS/keys.
- Streaming/real-time quotes, intraday refresh: delayed daily is enough for paper ideas.
- Refreshing fundamentals (listed under Decisions to review; separate item).
- Adding symbols beyond the 40 watchlist; new data vendors.

**Biggest risk:** Cboe access, terms and data-redistribution rights are unverified. Cloud sessions can't reach Cboe, so the adapter is only proven on three saved files (AAPL, KO, XOM). Publishing their delayed data on a public site may need license terms. Handled by F5 (one real run) and D2 before anything goes public.

**Decisions for Chase**
- D1: Snapshot (daily, committed) instead of live. Recommend yes.
- D2: Who checks Cboe's redistribution terms before the demo shows their prices? Recommend privacy-security + you, before F5; if terms block it, fall back to a labeled sample price with a date.
- D3: Where does the scheduled run live (your machine vs GitHub Action with network)? Recommend GitHub Action if Cboe is reachable from it, else manual weekly run.
- D4: Merging F4 changes the live demo, so it waits for your go.

**Handoffs**
- qa-tdd -> write FEED-1..7, UX-2, UX-3 as failing tests with 40-symbol fixtures (one hang, one malformed, all-fail) -> done when red for the right reason.
- engineer -> F3/F4 after red -> done when all suites green 3x.
- ux-reviewer -> UX-1, UX-2, UX-4 wording -> no P0/P1.
- privacy-security -> D2 terms, demo network/keys check -> sign-off.
- story-keeper -> log D1 once Chase decides.
- Update HANDOFF.md "Next" to CHL-F1 when the spec merges.
