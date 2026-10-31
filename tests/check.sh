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

skills_of() { # skills_of <agent.md>: the frontmatter `skills:` list, one per line, empty if none
  awk 'NR==1&&$0!="---"{exit} NR>1&&$0=="---"{exit} NR>1&&/^skills:/{on=1;next} on&&/^ *- /{sub(/^ *- */,"");print;next} on{on=0}' "$1"
}

# Every agent: frontmatter name matches the file, a description, a tools line.
for f in "$root"/plugins/studio/agents/*.md; do
  a="$(basename "$f" .md)"
  check "agent $a: frontmatter name, description, tools" \
    test "$(field "$f" name)" = "$a" -a -n "$(field "$f" description)" -a -n "$(field "$f" tools)"
  check "agent $a: listed in the README" grep -q "\`$a\`" "$root/README.md"
  check "agent $a: every preloaded skill exists in plugins/studio/skills" bash -c "for s in \$(cat); do test -f '$root/plugins/studio/skills/'\$s/SKILL.md || { echo \"missing skill: \$s\"; exit 1; }; done" < <(skills_of "$f")
done
check "ux-reviewer preloads the review-rounds skill" bash -c "skills_of() { $(declare -f skills_of | sed 1,2d | sed '$d'); }; skills_of '$root/plugins/studio/agents/ux-reviewer.md' | grep -qx review-rounds"

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

# sync.sh: copies every agent and its preloaded skills, keeps project-only agents and skills, rejects unknown names.
repo="$tmp/repo"; mkdir -p "$repo/.claude/agents" "$repo/.claude/skills/project-skill"; echo local > "$repo/.claude/agents/project-only.md"; echo mine > "$repo/.claude/skills/project-skill/SKILL.md"
check "sync.sh copies all agents" bash "$root/scripts/sync.sh" "$repo"
check "sync.sh: every product agent present and identical" diff -r -x project-only.md -x orchestrator.md -x focus-coach.md "$root/plugins/studio/agents" "$repo/.claude/agents"
check "sync.sh skips studio-only agents by default" test ! -e "$repo/.claude/agents/orchestrator.md" -a ! -e "$repo/.claude/agents/focus-coach.md"
check "sync.sh copies a studio-only agent when named" bash -c "bash '$root/scripts/sync.sh' '$repo' orchestrator >/dev/null && test -f '$repo/.claude/agents/orchestrator.md' && rm '$repo/.claude/agents/orchestrator.md'"
check "sync.sh notes a synced agent missing from the repo's CLAUDE.md table (QA-R1)" bash -c "echo '| x | \`staff-pm\` |' > '$repo/CLAUDE.md'; bash '$root/scripts/sync.sh' '$repo' staff-pm story-keeper | grep -q 'add the story-keeper row' && ! bash '$root/scripts/sync.sh' '$repo' staff-pm | grep -q note; rc=\$?; rm '$repo/CLAUDE.md'; exit \$rc"
check "story-keeper: never creates docs/STORY.md, replies No entry on routine turns, reads CLAUDE.md hard rules" bash -c "f='$root/plugins/studio/agents/story-keeper.md'; grep -q 'Never create the file' \$f && grep -q 'No entry' \$f && grep -q 'CLAUDE.md\` hard rules' \$f"
check "sync.sh copies the studio design rules with ux-reviewer" diff "$root/docs/design-rules.md" "$repo/.claude/design-rules.md"
check "design rules: every rule ux-rules.mjs checks (G and V) is defined in ux-reviewer.md" bash -c "for g in \$(grep -oE 'add\\(\"[GV][0-9]+' '$root/tools/ux-rules.mjs' | grep -oE '[GV][0-9]+' | sort -u); do grep -q \"\\*\\*\$g\\*\\*\" '$root/plugins/studio/agents/ux-reviewer.md' || { echo \"\$g missing\"; exit 1; }; done"
check "ux-rules.mjs tests pass (browser cases skip without Playwright)" node --test "$root/tests/ux-rules.test.mjs"

# check-findings.mjs: validates the ```findings block at the end of a ux-reviewer review (UXR-PROD).
# Fixtures: valid-*.md pass with exit 0 and a quiet stderr; invalid-*.md exit exactly 1, and stderr names the
# broken rule (the "<!-- expect: word -->" line), one reason per line. Every check first needs the tool to exist,
# so a missing file can never pass an invalid fixture by accident.
cf="$root/tools/check-findings.mjs"; ff="$root/tests/fixtures/findings"
check "UXR-PROD check-findings.mjs exists" test -f "$cf"
for fx in "$ff"/valid-*.md; do
  check "UXR-PROD check-findings passes $(basename "$fx")" bash -c "test -f '$cf' || { echo 'missing tools/check-findings.mjs'; exit 1; }; node '$cf' '$fx' 2>'$tmp/cferr'; rc=\$?; [ \$rc -eq 0 ] || { echo \"exit \$rc\"; cat '$tmp/cferr'; exit 1; }; ! test -s '$tmp/cferr'"
done
for fx in "$ff"/invalid-*.md; do
  exp="$(sed -n 's/^<!-- expect: \(.*\) -->$/\1/p' "$fx")"
  check "UXR-PROD check-findings rejects $(basename "$fx" .md) (stderr names '$exp')" bash -c "test -f '$cf' || { echo 'missing tools/check-findings.mjs'; exit 1; }; node '$cf' '$fx' >/dev/null 2>'$tmp/cferr'; rc=\$?; [ \$rc -eq 1 ] || { echo \"exit \$rc, want 1\"; exit 1; }; grep -qi -- '$exp' '$tmp/cferr' || { echo 'stderr does not name $exp:'; cat '$tmp/cferr'; exit 1; }"
done
check "UXR-PROD check-findings gives one reason per line (two broken rules, two lines)" bash -c "test -f '$cf' || { echo 'missing tools/check-findings.mjs'; exit 1; }; node '$cf' '$ff/invalid-two-reasons.md' 2>'$tmp/cferr'; [ \$? -eq 1 ] && [ \$(grep -c . '$tmp/cferr') -ge 2 ] && grep -qi score '$tmp/cferr' && grep -q P0 '$tmp/cferr'"
check "UXR-PROD check-findings --json prints the parsed block" bash -c "test -f '$cf' || { echo 'missing tools/check-findings.mjs'; exit 1; }; node '$cf' --json '$ff/valid-needs-changes.md' | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d[\"verdict\"]==\"Needs changes\" and d[\"score\"]==6, d; f=d[\"findings\"]; assert len(f)==3 and f[0]==dict(id=\"UX-R1\",priority=\"P0\",rule=\"G3\",where=\"Projects, 390px\",problem=\"Dialog has no way out\",fix=\"Add a Cancel button\"), f'"
check "UXR-PROD ux-reviewer reports, never edits: no Edit on its tools: line" bash -c "t=\$(awk 'NR>1&&/^---\$/{exit} /^tools:/' '$root/plugins/studio/agents/ux-reviewer.md'); echo \"tools line: \$t\"; ! echo \"\$t\" | grep -qw Edit"
check "UXR-PROD ux-reviewer.md Output section shows the \`\`\`findings block" bash -c "awk '/^## /{on=(\$0 ~ /^## Output/)} on' '$root/plugins/studio/agents/ux-reviewer.md' | grep -qF '\`\`\`findings' || { echo 'no \`\`\`findings in ## Output'; exit 1; }"
# check-qa-report.mjs: validates the ```qa block at the end of a qa-tdd report (QATDD-PROD). Same fixture loop
# as UXR-PROD: valid-*.md exit 0 with a quiet stderr; invalid-*.md exit exactly 1 and stderr names the broken rule
# (the "<!-- expect: word -->" line), one reason per line. The block, last one wins:
#   verdict: green | red | flaky | blocked                      (exactly one)
#   red: <what failed first and why>                            (optional, non-empty)
#   blocked: <what's missing>                                   (required for blocked)
#   suite: <name> | <command> | <p>/<f> <p>/<f> <p>/<f>          (exactly 3 runs)
#   QA-R<n> | P0-P2 | where | problem | <failing test path or none>
# green: >=1 suite, 0 failed every run, no suite whose runs differ. flaky: >=1 suite whose runs differ plus a QA-R
# finding. A test path has a / or a file extension.
cq="$root/tools/check-qa-report.mjs"; fq="$root/tests/fixtures/qa-report"
need_cq="test -f '$cq' || { echo 'missing tools/check-qa-report.mjs'; exit 1; }"
check "QATDD-PROD check-qa-report.mjs exists" test -f "$cq"
for fx in "$fq"/valid-*.md; do
  check "QATDD-PROD check-qa-report passes $(basename "$fx")" bash -c "$need_cq; node '$cq' '$fx' 2>'$tmp/cqerr'; rc=\$?; [ \$rc -eq 0 ] || { echo \"exit \$rc\"; cat '$tmp/cqerr'; exit 1; }; ! test -s '$tmp/cqerr'"
done
for fx in "$fq"/invalid-*.md; do
  exp="$(sed -n 's/^<!-- expect: \(.*\) -->$/\1/p' "$fx")"
  check "QATDD-PROD check-qa-report rejects $(basename "$fx" .md) (stderr names '$exp')" bash -c "$need_cq; node '$cq' '$fx' >/dev/null 2>'$tmp/cqerr'; rc=\$?; [ \$rc -eq 1 ] || { echo \"exit \$rc, want 1\"; exit 1; }; grep -qi -- '$exp' '$tmp/cqerr' || { echo 'stderr does not name $exp:'; cat '$tmp/cqerr'; exit 1; }"
done
check "QATDD-PROD check-qa-report gives one reason per line (two broken rules, two lines)" bash -c "$need_cq; node '$cq' '$fq/invalid-two-reasons.md' 2>'$tmp/cqerr'; [ \$? -eq 1 ] && [ \$(grep -c . '$tmp/cqerr') -ge 2 ] && grep -qi duplicate '$tmp/cqerr' && grep -qi failed '$tmp/cqerr' || { cat '$tmp/cqerr'; exit 1; }"
check "QATDD-PROD check-qa-report exits 2 on a usage error (no file, two files, unreadable file)" bash -c "$need_cq; node '$cq' 2>/dev/null; a=\$?; node '$cq' '$fq/valid-green.md' '$fq/valid-red.md' 2>/dev/null; b=\$?; node '$cq' '$tmp/no-such-report.md' 2>/dev/null; c=\$?; echo \"exits: \$a \$b \$c\"; [ \$a -eq 2 ] && [ \$b -eq 2 ] && [ \$c -eq 2 ]"
check "QATDD-PROD check-qa-report --json prints the parsed block" bash -c "$need_cq; node '$cq' --json '$fq/valid-flaky.md' | python3 -c '
import json,sys
d=json.load(sys.stdin)
assert d[\"verdict\"]==\"flaky\", d
assert d[\"red\"]==\"tests/x.test.mjs fails \\\"SHARE-3 save photo\\\" (expected 1, got 0)\", d[\"red\"]
s=d[\"suites\"]; assert len(s)==2, s
assert s[1]==dict(name=\"e2e\",command=\"npm run e2e\",runs=[dict(passed=9,failed=0),dict(passed=9,failed=1),dict(passed=9,failed=0)]), s[1]
f=d[\"findings\"]; assert f==[dict(id=\"QA-R1\",priority=\"P1\",where=\"e2e share sheet\",problem=\"passes on retry only\",test=\"tests/e2e/share.spec.ts\")], f'"
check "QATDD-PROD qa-tdd.md Output/Report section shows the \`\`\`qa block" bash -c "awk '/^## /{on=(\$0 ~ /^## (Output|Report)/)} on' '$root/plugins/studio/agents/qa-tdd.md' | grep -qF '\`\`\`qa' || { echo 'no \`\`\`qa in a ## Output or ## Report section of qa-tdd.md'; exit 1; }"
# QATDD-RELAY: the caller loses qa-tdd's QA-R ids when it summarizes the report, so every hop says to relay the ```qa block verbatim.
check "QATDD-RELAY qa-tdd.md description tells the caller to relay the \`\`\`qa block verbatim" bash -c "d=\$(awk 'NR==1&&/^---/{f=1;next} f&&/^---/{exit} f' '$root/plugins/studio/agents/qa-tdd.md' | grep '^description:'); echo \"\$d\" | grep -qi verbatim && echo \"\$d\" | grep -qiE 'qa block|\`\`\`qa' || { echo 'qa-tdd.md description: line lacks \"verbatim\" plus \"qa block\" or \"\`\`\`qa\"'; exit 1; }"
check "QATDD-RELAY qa-tdd.md Output section says the caller passes the \`\`\`qa block on verbatim" bash -c "awk '/^## /{on=(\$0 ~ /^## Output/)} on' '$root/plugins/studio/agents/qa-tdd.md' | grep -qi verbatim || { echo 'no \"verbatim\" in the ## Output section of qa-tdd.md'; exit 1; }"
check "QATDD-RELAY templates/CLAUDE-agents.md tells the main session to paste the \`\`\`qa block verbatim" bash -c "grep -F '\`\`\`qa' '$root/templates/CLAUDE-agents.md' | grep -qi verbatim || { echo 'no line with both \`\`\`qa and \"verbatim\" in templates/CLAUDE-agents.md'; exit 1; }"
check "QATDD-RELAY CLAUDE.md tells the main session to paste the \`\`\`qa block verbatim" bash -c "grep -F '\`\`\`qa' '$root/CLAUDE.md' | grep -qi verbatim || { echo 'no line with both \`\`\`qa and \"verbatim\" in CLAUDE.md'; exit 1; }"
check "sync.sh keeps project-only agents" grep -qx local "$repo/.claude/agents/project-only.md"
check "sync.sh installs review-rounds with ux-reviewer, identical to the plugin's" diff -r "$root/plugins/studio/skills/review-rounds" "$repo/.claude/skills/review-rounds"
check "sync.sh keeps project-only skills" grep -qx mine "$repo/.claude/skills/project-skill/SKILL.md"
check "sync.sh of engineer only installs no skills" bash -c "bash '$root/scripts/sync.sh' '$tmp/eng' engineer >/dev/null && test -z \"\$(ls -A '$tmp/eng/.claude/skills' 2>/dev/null)\""
ms="$tmp/missing"; mkdir -p "$ms/kit/plugins"; cp -r "$root/scripts" "$root/docs" "$ms/kit/"; cp -rL "$root/plugins/studio" "$ms/kit/plugins/"
printf -- '---\nname: bogus\ndescription: test agent\ntools: Read\nskills:\n  - no-such-skill\n---\nbody\n' > "$ms/kit/plugins/studio/agents/bogus.md"
check "sync.sh fails, naming the skill, when an agent preloads a missing skill, and copies nothing" bash -c "! bash '$ms/kit/scripts/sync.sh' '$ms/repo' engineer bogus 2>'$ms/err' && grep -q 'no-such-skill' '$ms/err' && ! test -e '$ms/repo/.claude/agents/engineer.md' && ! test -e '$ms/repo/.claude/skills'"
printf -- '---\nname: dotdot\ndescription: test agent\ntools: Read\nskills:\n  - ../review-rounds\n---\nbody\n' > "$ms/kit/plugins/studio/agents/dotdot.md"
check "sync.sh rejects a skill name that isn't lowercase letters, digits and dashes (QA-R1)" bash -c "! bash '$ms/kit/scripts/sync.sh' '$ms/repo' dotdot 2>'$ms/err' && grep -q 'bad skill name' '$ms/err' && ! test -e '$ms/repo/.claude'"
printf -- '---\nname: inline\ndescription: test agent\ntools: Read\nskills: [review-rounds]\n---\nbody\n' > "$ms/kit/plugins/studio/agents/inline.md"
check "sync.sh fails on an inline skills: [..] list instead of ignoring it (QA-R2)" bash -c "! bash '$ms/kit/scripts/sync.sh' '$ms/repo' inline 2>'$ms/err' && grep -q 'skills:' '$ms/err' && ! test -e '$ms/repo/.claude'"
check "sync.sh fails on an unknown agent name" bash -c "! bash '$root/scripts/sync.sh' '$repo' no-such-agent"
check "sync.sh names the unknown agent" bash -c "bash '$root/scripts/sync.sh' '$repo' no-such-agent 2>&1 | grep -q 'unknown agent: no-such-agent'"

# sync-tools.sh: copies every tool into scripts/, keeps other scripts, rejects unknown names.
t3="$tmp/tools"; mkdir -p "$t3/scripts"; echo mine > "$t3/scripts/build.mjs"
check "sync-tools.sh copies all tools" bash "$root/scripts/sync-tools.sh" "$t3"
check "sync-tools.sh: every tool present and identical" diff -r -x build.mjs "$root/tools" "$t3/scripts"
check "sync-tools.sh keeps other scripts" grep -qx mine "$t3/scripts/build.mjs"
check "sync-tools.sh names an unknown tool and copies nothing" bash -c "! bash '$root/scripts/sync-tools.sh' '$tmp/t4' no-such-tool 2>'$tmp/err' && grep -q 'unknown tool: no-such-tool' '$tmp/err' && ! test -e '$tmp/t4/scripts/ux-shots.mjs'"

# Every tool is listed in the README; ux-shots passes its tests (browser cases skip without Playwright).
for f in "$root"/tools/*.mjs; do
  check "tool $(basename "$f" .mjs): listed in the README" grep -q "\`$(basename "$f" .mjs)\`" "$root/README.md"
done
check "ux-shots tests" node --test "$root/tests/ux-shots.test.mjs"

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

# add-supabase.sh: copies the starter, and never overwrites on a second run.
r3="$tmp/supa"; mkdir -p "$r3"
check "add-supabase.sh installs the starter, its tests and its workflow" bash -c "bash '$root/scripts/add-supabase.sh' '$r3' >/dev/null && test -f '$r3/supabase/migrations/00000000000000_base.sql' -a -x '$r3/tests/sql/run.sh' -a -f '$r3/.github/workflows/supabase.yml' -a -f '$r3/docs/SUPABASE.md'"
echo mine > "$r3/tests/sql/rls_test.sql"
check "add-supabase.sh keeps an existing test file" bash -c "bash '$root/scripts/add-supabase.sh' '$r3' | grep -q 'kept existing tests/sql/rls_test.sql' && grep -q mine '$r3/tests/sql/rls_test.sql'"
# The starter's SQL tests themselves run in CI (checks.yml, job supabase-starter), where Postgres is available.
if [ -n "${PGHOST:-}" ]; then
  check "Supabase starter: migrations and RLS tests pass" sh "$root/templates/supabase/tests/sql/run.sh" starter_test
fi
# install-security.sh: detects ecosystems and languages, scans privacy, never overwrites.
r3="$tmp/sec"; mkdir -p "$r3/app" "$r3/py"; git -C "$r3" init -q
echo '{}' >"$r3/app/package.json"; echo 'let a' >"$r3/app/a.ts"; echo requests >"$r3/py/requirements.txt"; : >"$r3/py/m.py"
echo 'mine' >"$r3/SECURITY.md"; git -C "$r3" add -A
check "install-security.sh installs the kit" bash -c "bash '$root/scripts/install-security.sh' '$r3' && test -f '$r3/.github/workflows/security.yml' -a -f '$r3/.github/workflows/codeql.yml' -a -f '$r3/.github/dependabot.yml' -a -f '$r3/.github/privacy-scan.py'"
check "install-security.sh keeps an existing SECURITY.md" grep -qx mine "$r3/SECURITY.md"
check "dependabot.yml covers npm in /app, pip in /py and Actions" bash -c "grep -A1 'ecosystem: npm' '$r3/.github/dependabot.yml' | grep -q '\"/app\"' && grep -A1 'ecosystem: pip' '$r3/.github/dependabot.yml' | grep -q '\"/py\"' && grep -q 'ecosystem: github-actions' '$r3/.github/dependabot.yml'"
check "codeql.yml lists actions, javascript-typescript and python" grep -q 'language: \[actions, javascript-typescript, python\]' "$r3/.github/workflows/codeql.yml"
check "privacy scan passes sample data" python3 "$r3/.github/privacy-scan.py" "$r3"
# Built at run time so this file stays clean for the repo's own privacy scan.
mail="jane.doe@$(echo gmail).com"; tel="803-555-$((2200+83))"
printf 'ping %s or %s\n' "$mail" "$tel" >"$r3/leak.md"; git -C "$r3" add leak.md
check "privacy scan fails on a real-looking email and phone" bash -c "out=\$(python3 '$r3/.github/privacy-scan.py' '$r3'); [ \$? -eq 1 ] && echo \"\$out\" | grep -q 'email address' && echo \"\$out\" | grep -q 'phone number'"
printf '%s\n%s\n' "$mail" "$tel" >"$r3/.privacy-allow"
check "privacy scan honors .privacy-allow" python3 "$r3/.github/privacy-scan.py" "$r3"
check "gitleaks pin in security.yml matches a sha256" grep -qE 'SHA256: [0-9a-f]{64}$' "$root/templates/security/security.yml"

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
  # Front matter must parse as YAML: an unquoted value with ": " in it ("recall X: y") makes `claude plugin eval` refuse the case.
  check "eval $c: front matter has no unquoted ': ' in a value" bash -c "! awk '/^---$/{n++; next} n==1' '$d/prompt.md' | grep -E '^[a-z_]+: [^\"\x27].*: '"
  case "$c" in qa-tdd-*)
    # qa-tdd cases: tagged qa-tdd (so `--tag qa-tdd` runs them all) and listed in the evals README.
    tags="$(field "$d/prompt.md" tags | tr -d '[] ' | tr , '\n')"
    check "eval $c: tagged qa-tdd and listed in evals/README.md" bash -c "echo '$tags' | grep -qx qa-tdd || { echo 'missing tag: qa-tdd (have: $(echo $tags))'; exit 1; }; grep -qF '\`$c\`' '$root/plugins/studio/evals/README.md' || { echo 'not in evals/README.md'; exit 1; }"
  ;; esac
  case "$c" in ux-reviewer-recall-*)
    # Recall cases: the 5 tags that let `--tag recall` results be grouped by priority, source and finder.
    tags="$(field "$d/prompt.md" tags | tr -d '[] ' | tr , '\n')"
    check "eval $c: recall tags (ux-reviewer, recall, p0|p1|p2, src-es|src-ccw|src-hearth, by-human|by-agent)" bash -c "t='$tags'; for re in ux-reviewer recall 'p[012]' 'src-(es|ccw|hearth)' 'by-(human|agent)'; do echo \"\$t\" | grep -qxE \"\$re\" || { echo \"missing tag: \$re (have: \$(echo \$t))\"; exit 1; }; done"
    # Hearth is private: its screens are rebuilt generically, with invented names and example URLs only.
    check "eval $c: no private product name and only example URLs in the prompt" bash -c "f='$d/prompt.md'; ! grep -v '^tags:' \"\$f\" | grep -qi hearth && ! grep -oE '[a-z0-9.-]+\.(com|org|net|io|app|dev)\b' \"\$f\" | grep -vqxE '(www\.)?example\.com|app\.example'"
  ;; esac
  case "$c" in qa-tdd-recall-*)
    # QATDD-RECALL: the 5 tags that let qa-tdd recall results be grouped by priority, source and finder.
    tags="$(field "$d/prompt.md" tags | tr -d '[] ' | tr , '\n')"
    check "QATDD-RECALL eval $c: recall tags (qa-tdd, recall, p0|p1|p2, src-studio|src-rr, by-human|by-agent)" bash -c "t='$tags'; for re in qa-tdd recall 'p[012]' 'src-(studio|rr)' 'by-(human|agent)'; do echo \"\$t\" | grep -qxE \"\$re\" || { echo \"missing tag: \$re (have: \$(echo \$t))\"; exit 1; }; done"
  ;; esac
done
# QATDD-RECALL: the 8 qa-tdd recall cases exist and the README's "qa-tdd recall cases" table lists each one.
check "QATDD-RECALL 8 qa-tdd-recall-* cases, each listed under '## qa-tdd recall cases' in evals/README.md" bash -c "n=0; for d in '$root'/plugins/studio/evals/qa-tdd-recall-*/; do test -d \"\$d\" || continue; n=\$((n+1)); c=\$(basename \"\$d\"); awk '/^## /{on=(\$0 ~ /^## qa-tdd recall cases/)} on' '$root/plugins/studio/evals/README.md' | grep -qF \"\\\`\$c\\\`\" || { echo \"\$c not in the '## qa-tdd recall cases' section\"; exit 1; }; done; test \$n -ge 8 || { echo \"found \$n qa-tdd-recall-* cases, want 8\"; exit 1; }"

