**Decision: No-go on "done and live" today. Go with conditions.** A green deploy workflow plus the page in the build shows the deploy ran. It does not show ES-M2.2's own done check, "the link loads on a phone". Nobody has opened the link on a phone yet, so I'm not rounding that up. Nothing has been checked against the live URL.

Caveat: I had only the task text. There was no CLAUDE.md, HANDOFF.md or plan, so I couldn't quote the plan or check for open bugs.

**Gate: ES-M2.2**
| Criterion | Evidence | Status |
|---|---|---|
| Deploy workflow succeeded | Green this afternoon (reported, no run link) | Met |
| Build contains the new page | Reported | Met |
| Link loads on a phone (the plan's done check) | None | **Not met** |

**Critical path (one session, about 10 minutes)**
1. ES-M2.2.1: Open the live URL on a real phone over cellular, not wifi and not desktop emulation. Done when the page renders, the main action works, and nothing is blocked or errors.
   - Do it on the live URL, not the build artifact. A green deploy can still serve a cached or stale page, or a path broken by the Pages subpath (/energy-scanner/).
   - Check that the page shows the new content from this build, not the previous one.
   - Note the phone and browser, so the evidence is recorded.
2. If it loads, mark ES-M2.2 done and record the evidence (device, date, URL) in HANDOFF.md.
3. If it fails, treat it as a P1 (a core persona gets stuck). Keep ES-M2.2 at "doing", don't announce it, and write the failing check first.

**Not doing**
- No announcement or "it's live" claim before step 1. Saying it early risks being wrong in public.
- No new automated test for this. The plan defines the check as manual. An `auto` smoke test of the live URL is a backlog item and not a blocker.

**Biggest risk:** the live site works on desktop but not on a phone, for example a camera or file-upload permission, a mobile Safari quirk, or a subpath asset problem. Photos stay on the device in this product, so the phone check also confirms the core loop works there. Step 1 covers it.

**Decisions for Chase**
- Do the phone check yourself, or have a tester do it? I recommend you do it now. It's one tap-through and you are the one who gives the go for anything live.
- Should the done check also say "loads on the live URL on a phone, and the core action works"? I recommend yes. As written it could pass on a blank-but-loading page.

**Handoffs**
- qa-tdd: if step 1 fails, write the failing check for the specific failure, then hand to engineer. Done when it is red, then green 3x.
- positioning: hold any "live" copy or announcement until step 2 is recorded. Done when the copy is only released after the check passes.