// SPDX-License-Identifier: MIT
// Usage: node scripts/tokens.ts [--host inbox.example.com] project...
// Prints a fresh token per project, the INBOX_TOKENS secret value and one connector URL per project. Writes nothing to disk.
import { randomBytes } from 'node:crypto';

const NAME_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;
const HOST_RE = /^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?(:\d{1,5})?$/;
const usage = 'usage: node scripts/tokens.ts [--host inbox.example.com] project...  (names: a-z 0-9 -, up to 32 characters, no duplicates)';

function die(msg: string): never {
  process.stderr.write(`${msg}\n${usage}\n`);
  process.exit(1);
}

let host = 'inbox.example.com';
const names: string[] = [];
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i] as string;
  if (a === '--host') {
    const v = argv[++i];
    if (!v || !HOST_RE.test(v)) die('--host needs a host name such as inbox.example.com');
    host = v;
  } else if (a.startsWith('--')) {
    die(`unknown option ${a}`);
  } else {
    names.push(a);
  }
}
if (names.length === 0) die('give at least one project name');
for (const n of names) if (!NAME_RE.test(n)) die(`bad project name: ${n.slice(0, 40)}`);
if (new Set(names).size !== names.length) die('duplicate project names');

const pairs = names.map((n) => [n, randomBytes(32).toString('base64url')] as const);
const out = [
  'INBOX_TOKENS value (store it as a secret, never commit it):',
  pairs.map(([n, t]) => `${n}:${t}`).join(','),
  '',
  'Connector URL per project (each one is a password; give each project only its own):',
  ...pairs.map(([n, t]) => `${n}  https://${host}/t/${t}/mcp`),
];
process.stdout.write(out.join('\n') + '\n');
