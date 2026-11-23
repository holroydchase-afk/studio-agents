Spec written: `docs/SPEC-LIVE-PRICES.md` (HANDOFF.md updated). Nothing built; live Cboe is unverified from cloud sessions.

Key points:
- The demo rule (static, no network except Pyodide) means the visitor's browser can't fetch live prices. Recommended option A: a weekday job writes a dated `prices.json` snapshot that the demo ships, labeled "as of ... delayed". Option C (local app only) is the cheap fallback; B needs a rule change.
- The known failure: the adapter loops over about 40 symbols and one bad symbol blocks all. The spec requires per-symbol isolation, a 10 s timeout with one retry, a 5 min run budget, validation (bid <= ask, no same-week expiries), partial publishing, last-good price kept with its own as-of date, and a stale flag after 2 trading days. If more than 25% fail, the old snapshot stays and the job goes red.
- Acceptance tests CHL-LIVE-1..7 are listed for qa-tdd to write red first; start with the isolation test.
- Cards keep the range, as-of time and "Not financial advice. Paper trading only."

Needs Chase (one line each): pick A, B or C (recommend A); OK on 2 trading days max staleness; OK to check Cboe redistribution terms before the scheduled workflow. Any snapshot that ships on the demo waits for his go.

File: /tmp/claude-0/-home-user/3fb24a12-b686-57cb-a079-1ae3d4a32894/scratchpad/b5/live-feed-one-symbol-blocks-all-plain/docs/SPEC-LIVE-PRICES.md
