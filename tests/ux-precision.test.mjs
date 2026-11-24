// UXPREC-1..8: the ux-reviewer's "Scope and severity" paragraph carries a precision rule so it stops over-flagging
// (0 of 16 clean screens passed). Assertions read only that paragraph, with loose case-insensitive regexes.
// Run: node --test tests/ux-precision.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const paragraph = () => {
  const md = readFileSync(join(root, "plugins", "studio", "agents", "ux-reviewer.md"), "utf8");
  const p = md.split(/\n\s*\n/).find((b) => /^\s*\*\*Scope and severity\.?\*\*/i.test(b));
  assert.ok(p, "no 'Scope and severity' paragraph in ux-reviewer.md");
  return p;
};

test("UXPREC-1 a P1 needs all three: quoted words or pixels in the screenshot, a blocked persona task, no product rule making it deliberate", () => {
  const p = paragraph();
  assert.match(p, /P1[^.]{0,120}(all three|all of (these|the following)|each of)/i, "P1 must require all three conditions");
  assert.match(p, /quot\w*[^.]{0,80}(words|text|pixels?)|(words|text|pixels?)[^.]{0,80}quot\w*/i, "needs quoted words or pixels");
  assert.match(p, /visible in the (screenshot|shot|image)|in the (screenshot|shot|image)/i, "evidence must be visible in the screenshot");
  assert.match(p, /(task|job)[^.]{0,120}(blocks?|hides?|hidden|gets? wrong)|(blocks?|hides?|gets? wrong)[^.]{0,120}(task|job)/i, "needs a persona task it blocks, hides or gets wrong");
  assert.match(p, /(no|not|nothing)[^.]{0,80}(product |documented )?rule[^.]{0,80}(on purpose|deliberate|intentional|requires)/i, "needs no product rule saying it is on purpose");
});

test("UXPREC-2 anything estimated by eye that ux-rules.mjs did not measure is P2", () => {
  const p = paragraph();
  assert.match(p, /(by eye|eyeball|estimated|visual estimate)/i, "mentions estimating by eye");
  assert.match(p, /(tap|touch)[ -]?(target )?size|tap size/i, "names tap size");
  assert.match(p, /contrast/i, "names contrast");
  assert.match(p, /spacing/i, "names spacing");
  assert.match(p, /ux-rules(\.mjs)?[^.]{0,120}(not|n't|never)[^.]{0,40}measur|(not|n't|never)[^.]{0,40}measur\w*[^.]{0,80}ux-rules|ux-rules[^.]{0,80}did not/i, "only counts if ux-rules.mjs measured it");
  assert.match(p, /(by eye|estimated|eyeball)[^]{0,300}P2|P2[^]{0,300}(by eye|estimated|eyeball)/i, "by-eye estimates are P2");
});

test("UXPREC-3 read the product's own rules first; a documented product rule's requirement is not a finding", () => {
  const p = paragraph();
  assert.match(p, /CLAUDE\.md/, "names CLAUDE.md");
  assert.match(p, /docs\/design/, "names docs/design");
  assert.match(p, /(read|check)[^.]{0,120}(first|before)|(first|before)[^.]{0,60}\bread/i, "read them first");
  assert.match(p, /(requires?|mandates?|documented)[^.]{0,120}(not a finding|never a finding|isn't a finding|is not a finding|don't flag|do not flag)|(not a finding|never a finding|don't flag|do not flag)[^.]{0,120}(requires?|documented)/i, "documented requirement is not a finding");
});

test("UXPREC-4 more than two P1s on one screen means re-rank before writing them", () => {
  const p = paragraph();
  assert.match(p, /(more than (two|2)|(three|3) or more|over (two|2)|>\s*2)[^.]{0,60}P1/i, "names the more-than-two-P1s threshold");
  assert.match(p, /re-?rank/i, "says re-rank");
  assert.match(p, /(one|a|each|per|same) (screen|page)/i, "scoped to one screen");
});

test("UXPREC-5 a screen with no P0 or P1 scores 8 or more", () => {
  const p = paragraph();
  assert.match(p, /no P0 (or|and|nor) P1[^.]{0,80}(score|rate)\w*[^.]{0,40}\b(8|eight)\b|(score|rate)\w*[^.]{0,40}\b(8|eight)\b[^.]{0,80}no P0 (or|and|nor) P1/i, "no P0/P1 scores 8");
  assert.match(p, /\b(8|eight)\b[^.]{0,20}(or (more|higher|above)|\+)|at least (8|eight)/i, "8 or more");
});

test("UXPREC-6 demo scaffolding on the first screen is a finding: nudge, don't instruct (Chase, Nov 22)", () => {
  const p = paragraph();
  assert.match(p, /demo (chrome|bar|scaffolding)/i, "names demo scaffolding");
  assert.match(p, /do not (rate|judge) its tap sizes/i, "bar's own tap sizes are not rated");
  assert.match(p, /(clutter|crowd)/i, "instruction text and pitch bullets count as clutter");
  assert.match(p, /nudge/i, "propose a nudge");
  assert.match(p, /pulsing dot|highlight/i, "example nudge");
  assert.doesNotMatch(p, /out of scope unless it (covers|pushes)/i, "no longer out of scope");
});

test("UXPREC-7 when a product rule says who sees which variant, do not ask the user which", () => {
  const p = paragraph();
  assert.match(p, /DEC-66/, "cites the Hearth viewer/parent rule");
  assert.match(p, /do not ask/i, "says do not ask");
});

test("UXPREC-8 Ready is allowed when no P0 or P1 survives; P2s do not hold it back, a real P1 is never softened", () => {
  const p = paragraph();
  assert.match(p, /Ready is allowed/i, "Ready is allowed");
  assert.match(p, /do not hold Ready back for P2/i, "P2s do not block Ready");
  assert.match(p, /never softened/i, "a real P1 is not softened");
});
