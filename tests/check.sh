#!/usr/bin/env bash
# Checks for the studio plugin, templates and scripts. Run: bash tests/check.sh
# Needs bash, git, python3. Exits 1 if any check fails.
set -uo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
pass=0; fail=0
ok()  { pass=$((pass+1)); echo "ok   $1"; }
bad() { fail=$((fail+1)); echo "FAIL $1"; }
check() { local name="$1"; shift; if "$@" >"$tmp/out" 2>&1; then ok "$name"; else bad "$name"; sed 's/^/     /' "$tmp/out"; fi; }

field() { # field <file> <key>: value of a frontmatter key, empty if missing
  awk -v k="$2" 'NR==1&&$0!="---"{exit} NR>1&&$0=="---"{exit} NR>1&&index($0,k": ")==1{print substr($0,length(k)+3)}' "$1"
}

# Every agent: frontmatter name matches the file, a description, a tools line.
for f in "$root"/plugins/studio/agents/*.md; do
  a="$(basename "$f" .md)"
  check "agent $a: frontmatter name, description, tools" \
    test "$(field "$f" name)" = "$a" -a -n "$(field "$f" description)" -a -n "$(field "$f" tools)"
  check "agent $a: listed in the README" grep -q "\`$a\`" "$root/README.md"
done

# Every skill: SKILL.md with a name matching its folder and a description.
for d in "$root"/plugins/studio/skills/*/; do
  s="$(basename "$d")"
  check "skill $s: SKILL.md name and description" \
    test -f "$d/SKILL.md" -a "$(field "$d/SKILL.md" name)" = "$s" -a -n "$(field "$d/SKILL.md" description)"
done

# JSON is valid, and the marketplace entry matches the plugin.
check "plugin.json, marketplace.json and claude-settings.json parse and agree" python3 - "$root" <<'PY'
import json, sys, pathlib
r = pathlib.Path(sys.argv[1])
plugin = json.loads((r / "plugins/studio/.claude-plugin/plugin.json").read_text())
market = json.loads((r / ".claude-plugin/marketplace.json").read_text())
json.loads((r / "templates/claude-settings.json").read_text())
entry = next(p for p in market["plugins"] if p["name"] == plugin["name"])
assert entry["description"] == plugin["description"], "marketplace description differs from plugin.json"
assert (r / entry["source"]).is_dir(), "marketplace source folder missing"
PY

# sync.sh: copies every agent, keeps project-only agents, rejects unknown names.
repo="$tmp/repo"; mkdir -p "$repo/.claude/agents"; echo local > "$repo/.claude/agents/project-only.md"
check "sync.sh copies all agents" bash "$root/scripts/sync.sh" "$repo"
check "sync.sh: every product agent present and identical" diff -r -x project-only.md -x orchestrator.md -x focus-coach.md "$root/plugins/studio/agents" "$repo/.claude/agents"
check "sync.sh skips studio-only agents by default" test ! -e "$repo/.claude/agents/orchestrator.md" -a ! -e "$repo/.claude/agents/focus-coach.md"
check "sync.sh copies a studio-only agent when named" bash -c "bash '$root/scripts/sync.sh' '$repo' orchestrator >/dev/null && test -f '$repo/.claude/agents/orchestrator.md' && rm '$repo/.claude/agents/orchestrator.md'"
check "sync.sh keeps project-only agents" grep -qx local "$repo/.claude/agents/project-only.md"
check "sync.sh fails on an unknown agent name" bash -c "! bash '$root/scripts/sync.sh' '$repo' no-such-agent"
check "sync.sh names the unknown agent" bash -c "bash '$root/scripts/sync.sh' '$repo' no-such-agent 2>&1 | grep -q 'unknown agent: no-such-agent'"

# install-rules.sh: installs both files, and never overwrites on a second run.
r2="$tmp/rules"; mkdir -p "$r2"
check "install-rules.sh installs the hook and the PR check" bash -c "bash '$root/scripts/install-rules.sh' '$r2' && test -f '$r2/.claude/settings.json' -a -f '$r2/.github/workflows/handoff-check.yml' -a -f '$r2/.github/workflows/agents-check.yml'"
echo '{"mine":true}' > "$r2/.claude/settings.json"
check "install-rules.sh keeps an existing settings.json" bash -c "bash '$root/scripts/install-rules.sh' '$r2' | grep -q 'kept existing .claude/settings.json' && grep -q mine '$r2/.claude/settings.json'"

