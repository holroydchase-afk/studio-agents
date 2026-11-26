# Studio inbox: privacy and security review (INB)

Date: 2026-11-26. Reviewer: privacy-security. Scope: `studio-inbox/src/*.ts`, `schema.sql`, `wrangler.toml`, `scripts/tokens.ts`, against `docs/product/SPEC-STUDIO-INBOX.md`. Standards: OWASP ASVS L2 (V2/V3/V5/V7/V13), STRIDE. No code was edited.

Caveats: `studio-inbox/test/` is empty in this checkout, so no suite was run and the "failing test to add" lines assume the spec's `node --test` layout. developers.cloudflare.com is not reachable from this session, so every Cloudflare logging claim below is UNVERIFIED and must be checked live before ship (INB-R1).

## Verdict

Core design is sound: parameterized SQL everywhere, sender from token only, strict inputs, auth before body read, digest compare against all tokens, no logging in code. Two P1s must be fixed before the connector URLs are handed out: the scanner misses the inbox's own tokens most of the time, and the URL-path token has no platform-log story. Not safe to ship to other projects until INB-R1 and INB-R2 are closed.

## Findings

### P1

**INB-R1 (P1) Token in URL path vs platform logs. ASVS V7.1, V2.10.** `wrangler.toml` has no `[observability]` block, so logging behaviour rests on Cloudflare defaults I could not verify. Workers invocation logs, `wrangler tail`, and Logpush `workers_trace_events` can record the request URL, which contains the full credential for `/t/<token>/mcp`. Fix: add `[observability]` `enabled = false` (and `[observability.logs] invocation_logs = false`) explicitly, do not configure Logpush or tail sessions against this Worker, and record the Cloudflare page and date once reachable. Also prefer Bearer where the client allows it; path token stays the claude.ai fallback only. Test to add (static): read `wrangler.toml`, assert it contains no `observability` with `enabled = true` and does contain an explicit disabled setting.

**INB-R2 (P1) Scanner misses the inbox's own connector tokens and many secret shapes. ASVS V5.1, V8.3.** Tokens are 43-char base64url. The generic rule `[A-Za-z0-9+/=]{40,}` excludes `-` and `_`, so any token containing one (about 75 percent) passes, and a pasted `https://host/t/<token>/mcp` in body or ref is accepted. Also not caught: Stripe `sk_live_`/`rk_live_`, `AIza...`, `glpat-`, `npm_`, `sbp_`, `re_`, Cloudflare API tokens with hyphens, base64url strings under any length that is split by `-`/`_`. Fix: add `/[A-Za-z0-9_-]{32,}/` (base64url), `/\/t\/[^/\s]{16,}\/mcp/`, and the vendor prefixes above; accept the usability cost and tell senders to link, not paste. Tests (red first): `scanText('https://h.example/t/'+base64url(32 random bytes, forced to include "-" and "_")+'/mcp')` returns `secret` for 200 random tokens; `sk_live_` plus 24 chars, `AIza`+35, `glpat-`+20 each return `secret`.

**INB-R3 (P1) Scanner bypass by Unicode and format tricks. ASVS V5.1.3.** `scanText` runs on raw text. Bypasses: zero-width/soft-hyphen/bidi characters inside a key or address (`sk-​ant...`), fullwidth `＠` and fullwidth digits (JS `\d` is ASCII only), "name at example dot com", `%40`. Phones: contiguous `5551234567`, `(555)123-4567` (no separator after the paren), 7-digit local numbers. Cross-field splitting: a key's prefix in `subject` and rest in `body`, since fields are scanned separately. Fix: before matching, normalise `NFKC`, strip `\p{Cf}` and control characters, collapse whitespace, then scan each field AND the concatenation `subject\nbody\nref`; add `\b\d{10,11}\b`, `\(\d{3}\)\s?\d{3}[-. ]?\d{4}`, and `\s(at|\[at\])\s...\s(dot|\[dot\])` email forms. Tests: each of the above strings returns non-null; split key across subject/body returns `blocked_content` from `inbox.post`.

### P2

**INB-R4 (P2) Prompt injection hardening is thin. OWASP LLM01.** The notice exists but comes last in the result JSON (`notice` after `messages`) and message text is otherwise raw. Cheap hardening: (a) emit `notice` first; (b) add `untrusted: true` (or wrap as `"data"`) on each message; (c) reject or strip invisible instruction carriers on post: Unicode Tag block U+E0000 to U+E007F, bidi overrides, zero-width, control characters except `\n`/`\t` (same fix as INB-R3 normalise step, but reject so stored text is clean); (d) reject `ref` query strings and fragments, or limit `ref` hosts to `github.com` and the studio's own sites, because a reading model that fetches a link can be steered to leak data in the URL; (e) note `to: all` lets one compromised project reach everyone, so keep the 60/hour cap and consider lowering `all` to 10/day. Test: post with tag characters returns `blocked_content`; `inbox_read` result's first key is `notice`; ref with `?x=` rejected.

**INB-R5 (P2) Retention only enforced on post. INB-14, GDPR-style minimisation.** `purgeOlderThan` runs inside `post`; if nobody posts, 30-day-old messages stay readable and stored. Fix: also filter `created_at >= now - retention` in `listFor`/`countFor`, and purge on read. Test: store a 31-day-old message, no posts since, `inbox_read` does not return it.

