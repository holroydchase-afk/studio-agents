#!/usr/bin/env python3
"""UserPromptSubmit hook: nudge when the same kind of prompt shows up 3+ times in a day.

No model runs here. It reads the hook JSON on stdin, keeps a local log, and prints one line
(which Claude Code adds to the session) when a similar prompt has now been sent 3 or more times today.

Privacy: the log holds only the date, a count of words and short hashes of the words, never the prompt
text, so nothing readable is stored. The file is created 0600 under ~/.claude/studio/ and never leaves
the machine. Entries older than 7 days are dropped.

Env: STUDIO_REPEAT_NUDGE=off turns it off. STUDIO_NUDGE_LOG overrides the log path (tests).
STUDIO_NUDGE_MIN (default 3) and STUDIO_NUDGE_SIM (default 0.6) tune the count and the similarity.
"""
import datetime, hashlib, json, os, re, sys

STOP = set("the and for with that this from have has had you your are was were will would can could "
           "please just then than into onto about what when where which who how not but all any out "
           "now too also its it's i'm let lets get got make want need like".split())
KEEP_DAYS = 7


def tokens(text):
    words = re.findall(r"[a-z0-9][a-z0-9_'-]*", text.lower())
    return {w for w in words if len(w) > 2 and w not in STOP}


def hashes(toks):
    return sorted(hashlib.sha256(t.encode()).hexdigest()[:10] for t in toks)


def similar(a, b, threshold):
    a, b = set(a), set(b)
    return bool(a and b) and len(a & b) / len(a | b) >= threshold


def load(path, today):
    cutoff = (today - datetime.timedelta(days=KEEP_DAYS)).isoformat()
    rows = []
    try:
        with open(path) as f:
            for line in f:
                try:
                    r = json.loads(line)
                    if r["d"] >= cutoff and isinstance(r["h"], list):
                        rows.append(r)
                except (ValueError, KeyError, TypeError):
                    continue
    except OSError:
        pass
    return rows


def main():
    if os.environ.get("STUDIO_REPEAT_NUDGE", "").lower() in ("off", "0", "false"):
        return
    try:
        prompt = json.load(sys.stdin).get("prompt", "")
    except (ValueError, AttributeError):
        return
    if not isinstance(prompt, str) or prompt.lstrip().startswith("/"):
        return
    toks = tokens(prompt)
    if len(toks) < 4:  # "yes", "go", "merge it": too short to be a repeat task
        return
    path = os.environ.get("STUDIO_NUDGE_LOG") or os.path.expanduser("~/.claude/studio/prompt-log.jsonl")
    need = int(os.environ.get("STUDIO_NUDGE_MIN", "3"))
    sim = float(os.environ.get("STUDIO_NUDGE_SIM", "0.6"))
    today = datetime.date.today()
    d = today.isoformat()
    h = hashes(toks)
    rows = load(path, today)
    matches = [r for r in rows if r["d"] == d and similar(r["h"], h, sim)]
    count = len(matches) + 1
    already = any(r.get("n") for r in matches)
    nudge = count >= need and not already
    rows.append({"d": d, "h": h, **({"n": 1} if nudge else {})})
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        tmp = path + ".tmp"
        fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w") as f:
            for r in rows:
                f.write(json.dumps(r, separators=(",", ":")) + "\n")
        os.replace(tmp, path)
    except OSError:
        pass
    if nudge:
        print(f"You've asked this {count}x today. Want me to automate it? "
              "(Repeat-prompt nudge: tell the user this once, in one line, and offer a skill, a copy-paste "
              "prompt or a routine. Do nothing more unless they say yes. Drop it if they say no.)")


try:
    main()
except Exception:  # a nudge must never break a prompt
    pass