check "install-rules.sh installs the shared checks and their config" test -f "$r2/scripts/check-agents.sh" -a -f "$r2/scripts/check-logs.mjs" -a -f "$r2/studio-checks.json"
check "studio-checks.json template parses" python3 -c 'import json,sys;json.load(open(sys.argv[1]))["logs"]["roots"]' "$root/templates/studio-checks.json"

# check-agents.sh: passes a matching roster in either table shape, fails both kinds of drift.
a="$tmp/agents"; mkdir -p "$a/scripts" "$a/.claude/agents"; cp "$root/templates/scripts/check-agents.sh" "$a/scripts/"
touch "$a/.claude/agents/staff-pm.md" "$a/.claude/agents/qa-tdd.md"
printf '| Moment | Agent |\n|---|---|\n| Planning | `staff-pm` |\n| Tests | `qa-tdd` |\n' > "$a/CLAUDE.md"
check "check-agents.sh passes the studio table" bash "$a/scripts/check-agents.sh"
printf '| Agent | Role |\n|---|---|\n| `staff-pm` | plans |\n| `qa-tdd` | tests |\n' > "$a/CLAUDE.md"
check "check-agents.sh passes a name-first roster" bash "$a/scripts/check-agents.sh"
touch "$a/.claude/agents/engineer.md"
check "check-agents.sh fails an agent missing from CLAUDE.md" bash -c "bash '$a/scripts/check-agents.sh' | grep -q \"'engineer' is missing\""
rm "$a/.claude/agents/engineer.md" "$a/.claude/agents/qa-tdd.md"
check "check-agents.sh fails a CLAUDE.md row with no agent file" bash -c "bash '$a/scripts/check-agents.sh' | grep -q \"lists 'qa-tdd'\""

f="$tmp/fresh"; mkdir -p "$f"; bash "$root/scripts/sync.sh" "$f" >/dev/null; bash "$root/scripts/install-rules.sh" "$f" >/dev/null; cp "$root/templates/CLAUDE-agents.md" "$f/CLAUDE.md"
check "check-agents.sh passes a fresh repo (all synced agents + templates/CLAUDE-agents.md)" bash "$f/scripts/check-agents.sh"

# check-logs.mjs has its own suite.
check "check-logs.mjs suite (tests/check_logs_test.sh)" bash "$root/tests/check_logs_test.sh"

# The SessionStart hook prints HANDOFF.md, or says to create one.
hook="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["hooks"]["SessionStart"][0]["hooks"][0]["command"])' "$root/templates/claude-settings.json")"
h="$tmp/hook"; mkdir -p "$h"
check "hook says to create HANDOFF.md when it's missing" bash -c "CLAUDE_PROJECT_DIR='$h' bash -c \"\$0\" | grep -q 'No HANDOFF.md'" "$hook"
echo "# Handoff marker-123" > "$h/HANDOFF.md"
check "hook prints HANDOFF.md" bash -c "CLAUDE_PROJECT_DIR='$h' bash -c \"\$0\" | grep -q marker-123" "$hook"

# handoff-check.yml: run its shell step against a throwaway git history.
step="$tmp/step.sh"
awk '/run: \|/{on=1;next} on&&/^ {10}/{sub(/^ {10}/,"");print;next} on{exit}' "$root/templates/handoff-check.yml" > "$step"
g="$tmp/git"; git init -q "$g"; git -C "$g" -c user.email=t@t -c user.name=t commit -q --allow-empty -m base
base="$(git -C "$g" rev-parse HEAD)"
pr() { git -C "$g" -c user.email=t@t -c user.name=t commit -q -am "$1" 2>/dev/null || git -C "$g" -c user.email=t@t -c user.name=t commit -q -m "$1"; }
echo x > "$g/app.txt"; git -C "$g" add app.txt; pr "code only"
check "handoff-check fails a PR without a HANDOFF.md change" bash -c "cd '$g' && ! BASE=$base HEAD=\$(git rev-parse HEAD) bash '$step'"
echo y > "$g/HANDOFF.md"; git -C "$g" add HANDOFF.md; pr "with handoff"
check "handoff-check passes once HANDOFF.md changes" bash -c "cd '$g' && BASE=$base HEAD=\$(git rev-parse HEAD) bash '$step'"
check "handoff-check skips a PR titled [skip handoff]" grep -q "\[skip handoff\]" "$root/templates/handoff-check.yml"

