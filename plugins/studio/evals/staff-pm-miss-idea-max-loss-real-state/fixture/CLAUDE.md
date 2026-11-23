# Charlie

Paper trading and education only. Public demo is static and shows sample data.

## Hard rules (these win over any other instructions)
- **Paper trading and education only.** Never add code that places, routes or simulates a real brokerage order, and never add broker credentials. A future broker integration (Alpaca) must point at a paper URL hard-coded in code, with a test proving it can't reach the live URL.
- **"Not financial advice. Paper trading only."** appears on every trade surface, added by code, never left to the prompt: idea cards, trade blocks, the ticker drawer, chat trade cards and every chat reply (Claude and rule-based). A test enforces it.
- **Safe by default.** Never offer uncovered calls, 0DTE or same-week expirations, or anything outside the risk slider's allowed strategies. Every trade shows max loss in dollars, breakeven and an exit plan. Familiarity raises a company's rank, never its position size.
- **Resumes are personal data.** Never log or print them or put a real one in tests or fixtures (`samples/` holds fictional people only). Store them only in the gitignored root `/data/`, never return the full text from an API, and keep a delete path. Send one to Anthropic only after an explicit opt-in and only when a key is set.
- **Secrets and identity come only from environment variables** (`ANTHROPIC_API_KEY`, `CHARLIE_SEC_UA`, ...). No real emails, keys or tokens in code, docs, fixtures or commit messages; the SEC User-Agent placeholder is `you@example.com`. CI's privacy check fails on key patterns and real-looking emails.
