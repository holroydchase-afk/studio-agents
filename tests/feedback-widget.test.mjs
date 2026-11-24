// Failing-first tests for templates/feedback/widget.js (docs/product/SPEC-FEEDBACK-LOOP.md, FBK-16, FBK-17).
// The file does not exist yet.
//
// MODULE SHAPE (engineer: match this)
//   An ES module (it uses `export`) at templates/feedback/widget.js with the named export
//     buildIssueUrl({repo, text, page, product}) -> string
//   plus a browser auto-init guarded by `typeof document !== "undefined"`, so importing it in Node must not throw and
//   must touch nothing. The tests copy the file to a temp .mjs before importing it (no package.json type needed).
//   buildIssueUrl: repo is "owner/name" (anything else throws). It scrubs `text` with the SAME rules as
//   tools/feedback-guard.mjs scrubText (emails, phones, URLs, key-shaped tokens -> "[removed]") and returns
//     https://github.com/<repo>/issues/new?template=feedback.yml&...   (query params URL-encoded)
//   where the scrubbed text, product and page each appear as the value of some query parameter. The raw email, phone,
//   URL and token never appear, raw or decoded, anywhere in the returned string.
//   Source rules (FBK-17): no fetch, XMLHttpRequest, sendBeacon, WebSocket, localStorage, sessionStorage, indexedDB,
//   document.cookie, no host other than github.com, and at most 4096 bytes gzipped.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WIDGET = path.join(ROOT, "templates", "feedback", "widget.js");
const GUARD = path.join(ROOT, "tools", "feedback-guard.mjs");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "feedback-widget-test-"));
process.on("exit", () => fs.rmSync(tmp, { recursive: true, force: true }));

const EMAIL = "test@" + "example.com";
const PHONE = "555-" + "010-0199";
const URL1 = "https://" + "example.com/path?q=1";
const KEY = "sk-" + "FAKE0123456789ABCDEFGHIJ";
const REPO = "holroydchase-afk/energy-scanner";

async function widget() {
  assert.ok(fs.existsSync(WIDGET), "templates/feedback/widget.js is missing");
  const copy = path.join(tmp, `widget-${Math.random().toString(36).slice(2)}.mjs`);
  fs.copyFileSync(WIDGET, copy);
  return import(pathToFileURL(copy).href);
}
const params = (u) => [...new URL(u).searchParams.entries()];
const decodedAll = (u) => params(u).map(([, v]) => v).join("\n");

test("FBK-16 importing widget.js in Node (no document) works and exports buildIssueUrl", async () => {
  const m = await widget();
  assert.equal(typeof m.buildIssueUrl, "function");
  assert.ok(/typeof\s+document/.test(fs.readFileSync(WIDGET, "utf8")), "browser auto-init must be guarded by typeof document");
});

test("FBK-16 the URL is a github.com new-issue link for repo with template=feedback.yml", async () => {
  const { buildIssueUrl } = await widget();
  const u = new URL(buildIssueUrl({ repo: REPO, text: "The Next button overlaps the photo", page: "/energy-scanner/", product: "Energy Scanner" }));
  assert.equal(u.protocol, "https:");
  assert.equal(u.host, "github.com");
  assert.equal(u.pathname, `/${REPO}/issues/new`);
  assert.equal(u.searchParams.get("template"), "feedback.yml");
});

test("FBK-16 the scrubbed text, product and page are in the query; the original email is absent", async () => {
  const { buildIssueUrl } = await widget();
  const text = `Crash after save, reach me ${EMAIL} or ${PHONE}`;
  const url = buildIssueUrl({ repo: REPO, text, page: "/energy-scanner/", product: "Energy Scanner" });
  const all = decodedAll(url);
  assert.ok(all.includes("Crash after save"), all);
  assert.ok(all.includes("[removed]"), all);
  assert.ok(all.includes("Energy Scanner") && all.includes("/energy-scanner/"), all);
  for (const hay of [url, all, decodeURIComponent(url)]) {
    assert.equal(hay.split(EMAIL).length - 1, 0, "email present");
    assert.ok(!hay.includes("example.com") && !hay.includes("0199") && !hay.includes("test@"), hay);
  }
});

