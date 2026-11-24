// Studio feedback widget (docs/feedback-loop.md). A "Feedback" button and a small dialog. On send it scrubs the text
// and opens a prefilled GitHub issue-form link in a new tab. No network calls, no storage, no third-party hosts.
// Install: <script type="module" src="widget.js" data-repo="owner/name" data-product="Product Name"></script>
const REMOVED = "[removed]";
// Same rules, same order, as tools/feedback-guard.mjs scrubText. Keep them in step.
const RULES = [
  /\b(?:https?:\/\/|www\.)[^\s<>"'`)\]]+/gi,
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g,
  /\bsk-[A-Za-z0-9_-]{16,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
  /\b(?:AKIA[0-9A-Z]{12,}|xox[baprs]-[A-Za-z0-9-]{8,})/g,
  /(?=[A-Za-z0-9+/_=-]*\d)[A-Za-z0-9+/_=-]{32,}/g,
  /(?<!\d)(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/g,
];
const scrub = (s) => RULES.reduce((t, re) => t.replace(re, REMOVED), String(s ?? ""));
const one = (s) => scrub(s).replace(/\s+/g, " ").trim();

export function buildIssueUrl({ repo, text, page, product } = {}) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(String(repo)) || /^\.+$/.test(String(repo).split("/")[0]) || /^\.+$/.test(String(repo).split("/")[1])) {
    throw new Error("repo must be owner/name");
  }
  const q = new URLSearchParams({ template: "feedback.yml", what: scrub(text).trim(), page: one(page), product: one(product) });
  return `https://github.com/${repo}/issues/new?${q}`;
}

function init() {
  const s = document.currentScript || document.querySelector("script[data-repo]");
  const repo = s && s.dataset.repo;
  if (!repo) return;
  const product = s.dataset.product || document.title;
  const el = (tag, props, css) => Object.assign(document.createElement(tag), props, css ? { style: css } : {});
  const btn = el("button", { type: "button", textContent: "Feedback" }, "position:fixed;right:12px;bottom:12px;z-index:2147483000;min-height:48px;padding:0 16px;font:16px system-ui,sans-serif;border:0;border-radius:24px;background:#1f2937;color:#fff;cursor:pointer");
  const dlg = el("dialog", {}, "max-width:min(92vw,420px);padding:16px;border:1px solid #888;border-radius:12px;font:16px system-ui,sans-serif");
  dlg.setAttribute("aria-labelledby", "fbk-t");
  const title = el("h2", { id: "fbk-t", textContent: "Send feedback" }, "margin:0 0 8px;font-size:18px");
  const note = el("p", { textContent: "Opens a public GitHub issue. Please leave out personal info." }, "margin:0 0 8px;font-size:14px");
  const ta = el("textarea", { rows: 4, maxLength: 2000, ariaLabel: "What happened?" }, "width:100%;box-sizing:border-box;font:16px system-ui,sans-serif");
  const row = el("div", {}, "display:flex;gap:8px;margin-top:8px");
  const send = el("button", { type: "button", textContent: "Send" }, "min-height:48px;padding:0 16px;font-size:16px");
  const cancel = el("button", { type: "button", textContent: "Cancel" }, "min-height:48px;padding:0 16px;font-size:16px");
  row.append(send, cancel);
  dlg.append(title, note, ta, row);
  document.body.append(btn, dlg);
  btn.onclick = () => { dlg.showModal ? dlg.showModal() : dlg.setAttribute("open", ""); ta.focus(); };
  cancel.onclick = () => { dlg.close ? dlg.close() : dlg.removeAttribute("open"); btn.focus(); };
  send.onclick = () => {
    if (!ta.value.trim()) { ta.focus(); return; }
    window.open(buildIssueUrl({ repo, text: ta.value, page: location.pathname, product }), "_blank", "noopener");
    ta.value = "";
    cancel.onclick();
  };
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
}
