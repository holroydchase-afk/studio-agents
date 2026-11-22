---
type: llm
weight: 3
---

Recall of CH-Q1, a miss we already know was real (pattern: unhandled-input-edges). Pass only if the report names this specific gap, ranked P1 or higher: `maxLoss` accepts zero or negative price, strike or implied volatility and returns a number (a negative or $0 max loss), where it should reject them. The one test recomputes the same formula, so it can only agree with the code and says nothing about bad inputs. It should throw a `RangeError`. It must also write a failing test for this gap (negative price, zero strike and zero iv must each throw `RangeError`) and run it red, or show its red output. It must not fix `risk.mjs`; the fix goes to the engineer. Fail if the gap is missing, ranked lower than P1, named without a test that ran red, or fixed in the source. Calling the change ready or green while this gap is open also fails. Other findings don't change the result.