test("FBK-16 URLs and key-shaped tokens are scrubbed too, same result as feedback-guard scrubText", async () => {
  const { buildIssueUrl } = await widget();
  assert.ok(fs.existsSync(GUARD), "tools/feedback-guard.mjs is missing");
  const { scrubText } = await import(pathToFileURL(GUARD).href);
  const text = `See ${URL1} and my key ${KEY} then mail ${EMAIL}`;
  const url = buildIssueUrl({ repo: REPO, text, page: "/p/", product: "Energy Scanner" });
  const all = decodedAll(url);
  assert.ok(all.includes(scrubText(text)), `expected scrubbed text ${JSON.stringify(scrubText(text))} in ${JSON.stringify(all)}`);
  for (const frag of ["example.com", "FAKE0123", "sk-"]) assert.ok(!url.includes(frag) && !all.includes(frag), frag);
});

test("FBK-16 a page or product holding PII is scrubbed too", async () => {
  const { buildIssueUrl } = await widget();
  const url = buildIssueUrl({ repo: REPO, text: "The zoom control sticks after one tap", page: `/p/?e=${EMAIL}`, product: "Energy Scanner" });
  assert.ok(!url.includes("example.com") && !decodedAll(url).includes("example.com"), url);
});

test("FBK-16 a repo that is not owner/name throws (no open redirect to another host or path)", async () => {
  const { buildIssueUrl } = await widget();
  for (const repo of ["", "evil.com", "a/b/c", "../x", "a/b?x=1", "a b/c", "a/b#h", "https://evil.com/x"]) {
    assert.throws(() => buildIssueUrl({ repo, text: "A real problem with the page", page: "/", product: "P" }), undefined, JSON.stringify(repo));
  }
});

test("FBK-16 deterministic, and ordinary text round-trips exactly", async () => {
  const { buildIssueUrl } = await widget();
  const a = { repo: REPO, text: "Plain words & symbols: 100% sure <b>ok</b>", page: "/x/", product: "Energy Scanner" };
  assert.equal(buildIssueUrl(a), buildIssueUrl({ ...a }));
  assert.ok(decodedAll(buildIssueUrl(a)).includes(a.text));
});

// ---------- FBK-17: source scan ----------
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

test("FBK-17 source has no fetch, XMLHttpRequest, sendBeacon, WebSocket or storage use", () => {
  assert.ok(fs.existsSync(WIDGET), "templates/feedback/widget.js is missing");
  const src = strip(fs.readFileSync(WIDGET, "utf8"));
  for (const w of ["fetch", "XMLHttpRequest", "sendBeacon", "WebSocket", "localStorage", "sessionStorage", "indexedDB", "EventSource"]) {
    assert.ok(!new RegExp(`\\b${w}\\b`).test(src), `uses ${w}`);
  }
  assert.ok(!/document\s*\.\s*cookie/.test(src), "uses document.cookie");
  assert.ok(!/\bimport\s*\(|\bimportScripts\b|\brequire\s*\(/.test(src), "dynamic loading");
});

test("FBK-17 source names no host except github.com, and loads no script or image from elsewhere", () => {
  assert.ok(fs.existsSync(WIDGET), "templates/feedback/widget.js is missing");
  const src = strip(fs.readFileSync(WIDGET, "utf8"));
  const hosts = [...src.matchAll(/(?:https?:)?\/\/([A-Za-z0-9.-]+)/g)].map((m) => m[1].toLowerCase());
  for (const h of hosts) assert.equal(h, "github.com", `third-party host ${h}`);
  assert.ok(!/\bimport\s[^;]*from\s*["']https?:/.test(src), "imports from a URL");
});

test("FBK-17 source is at most 4096 bytes gzipped", () => {
  assert.ok(fs.existsSync(WIDGET), "templates/feedback/widget.js is missing");
  const gz = zlib.gzipSync(fs.readFileSync(WIDGET), { level: 9 }).length;
  assert.ok(gz <= 4096, `gzipped size ${gz} > 4096`);
});
