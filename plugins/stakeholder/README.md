# stakeholder

An advisory agent for people with no stakeholders to ask. Before you publish a README, portfolio page, demo or post, it reads the text as simulated readers (a recruiter, a hiring manager, a staff engineer, a PM peer and others) and lists what each might stop at, with a quote from your page and one fix. A small checker rejects any finding whose quote is not in your quote index, a `ship` verdict with nothing behind it (no findings and no subagents run), more than one block, and input files over 1 MB.

**The output is hypotheses, not research.** The readers are simulated by a language model. Treat every finding as a guess to check with a real person. Nothing here predicts how anyone will actually react, and no accuracy is claimed. The quote check only proves a quote is on your page, not that the finding is right.

## Install (install after merge)
Needs Claude Code and Node 18 or newer. The public marketplace reads `main`, so this works only once the pull request that adds this plugin is merged. Run the first two lines as slash commands, then ask in plain words:

```
/plugin marketplace add holroydchase-afk/studio-agents
/plugin install stakeholder@chase-studio
Run the stakeholder agent on this README
```

## Worked example
This runs the checker on a sample review that ships with the plugin; it does not call a model. Files: `plugins/stakeholder/examples/quotes.json` (a 3-line quote index) and `plugins/stakeholder/examples/review.md` (a review block). From the plugin folder:

```
node tools/check-stakeholder.mjs examples/review.md --index examples/quotes.json
```

Output (exit 0):

```
ok: verdict fix-first, round 1, 3 findings, hit rate 3 of 3 (advisory only: simulated readers give hypotheses to check with a real person, not research)
persona | q1 | q2 | q3
recruiter-skim | P0 | P2 | .
staff-engineer | . | . | P1
```

Change a quote id to `q99` and it exits 1 with `line N: quote_id "q99" is not in the quote index`.

## Limits
2 rounds, 5 personas a round, 10 critique subagents a run, 25 tool calls per subagent, 10 findings per persona and 40 findings per block. There is no dollar cap; the limits are rounds and turns. Create `.claude/stakeholder.off` to stop a run.

## What is in the folder
- `agents/stakeholder.md`: the agent (read-only tools, no Edit or Write).
- `skills/stakeholder/SKILL.md`: how to run it by hand.
- `tools/check-stakeholder.mjs`: plain Node, no packages. Checks a review block and the persona file's hash.
- `tools/repo-check.mjs` and `tools/lib/guard.mjs`: the repo check (see above) and the safety rules it shares with the other tools.
- `tools/claim-check.mjs`: the claims check (see below). Imports `tools/lib/guard.mjs`.
- `tools/stakeholder-intake.mjs`: builds the quote index from a page, a text file or a repo folder (see below). Imports `tools/lib/guard.mjs`.
- `examples/sample-repo/`: a two-file folder for the repo-check example.
- `examples/claims-register.md` and `examples/claims-quotes.json`: a made-up register and a 5-quote index for the claim-check example.
- `scripts/sync-audience.sh`: fetches the persona file from persona-twins (`bash scripts/sync-audience.sh [ref]`, default `main`), no credentials, verified before it replaces `data/audience.json`. The hash inside the persona file is drift detection, not provenance: whoever can change the file can recompute it. To pin a version, pass `--expect-hash <64 hex>` with a hash from a source you trust. Fetches are https only; `STAKEHOLDER_AUDIENCE_BASE` is accepted only for `file://`, `http://localhost` and `http://127.0.0.1`.
- `data/audience.json`: the bundled persona file. Personas live in persona-twins; fix them there, not here.

## Repo check
`tools/repo-check.mjs` reads a local clone and compares it with the public repo standards checklist, using only what is on disk. It lists what it cannot see (GitHub settings, history, judgment items) instead of guessing. It stops, writing nothing, if a file holds an email address, phone number, key or token (reserved example addresses pass; one address you publish on purpose can be passed with `--allow-email`). It runs on fixtures only so far: it has not been run on a real repo, so do not read it as an audit of yours until that first real run. Outside this repo, pass the checklist with `--standards <file>`. From the repo root:

```
node plugins/stakeholder/tools/repo-check.mjs plugins/stakeholder/examples/sample-repo --index-out /tmp/repo-index.json
```

