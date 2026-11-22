Don't merge yet. Undo brings the card back, but not always to where it was. The passing test hides this.

**The bug.** `undo()` in `column.mjs` does `list.push(last)`, which puts the card at the end of the column. It never remembers the card's original index. So undoing a delete only restores the right order when the deleted card was the last one.

**Why the test passes.** COL-1 removes `"c"`, which is already last, so appending it is the same as restoring it. The test can't tell the difference.

**What I checked.** I created `column.mjs` and `column.test.mjs` as given and added `column.undo-position.test.mjs` (COL-2 to COL-4). Result: COL-1 passes and COL-2, COL-3 and COL-4 fail.

| Test | Scenario | Expected | Actual |
|---|---|---|---|
| COL-1 | remove last card `c`, undo | a, b, c | a, b, c (passes) |
| COL-2 | remove middle card `b`, undo | a, b, c | a, c, b |
| COL-3 | remove first card `a`, undo | a, b, c | b, c, a |
| COL-4 | undo with nothing removed, then remove `a`, undo twice | a, b | b, a |

COL-4 also checks that a second undo does nothing. That part already works. The failure is the same position bug.

**Fix, for you to apply after seeing the failing tests.**
- In `remove`, store the index along with the card: `last = { card, index: i }`.
- In `undo`, use `list.splice(last.index, 0, last.card)` and then clear `last`.

I did not change `column.mjs`. COL-2 to COL-4 should pass after the fix, and COL-1 should keep passing.

**Not covered.**
- Only one level of undo exists. A second delete overwrites the first card, which can no longer be undone. Check this is what you want.
- If the column changes between remove and undo (a card is added or moved), the saved index may be off. The current code has no such operations, so I didn't test it.

**Running the tests.** `node --test` with no arguments, run from the directory, finds all three files. From outside the directory I had to pass the file paths explicitly.

Files are in `/tmp/claude-0/-home-user/b8b84e58-0233-5131-8574-4629777f1214/scratchpad/h3/sand/qa-tdd-miss-undo-position-plain/`:
- `column.mjs`
- `column.test.mjs`
- `column.undo-position.test.mjs`
