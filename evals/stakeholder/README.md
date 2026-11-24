# Stakeholder eval

Same artifact, two arms, one blind grader per artifact. **Plain** is one Claude call told to review the text before it goes public. **Agent** is three persona calls (the persona text from `plugins/stakeholder/data/audience.json` plus the text protocol), merged to 10 findings by taking each persona's findings in turn. Both arms read the same quote index from `stakeholder-intake` and write the same four-field JSON lines. Findings are shown to an Opus grader with the arm hidden and the order shuffled; the grader scores specific, quote fit, fix, coverage and honest (1 to 5) and picks A, B or tie.

Rules: report wins out of N, never a multiplier. Chase is the answer key: spot-check pairs and note where he disagrees with the grader. Results: `runs/<date>-<label>/results.json` and `results.md`.