# agents-check.yml: run its "Agents line" step against a throwaway git history.
astep="$tmp/astep.sh"
awk '/name: Agents line/{n=1} n&&/run: \|/{on=1;next} on&&/^ {10}/{sub(/^ {10}/,"");print;next} on{exit}' "$root/templates/agents-check.yml" > "$astep"
ag="$tmp/agit"; git init -q "$ag"; git -C "$ag" -c user.email=t@t -c user.name=t commit -q --allow-empty -m base
abase="$(git -C "$ag" rev-parse HEAD)"
acommit() { git -C "$ag" add -A; git -C "$ag" -c user.email=t@t -c user.name=t commit -q -m "$1"; }
arun() { (cd "$ag" && BASE=$abase HEAD=$(git rev-parse HEAD) BODY="$1" bash "$astep"); }
echo x > "$ag/README.md"; acommit docs
check "agents-check fails a PR with no Agents: line" bash -c "$(declare -f arun); abase=$abase ag='$ag' astep='$astep'; ! arun 'Just a summary'"
check "agents-check passes a docs-only PR with any Agents: line" bash -c "$(declare -f arun); abase=$abase ag='$ag' astep='$astep'; arun \$'Summary\n\nAgents: positioning checked copy'"
echo x > "$ag/app.js"; acommit code
check "agents-check fails a code PR whose Agents: line skips qa-tdd" bash -c "$(declare -f arun); abase=$abase ag='$ag' astep='$astep'; ! arun 'Agents: engineer built it'"
check "agents-check passes a code PR naming qa-tdd" bash -c "$(declare -f arun); abase=$abase ag='$ag' astep='$astep'; arun \$'**Agents:** staff-pm scoped; qa-tdd red then green, 3x\r'"
check "agents-check exempts bots and [skip agents]" bash -c "grep -q \"user.type != 'Bot'\" '$root/templates/agents-check.yml' && grep -q '\[skip agents\]' '$root/templates/agents-check.yml'"

