// SPDX-License-Identifier: MIT
// INB-11 content scan. All "secrets" here are built from repeated letters: fake, not real shapes of live keys.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const scan = async (t: string) => (await import('../src/scan.ts')).scanText(t);

const blocked: Array<[string, string]> = [
  ['sk- API key', 'sk-' + 'a'.repeat(32)],
  ['sk-proj style key', 'sk-proj-' + 'a'.repeat(30) + '_' + 'b'.repeat(10)],
  ['GitHub ghp_ token', 'ghp_' + 'a'.repeat(36)],
  ['GitHub fine-grained token', 'github_pat_' + 'a'.repeat(22) + '_' + 'b'.repeat(40)],
  ['Slack xoxb token', 'xoxb-' + '1'.repeat(12) + '-' + 'a'.repeat(24)],
  ['Slack xoxp token', 'xoxp-' + '1'.repeat(12) + '-' + 'a'.repeat(24)],
  ['AWS access key id', 'AKIA' + 'A'.repeat(16)],
  ['JWT', 'eyJ' + 'a'.repeat(20) + '.eyJ' + 'b'.repeat(20) + '.' + 'c'.repeat(20)],
  ['private key block (generic)', '-----BEGIN PRIVATE KEY-----'],
  ['private key block (RSA)', '-----BEGIN RSA PRIVATE KEY-----'],
  ['private key block (OpenSSH)', '-----BEGIN OPENSSH PRIVATE KEY-----'],
  ['private key block (EC)', '-----BEGIN EC PRIVATE KEY-----'],
  ['40 hex characters', '0123456789abcdef0123456789abcdef01234567'],
  ['64 hex characters', '0123456789abcdef'.repeat(4)],
  ['40 base64 characters', 'AbCdEfGhIj'.repeat(4)],
  ['base64 with + / and = padding', 'AbCd+fGh/jKlMnOpQrStUvWxYz0123456789abcd=='],
  ['email address', 'someone@example.com'],
  ['email with plus and subdomain, upper case', 'First.Last+tag@Sub.Example.CO.UK'],
  ['phone (555) 123-4567', '(555) 123-4567'],
  ['phone 555-123-4567', '555-123-4567'],
  ['phone +1 555 123 4567', '+1 555 123 4567'],
  ['phone +44 20 7946 0958', '+44 20 7946 0958'],
  ['phone 555.123.4567', '555.123.4567'],
];
for (const [name, secret] of blocked) {
  test(`INB-11 scanText blocks ${name}, alone and inside a sentence, and the reason never echoes it`, async () => {
    for (const text of [secret, `Please use ${secret} for the setup, thanks.`, `line one\nline two ${secret}\nline three`]) {
      const reason = await scan(text);
      assert.equal(typeof reason, 'string', `not blocked: ${text.slice(0, 50)}`);
      assert.ok((reason as string).length > 0);
      assert.ok(!(reason as string).includes(secret), 'reason echoes the match');
      assert.ok(!(reason as string).includes(secret.slice(0, 12)), 'reason echoes part of the match');
    }
  });
}

const clean: Array<[string, string]> = [
  ['ordinary sentence', 'Shipped the new sign-in screen; please review when you can.'],
  ['PR numbers', 'Merged PR #123 and #4567, closes issues 12, 34 and 56.'],
  ['short git hashes', 'Fixed in commit abc1234 and again in 9f8e7d6c5b4a.'],
  ['39 hex characters (under the 40 threshold)', 'checksum 0123456789abcdef0123456789abcdef0123456 ok'],
  ['https URL', 'See https://github.com/example/repo/pull/123 for details.'],
  ['long URL with hyphenated words', 'Read https://example.com/docs/how-to-write-a-good-handoff-note-for-the-next-session today.'],
  ['dates and times', 'Due 2026-11-26 at 10:00, or 2026-11-26T10:00:00Z at the latest.'],
  ['version numbers', 'Bumped to v1.2.3 and then 10.20.30.'],
  ['test counts', 'Tests: 23 passed, 0 failed in 1.4s, 118 assertions.'],
  ['spec ids', 'INB-12 and INB-13 are covered; see SPEC-STUDIO-INBOX.md.'],
  ['words that contain sk-', 'A risk-based plan with a task-list and a mask-less default.'],
  ['xoxo as a sign-off', 'Thanks all, xoxo'],
  ['the word AKIA in prose', 'AKIA is a prefix we scan for.'],
  ['money and percentages', 'Costs $1,234.56 a month, up 12% from 1,000.'],
  ['at-mentions without a domain', 'Ping @alpha-team about it, and cc @beta.'],
  ['file paths', 'Edit studio-inbox/src/inbox.ts and docs/product/SPEC-STUDIO-INBOX.md.'],
  ['code-ish words', 'Call createInbox() then inbox.read({ack: true}) twice.'],
  ['short numbers that are not phones', 'Ports 8123 and 8080, 3 retries, 120 chars.'],
  ['a 30 character identifier', 'projectNameCursorRetentionLimit'],
  ['the word BEGIN without a key block', 'BEGIN the migration, then END it.'],
  ['empty-ish text', 'ok'],
];
for (const [name, text] of clean) {
  test(`INB-11 scanText passes clean text: ${name}`, async () => {
    assert.equal(await scan(text), null);
  });
}

test('INB-11 scanText returns null (not undefined, not "") for clean text', async () => {
  assert.strictEqual(await scan('hello there'), null);
});

test('INB-11 scanText is stable: same input, same reason', async () => {
  const t = 'mail someone@example.com';
  assert.equal(await scan(t), await scan(t));
});

test('INB-11 scanText handles a very long clean text (2000 words) without throwing', async () => {
  assert.equal(await scan('lorem ipsum '.repeat(170).slice(0, 2000)), null);
});
