// SPDX-License-Identifier: MIT
// INB-21: scripts/tokens.ts. `npm run tokens -- <project...> --host <host>`
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SCRIPT = join(ROOT, 'scripts', 'tokens.ts');
const HOST = 'inbox.example.workers.dev';

function run(args: string[], cwd: string = ROOT) {
  assert.ok(existsSync(SCRIPT), 'scripts/tokens.ts does not exist');
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8', env: process.env });
  return { status: r.status, out: r.stdout, err: r.stderr };
}

function snapshot(dir: string, skip: string[] = ['node_modules']): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (skip.includes(e.name)) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(`${p}:${statSync(p).size}:${statSync(p).mtimeMs}`);
    }
  };
  walk(dir);
  return out.sort();
}

const TOKEN_RE = /[A-Za-z0-9_-]{43}/;
function secretValue(out: string): string {
  const m = out.match(/([a-z0-9][a-z0-9-]{0,31}:[A-Za-z0-9_-]{43}(?:,[a-z0-9][a-z0-9-]{0,31}:[A-Za-z0-9_-]{43})*)/);
  assert.ok(m, `no INBOX_TOKENS value (project:token,project:token) in output:\n${out}`);
  return m[1] as string;
}

test('INB-21 prints the INBOX_TOKENS secret value: project:token pairs, in the order given, tokens are 43-char base64url (32 bytes)', () => {
  const r = run(['alpha', 'beta', '--host', HOST]);
  assert.equal(r.status, 0, r.err);
  assert.match(r.out, /INBOX_TOKENS/);
  const value = secretValue(r.out);
  const pairs = value.split(',').map((p) => p.split(':') as [string, string]);
  assert.deepEqual(pairs.map((p) => p[0]), ['alpha', 'beta']);
  for (const [, t] of pairs) {
    assert.match(t, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(Buffer.from(t, 'base64url').length, 32);
  }
  assert.notEqual(pairs[0]![1], pairs[1]![1], 'tokens must differ per project');
});

test('INB-21 prints one connector URL per project containing /t/<that project\'s token>/mcp and the host', () => {
  const r = run(['alpha', 'beta', 'gamma', '--host', HOST]);
  assert.equal(r.status, 0, r.err);
  const pairs = secretValue(r.out).split(',').map((p) => p.split(':') as [string, string]);
  assert.equal(pairs.length, 3);
  for (const [project, token] of pairs) {
    const url = `https://${HOST}/t/${token}/mcp`;
    assert.ok(r.out.includes(url), `missing connector URL for ${project}: expected ${url.replace(token, '<token>')}`);
    const line = r.out.split('\n').find((l) => l.includes(url))!;
    assert.ok(line.includes(project), `the URL line should name its project: ${line.replace(token, '<token>')}`);
  }
});

test('INB-21 every run generates fresh tokens', () => {
  const a = secretValue(run(['alpha', '--host', HOST]).out);
  const b = secretValue(run(['alpha', '--host', HOST]).out);
  assert.notEqual(a, b);
});

test('INB-21 the printed secret value is accepted by parseTokens (valid names, long enough, unique)', async () => {
  const { parseTokens } = await import('../src/config.ts');
  const m = parseTokens(secretValue(run(['alpha', 'beta', 'gamma', '--host', HOST]).out));
  assert.equal(m.size, 3);
});

test('INB-21 writes nothing to disk: the package folder and the working directory are unchanged', () => {
  const before = snapshot(ROOT);
  const cwd = mkdtempSync(join(tmpdir(), 'inbox-tokens-'));
  const r1 = run(['alpha', 'beta', '--host', HOST]);
  const r2 = run(['alpha', 'beta', '--host', HOST], cwd);
  assert.equal(r1.status, 0, r1.err);
  assert.equal(r2.status, 0, r2.err);
  assert.deepEqual(snapshot(ROOT), before);
  assert.deepEqual(readdirSync(cwd), []);
});

test('INB-21 tokens go to stdout only for the secret and URLs; stderr carries no token', () => {
  const r = run(['alpha', '--host', HOST]);
  assert.equal(r.status, 0, r.err);
  assert.ok(!TOKEN_RE.test(r.err), 'stderr contains something token-shaped');
});

test('INB-21 an invalid project name exits non-zero and prints no token', () => {
  const r = run(['Bad_Name', '--host', HOST]);
  assert.notEqual(r.status, 0);
  assert.ok(!TOKEN_RE.test(r.out), 'printed a token for an invalid project');
  assert.ok(!/Cannot find module/.test(r.err));
});

test('INB-21 duplicate project names exit non-zero (they would make an invalid INBOX_TOKENS)', () => {
  const r = run(['alpha', 'alpha', '--host', HOST]);
  assert.notEqual(r.status, 0);
  assert.ok(!/Cannot find module/.test(r.err));
});

test('INB-21 no projects exits non-zero with a usage message', () => {
  const r = run(['--host', HOST]);
  assert.notEqual(r.status, 0);
  assert.ok(/usage|project/i.test(r.err + r.out));
  assert.ok(!TOKEN_RE.test(r.out));
});
