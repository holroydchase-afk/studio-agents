# Replicate run, 2026-11-23

Second run of both arms on the same 8 prompts and context pack, fresh blind Opus graders (one per prompt, order shuffled, spec blocks stripped).

Agent 7, plain 1. The only plain win was shifts-and-ratio, same as the first run.

Combined with the first with-block run: agent 14 wins, plain 2 over 16 pairs. Dev and held-out are mixed here because the held-out set was already seen.

Notes:
- Four plain2 reports (orchestration, role-radar, licenses, linkedin) were saved from the subagents' returned text, because their Write was refused. They are verbatim.
- Graders repeatedly marked down lint-ok lines, extra decisions and replies that opened with notes about a failed file write (both arms).
- Both arms invented facts about the repos they could not open. Neither gave true calendar dates except the linkedin agent reply.
- Limits: model graders only, same 8 prompts, no real repo access, Chase's spot-check of 3 pairs is still pending. No multiplier claim.
