# UX build eval

The prompts for the UX agent's build-grade-revise loop are in `prompts.json`; earlier results are in `results/`. The UX agent's miss cases run from `evals/suites/ux-reviewer.json` (built from the UX eval miss issues by `evals/suites/build-ux-tasks.mjs`). The render-step suite from this folder is not built yet (EVPL-23 in `docs/product/SPEC-EVAL-PIPELINE.md`). Note that old runs stay v1 and are never recomputed.