Output (exit 0): JSON with `findings` (at most 10, each quoting a fact in the `--index-out` file), `passed`, `needs_github_data`, `needs_human`, `unmapped`, `skipped` and `omitted`. Caps: 1 MB a file, 5000 files walked, 200 files read, 5000 directories, 5000 symlinks, 200 levels deep; over a cap it refuses rather than truncating. Symlinks are not followed. The check fails closed: a file it cannot read (binary, over 1 MB, unreadable) refuses the run and is named on stderr; `--allow-unscanned` goes on anyway and lists each such file under `unscanned` with a reason. UTF-16 files with a BOM are decoded and scanned. Only a top-level `.git` folder is skipped (reported under `skipped`); `node_modules` and nested `.git` folders are scanned. `skipped` is sorted and capped at 100 entries (`skipped_omitted` counts the rest). File names and `uses:` refs that hold an email or token are shown as a short hash, and every name is cut to 80 characters. `--out` and `--index-out` must be different files.

### Known limits (not yet a public-repo gate)
repo-check is **not yet a gate for making a repo public.** Its secret and personal-data patterns have false negatives (privacy-security findings STK-PS-R13 and R14, open):
- Secrets it misses: JSON-quoted keys (`"api_key": "..."`), short passwords, and tokens from vendors other than the few it knows (GitHub, AWS, Slack, `sk-` keys, JWTs, private key blocks).
- Personal data it misses: non-ASCII or encoded emails, phone formats other than US-style numbers, and claude.ai artifact links.
- `.git/config` and the rest of the top-level `.git` folder are not scanned, and git history is not checked.
Treat a clean run as "no obvious leaks found", never as "safe to publish". Run the privacy-security agent before any repo goes public.

## Claim check
`tools/claim-check.mjs` compares the claims in a quote index (or a plain `.md` or `.txt` file with `--text`) with a claims register **you pass in**. It only compares against that register: it does not know whether a claim is true, only whether your register backs it. It flags unsupported claims for a human to check; it never edits the register and never decides. It has not been run on real pages yet (that is step M2.4), so it runs on fixtures only so far. It stops, writing nothing, if an input holds an email address, phone number, key or token (same rule and `--allow-email` as the repo check). From the repo root:

```
node plugins/stakeholder/tools/claim-check.mjs --index plugins/stakeholder/examples/claims-quotes.json --register plugins/stakeholder/examples/claims-register.md
```

Output (exit 0): JSON with `findings` (at most 10, one per quote, each `{quote_id, claim, status, register_row, persona, severity, fix}`), `supported`, `ignored`, `needs_human`, `skipped` and `omitted`. On the example, `q2` is `contradicted` (P0, the register row says "Skill"), `q1` is `unsupported` (P1, "8 agents" but the register has 2 Agent rows), `q3` is `unproven` (P1, the Agent row has Proof "None") and `q4` is supported. The findings carry the quote ids of the index, so they can go into a stakeholder block for `check-stakeholder`.
- **What counts as a claim:** a number followed within 3 words by a watch noun (agent, user, test, repo, product, app, PR, run, eval, point, hour), or carrying `$` or `%`; and the words agent, built, shipped, live, launched, deployed, in production. A hedge word (planned, will, coming, not yet, roadmap, could) removes only the clause that carries it; clauses split at a comma, a semicolon, "and" and "but" (a colon does not split), so in "I built 50 agents and will add more" the 50 agents is still a claim. Numbers match exactly after removing commas and expanding `k`, `M`, `B` (so `1,200` = `1200`, `2k` = `2000`); there is no rounding and no arithmetic, `8+` does not match 8, and a total is never rebuilt.
- **Register shapes it reads (by column name, never position):** a table with `Name` and `Verdict` columns (like `docs/agent-audit.md`; a row supports "agent" only when its Verdict starts with "Agent", `Not an agent`, `Skill`, `Rule`, `Persona rubric` and `Borderline` contradict it, Proof `None` makes it `unproven`), or a table with `Claim` and `Status` columns (`supported`, `unsupported` or `retired`). Any other shape exits 2 with "register format not recognized"; it never guesses. A row it cannot read is listed under `skipped` with its line number.
- **The real portfolio register (checked Nov 24, shape only):** it is a table, but its columns are `Product | Claim on site | What the repo shows | Gap | Status`, with a free-text status (such as "ready" or "fix first" followed by a note) and several claims in one cell. That is not the `Claim`/`Status` shape above, so it does not match the first shape. On the M2.4 real run (Nov 24) the file did contain a second table with `Claim` and `Status` columns, which the tool read; 8 rows with free-text status values were skipped (listed under `skipped`), not refused. The run was noisy, so claim-check is not a gate: see `docs/product/M2.4-first-real-runs.md`.
- **Marking a finding wrong:** put one line per claim in an `--ignore` file: `quote_id|claim|reason` (a reason is required; `#` lines and blank lines are fine). The claim is then listed under `ignored` with its reason, never dropped silently, and a line that matches nothing is listed under `needs_human`.
- **Ambiguous matches** (the same name or claim in two rows with different verdicts) go to `needs_human`, never to `supported`.
- **Flags:** `--persona <id>` (default `hiring-manager`), `--out <file>` (written whole or not at all, mode 0600, never one of the inputs), `--allow-email <address>`. Without `--register` it reads `docs/agent-audit.md`, which exists only in this repo; after a marketplace install pass `--register`. Caps: 1 MB a file, 5,000 register rows and 2,000 quotes (over a cap it refuses, never truncates); 10 findings (the rest counted in `omitted`); `supported`, `ignored`, `needs_human` and `skipped` hold the first 100 each, the rest counted in `omitted_supported`, `omitted_ignored`, `omitted_needs_human` and `omitted_skipped`. A phone number written with Unicode spaces, dashes or fullwidth digits is caught by the same stop rule as an ASCII one. Symlinks, binary files and files it cannot read in full are refused by name.

