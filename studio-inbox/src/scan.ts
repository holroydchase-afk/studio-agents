// SPDX-License-Identifier: MIT
// Content scan (INB-11, INB-R2, INB-R3). Fails closed. Returns a reason code, never the matched text.
// Text is normalised first: NFKC (fullwidth forms fold to ASCII) and every format character (\p{Cf}: zero-width,
// soft hyphen, bidi marks, word joiner) removed, so invisible characters cannot split a key or an address.

// Vendor-specific shapes. Also run over the stripped concatenation of several fields (see scanFields).
const PREFIXED: RegExp[] = [
  /gh[pousr]_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /xox[abprs]-[A-Za-z0-9-]{10,}/,
  /AKIA[0-9A-Z]{16}/,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /[sr]k_(?:live|test)_[A-Za-z0-9]{16,}/,
  /AIza[A-Za-z0-9_-]{35}/,
  /glpat-[A-Za-z0-9_-]{20,}/,
  /(?<![A-Za-z0-9_])npm_[A-Za-z0-9]{30,}/,
  /(?<![A-Za-z0-9_])sbp_[A-Za-z0-9]{20,}/,
  /(?<![A-Za-z0-9_])re_[A-Za-z0-9]{20,}/,
  /\/t\/[A-Za-z0-9_-]{16,}\/mcp/, // a connector URL carries the bearer token in its path
];
const SECRET: RegExp[] = [
  /(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]{20,}/,
  ...PREFIXED,
  /[0-9a-fA-F]{40,}/,
  /[A-Za-z0-9+/=]{40,}/,
];

/** A long base64url-looking run: 32+ characters using at least 3 of: upper, lower, digit, "-" or "_". Hyphenated prose has only 2. */
function looksLikeBase64url(text: string): boolean {
  for (const run of text.match(/[A-Za-z0-9_-]{32,}/g) ?? []) {
    const classes = [/[A-Z]/, /[a-z]/, /[0-9]/, /[_-]/].filter((re) => re.test(run)).length;
    if (classes >= 3) return true;
  }
  return false;
}

const LABEL = '[A-Za-z0-9-]+';
const LOCAL = '[A-Za-z0-9._%+-]+';
const EMAIL: RegExp[] = [
  new RegExp(`${LOCAL}@${LABEL}(?:\\.${LABEL})+`),
  // "name [at] example [dot] com", "name (at) example (dot) com", with "@" or "." mixed in
  new RegExp(`${LOCAL}\\s*(?:\\[at\\]|\\(at\\))\\s*${LABEL}(?:\\s*(?:\\.|\\[dot\\]|\\(dot\\)|\\s+dot\\s+)\\s*${LABEL})+`, 'i'),
  // "name at example dot com": a bare "at" needs the domain dots spelled out too, so "look at github.com" is fine
  new RegExp(`${LOCAL}\\s+at\\s+${LABEL}(?:\\s*(?:\\[dot\\]|\\(dot\\))\\s*${LABEL}|\\s+dot\\s+${LABEL})+`, 'i'),
];
const PHONE: RegExp[] = [/(?<![A-Za-z0-9])\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?![A-Za-z0-9])/, /\+\d{1,3}[\s.-]?\(?\d{1,4}\)?(?:[\s.-]?\d{2,4}){2,4}/];

export const normalize = (text: string): string => text.normalize('NFKC').replace(/\p{Cf}/gu, '');

export function scanText(raw: string): string | null {
  const text = normalize(raw);
  if (SECRET.some((re) => re.test(text)) || looksLikeBase64url(text)) return 'secret';
  if (EMAIL.some((re) => re.test(text))) return 'email';
  if (PHONE.some((re) => re.test(text))) return 'phone';
  return null;
}

/** Scans each field, then all fields joined with no separator (a key split across fields), then the vendor-key shapes over the fields with everything but letters, digits, "_" and "-" removed. */
export function scanFields(fields: readonly string[]): string | null {
  for (const f of fields) {
    const r = scanText(f);
    if (r) return r;
  }
  const joined = scanText(fields.join(''));
  if (joined) return joined;
  const stripped = fields.map((f) => normalize(f).replace(/[^A-Za-z0-9_-]/g, '')).join('');
  if (PREFIXED.some((re) => re.test(stripped))) return 'secret';
  return null;
}
