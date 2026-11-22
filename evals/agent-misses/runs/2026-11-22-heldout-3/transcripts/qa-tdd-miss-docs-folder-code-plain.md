# Check: do not merge yet

The 3 tests pass (run by file path, since the shell started in /home/user and a bare `node --test` there picked up unrelated suites; I stopped that run). But the check is too loose, and the tests do not cover the gaps. It lets code skip the failing-test step.

## Problems found (probed directly)

- **P1: anything under `docs/` is treated as docs, whatever it is.** `docs/build.mjs`, `docs/scripts/deploy.sh` and `docs/app.py` all return true. A PR that changes code in a docs folder can say "qa-tdd skipped". This is the one the tests miss.
- **P1: all `.json` and `.yml` files count as config, including ones that change behaviour.** `.github/workflows/ci.yml`, `package.json` (scripts, dependencies) and `studio-checks.json` (holds the `agents.verify` command) all return true. CI workflows and dependency changes need their own review (architect) and are not safe to skip testing on.
- **P2: matching is case-sensitive.** `README.MD` returns false. This fails safe (it asks for tests), so it is only an annoyance.

## Suggested fix

Allow only documentation extensions (`.md`, `.txt`), and under `docs/` only those extensions. Keep a short explicit allowlist for config files that cannot change behaviour. Treat `.github/`, `package.json`, lockfiles and `studio-checks.json` as code. Normalize case and path separators first.

## Tests to add first (each should fail today)

- SKIP-4 `docs/build.mjs` may not skip.
- SKIP-5 `docs/guide.md` may skip.
- SKIP-6 `.github/workflows/ci.yml` may not skip.
- SKIP-7 `package.json` may not skip.
- SKIP-8 `README.MD` may skip.

Files: /tmp/claude-0/-home-user/b8b84e58-0233-5131-8574-4629777f1214/scratchpad/h3/sand/qa-tdd-miss-docs-folder-code-plain/may-skip.mjs and may-skip.test.mjs (created exactly as given).
