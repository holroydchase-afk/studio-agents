**Answer:** The label is the last path segment of the working directory, computed so it works for POSIX and Windows paths whatever OS the CLI runs on. A path with no last segment (`/`, `C:\`, `C:/`, `\\server\share`) is labelled "(root)". The task statement only mentions the top of the filesystem, so the Windows drive root is the case most likely to be missed.

No repo docs were available (no CLAUDE.md, HANDOFF.md or anchors). This is scoped only from TASK.md. Its one repo fact is that logs record the working directory as a path string, and nothing says which OS wrote the log.

**Rules**
- Treat `/` and `\` both as separators, regardless of the OS running the CLI. Logs may come from another machine.
- Ignore trailing separators.
- If nothing is left after stripping a drive prefix, a UNC share prefix and separators, the label is "(root)".
- Show only the label. Never show the full path. It is not stored, printed or snapshotted.
- A missing, empty or non-string path gets a distinct label, "(unknown)". Do not call it "(root)".

**Acceptance criteria**

| ID | Given | Then | Type |
|---|---|---|---|
| LBL-1 | `/home/me/proj` | `proj` | auto |
| LBL-2 | `/home/me/proj/` (trailing slash) | `proj` | auto |
| LBL-3 | `/` | `(root)` | auto |
| LBL-4 | `C:\Users\me\proj` | `proj` | auto |
| LBL-5 | `C:\` | `(root)` | auto |
| LBL-6 | `C:` and `c:/` | `(root)` | auto |
| LBL-7 | `C:\Users\me\proj\` and mixed separators `C:/Users\me/proj` | `proj` | auto |
| LBL-8 | UNC `\\server\share` | `(root)` | auto |
| LBL-9 | UNC `\\server\share\proj` | `proj` | auto |
| LBL-10 | `//` or `///` | `(root)` | auto |
| LBL-11 | Empty string, missing field, or a non-string value | `(unknown)`, no crash | auto |
| LBL-12 | Any input | The output never contains a separator or drive letter, except where a folder name itself contains one. A folder named `C:` is not a real case. | auto |
| LBL-13 | A real folder literally named `(root)` | Collides with the root label. Accepted for now and noted. | manual |
| LBL-14 | Two Windows projects, `C:\a\app` and `D:\b\app` | Both show `app`. This is a label collision, not a bug, because the label is basename only. | auto |

The tests must run the same on Linux CI, so none of them may use the host OS's path functions.

**Critical path (one session)**
1. M1.1: `qa-tdd` writes LBL-1 to LBL-14 as failing tests (red). Done when they fail for the right reason. Half a session.
2. M1.2: `engineer` implements one pure label function with no I/O. Done when all pass 3x on Linux. Half a session.
3. Done definition: every place that prints a project label (table, README example output, any snapshot) is updated, and no test fixture contains a real path.

**Not doing**
- Disambiguating two projects with the same basename. That is a new feature, so it goes in the ideas log.
- Resolving symlinks or reading the real filesystem. The label is derived from the string only.
- A parent-folder suffix such as `app (b)`. Same reason.

**Biggest risk:** Using `os.path.basename` or `path.basename`, which on Linux returns the whole string for `C:\x`, or an empty string for `/`. LBL-4 to LBL-8 on Linux CI catch this.

**Decisions for Chase**
- Is "(unknown)" the right label when the path is missing? I recommend yes.
- Accept that two projects with the same folder name look identical? I recommend yes, and log it as an idea.

**Handoffs**
- `qa-tdd`: write LBL-1 to LBL-14 as failing tests. Done when they are red for the right reason and cover Windows paths on a POSIX runner.
- `engineer`: build the pure label function. Done when all pass 3x.
- `ux-reviewer`: check that "(root)" and "(unknown)" read clearly in the table. Done when there is no P0 or P1.