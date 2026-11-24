// guard: shared safety rules for the stakeholder tools (repo-check now; claim-check and intake reuse it).
// Plain Node, no packages, no network, never executes anything it reads. Secret and personal-data patterns live
// only in this file.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const MAX_BYTES = 1048576; // 1 MB per file read
export const MAX_FILES_WALKED = 5000;
export const MAX_FILES_READ = 200;
export const MAX_DIRS = 5000;
export const MAX_SYMLINKS = 5000;
export const MAX_DEPTH = 200;
export const MAX_NAME = 80;

// Anything printed that came from a file name or the command line shows control characters as \uXXXX.
export const esc = (v) => String(v).replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069\ufeff]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));

// A refusal carries an exit code (1 refused or failed, 2 usage) and one reason per line.
export class Refusal extends Error {
  constructor(lines, code = 1) { super(Array.isArray(lines) ? lines.join("\n") : String(lines)); this.lines = Array.isArray(lines) ? lines : [String(lines)]; this.code = code; }
}
export const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// ---- secrets and personal data (the scan names file, line and category, never the matched value)
const RESERVED_HOSTS = ["example.com", "example.org", "example.net"];
const RESERVED_TLDS = ["test", "invalid"];
const FILE_LIKE_TLDS = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp", "css", "js", "json", "ts", "md", "html"]);
const EMAIL_LOCAL = /[A-Za-z0-9._%+-]/;
const EMAIL_HOST = /[A-Za-z0-9.-]/;
const KEY_PATTERNS = [
  /ghp_[A-Za-z0-9]{36}/,
  /github_pat_[A-Za-z0-9_]{22,}/,
  /AKIA[0-9A-Z]{16}/,
  /xox[abprs]-[A-Za-z0-9-]{10,}/,
  /\bsk-[A-Za-z0-9_-]{20,}/,
  /(?<![A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/,
  /\b(?:api[_-]?key|token|secret|password)\s*[:=]\s*["']?[A-Za-z0-9_\-/+=]{20,}/i,
];
const PEM = /-----BEGIN [A-Z ]*PRIVATE KEY-----/;
const PHONE = /(?<![\w.-])(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}(?![\w-])/;

function emailsIn(line) {
  const found = [];
  let at = line.indexOf("@");
  while (at !== -1) {
    let s = at; while (s > 0 && at - s < 64 && EMAIL_LOCAL.test(line[s - 1])) s--;
    let e = at + 1; while (e < line.length && e - at < 255 && EMAIL_HOST.test(line[e])) e++;
    let host = line.slice(at + 1, e).replace(/[.-]+$/, "");
    const local = line.slice(s, at);
    if (local && /^[A-Za-z0-9]/.test(host) && host.includes(".")) {
      const tld = host.slice(host.lastIndexOf(".") + 1);
      if (/^[A-Za-z]{2,}$/.test(tld) && !FILE_LIKE_TLDS.has(tld.toLowerCase())) found.push(`${local}@${host}`);
    }
    at = line.indexOf("@", at + 1);
  }
  return found;
}
const isReserved = (addr) => {
  const host = addr.slice(addr.indexOf("@") + 1).toLowerCase();
  if (RESERVED_HOSTS.some((h) => host === h || host.endsWith("." + h))) return true;
  if (RESERVED_TLDS.includes(host.slice(host.lastIndexOf(".") + 1))) return true;
  if (/^git@(github\.com|gitlab\.com|bitbucket\.org)$/i.test(addr)) return true;
  return host === "noreply.github.com" || host.endsWith(".noreply.github.com");
};

// text -> { hits: [{line, category}], allowed: Map(address -> count) }
export function scanText(text, allow = new Set()) {
  const hits = []; const allowed = new Map();
  const lines = text.split("\n");
  lines.forEach((ln, i) => {
    const line = i + 1;
    for (const addr of emailsIn(ln)) {
      if (isReserved(addr)) continue;
      if (allow.has(addr.toLowerCase())) { allowed.set(addr.toLowerCase(), (allowed.get(addr.toLowerCase()) || 0) + 1); continue; }
      hits.push({ line, category: "email address" });
    }
    if (PEM.test(ln)) hits.push({ line, category: "private key block" });
    if (KEY_PATTERNS.some((p) => p.test(ln))) hits.push({ line, category: "key, token or secret" });
    if (PHONE.test(ln)) hits.push({ line, category: "phone number" });
  });
  return { hits, allowed };
}

// A name or ref that is about to be printed: an email or token in it is replaced by a short hash, control characters
// are shown as \\uXXXX, and it is cut to 80 characters.
export function safeName(v, max = MAX_NAME) {
  const s = String(v);
  const raw = scanText(s).hits.length ? `[redacted ${crypto.createHash("sha256").update(s, "utf8").digest("hex").slice(0, 8)}]` : esc(s);
  return raw.length > max ? raw.slice(0, max - 3) + "..." : raw;
}

// ---- safe walk: lstat only, symlinks never followed. Only a top-level .git is skipped; node_modules and nested .git are scanned.
// Returns { entries: [{rel, size}], skipped: [{file, reason}], unscanned: [{file, reason}] }.
// skipped holds things that cannot hold text (symlinks, odd files, the top-level .git); unscanned holds things that might
// but could not be read (fail closed: the caller refuses unless told otherwise). Caps refuse with a reason.
export function walkTree(root, { dirAsFile = () => false } = {}) {
  const entries = []; const skipped = []; const unscanned = []; let count = 0, dirs = 0, links = 0;
  const walk = (dir, relDir, depth) => {
    let names;
    try { names = fs.readdirSync(dir).sort(cmp); } catch { unscanned.push({ file: safeName(relDir || "."), reason: "unreadable directory" }); return; }
    for (const name of names) {
      const rel = relDir ? `${relDir}/${name}` : name;
      const full = path.join(dir, name);
      let st; try { st = fs.lstatSync(full); } catch { unscanned.push({ file: safeName(rel), reason: "unreadable" }); continue; }
      if (st.isSymbolicLink()) {
        if (++links > MAX_SYMLINKS) throw new Refusal(`too many symlinks: more than ${MAX_SYMLINKS} (cap ${MAX_SYMLINKS}); nothing was truncated`);
        skipped.push({ file: safeName(rel), reason: "symlink not followed" }); continue;
      }
      if (st.isDirectory()) {
        if (!relDir && name === ".git") { skipped.push({ file: ".git", reason: "top-level .git directory not scanned" }); continue; }
        if (dirAsFile(rel)) { skipped.push({ file: safeName(rel), reason: "a directory where a file is expected" }); continue; }
        if (++dirs > MAX_DIRS) throw new Refusal(`too many directories: more than ${MAX_DIRS} (cap ${MAX_DIRS}); nothing was truncated`);
        if (depth + 1 > MAX_DEPTH) throw new Refusal(`too deep: directories nested more than ${MAX_DEPTH} levels (depth cap ${MAX_DEPTH}); nothing was truncated`);
        walk(full, rel, depth + 1); continue;
      }
      if (++count > MAX_FILES_WALKED) throw new Refusal(`too many files: more than ${MAX_FILES_WALKED} (cap ${MAX_FILES_WALKED}); nothing was truncated`);
      if (!st.isFile()) { skipped.push({ file: safeName(rel), reason: "not a regular file" }); continue; }
      entries.push({ rel, size: st.size });
    }
  };
  walk(root, "", 0);
  return { entries, skipped, unscanned };
}

// Decodes a buffer: UTF-16 with a BOM (LE or BE) is decoded; anything else with a NUL byte is binary (null).
function decode(buf) {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return buf.subarray(2, 2 + ((buf.length - 2) & ~1)).toString("utf16le");
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) { const b = Buffer.from(buf.subarray(2, 2 + ((buf.length - 2) & ~1))); b.swap16(); return b.toString("utf16le"); }
  if (buf.includes(0)) return null;
  return buf.toString("utf8");
}

// Reads every regular file within the cap. Binary (a NUL byte, no BOM), oversize and unreadable files are pushed to
// `unscanned` with a reason, never silently dropped.
export function readTexts(root, entries, unscanned) {
  const texts = new Map(); let reads = 0;
  for (const e of entries) {
    if (e.size > MAX_BYTES) { unscanned.push({ file: safeName(e.rel), reason: "over 1 MB, not scanned" }); continue; }
    if (++reads > MAX_FILES_READ) throw new Refusal(`too many files to read: more than ${MAX_FILES_READ} (cap ${MAX_FILES_READ}); nothing was truncated`);
    let buf; try { buf = fs.readFileSync(path.join(root, ...e.rel.split("/"))); } catch { unscanned.push({ file: safeName(e.rel), reason: "unreadable" }); continue; }
    const t = decode(buf);
    if (t === null) { unscanned.push({ file: safeName(e.rel), reason: "binary file, not scanned" }); continue; }
    texts.set(e.rel, t);
  }
  return texts;
}

// Random temp name, created exclusively (never through a planted link) with mode 0600, then renamed; never half-written.
export function writeAtomic(file, text) {
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.tmp-${crypto.randomBytes(8).toString("hex")}`);
  let fd = null;
  try {
    fd = fs.openSync(tmp, "wx", 0o600);
    fs.writeFileSync(fd, text); fs.closeSync(fd); fd = null;
    fs.renameSync(tmp, file);
  } catch {
    if (fd !== null) { try { fs.closeSync(fd); } catch {} }
    try { fs.rmSync(tmp, { force: true }); } catch {}
    throw new Refusal(`cannot write ${safeName(path.basename(file))}`);
  }
}

// True when two output paths name the same file (spelling, .. and symlinked folders resolved).
export function samePath(a, b) {
  const real = (p) => { const r = path.resolve(p); try { return path.join(fs.realpathSync(path.dirname(r)), path.basename(r)); } catch { return r; } };
  return real(a) === real(b);
}

// Runs a tool's main(argv); turns a Refusal into stderr lines and an exit code. Never prints a stack trace.
export function runMain(main) {
  try { main(process.argv.slice(2)); }
  catch (e) {
    if (e instanceof Refusal) { process.stderr.write(e.lines.map((l) => l + "\n").join("")); process.exit(e.code); }
    process.stderr.write("failed: unexpected error\n"); process.exit(1);
  }
}