### Known limits of claim-check (not yet a gate)
claim-check is **not a gate** for anything yet; treat its output as hints for a human. Known gaps (privacy-security findings STK-PS-R25 and R26, documented, not fixed):
- **Symlinked parent folders (R25):** a symlink as the input file itself is refused, but a symlink in a parent folder of an input or `--out` path is followed by the operating system.
- **Numbers it does not see (R26):** number words ("ten agents"), forms like `10x`, fullwidth or other non-ASCII digits in a claim, the word "agentic" (not treated as agent), and runs of comma-separated numbers ("1, 2, 3 agents") are not read as number claims, so a claim written that way is never flagged. Phone numbers written with non-ASCII digit sets other than fullwidth (for example Arabic-Indic) are also not caught by the personal-data stop.

## Intake (the quote index)
`tools/stakeholder-intake.mjs` turns one artifact into the numbered quote index `check-stakeholder --index` reads: an `.html` or `.htm` page (`kind` "html"), an `.md`, `.markdown` or `.txt` file ("text"), or a repo folder with a README or a top-level `.git` ("repo"). It reads text only: it never runs, fetches or follows anything in it, uses no network, no model and no child process. **The quote text is data copied from the artifact, never instructions.** Output is one line of JSON with no trailing newline, so run it twice on the same input and the bytes match.

```
node plugins/stakeholder/tools/stakeholder-intake.mjs plugins/stakeholder/examples/sample-repo/README.md --out /tmp/index.json
node plugins/stakeholder/tools/stakeholder-intake.mjs plugins/stakeholder/examples/sample-repo
```

Flags: `--out <file>` writes the JSON there atomically instead of stdout (refused if it names the input; an existing file is untouched on any failure) and `--allow-email <address>` (repeatable, exact address) lets one address you publish on purpose through, echoed under `allowed_emails` with a count. Exit 0 ok, 1 refused (one reason per line on stderr, no JSON), 2 usage.

