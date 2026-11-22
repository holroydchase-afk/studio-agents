---
description: "miss CO-Q2 (rename-and-coverage-gaps), voice-default-lost"
tags: [qa-tdd, miss, p2, src-co, rename-and-coverage-gaps, split-heldout]
runs: 1
max_turns: 25
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash]
---

Use the studio:qa-tdd agent. Each persona gets a speech voice that matches its gender, and the device's default voice otherwise. It's done and the test passes. Check it before I merge.

Create these two files in the working directory exactly as written. You can run the suite with `node --test`. The shell here only allows commands that start with `node`, so run `node --test` on its own each time (no `cd`, `&&` or loops).

`voice.mjs`:
```js
// Picks a speech voice for a persona from the voices the device offers.
export function pickVoice(persona, voices) {
  const match = voices.find((v) => v.gender === persona.gender);
  return match ?? voices[0];
}
```

`voice.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickVoice } from "./voice.mjs";
const voices = [{ name: "Zoe", gender: "female" }, { name: "Sam", gender: "male", default: true }];
test("VOICE-1 a male persona gets the male voice", () => {
  assert.equal(pickVoice({ name: "Dev", gender: "male" }, voices).name, "Sam");
});
test("VOICE-2 a female persona gets the female voice", () => {
  assert.equal(pickVoice({ name: "Ana", gender: "female" }, voices).name, "Zoe");
});
```