**INB-R6 (P2) Rate-limit gaps. ASVS V11.** (a) Only posts are limited; reads run a LIMIT 50 select plus a COUNT over up to 5000 rows, so a looping client or leaked token can burn D1 free-tier daily row reads and take the inbox down for everyone. Add a per-project read cap (for example 600/hour, tracked in D1 or via a Cloudflare rate-limiting rule). (b) Check-then-insert is not atomic, so parallel posts can overshoot by a few. (c) `trimToLimit` is global: a busy sender can evict others' messages and reduce its own `countFrom`. (d) No limit on unauthenticated traffic (Workers request quota); add a Cloudflare WAF rate rule on `/mcp` and `/t/*` or accept. Test: 700 reads in an hour returns `rate_limited`.

**INB-R7 (P2) No token rotation or revocation story. ASVS V2.10, V3.7.** One secret holds all tokens; rotating one project means replacing the whole secret and the project's connector URL at the same instant (old token dies immediately, no overlap, and duplicate project names are rejected by INB-1). Fix: document in SETUP.md (`node scripts/tokens.ts <project>`, `wrangler secret put INBOX_TOKENS`, update the connector URL in claude.ai, verify, done); allow an optional second token per project during rotation (spec change to INB-1) or accept a brief outage and say so; add a gitleaks/CI rule for `/t/[A-Za-z0-9_-]{43}/mcp`; rotate on any suspected leak and every 90 days; add a one-line `wrangler d1 execute` to purge all messages from a sender. Scheduled for the first post-ship check, 2026-12-26.

**INB-R8 (P2) `ack` with filters silently skips unread messages. Integrity.** `inbox_read {kind:'fyi', ack:true}` moves the cursor to the last returned id, marking every unread message of other kinds below it as read. Also true with `from`, and with a high `since_id`. Fix: only move the cursor when no `from`/`kind`/`since_id` is given, or to the last id of a contiguous unread run. Test: three messages ids 1(need) 2(fyi) 3(need); read kind=fyi ack leaves `unread_remaining` 2.

**INB-R9 (P2) Metadata leak via `head_id` and global ids. LINDDUN: detectability.** Every project learns total studio traffic, including other projects' direct messages, from `head_id` and id gaps. Low risk inside one studio, but the privacy bar treats counts as leaks. Fix: drop `head_id`, or accept and document it. Test: `inbox_projects` result has no `head_id`.

**INB-R10 (P2) Missing response headers; local server lacks Host/Origin check. ASVS V14.4, MCP transport spec.** Add `x-content-type-options: nosniff` and require `content-type: application/json` on POST (this also turns cross-origin "simple" form posts into 415). `server.ts` binds 127.0.0.1 but does not validate `Host`/`Origin`, so DNS rebinding is possible against a trial server (needs a token, hence P2). Fix: reject requests whose `Origin` is present and not on an allow list, and whose `Host` is not localhost, in `server.ts`. No CORS headers are sent, which is correct; do not add any. Test: `Origin: https://evil.example` returns 403 from the local runner.

**INB-R11 (P2) Scanner false positives push users to workarounds.** 40+ hex blocks GitHub commit URLs and SHAs, which are the most common `ref`. Fix: exempt `https://github.com/.../commit/<sha>` in `ref` only, or allow 40-hex when preceded by `commit/`. Test: a commit URL in ref passes; a bare 40-hex in body is blocked.

**INB-R12 (P2) Worker rebuilds auth state per request and `compatibility_date` is today's date.** `createHandler` re-parses tokens and re-hashes every token per request (cost scales with project count, harmless now). A compatibility date equal to the deploy day can fail if the runtime has not rolled out yet; use a date a few days back. Fix: cache the handler per `INBOX_TOKENS` value; set `compatibility_date = "2026-11-20"`.

### P3 and notes

- INB-R13 (P3) Invisible-only subject (U+200B) passes the `trim()` check; fixed by the INB-R3 strip step.
- Verified fine: SQL injection (all values bound, `LIMIT ?` bound, `__proto__` key rejected by `unknownKeys`); timing (SHA-256 then all-entries compare, 401 body generic); 413 enforced on declared length and streamed; token never in any thrown message; `reply_to` returns the same `not_found` for missing and invisible; no CORS; `cache-control: no-store`; AUTOINCREMENT ids never reused; `wrangler.toml` holds a placeholder id only.
- Accepted: names, addresses and other free-text personal data cannot be detected by regex; the control is the sender instructions plus the notice. Say that plainly in README.

## Required now (before connector URLs are issued)

INB-R1, INB-R2, INB-R3 (each with its failing test first), and a populated `test/` directory proving INB-2 to INB-5 and INB-11 as specified (it is empty here). INB-R4 to INB-R6 and INB-R8 should land in the same milestone as they are cheap.

## Scheduled

| Item | Standard | Date |
|---|---|---|
| Rotation runbook and CI rule (INB-R7) | ASVS V2.10 | 2026-12-26 |
| Read rate limit and WAF rule (INB-R6) | ASVS V11 | 2026-12-10 |
| Verify Cloudflare logging, data location and no-training pages live, cite them (INB-R1) | vendor review | before ship |
| Cloudflare terms and GDPR/data-location review | legal | needs Chase |