# This repo follows its own kit: rules installed, every agent symlinked into .claude/agents/ and named in CLAUDE.md.
check "own kit: settings.json, handoff-check and agents-check match the templates" bash -c "cmp '$root/templates/claude-settings.json' '$root/.claude/settings.json' && cmp '$root/templates/handoff-check.yml' '$root/.github/workflows/handoff-check.yml' && cmp '$root/templates/agents-check.yml' '$root/.github/workflows/agents-check.yml'"
check "own kit: every agent has a .claude/agents/ link to plugins/studio/agents/" bash -c "for f in '$root'/plugins/studio/agents/*.md; do test \"\$(readlink '$root/.claude/agents/'\$(basename \$f))\" = \"../../plugins/studio/agents/\$(basename \$f)\" || { echo \"no link for \$f\"; exit 1; }; done"
own="$tmp/own"; mkdir -p "$own/scripts"; cp "$root/templates/scripts/check-agents.sh" "$own/scripts/"; cp "$root/CLAUDE.md" "$own/"; cp -rL "$root/.claude" "$own/"
check "own kit: check-agents.sh passes this repo's CLAUDE.md and .claude/agents/" bash "$own/scripts/check-agents.sh"

# TONE rule: every repo's CLAUDE.md (via the template) and the session rules make the session introduce itself by role.
check "CLAUDE-agents.md, CLAUDE.md and session-rules.md carry the intro-by-role rule" bash -c "grep -q 'introduces itself by role' '$root/templates/CLAUDE-agents.md' && grep -q 'introduces itself by role' '$root/CLAUDE.md' && grep -q 'opens with who you are, by role' '$root/docs/session-rules.md'"

# Public repo: no claude.ai artifact or session links, no trigger or environment ids.
check "no claude.ai links or trigger/environment ids" bash -c "! grep -rnE 'claude\.ai/(artifact|code)/|trig_[0-9A-Za-z]{10,}|env_[0-9A-Za-z]{10,}' --exclude-dir=.git --exclude=check.sh '$root'"

echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