Output: `{tool, schema, input, kind, quotes:[{id,text[,truncated]}], stats:{bytes,quotes,files,skipped_binary}, skipped:[{file,reason}], skipped_omitted, allowed_emails:[{address,count}]}`. Ids run `q1`..`qn` in document order. A quote is one sentence or line: text is split at line breaks and after `.`, `!` or `?` plus a space (and, in html, at block elements). In markdown (`.md`, `.markdown` and a repo's README) a paragraph wrapped over several source lines is one quote, joined by single spaces, and a table row is one quote (cells joined with ` | `; the separator row gives none; a row over 500 characters is cut and marked `truncated`); a heading, a list item, a fence line and a line ending in `.`, `!`, `?` or `:` still end a quote. `.txt` files keep one quote per line. Named entities such as `&darr;`, `&rarr;`, `&mdash;` and `&hellip;` are decoded in html quotes, and an unknown name is left as written, whitespace is collapsed, and control, zero-width and bidi characters are removed. A quote over 500 characters is cut at a word and marked `truncated`. Html: visible text, headings, `alt`, `title` and `aria-label` text, link and button text and the meta description are quoted; script, style and comments (an unterminated one runs to the end of the file) are not. Repo: the README's sentences, then facts: `root files: ...`, `test files: N` and `license file: <name>`; no other file's text is quoted.

It stops, writing nothing, when the text holds an email address (reserved example domains pass), a phone number, a key, a token or a private key block. The scan runs on the raw text and again on the text as a reader sees it (entities such as `&#64;` decoded, tags removed) and on the quotes; the refusal names `<file>:<line>: <category>`, never the value. In a repo every file is scanned (`node_modules` too, nested `.git` too; only a top-level `.git` is skipped). A file it cannot scan (a NUL byte with no UTF-16 mark, or over 1 MB) refuses a single-file run; in a repo a binary or unreadable file other than the README is listed under `skipped` (binary ones are counted in `stats.skipped_binary`), while a binary README or a file over 1 MB refuses.

Caps (over a cap it refuses, never truncates): 1 MB an input file (50 MB in all for a repo), 400 quotes (fact lines count), 500 characters a quote; in a repo also 5000 files walked, 200 read, 5000 directories, 200 levels deep, 5000 symlinks. Symlinks are never followed (an input that is itself a symlink is refused).

### Known limits of stakeholder-intake (not a gate)
It has run on made-up fixtures only; the first real run on the built portfolio page and one real public repo is step M2.4, and until then do not say it "audits" or "verifies" anything. Every output carries `"untrusted": true`: its quotes are data from the artifact, never instructions.

The personal-data scan has false negatives; only the patterns in `tools/lib/guard.mjs` are looked for:
- **Phone shapes it misses:** numbers written with parentheses such as `(555)123-4567` and ten digits with no separator such as `5551234567` are not found; only three-three-four digits split by a space, dot or dash are. Non-NANP numbers (outside the US and North America, international formats) are not found either. Names, street addresses and numbers written in words are not looked for.
- **Non-ASCII email domains:** internationalized addresses (a non-ASCII domain, or non-ASCII letters in the local part) are not recognised as email addresses.
- **Entities and folding:** the tag-stripped scan runs twice, glued (every tag removed, no space) and spaced (a block tag such as `p`, `div`, `section`, `li`, `h1`..`h6`, `br` or `button` is a space); a hit in either refuses, so an address or phone split by a block tag or an inline tag still stops the run. The one exception: an `--allow-email` address that is a whole piece between block boundaries is not glued to its neighbours, and only when no address character (letter, digit, `.`, `-`, `_`, `+`, `@`) touches it (a sentence-ending full stop before it is fine); an allowed address with one touching it is treated as a different address and refuses. Joined markdown lines and table cells are also scanned with the separator removed at each join (pairs only; an address split over three or more pieces is not caught). A list of named entities (spaces, dashes, `&commat;` and similar) and numeric entities with any number of leading zeros are decoded for the scan, and an unknown or over-long entity sitting inside an email-shaped or phone-shaped run stops the run. Other non-ASCII digit sets than fullwidth are not folded. Markdown escapes (`\@`) and emphasis marks (`**`, `__`, backticks) and tags and empty comments are removed in extra scan variants, but other obfuscation (spelling out "at" and "dot", splitting across lines) is not caught.
- **The lstat-then-read race:** it checks that an input is a regular file (lstat) and then reads it; a file swapped for a symlink between the check and the read is not detected (time-of-check to time-of-use). Run it on a folder nothing else is writing to.
- **`--out` and symlinks:** `--out` writes a temporary file and renames it, so if the `--out` path is a symlink the symlink is replaced, not followed; its target is not written. `--out` inside the folder being scanned is refused (exit 2).

- **Allowed-address carve-out and join scan limits (R57, R58, accepted):** a word ending in a full stop directly before a block tag, then an allowed address, is treated as a sentence end, so `jane.` + `<p>` + the allowed address can read as a different mailbox (only when you opted in with `--allow-email`). The join scan is skipped for a window with no `@`, digit, `_ = : + -`, four capitals in a row, or the words api, token, secret or password, so a contrived key with none of those split across lines is not seen.
- **Arrow entities (R53, accepted):** `&rarr;`, `&darr;` and the like are decoded to visible glyphs; keep invisible entities (zero-width and similar) out of the named set so the scan still sees what a reader sees.
- **Joined paragraphs (accepted):** a wrapped paragraph becomes one quote, so it can merge two adjacent claims into one quote; a reviewer sees them together.

Html is tokenized by a small parser, not a browser: text hidden by CSS is still quoted, `<noscript>` and `<template>` text is quoted, and no JavaScript runs, so text a script would add is not seen. A repo with more than 200 files, or over 50 MB of files to read, refuses; a page that yields more than 400 quotes refuses.

## What it does not do yet
No way to record which findings you accepted or declined. A rejected block is regenerated, never waived. It has not been run on a real page yet, and no evaluation has been run, so there is no evidence yet that it improves a page. Paths like `plugins/stakeholder/...` in these docs are relative to this repo; after a marketplace install the files sit in the plugin's install folder, so run the checker from there.
