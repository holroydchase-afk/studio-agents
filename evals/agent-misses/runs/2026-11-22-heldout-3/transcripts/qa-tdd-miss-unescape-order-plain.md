Don't merge yet: `unescapeHtml` has a real bug that the two existing tests miss.

**The bug.** `&amp;` is decoded first, so the `&` it produces is then fed to the `&lt;` and `&gt;` replacements. The text gets decoded twice.

- Saved text `&amp;lt;b&amp;gt;` is the user's literal text `&lt;b&gt;`.
- `unescapeHtml` returns `<b>`, which is wrong. A note containing a literal `&lt;` would silently turn into `<`.
- It can also turn escaped markup into live markup if the output is ever re-inserted as HTML.

**Why the tests pass.** UNESC-1 and UNESC-2 each use a single escape type, so the order of the replacements never matters. Neither covers the case where one escape sits inside another.

**What I ran.** I created your two files as written. I added a third file, `unescape.order.test.mjs`, with two tests:

- UNESC-3: `&amp;lt;b&amp;gt;` should give `&lt;b&gt;`.
- UNESC-4: `&amp;amp;` should give `&amp;`.

Bare `node --test` picked up unrelated suites from the working directory, so I ran the four test files by path. Result: 3 pass, 1 fail.

- UNESC-1, UNESC-2 and UNESC-4 pass. UNESC-4 passes by luck, because `&amp;amp;` only becomes `&amp;` and nothing else touches it.
- UNESC-3 fails: expected `&lt;b&gt;`, got `<b>`.

**Fix (not applied; I left your files as written).** Decode `&amp;` last:

```js
return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
```

With that order UNESC-3 should pass, and UNESC-1, UNESC-2 and UNESC-4 should keep passing. I haven't run the fixed version. Keep `unescape.order.test.mjs` as the regression test.

**Not covered.** The function handles only `&amp;`, `&lt;` and `&gt;`. It ignores `&quot;`, `&#39;` and numeric entities. That is fine if the escaping side produces only those three, but worth confirming.

Files are in `/tmp/claude-0/-home-user/b8b84e58-0233-5131-8574-4629777f1214/scratchpad/h3/sand/qa-tdd-miss-unescape-order-plain`.
