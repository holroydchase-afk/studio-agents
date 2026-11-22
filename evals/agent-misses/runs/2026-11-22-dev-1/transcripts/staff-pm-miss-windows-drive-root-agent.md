# staff-pm-miss-windows-drive-root, with agent (staff-pm subagent report, verbatim)

Spec done. Decision: the project label is the last path segment, parsed by our own code on both / and \ (never OS path.basename, which leaks full Windows paths on Linux/macOS). Any filesystem root maps to "(root)": "/", "C:\", "C:/", "c:", and UNC share roots (server/share never shown). Missing or empty cwd shows "(unknown)".

Spec (all auto, unit tests in core, pure function):
- LABEL-1 /home/a/proj -> proj
- LABEL-2 / -> (root)
- LABEL-3 C:\Users\a\proj -> proj on any OS
- LABEL-4 C:\, C:/, c: -> (root), not "C:\" and not empty
- LABEL-5 \\srv\share (with or without trailing \) -> (root)
- LABEL-6 trailing or repeated separators ignored
- LABEL-7 empty or missing cwd -> (unknown), distinct from (root)
- LABEL-8 label never contains / or \ or a drive letter, checked across every output surface (table, JSON, stored record). This is the privacy check.
- LABEL-9 a POSIX folder literally named a\b labels as b. Accepted trade-off, documented in METHODOLOGY.
- LABEL-10 same label on different projects stays separate rows keyed by hash, with a short hash suffix on collision, e.g. "app (3fa9)".
- LABEL-11 stored data is hash (of the normalized full path) plus label only.

Critical path (~2 sessions): qa-tdd writes LABEL-1..11 red; engineer builds labelProject() in packages/core with no node:path, green 3x; collision suffix plus ux-reviewer pass; METHODOLOGY/README note and HANDOFF.

Not doing: showing a parent folder to disambiguate, case-insensitive matching of POSIX paths, symlink or ~ resolution, WSL path translation.

Biggest risk: a stray path.basename elsewhere leaking a full Windows path off-Windows; LABEL-8 over all outputs covers it.

Caveat: TASK.md did not name the product. The agent assumed ccwatts and its "basename only, no full paths" hard rule.