# Agent run log: the hook records real Agent calls; check-agent-runs.sh holds the Agents: line to that log.
check "install-rules.sh installs the run-log hook and checker" test -f "$r2/scripts/log-agent-run.sh" -a -f "$r2/scripts/check-agent-runs.sh"
lr="$tmp/runs"; git init -q -b feat/x "$lr"; mkdir -p "$lr/.claude/agents"; touch "$lr/.claude/agents/qa-tdd.md" "$lr/.claude/agents/staff-pm.md"
cp "$root/templates/scripts/log-agent-run.sh" "$root/templates/scripts/check-agent-runs.sh" "$lr/" 2>/dev/null
hookrun() { printf '%s' "$1" | CLAUDE_PROJECT_DIR="$lr" bash "$lr/log-agent-run.sh"; }
check "settings.json has a PreToolUse hook on the Agent tool" python3 -c 'import json,sys;h=json.load(open(sys.argv[1]))["hooks"]["PreToolUse"];assert any("Agent" in e["matcher"] and "log-agent-run.sh" in e["hooks"][0]["command"] for e in h)' "$root/templates/claude-settings.json"
check "log hook writes '<time> qa-tdd' to the branch's log" bash -c "$(declare -f hookrun); lr='$lr'; hookrun '{\"tool_name\":\"Agent\",\"tool_input\":{\"subagent_type\":\"qa-tdd\",\"prompt\":\"secret prompt\"}}' && grep -qE '^[0-9T:-]+Z qa-tdd\$' '$lr/.claude/agent-runs/feat-x.log'"
check "log hook never writes the prompt" bash -c "! grep -rq 'secret prompt' '$lr/.claude/agent-runs'"
check "log hook ignores a malformed name and exits 0" bash -c "$(declare -f hookrun); lr='$lr'; hookrun '{\"tool_input\":{\"subagent_type\":\"x; rm -rf /\"}}' && ! grep -q rm '$lr/.claude/agent-runs/feat-x.log'"
check "log hook exits 0 on junk input" bash -c "$(declare -f hookrun); lr='$lr'; hookrun 'not json'"
crun() { (cd "$lr" && HEAD_REF=feat/x BODY="$1" bash check-agent-runs.sh); }
check "run check passes when every named agent is in the log" bash -c "$(declare -f crun); lr='$lr'; crun 'Agents: qa-tdd red then green, 3x'"
check "run check fails an agent named but never run" bash -c "$(declare -f crun); lr='$lr'; crun 'Agents: staff-pm scoped; qa-tdd green' | grep -q \"'staff-pm'\"; ! crun 'Agents: staff-pm scoped; qa-tdd green'"
check "run check accepts 'qa-tdd skipped: why' with no log entry" bash -c "$(declare -f crun); lr='$lr'; rm -f '$lr/.claude/agent-runs/feat-x.log'; crun 'Agents: qa-tdd skipped: docs only'"
check "run check fails when there is no log at all" bash -c "$(declare -f crun); lr='$lr'; ! crun 'Agents: qa-tdd green'"
printf '{"agents":{"verify":"echo ran >> runs.txt","runs":3}}' > "$lr/studio-checks.json"; hookrun '{"tool_input":{"subagent_type":"qa-tdd"}}'
check "run check reruns the verify command 3x when qa-tdd ran" bash -c "$(declare -f crun); lr='$lr'; crun 'Agents: qa-tdd green' && test \$(wc -l < '$lr/runs.txt') -eq 3"
printf '{"agents":{"verify":"false","runs":3}}' > "$lr/studio-checks.json"
check "run check fails when the verify command fails" bash -c "$(declare -f crun); lr='$lr'; ! crun 'Agents: qa-tdd green'"
check "agents-check.yml runs check-agent-runs.sh with the head branch" bash -c "grep -q 'check-agent-runs.sh' '$root/templates/agents-check.yml' && grep -q 'github.head_ref' '$root/templates/agents-check.yml'"

# Agent evals: every case dispatches a real studio agent and has a scoring grader.
for d in "$root"/plugins/studio/evals/*/; do
  c="$(basename "$d")"; [ "$c" = results ] && continue
  check "eval $c: prompt.md, a scored grader, and a dispatch check for an existing agent" bash -c "test -f '$d/prompt.md' && grep -lq 'type: llm' '$d'/graders/*.md && a=\$(grep -ho 'studio:)?[a-z-]*' '$d'/graders/*.md | head -1 | sed 's/studio:)?//') && test -n \"\$a\" -a -f '$root/plugins/studio/agents/'\$a.md"
done

# This repo follows its own kit: rules installed, every agent symlinked into .claude/agents/ and named in CLAUDE.md.
check "own kit: settings.json, handoff-check and agents-check match the templates" bash -c "cmp '$root/templates/claude-settings.json' '$root/.claude/settings.json' && cmp '$root/templates/handoff-check.yml' '$root/.github/workflows/handoff-check.yml' && cmp '$root/templates/agents-check.yml' '$root/.github/workflows/agents-check.yml'"
check "own kit: every agent has a .claude/agents/ link to plugins/studio/agents/" bash -c "for f in '$root'/plugins/studio/agents/*.md; do test \"\$(readlink '$root/.claude/agents/'\$(basename \$f))\" = \"../../plugins/studio/agents/\$(basename \$f)\" || { echo \"no link for \$f\"; exit 1; }; done"
own="$tmp/own"; mkdir -p "$own/scripts"; cp "$root/templates/scripts/check-agents.sh" "$own/scripts/"; cp "$root/CLAUDE.md" "$own/"; cp -rL "$root/.claude" "$own/"
check "own kit: check-agents.sh passes this repo's CLAUDE.md and .claude/agents/" bash "$own/scripts/check-agents.sh"

# Public repo: no claude.ai artifact or session links, no trigger or environment ids.
check "no claude.ai links or trigger/environment ids" bash -c "! grep -rnE 'claude\.ai/(artifact|code)/|trig_[0-9A-Za-z]{10,}|env_[0-9A-Za-z]{10,}' --exclude-dir=.git --exclude=check.sh '$root'"

echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
