Don't merge yet. The two tests pass, but the parser silently drops many bullet lines a real log entry is likely to contain.

**What I ran**
- I created `entry.mjs` and `entry.test.mjs` as given.
- I ran the suite by passing the test file path to `node --test`: 2 of 2 pass. A bare `node --test` can't find the files from this shell because its working directory isn't the sandbox folder.
- I fed `parseEntry` a set of other inputs directly. Results below.

**What the parser drops**

The regex `^- ([a-z]+): (.*)$` only matches a hyphen, one space, a key made only of lowercase letters, then a colon and a space. Everything else returns `{}` with no error:

| Input | Result |
|---|---|
| `* call: a` (asterisk bullet) | `{}` |
| `• call: a` (unicode bullet) | `{}` |
| `  - call: a` (indented or nested bullet) | `{}` |
| `-  call: a` (two spaces after the hyphen) | `{}` |
| `- Call: a` (uppercase key) | `{}` |
| `- why-not: a`, `- call_id: a`, `- n2: a` (hyphen, underscore or digit in key) | `{}` |
| `- call:` (empty value, no trailing space) | `{}` |
| `- call: a\r\n- why: b` (Windows line endings) | `{"why":"b"}` |

The CRLF case is the worst. The first line only fails because the `\r` is split off the end of the wrong line, and the field loss is silent. The `.` in `(.*)` also doesn't match `\r`, so every line of a CRLF file fails the `$` anchor except the last one, which has no `\r`.

Two smaller points:
- A repeated key silently overwrites the earlier one (`- call: a` then `- call: b` gives `{"call":"b"}`). That may be fine, but it's undecided.
- `- call: ` (trailing space) gives `{"call":""}` while `- call:` gives nothing, which is inconsistent.

**Why the tests didn't catch it**

ENTRY-1 and ENTRY-2 only cover the happy path (two well-formed `- key: value` lines) and a non-bullet line. Nothing covers other bullet styles, key shapes, indentation, line endings or empty values.

**What to do before merging**
1. Decide which formats a story-keeper entry may legitimately use. I haven't seen real entries, so I can't say which of the cases above actually occur.
2. For each one you want supported, write a failing test first (for example ENTRY-3 for `*` bullets and indentation, ENTRY-4 for CRLF, ENTRY-5 for keys with hyphens, underscores or digits, ENTRY-6 for an empty value), then widen the regex. A likely shape is `/^\s*[-*•]\s+([A-Za-z][\w-]*):\s*(.*?)\s*$/`, plus splitting on `/\r?\n/`.
3. For each one you don't want supported, add a test that pins it as ignored, so the behaviour is deliberate.
4. Decide what a duplicate key should do and test it.

If the real entries only ever use `- lowercase: value` with LF endings, the current code is correct for them and you can merge. I couldn't verify that, so it's your call.
