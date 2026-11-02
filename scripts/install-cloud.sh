#!/usr/bin/env bash
# Install the studio agents and the agent run-log hook at user level ($HOME/.claude), for Claude cloud
# project sessions, which start above the cloned repos so repo .claude/ folders never load.
# Usage: bash scripts/install-cloud.sh   (run from the environment's setup script; safe to re-run)
# Agents are overwritten with the latest; settings.json keeps every existing key and hook, and is left
# untouched (with a warning, exit 0) if it isn't valid JSON of the expected shape.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
dest="$HOME/.claude"
mkdir -p "$dest/agents" "$dest/studio"
cp -f "$root"/plugins/studio/agents/*.md "$dest/agents/"
cp -f "$root/templates/scripts/log-agent-run.sh" "$dest/studio/log-agent-run.sh"
hook="run-log hook in $dest/settings.json"
rc=0; python3 - "$dest/settings.json" <<'PY' || rc=$?
import json, os, sys
path = sys.argv[1]
s = {}
try:
    if os.path.exists(path) and os.path.getsize(path) > 0:
        with open(path) as f:
            s = json.load(f)
    hooks = s.setdefault("hooks", {}) if isinstance(s, dict) else None
    pre = hooks.setdefault("PreToolUse", []) if isinstance(hooks, dict) else None
    assert isinstance(pre, list) and all(isinstance(e, dict) and isinstance(e.get("hooks", []), list)
                                         and all(isinstance(h, dict) for h in e.get("hooks", [])) for e in pre)
except (ValueError, OSError, AssertionError):
    print(f"install-cloud: warning: {path} is not valid JSON or has an unexpected shape; left it untouched, add the hook by hand")
    sys.exit(3)
cmd = ('git -C "$CLAUDE_PROJECT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1 || '
       'bash "$HOME/.claude/studio/log-agent-run.sh"; exit 0')
# Drop any earlier copy of our hook, whatever its matcher, so re-runs and old installs never double-log.
pre[:] = [e for e in pre if not any(".claude/studio/log-agent-run.sh" in str(h.get("command", "")) for h in e.get("hooks", []))]
pre.append({"matcher": "Agent|Task", "hooks": [{"type": "command", "command": cmd}]})
with open(path + ".tmp", "w") as f:
    json.dump(s, f, indent=2)
    f.write("\n")
os.replace(path + ".tmp", path)
PY
case $rc in 0) ;; 3) hook="no run-log hook (settings.json left as is)" ;; *) exit "$rc" ;; esac
n=$(ls "$root"/plugins/studio/agents/*.md | wc -l | tr -d ' ')
echo "install-cloud: $n studio agents in $dest/agents, $hook"
