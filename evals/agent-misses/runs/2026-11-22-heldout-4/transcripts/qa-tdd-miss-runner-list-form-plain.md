Do not merge as it was: the lint passed on our workflow by missing it, not because the workflow is clean.

**Finding (QA-R1, P1):** `ci.yml` has `runs-on: [ubuntu-latest]`, a floating runner, which is exactly what the lint exists to catch. The regex only matched the scalar form, so CILINT-3 passed on a false negative. Same for block lists, quoted values and trailing comments.

**What I did, test first:**
- Red: I added five tests (flow lists incl. `[self-hosted, macos-latest]`, block lists, quoted values and comments, pinned list forms pass, `ci.yml` does not use a floating runner). 4 failed and 4 passed.
- Fix: I rewrote `floating()` in `ci-lint.mjs` to read the whole `runs-on` value and match `(ubuntu|macos|windows)-latest` as a whole word. I pinned `ci.yml` to `runs-on: [ubuntu-22.04]`.
- Green: `node --test` 3 times, 8/8 passing each time.

**Open:** `runs-on` set by an expression (`${{ matrix.os }}`) is still not caught.
