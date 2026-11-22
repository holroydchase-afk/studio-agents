Not ready to merge. Undo brings the card back, but not to where it was.

COL-1 passes only because it deletes the last card ("c"), and putting it at the end happens to be the right place. `undo()` in `column.mjs` does `list.push(last)`, so any card that wasn't last returns at the bottom of the column. On a roadmap, order is the priority, so deleting the top card and undoing silently demotes it. That is a wrong result on the core loop.

Wrote 7 more tests in `column.position.test.mjs` (COL-2 to COL-8). Ran with `node --test` on the two test files, 1 run each since the verdict is red:
- COL-2 (middle card, remove "b" then undo): red, gives a,c,b.
- COL-3 (first card, remove "a" then undo): red, gives b,c,a.
- COL-6 (unknown id removed between delete and undo) and COL-7 (undo twice): red for the same position bug.
- COL-8 (two deletes, two undos): red. Undo holds only one card, so the first deleted card is lost for good (a P1 only if multi-step undo was intended; the spec says only "the last removed card").
- COL-4 (only card in a column) and COL-5 (undo with nothing removed): pass.
- Not covered: duplicate ids, a null or undefined id, `remove` and `undo` on a column built from an empty array.

Fix for the engineer: store `{card, index}` in `remove` and `splice(index, 0, card)` in `undo`, clamping the index to the current length. I did not touch `column.mjs`.

Needs your call: should undo be one step or many? COL-8 assumes many. Delete it if one step is intended, but then a second delete silently makes the first one permanent. Say which you want in the spec.

Not run: the UI wiring and a real roadmap card. This only tests the column logic. A bare `node --test` also picks up the studio tools' own tests and times out, so I ran the two files by path.

The `only-tests` guard exits 1 on `column.mjs` and `tools/*`. Those files came with the setup, and I changed no source. Eval run, so no run log.

```qa
verdict: red
red: COL-2 undo of a non-last card returns it to the end of the column instead of its original position (got a,c,b, expected a,b,c)
suite: column | node --test column.test.mjs column.position.test.mjs | 3/5
QA-R1 | P1 | column.mjs undo() | undo pushes the card to the end, so any card but the last returns in the wrong position (COL-2, COL-3, COL-6, COL-7) | column.position.test.mjs
QA-R2 | P1 | column.mjs remove()/undo() | undo holds one card only, so a second delete makes the first permanent, and the spec doesn't say whether that is intended (COL-8) | column.position.test.mjs
QA-R3 | P2 | COL-1 | the only existing test deletes the last card, which hides the position bug | column.test.mjs
```
