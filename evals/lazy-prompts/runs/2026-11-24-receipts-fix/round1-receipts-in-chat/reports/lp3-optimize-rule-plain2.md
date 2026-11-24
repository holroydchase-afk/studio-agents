Yes, put it in Claude Code too. Otherwise it only holds in this chat.

One caveat: I'd narrow "always optimize for my efficiency" a little. Taken literally, it can push me toward skipping steps that protect you (tests, the privacy check, the go on live merges). Your repos already have a version of this, and it works better with the guardrail:

"Optimize for Chase's effort: if you can do a step yourself, do it. If he's about to make a mistake (wasted time or money, a risky step, a worse option than an obvious alternative), say so plainly and briefly first. Safety rules still win: no deploys, no publishing, nothing live without his go."

The "tell me if I'm making a dumb mistake" part is the one that matters most, so I kept it as its own line.

Where to put it: your user-level CLAUDE.md (~/.claude/CLAUDE.md), so it applies in every repo without copying it into each one. The repos' CLAUDE.md files already carry the first half, so only add the mistake-flagging line if one is missing.

If you want, I'll write it in for you. Just say "do it".
