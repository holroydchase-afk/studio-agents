// LINT-1..10: the studio ESLint gate (docs/product/SPEC-ESLINT.md).
// ESLint-running cases skip when templates/lint/node_modules/eslint is absent,
// unless LINT_REQUIRE=1 (CI), which turns the skip into a failure.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lintDir = path.join(root, 'templates/lint');
const eslintBin = path.join(lintDir, 'node_modules/eslint/bin/eslint.js');
const configSrc = path.join(lintDir, 'eslint.config.mjs');
const required = process.env.LINT_REQUIRE === '1';
const haveEslint = fs.existsSync(eslintBin);
const skipEslint = !haveEslint && !required ? 'eslint not installed in templates/lint (set LINT_REQUIRE=1 to fail)' : false;

function needEslint() {
  assert.ok(haveEslint, 'templates/lint/node_modules/eslint is missing (LINT_REQUIRE=1)');
}

// Build a temp project, run eslint --format json, return { code, results }.
function project({ deps = [], files = {}, local, env = {}, args = [] }) {
  needEslint();
  assert.ok(fs.existsSync(configSrc), 'templates/lint/eslint.config.mjs does not exist yet');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  const dependencies = Object.fromEntries(deps.map((d) => [d, '*']));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'fx', type: 'module', dependencies }));
  fs.copyFileSync(configSrc, path.join(dir, 'eslint.config.mjs'));
  if (local !== undefined) fs.writeFileSync(path.join(dir, 'eslint.studio-local.mjs'), local);
  fs.symlinkSync(path.join(lintDir, 'node_modules'), path.join(dir, 'node_modules'));
  for (const [f, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), body);
  }
  const runEnv = { ...process.env, ...env };
  if (!('STUDIO_LINT_STRICT' in env)) delete runEnv.STUDIO_LINT_STRICT;
  const run = (extra) => {
    try {
      return { code: 0, out: execFileSync('node', [eslintBin, ...extra], { cwd: dir, env: runEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
    } catch (e) {
      return { code: e.status, out: String(e.stdout || ''), err: String(e.stderr || '') };
    }
  };
  const r = run(['--format', 'json', ...args, '.']);
  let results = [];
  try { results = JSON.parse(r.out); } catch { assert.fail(`eslint did not emit JSON (exit ${r.code}): ${r.err}`); }
  const rules = (file) => {
    const p = run(['--print-config', file]);
    return JSON.parse(p.out).rules || {};
  };
  return { code: r.code, results, rules, dir };
}
const msgs = (res, file) => (res.find((r) => path.basename(r.filePath) === file || r.filePath.endsWith(file))?.messages) || [];

const UNUSED = 'const unused = 1;\nexport {};\n';

test('LINT-1: plain JS unused var warns, exit 0', { skip: skipEslint }, () => {
  const p = project({ files: { 'a.js': UNUSED } });
  const m = msgs(p.results, 'a.js').find((x) => x.ruleId === 'no-unused-vars');
  assert.ok(m, 'no-unused-vars finding expected');
  assert.equal(m.severity, 1);
  assert.equal(p.code, 0);
});

test('LINT-2: ts any warns; js has no typescript rules', { skip: skipEslint }, () => {
  const p = project({ files: { 'a.ts': 'export const x: any = 1;\n', 'b.js': UNUSED } });
  const m = msgs(p.results, 'a.ts').find((x) => x.ruleId === '@typescript-eslint/no-explicit-any');
  assert.ok(m && m.severity === 1);
  const jsRules = Object.keys(p.rules('b.js'));
  assert.equal(jsRules.filter((r) => r.startsWith('@typescript-eslint/')).length, 0);
});

test('LINT-3: STUDIO_LINT_STRICT=1 makes findings errors, exit 1', { skip: skipEslint }, () => {
  const p = project({ files: { 'a.js': UNUSED, 'a.ts': 'export const x: any = 1;\n' }, env: { STUDIO_LINT_STRICT: '1' } });
  assert.equal(msgs(p.results, 'a.js').find((x) => x.ruleId === 'no-unused-vars').severity, 2);
  assert.equal(msgs(p.results, 'a.ts').find((x) => x.ruleId === '@typescript-eslint/no-explicit-any').severity, 2);
  assert.equal(p.code, 1);
});

const HOOKS = {
  'c.jsx': `import { useState, useEffect } from 'react';
export function A({ on }) {
  if (on) { useState(0); }
  return null;
}
export function B() {
  const [s, setS] = useState(0);
  useEffect(() => { setS(1); }, []);
  return s;
}
`,
};
test('LINT-4: react hooks rules with react dep, absent without', { skip: skipEslint }, () => {
  const withReact = project({ deps: ['react'], files: HOOKS });
  const ids = msgs(withReact.results, 'c.jsx').map((m) => m.ruleId);
  assert.ok(ids.includes('react-hooks/rules-of-hooks'), `got ${ids}`);
  assert.ok(ids.includes('react-hooks/set-state-in-effect'), `got ${ids}`);
  const without = project({ files: HOOKS });
  const r = without.rules('c.jsx');
  assert.ok(!('react-hooks/rules-of-hooks' in r));
  assert.ok(!('react-hooks/set-state-in-effect' in r));
  assert.ok(!msgs(without.results, 'c.jsx').some((m) => String(m.ruleId).startsWith('react-hooks/')));
});

const RN = { 'd.jsx': "export const A = () => <View style={{ margin: 1 }} />;\n" };
test('LINT-5: react-native/no-inline-styles with react-native or expo, absent otherwise', { skip: skipEslint }, () => {
  for (const dep of ['react-native', 'expo']) {
    const p = project({ deps: [dep], files: RN });
    assert.ok(msgs(p.results, 'd.jsx').some((m) => m.ruleId === 'react-native/no-inline-styles'), `${dep}`);
  }
  const none = project({ files: RN });
  assert.ok(!('react-native/no-inline-styles' in none.rules('d.jsx')));
});

test('LINT-6: eslint.studio-local.mjs can turn a rule off', { skip: skipEslint }, () => {
  const local = "export default [{ rules: { 'no-unused-vars': 'off' } }];\n";
  const p = project({ files: { 'a.js': UNUSED }, local });
  assert.ok(!msgs(p.results, 'a.js').some((m) => m.ruleId === 'no-unused-vars'));
  const single = project({ files: { 'a.js': UNUSED }, local: "export default { rules: { 'no-unused-vars': 'off' } };\n" });
  assert.ok(!msgs(single.results, 'a.js').some((m) => m.ruleId === 'no-unused-vars'));
});

test('LINT-7: ignored paths are never linted', { skip: skipEslint }, () => {
  const files = { 'src/ok.js': UNUSED, 'x.min.js': UNUSED };
  for (const d of ['node_modules_x', 'dist', 'build', 'coverage', '.expo', 'ios', 'android', '.next']) files[`${d}/bad.js`] = UNUSED;
  files['node_modules/pkg/bad.js'] = UNUSED;
  const p = project({ files });
  const linted = p.results.map((r) => path.relative(p.dir, r.filePath));
  assert.ok(linted.includes('src/ok.js'), 'src/ok.js must be linted');
  for (const f of linted.filter((f) => f !== 'src/ok.js' && f !== 'eslint.config.mjs')) {
    if (f === 'node_modules_x/bad.js') continue; // control: a non-ignored dir
    assert.fail(`should be ignored: ${f}`);
  }
  assert.ok(linted.includes('node_modules_x/bad.js'), 'control dir must be linted');
});

test('LINT-8: manifest entries and reusable workflow', () => {
  const m = JSON.parse(fs.readFileSync(path.join(root, 'templates/manifest.json'), 'utf8'));
  const cfg = m.entries.find((e) => e.dest === 'eslint.config.mjs');
  assert.ok(cfg, 'manifest lacks eslint.config.mjs');
  assert.equal(cfg.policy, 'managed');
  assert.equal(cfg.src, 'templates/lint/eslint.config.mjs');
  const wf = m.entries.find((e) => e.dest === '.github/workflows/lint.yml');
  assert.ok(wf, 'manifest lacks lint.yml');
  assert.equal(wf.policy, 'seed');
  for (const e of [cfg, wf]) assert.ok(fs.existsSync(path.join(root, e.src)), `missing source ${e.src}`);
  const y = fs.readFileSync(path.join(lintDir, 'lint.yml'), 'utf8');
  assert.match(y, /workflow_call:/);
  assert.match(y, /working-directory:/);
  assert.match(y, /strict:/);
  assert.match(y, /npm ci/);
  assert.match(y, /STUDIO_LINT_STRICT:.*strict/);
});

test('LINT-9: template package.json pins eslint 9 and lists the plugins', () => {
  const dev = JSON.parse(fs.readFileSync(path.join(lintDir, 'package.json'), 'utf8')).devDependencies;
  assert.match(dev.eslint, /^\^9\./);
  for (const k of ['typescript-eslint', '@eslint/js', 'globals', 'eslint-plugin-react-hooks', 'eslint-plugin-react-native']) assert.ok(dev[k], k);
});

test('LINT-10: CI job lint-config runs with LINT_REQUIRE=1', () => {
  const y = fs.readFileSync(path.join(root, '.github/workflows/checks.yml'), 'utf8');
  const i = y.search(/^ {2}lint-config:/m);
  assert.ok(i >= 0, 'checks.yml has no lint-config job');
  const rest = y.slice(i + 1);
  const next = rest.search(/^ {2}[a-z][\w-]*:/m);
  const job = next >= 0 ? rest.slice(0, next) : rest;
  assert.match(job, /LINT_REQUIRE:\s*['"]?1/);
  assert.match(job, /templates\/lint/);
  assert.match(job, /npm ci/);
  assert.match(job, /lint-config\.test\.mjs/);
});
