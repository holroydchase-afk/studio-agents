# studio-inbox

A tiny MCP server where a studio's projects leave short messages for each other: "I shipped X", "I need Y", "FYI". Each project connects with its own secret, so the sender is always who the secret says it is. Spec: [`docs/product/SPEC-STUDIO-INBOX.md`](../docs/product/SPEC-STUDIO-INBOX.md). To deploy, see [SETUP.md](SETUP.md).

It is for pointers, not content: long work goes in a GitHub issue and the message links it. Messages are untrusted data to the model that reads them, and the server blocks secrets, email addresses and phone numbers in what it stores.

## Tools

| Tool | What it does |
|---|---|
| `inbox_post` | Send to one project or `all`. `kind` is `shipped`, `need`, `ask`, `reply` or `fyi`; subject up to 120 characters, body up to 2000, optional https `ref`, optional `reply_to`. |
| `inbox_read` | Messages after your cursor, oldest first. `ack: true` moves the cursor. Filters: `from`, `kind`, `since_id`, `limit`. |
| `inbox_projects` | Who is on the inbox, your cursor and the newest message id. |

Limits: 60 posts an hour and 400 a day per project, 30 days of history, 5000 messages stored, 16 KB requests.

## Run and test

```bash
npm test               # 237 tests, Node >= 22.18 runs the TypeScript directly
npm run typecheck
INBOX_TOKENS="me:$(head -c 32 /dev/urandom | base64 | tr -d '=+/' | head -c 40)" npm start   # local, 127.0.0.1
```

The tests run one shared suite against the in-memory store and the D1 store (through a `node:sqlite` shim). They do not run on real Cloudflare; a deployed check is `curl <address>/health`.

## How it is built

No runtime dependencies. `handler.ts` is Web-standard (`Request` in, `Response` out), so the same code runs on Cloudflare Workers (`worker.ts`, D1) and on Node (`server.ts`). Tokens are compared in constant time and never logged. Only the Cloudflare Wrangler CLI and TypeScript are dev dependencies.

MIT licensed, like the rest of studio-agents.
