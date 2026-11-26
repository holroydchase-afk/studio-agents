# Limits

Version 0.1.0. The demo's numbers are invented and are not a result.

- **Small suites.** Most suites have a handful of tasks. Under 10, the tool will not call a result.
- **One judge model.** The judge is a model, graded against a human only on the pairs a human marked. Until 20 are marked, the judge is unchecked.
- **Text-only tasks.** Tasks that depend on screenshots or a live repo need a runner that supplies them; the tool only moves text.
- **No model runner.** The tool writes and checks jobs. You supply the model calls, and the tool records the model ids you report. It cannot verify them.
- **Authors grade their own suites.** Tasks written by the same person who tuned the agent can leak the answer. Prefer tasks from real misses and keep a held-out set.
- **Old runs.** Runs from before the protocol are v1 and are shown, not recomputed.
- **Not research.** A pass here is a hypothesis about your agent, not a benchmark result.
- **Blind to labels, not to style.** The judge never sees arm names, but an agent's replies may still read differently from plain Claude's. The `strip` setting removes only the markers you list.
- **The claim gate trusts its file.** `report --claim` reads the saved calibration result and does not check that it was computed on the run being reported. Twenty marks is a rough estimate of agreement.
