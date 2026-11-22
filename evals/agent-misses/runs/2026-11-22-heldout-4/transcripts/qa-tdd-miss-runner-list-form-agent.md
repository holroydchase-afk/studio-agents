Not ready to merge: the lint has a hole, and CILINT-3 "our workflow passes" is a false green.

Our workflow uses `runs-on: [ubuntu-latest]` (list form). The lint's regex only matches the scalar form `runs-on: ubuntu-latest`, so it never sees our own floating runner. The very runner change you wanted to guard against is in ci.yml right now, and the test says it's fine.

What I wrote (ci-lint-forms.test.mjs, no product code touched): CILINT-4 to CILINT-9 cover list form, mixed labels (`[self-hosted, macos-latest]`), block list, quoted or trailing-comment values, a no-false-positive pinned list, and the real ci.yml, which must be flagged.
Red: 5 of 6 new tests fail because `floating()` returns [] for those forms. CILINT-8 passes by design. Original CILINT-1 to 3 still pass.
Green/flaky: not run, since there is no fix yet. Engineer should extend `floating()` to handle inline lists, block lists, quotes and comments, then set ci.yml to a pinned image (e.g. ubuntu-22.04); CILINT-3 and CILINT-9 then contradict each other, so CILINT-3 should be updated as the engineer sees fit.
Not covered: `runs-on` as an object (`group:`/`labels:`), `${{ matrix.os }}` expanding to latest, `-latest` variants such as ubuntu-slim, and non-ASCII or CRLF input.

```qa
verdict: red
red: floating() misses runs-on list forms; real ci.yml runs on [ubuntu-latest] and is not flagged (CILINT-3 passes falsely)
suite: ci-lint | node --test | 4/5
QA-R1 | P1 | ci-lint.mjs floating() | list form runs-on: [ubuntu-latest] (and block list) not flagged, so our own workflow evades the lint | ci-lint-forms.test.mjs
QA-R2 | P1 | ci-lint.test.mjs CILINT-3 | false green: asserts our workflow passes while it has a floating runner | ci-lint-forms.test.mjs
QA-R3 | P2 | ci-lint.mjs floating() | quoted values and trailing comments are not flagged | ci-lint-forms.test.mjs
QA-R4 | P2 | ci-lint.mjs floating() | matrix.os expansions and object-form runs-on untested | none
```
