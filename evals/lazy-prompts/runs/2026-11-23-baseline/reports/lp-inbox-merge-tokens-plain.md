Short answer: the idea is smart, but the process as pasted probably costs more tokens than it saves. I'd keep the inbox idea and drop the locks and the fixed entry format.

I only have your one-line description of it, not the full paste, so this is based on that.

**What's right about it**
- Parallel chats overwriting a shared doc is a real problem, and an append-only inbox per chat fixes it cleanly. A merge pass applies the entries later, so nothing gets lost.
- It matches your rule to keep one file per topic and to read only the section you need.

**Where it works against your goal of fewer tokens**
- Every chat has to read the long process description at the start. That is a recurring cost, and it is probably bigger than what the inbox saves.
- Locks are the wrong tool here. Your sessions are not long-running processes and can't reliably hold or release a lock. A stale lock after a crashed chat blocks everything. Separate inbox files already remove the conflict, so you don't need locks.
- A fixed entry format makes each chat spend tokens on formatting. It also adds a failure mode: a malformed entry breaks the merge pass.
- The merge pass is another session to run, and you're the one who has to remember to trigger it.

**What I'd do instead**
1. One inbox file per chat, named by date and thread (for example `inbox/2026-11-23-hearth.md`). Entries are plain bullets, in any format.
2. No locks.
3. The merge pass is a single scheduled job, or part of your digest. It reads the inbox files, updates the shared docs and archives the inbox files. It only needs to run once a day.
4. Cut the process description to about 10 lines in the CLAUDE.md of each repo, so every chat reads it cheaply.

On the "is it smart" question: the diagnosis (parallel chats clobbering shared docs) is right. I'd just make the fix much lighter before it goes into your repos.

If you want, say "go" and I'll rewrite the paste into that short version and show you the result before it goes anywhere. Nothing has been changed in any repo.
