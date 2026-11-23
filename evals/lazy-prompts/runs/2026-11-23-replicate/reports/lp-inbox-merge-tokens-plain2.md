Short answer: the idea is sound, but it's mostly a safety fix rather than a token saver, and the version you describe is heavier than it needs to be. I only have your description, not the paste, so this is based on that.

**What's smart**
- One inbox file per chat, with entries only ever appended, means two chats can't overwrite each other. That's the right pattern for parallel chats.
- A single merge pass that applies the entries is also right.

**Where it may not save tokens**
- Every chat has to read the process text, so a long paste costs tokens each time it's loaded.
- The merge pass reads every inbox plus the target doc, which can cost more than the collisions it prevents.
- Locks are fragile here. A chat that dies mid-merge leaves a stale lock, and the next chat either waits or has to guess.
- A fixed entry format helps. Keep it to one line per entry.

**What I'd do instead**
1. Keep one inbox file per chat or thread, append-only, with no locks. Nothing else can collide, so nothing needs locking.
2. Keep the entry format to a single line, for example `date | doc | what changed | why`.
3. Have one owner run the merge pass, such as the morning digest or the studio project, and have it clear the inboxes after applying them.
4. Cut the process text to about 10 lines in a single file and point the repos' CLAUDE.md files at it. Don't paste it into each one.
5. Where repos already use HANDOFF.md with PRs, leave that alone. Git already handles the merging there, so the inbox is only worth it for the shared studio docs that several chats touch.

Don't call it a token saver until you've compared one week of usage with and without it. Until then it's a conflict-prevention process, which is still worth having.

If you want, I can write the trimmed 10-line version for you to review.
