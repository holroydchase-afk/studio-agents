Not ready to merge: `maxLoss` returns NaN or negative dollar amounts for bad inputs, and the existing test cannot catch that. I did not touch `risk.mjs`.

**Why the passing test proves little.** RISK-1 recomputes the same formula the code uses, so it can't fail on a wrong formula. It also only covers one good input.

**What I wrote.**
- `risk.mjs` and `risk.test.mjs` are copied exactly as given.
- `/tmp/evalruns/dev2/qa-tdd-miss-risk-bad-inputs/risk.bad-inputs.test.mjs` is new (RISK-2 to RISK-7).
- I picked the rule it enforces: a max-loss figure must be a finite number of 0 or more, or the call throws. You can change that rule, but never to a silent NaN or negative number.

**Red result.** The same result came back on all 3 runs of both files: 9 of 12 tests fail, 3 pass.
- Missing `iv` or `price`, or a string `iv`, returns NaN.
- Negative `iv` or `price` returns -600.
- Negative `strike` returns -5500.
- `contracts` of 0, -1 or 1.5 does not throw. Zero contracts gives a $0 loss.
- `Infinity` or `NaN` input does not throw.
- The three passes are RISK-1, RISK-2 (hand-computed 600 and 1200), and RISK-7 (calling with no argument already throws).

**Handoff to engineer.** Validate the inputs and make the failing tests pass:
- Throw `RangeError` or `TypeError` for non-finite or negative `price`, `iv` or `strike`.
- Do the same for `contracts` that isn't a positive integer.

**Product question for Chase (not tested).** `Math.min(premium, strike)` compares a per-share premium to the strike price, which is a questionable cap. For a long option the loss is the premium. For a short option it isn't capped at the strike. Chase should confirm the strategy this models and that "price * iv * 0.4" is acceptable as a stand-in.

**Not tested.** There are no real-option reference values. The premium formula is a rough estimate with no sourced parameters, so I can't check it against actual prices. There was no repo for CLAUDE.md or HANDOFF.md, so I recorded results only here. The sandbox only allows `node`, so I ran the files directly instead of the directory. Running `node --test` on the directory fails to find a module.

```qa
verdict: red
red: 9 of 12 tests fail: maxLoss returns NaN, negative values or $0 for invalid inputs instead of throwing (RISK-3 to RISK-6)
suite: unit | node --test risk.test.mjs risk.bad-inputs.test.mjs | 3/9 3/9 3/9
QA-R1 | P1 | risk.mjs maxLoss | missing, non-numeric or Infinity price/iv/strike returns NaN instead of throwing | /tmp/evalruns/dev2/qa-tdd-miss-risk-bad-inputs/risk.bad-inputs.test.mjs
QA-R2 | P1 | risk.mjs maxLoss | negative price, iv or strike returns a negative "max loss" (-600, -5500) | /tmp/evalruns/dev2/qa-tdd-miss-risk-bad-inputs/risk.bad-inputs.test.mjs
QA-R3 | P1 | risk.mjs maxLoss | contracts of 0, negative or fractional is accepted; 0 reports a $0 loss | /tmp/evalruns/dev2/qa-tdd-miss-risk-bad-inputs/risk.bad-inputs.test.mjs
QA-R4 | P2 | risk.test.mjs RISK-1 | test recomputes the code's own formula, so it can't catch a wrong formula (tautological); needs hand-computed values | /tmp/evalruns/dev2/qa-tdd-miss-risk-bad-inputs/risk.bad-inputs.test.mjs
QA-R5 | P2 | risk.mjs maxLoss | Math.min(premium, strike) caps a per-share premium by the strike price; the rule is unexplained and unsourced, and PM should confirm it | none
```