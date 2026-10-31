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
# check-story-entry.mjs: validates a story-keeper reply (STORY-PROD). Same fixture loop as QATDD-PROD: valid-*.md
# exit 0 with a quiet stderr; invalid-*.md exit exactly 1 and stderr names the broken rule (the "<!-- expect: word -->"
# line), one reason per line. A reply is exactly one of:
#   No entry: <reason>                                          (no story block)
#   one story block (three backticks + story):
#     ### YYYY-MM-DD · Decision|Lesson|Pivot|Win: <title>       (real date, non-empty title)
#     - Problem: / - Chase's call: / - Decision and why: / - Result: / - Story angle:   (each once, non-empty)
#     - Lesson:                                                 (required for Lesson and Pivot; no other labels)
#     <= 120 whitespace-separated words, header included; no email, phone, claude.ai URL, trig_/env_/cmsg_/session_ id,
#     or API key (sk-, ghp_, github_pat_)
#   then optionally one line `Memory: <rule>` after the block.
# --json: {kind: entry|none, type, date, title, words, fields: {<label>: <text>}, memory}.
cs="$root/tools/check-story-entry.mjs"; fs="$root/tests/fixtures/story-entry"
need_cs="test -f '$cs' || { echo 'missing tools/check-story-entry.mjs'; exit 1; }"
check "STORY-PROD check-story-entry.mjs exists" test -f "$cs"
for fx in "$fs"/valid-*.md; do
  check "STORY-PROD check-story-entry passes $(basename "$fx")" bash -c "$need_cs; node '$cs' '$fx' 2>'$tmp/cserr'; rc=\$?; [ \$rc -eq 0 ] || { echo \"exit \$rc\"; cat '$tmp/cserr'; exit 1; }; ! test -s '$tmp/cserr'"
done
for fx in "$fs"/invalid-*.md; do
  exp="$(sed -n 's/^<!-- expect: \(.*\) -->$/\1/p' "$fx")"
  check "STORY-PROD check-story-entry rejects $(basename "$fx" .md) (stderr names '$exp')" bash -c "$need_cs; node '$cs' '$fx' >/dev/null 2>'$tmp/cserr'; rc=\$?; [ \$rc -eq 1 ] || { echo \"exit \$rc, want 1\"; exit 1; }; grep -qi -- '$exp' '$tmp/cserr' || { echo 'stderr does not name $exp:'; cat '$tmp/cserr'; exit 1; }"
done
# Secret shapes are built at run time so no tracked file holds one (gitleaks, privacy-scan and the id grep below).
sk_body="$(printf 'Ab1%.0s' 1 2 3 4 5 6 7 8 9 10 11 12)"
for leak in "trig_${sk_body}:trig_" "env_${sk_body}:env_" "sk-${sk_body}:key" "ghp_${sk_body}:key" "github_pat_${sk_body}:key" \
  "ghs_${sk_body}:key" "gho_${sk_body}:key" "ghu_${sk_body}:key" "ghr_${sk_body}:key" "xoxb-${sk_body}:key" "xoxp-${sk_body}:key"; do  # QA-R5: GitHub app/OAuth and Slack tokens
  val="${leak%:*}"; exp="${leak##*:}"; lf="$tmp/leak-${val%%[_-]*}.md"
  sed "s/^- Result: pending\$/- Result: pending, see ${val}/" "$fs/valid-decision.md" > "$lf"
  check "STORY-PROD check-story-entry rejects a ${val%%[_-]*} secret (stderr names '$exp')" bash -c "$need_cs; grep -q -- '$val' '$lf' || { echo 'fixture not built'; exit 1; }; node '$cs' '$lf' >/dev/null 2>'$tmp/cserr'; rc=\$?; [ \$rc -eq 1 ] || { echo \"exit \$rc, want 1\"; exit 1; }; grep -qi -- '$exp' '$tmp/cserr' || { echo 'stderr does not name $exp:'; cat '$tmp/cserr'; exit 1; }"
done
check "STORY-PROD check-story-entry gives one reason per line (two broken rules, two lines)" bash -c "$need_cs; node '$cs' '$fs/invalid-two-reasons.md' 2>'$tmp/cserr'; [ \$? -eq 1 ] && [ \$(grep -c . '$tmp/cserr') -ge 2 ] && grep -q Result '$tmp/cserr' && grep -qi email '$tmp/cserr' || { cat '$tmp/cserr'; exit 1; }"
check "STORY-PROD check-story-entry exits 2 on a usage error (no file, two files, unreadable file)" bash -c "$need_cs; node '$cs' 2>/dev/null; a=\$?; node '$cs' '$fs/valid-decision.md' '$fs/valid-win.md' 2>/dev/null; b=\$?; node '$cs' '$tmp/no-such-reply.md' 2>/dev/null; c=\$?; echo \"exits: \$a \$b \$c\"; [ \$a -eq 2 ] && [ \$b -eq 2 ] && [ \$c -eq 2 ]"
check "STORY-PROD check-story-entry --json prints the parsed entry" bash -c "$need_cs; node '$cs' --json '$fs/valid-memory.md' | python3 -c '
import json,sys
d=json.load(sys.stdin)
assert d[\"kind\"]==\"entry\" and d[\"type\"]==\"Decision\" and d[\"date\"]==\"2026-11-02\", d
assert d[\"title\"]==\"Every PR names who ran QA\", d[\"title\"]
assert d[\"words\"]==67, d[\"words\"]
f=d[\"fields\"]; assert set(f)=={\"Problem\",\"Chase\x27s call\",\"Decision and why\",\"Result\",\"Story angle\"}, f
assert f[\"Chase\x27s call\"]==\"\\\"From now on, every PR names who ran QA.\\\"\" and f[\"Result\"]==\"pending\", f
assert d[\"memory\"]==\"Every PR body names who ran QA on its Agents: line.\", d[\"memory\"]'"
check "STORY-PROD check-story-entry --json reports a No entry reply as kind none" bash -c "$need_cs; node '$cs' --json '$fs/valid-no-entry.md' | python3 -c '
import json,sys
d=json.load(sys.stdin)
assert d[\"kind\"]==\"none\" and d.get(\"memory\") is None, d'"
check "STORY-PROD story-keeper.md shows the \`\`\`story block and names check-story-entry" bash -c "f='$root/plugins/studio/agents/story-keeper.md'; grep -qF '\`\`\`story' \$f || { echo 'no \`\`\`story fence in story-keeper.md'; exit 1; }; grep -q 'check-story-entry' \$f || { echo 'story-keeper.md does not name check-story-entry'; exit 1; }"
check "STORY-PROD story-keeper description tells the main session to relay its reply verbatim" bash -c "awk 'NR==1&&/^---$/{on=1;next} on&&/^---$/{exit} on' '$root/plugins/studio/agents/story-keeper.md' | grep '^description:' | grep -qi verbatim || { echo 'story-keeper.md frontmatter description does not say verbatim'; exit 1; }"
check "STORY-PROD the four story-keeper behavior eval cases exist" bash -c "for c in routine-no-entry decision-no-pii no-duplicate memory-line; do test -f '$root/plugins/studio/evals/story-keeper-'\$c/prompt.md || { echo \"missing story-keeper-\$c\"; exit 1; }; done"
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

# PMT-M3.4 status header: every HANDOFF.md opens with a machine-readable `<!-- status` block that the
# Studio Console (pm-tools scripts/feed/core.ts parseHandoff) reads. CON-16: handoff-check warns, never fails, without it.
hs="$tmp/hstatus"; mkdir -p "$hs"; hsc="$root/templates/scripts/check-handoff-status.sh"
hkeys="stage goal milestone now next waiting_on_chase blockers"
check "PMT-M3.4 templates/HANDOFF.md opens with a closed <!-- status block (first 15 lines) holding every key" bash -c "f='$root/templates/HANDOFF.md'; test -f \$f && head -15 \$f | grep -q '^<!-- status' && blk=\$(awk '/^<!-- status/{on=1;next} on&&/^-->/{exit} on' \$f) && sed -n '/^<!-- status/,/^-->/p' \$f | grep -q '^-->' && for k in $hkeys; do echo \"\$blk\" | grep -qE \"^\$k:\" || { echo \"missing key: \$k\"; exit 1; }; done"
check "PMT-M3.4 templates/HANDOFF.md keeps the five sections" bash -c "for s in 'Done' 'In progress' 'Exact next step' 'Decisions to review' 'Blockers'; do grep -qx \"## \$s\" '$root/templates/HANDOFF.md' || { echo \"missing ## \$s\"; exit 1; }; done"
check "PMT-M3.4 status check passes templates/HANDOFF.md quietly" bash -c "out=\$(bash '$hsc' '$root/templates/HANDOFF.md'); rc=\$?; echo \"\$out\"; [ \$rc -eq 0 ] && ! echo \"\$out\" | grep -q '::warning'"
printf '# Handoff\n\n## Done\n- x\n## In progress\n## Exact next step\n## Decisions to review\n## Blockers\n' > "$hs/none.md"
check "PMT-M3.4 CON-16 status check warns (::warning::) and exits 0 when HANDOFF.md lacks the header" bash -c "out=\$(bash '$hsc' '$hs/none.md'); rc=\$?; echo \"\$out\"; [ \$rc -eq 0 ] && echo \"\$out\" | grep -q '^::warning'"
good() { printf '# Handoff\n<!-- status\nstage: %s\ngoal: %s\nmilestone: PMT-M3\nnow: PMT-M3.4 tests red\nnext: engineer builds it\nwaiting_on_chase:\n  - Review goal names\nblockers: []\n-->\n\n## Done\n' "$1" "$2"; }
good building agent-team > "$hs/good.md"
check "PMT-M3.4 status check is quiet and exits 0 on a valid header" bash -c "out=\$(GOALS=agent-team,portfolio bash '$hsc' '$hs/good.md'); rc=\$?; echo \"\$out\"; [ \$rc -eq 0 ] && ! echo \"\$out\" | grep -q '::warning'"
for st in idea building beta live parked; do good "$st" agent-team > "$hs/st-$st.md"; done
check "PMT-M3.4 status check accepts every allowed stage (idea, building, beta, live, parked)" bash -c "for st in idea building beta live parked; do out=\$(bash '$hsc' '$hs/st-'\$st.md) || exit 1; echo \"\$out\" | grep -q '::warning' && { echo \"warned on \$st: \$out\"; exit 1; }; done; true"
good shipping agent-team > "$hs/stage.md"
check "PMT-M3.4 status check warns on an unknown stage, naming it, and exits 0" bash -c "out=\$(bash '$hsc' '$hs/stage.md'); rc=\$?; echo \"\$out\"; [ \$rc -eq 0 ] && echo \"\$out\" | grep '^::warning' | grep -q shipping"
good building no-such-goal > "$hs/goal.md"
check "PMT-M3.4 status check warns on a goal not in GOALS, naming it, and exits 0" bash -c "out=\$(GOALS=agent-team,portfolio bash '$hsc' '$hs/goal.md'); rc=\$?; echo \"\$out\"; [ \$rc -eq 0 ] && echo \"\$out\" | grep '^::warning' | grep -q no-such-goal"
check "PMT-M3.4 status check skips the goal check when GOALS is unset" bash -c "out=\$(bash '$hsc' '$hs/goal.md'); rc=\$?; echo \"\$out\"; [ \$rc -eq 0 ] && ! echo \"\$out\" | grep -q '::warning'"
good building agent-team | sed '/^blockers:/d' > "$hs/key.md"
check "PMT-M3.4 status check warns on a missing key, naming it, and exits 0" bash -c "out=\$(bash '$hsc' '$hs/key.md'); rc=\$?; echo \"\$out\"; [ \$rc -eq 0 ] && echo \"\$out\" | grep '^::warning' | grep -q blockers"
good building agent-team | sed '/^-->/d' > "$hs/open.md"
check "PMT-M3.4 status check treats an unclosed header as missing (warns, exits 0)" bash -c "out=\$(bash '$hsc' '$hs/open.md'); rc=\$?; echo \"\$out\"; [ \$rc -eq 0 ] && echo \"\$out\" | grep -q '^::warning'"
{ printf '# Handoff\n'; for i in $(seq 1 15); do echo; done; good building agent-team | sed 1d; } > "$hs/late.md"
check "PMT-M3.4 status check warns when the header starts after line 15 (the parser won't see it)" bash -c "out=\$(bash '$hsc' '$hs/late.md'); rc=\$?; echo \"\$out\"; [ \$rc -eq 0 ] && echo \"\$out\" | grep -q '^::warning'"
check "PMT-M3.4 status check exits 0 with a warning when HANDOFF.md doesn't exist" bash -c "out=\$(bash '$hsc' '$hs/nope.md'); rc=\$?; echo \"\$out\"; [ \$rc -eq 0 ] && echo \"\$out\" | grep -q '^::warning'"
check "PMT-M3.4 handoff-check.yml runs check-handoff-status.sh" grep -q 'check-handoff-status.sh' "$root/templates/handoff-check.yml"
check "PMT-M3.4 install-rules.sh installs check-handoff-status.sh" bash -c "bash '$root/scripts/install-rules.sh' '$hs/inst' >/dev/null && cmp '$hsc' '$hs/inst/scripts/check-handoff-status.sh'"
check "PMT-M3.4 session-rules: 'Every commit or PR' says to update the status header" bash -c "sed -n '/^## Every commit or PR/,/^## /p' '$root/docs/session-rules.md' | grep -qi 'status header'"
check "PMT-M3.4 session-rules: the HANDOFF.md template shows the <!-- status block" bash -c "sed -n '/^## HANDOFF.md template/,\$p' '$root/docs/session-rules.md' | grep -q '^<!-- status'"
check "PMT-M3.4 own kit: this repo's HANDOFF.md has a status header the check accepts" bash -c "out=\$(bash '$hsc' '$root/HANDOFF.md'); rc=\$?; echo \"\$out\"; [ \$rc -eq 0 ] && ! echo \"\$out\" | grep -q '::warning'"

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

# Cloud sessions start in the parent of several repos (CLAUDE_PROJECT_DIR is not a git repo), so the log hook
# falls back to the hook input's "cwd", and install-cloud.sh installs agents and the hook at user level ($HOME).
cr="$tmp/cwdrepo"; git init -q -b feat/cloud "$cr"; mkdir -p "$cr/sub"; ng="$tmp/nogit"; mkdir -p "$ng"
lhook() { (cd "$ng" && printf '%s' "$1" | CLAUDE_PROJECT_DIR="$ng" bash "$root/templates/scripts/log-agent-run.sh"); }
check "CLOUD-5 log hook: project dir not a repo, logs to the git top-level of the input's cwd" bash -c "$(declare -f lhook); root='$root' ng='$ng'; lhook '{\"cwd\":\"$cr/sub\",\"tool_input\":{\"subagent_type\":\"qa-tdd\"}}' && grep -qE '^[0-9T:-]+Z qa-tdd\$' '$cr/.claude/agent-runs/feat-cloud.log' && ! test -e '$cr/sub/.claude' && ! test -e '$ng/.claude'"
ng2="$tmp/nogit2"; mkdir -p "$ng2"
check "CLOUD-6 log hook: neither project dir nor cwd is a repo, writes nothing and exits 0" bash -c "$(declare -f lhook); root='$root' ng='$ng'; lhook '{\"cwd\":\"$ng2\",\"tool_input\":{\"subagent_type\":\"qa-tdd\"}}' && ! test -e '$ng/.claude' && ! test -e '$ng2/.claude'"

ch="$tmp/cloudhome"; mkdir -p "$ch/.claude"
printf '{"model":"opus","hooks":{"SessionStart":[{"hooks":[{"type":"command","command":"echo keep-me"}]}]}}' > "$ch/.claude/settings.json"
check "CLOUD-1 install-cloud.sh runs and exits 0" bash -c "HOME='$ch' bash '$root/scripts/install-cloud.sh'"
check "CLOUD-1 install-cloud.sh copies every agent (incl. orchestrator, focus-coach) to \$HOME/.claude/agents" bash -c "for f in '$root'/plugins/studio/agents/*.md; do cmp \"\$f\" '$ch/.claude/agents/'\$(basename \$f) || exit 1; done; test -f '$ch/.claude/agents/orchestrator.md' -a -f '$ch/.claude/agents/focus-coach.md'"
check "CLOUD-2 install-cloud.sh copies log-agent-run.sh to \$HOME/.claude/studio" cmp "$root/templates/scripts/log-agent-run.sh" "$ch/.claude/studio/log-agent-run.sh"
{ echo stale > "$ch/.claude/agents/qa-tdd.md"; } 2>/dev/null
check "CLOUD-1 install-cloud.sh re-run overwrites a stale agent with the latest and exits 0" bash -c "HOME='$ch' bash '$root/scripts/install-cloud.sh' && cmp '$root/plugins/studio/agents/qa-tdd.md' '$ch/.claude/agents/qa-tdd.md'"
cloudhooks() { # cloudhooks <settings.json>: asserts other keys and hooks kept, exactly one Agent|Task log hook
  python3 - "$1" <<'PY'
import json, sys
s = json.load(open(sys.argv[1]))
pre = s["hooks"]["PreToolUse"]
mine = [e for e in pre if e.get("matcher") == "Agent|Task" and any(".claude/studio/log-agent-run.sh" in h.get("command", "") for h in e.get("hooks", []))]
assert len(mine) == 1, f"want 1 Agent|Task log hook, got {len(mine)}"
PY
}
check "CLOUD-3 settings.json: valid JSON, one Agent|Task hook after two runs" bash -c "$(declare -f cloudhooks); cloudhooks '$ch/.claude/settings.json'"
check "CLOUD-3 settings.json keeps existing keys and hooks alongside the new one" python3 -c 'import json,sys;s=json.load(open(sys.argv[1]));assert "PreToolUse" in s["hooks"], "install did not add PreToolUse";assert s["model"]=="opus";assert s["hooks"]["SessionStart"][0]["hooks"][0]["command"]=="echo keep-me"' "$ch/.claude/settings.json"
ch2="$tmp/cloudhome2"; mkdir -p "$ch2"
check "CLOUD-3 install-cloud.sh creates settings.json when missing" bash -c "$(declare -f cloudhooks); HOME='$ch2' bash '$root/scripts/install-cloud.sh' && cloudhooks '$ch2/.claude/settings.json'"
uhook() { # uhook <project dir> <input>: runs the user-level hook command from settings.json, as Claude Code would
  local cmd; cmd="$(python3 -c 'import json,sys;print(next(h["command"] for e in json.load(open(sys.argv[1]))["hooks"]["PreToolUse"] if e.get("matcher")=="Agent|Task" for h in e["hooks"]))' "$ch/.claude/settings.json")" || return 1
  [ -n "$cmd" ] || return 1
  (cd "$1" && printf '%s' "$2" | HOME="$ch" CLAUDE_PROJECT_DIR="$1" bash -c "$cmd")
}
ur="$tmp/userrepo"; git init -q -b feat/u "$ur"
check "CLOUD-4 user-level hook does nothing when CLAUDE_PROJECT_DIR is a repo (repo hook logs instead)" bash -c "$(declare -f uhook); ch='$ch'; uhook '$ur' '{\"cwd\":\"$ur\",\"tool_input\":{\"subagent_type\":\"qa-tdd\"}}' && ! test -e '$ur/.claude/agent-runs'"
check "CLOUD-4 user-level hook logs via cwd when CLAUDE_PROJECT_DIR is not a repo" bash -c "$(declare -f uhook); ch='$ch'; rm -rf '$cr/.claude'; uhook '$ng' '{\"cwd\":\"$cr/sub\",\"tool_input\":{\"subagent_type\":\"staff-pm\"}}' && grep -qE 'Z staff-pm\$' '$cr/.claude/agent-runs/feat-cloud.log'"
check "CLOUD-8 README mentions install-cloud.sh" grep -q 'install-cloud.sh' "$root/README.md"
# QA-R1 (P1): a cloud thread whose cwd stays in the parent folder logs nothing (CLOUD-6), so agents-check fails every
# agent it names. Until the hook can find the repo another way, the README must tell the session to cd into the repo first.
check "CLOUD-9 (QA-R1) README says the run log needs the session's cwd inside the repo (cd before calling an agent)" bash -c "sed -n '/Cloud sessions/,/^## /p' '$root/README.md' | grep -qiE '\\bcd\\b.*(repo|agent)'"
# QA-R2: an unreadable settings.json (non-JSON, or "hooks": null) must not abort the install or be rewritten.
badset() { # badset <home> <settings content>: install exits 0, copies agents, warns, leaves settings.json byte-identical
  mkdir -p "$1/.claude"; printf '%s' "$2" > "$1/.claude/settings.json"; cp "$1/.claude/settings.json" "$1/before.json"
  HOME="$1" bash "$root/scripts/install-cloud.sh" > "$1/install.out" 2>&1 || { echo "install exited non-zero"; cat "$1/install.out"; return 1; }
  for f in "$root"/plugins/studio/agents/*.md; do cmp "$f" "$1/.claude/agents/$(basename "$f")" || { echo "agent not copied: $(basename "$f")"; return 1; }; done
  grep -qi warning "$1/install.out" || { echo "no warning line in output:"; cat "$1/install.out"; return 1; }
  cmp "$1/before.json" "$1/.claude/settings.json" || { echo "settings.json changed"; return 1; }
}
check "CLOUD-10 (QA-R2) non-JSON settings.json: exits 0, copies agents, warns, file byte-identical" bash -c "$(declare -f badset); root='$root'; badset '$tmp/cloudbad1' '{\"model\": \"opus\",, not json'"
check "CLOUD-10 (QA-R2) settings.json with \"hooks\": null: exits 0, copies agents, warns, file byte-identical" bash -c "$(declare -f badset); root='$root'; badset '$tmp/cloudbad2' '{\"model\":\"opus\",\"hooks\":null}'"
# QA-R4: an older install (or hand edit) with matcher "Agent" that runs the same script must be replaced, not doubled.
ch3="$tmp/cloudhome3"; mkdir -p "$ch3/.claude"
printf '{"hooks":{"PreToolUse":[{"matcher":"Agent","hooks":[{"type":"command","command":"bash \\"$HOME/.claude/studio/log-agent-run.sh\\""}]}]}}' > "$ch3/.claude/settings.json"
check "CLOUD-11 (QA-R4) existing matcher \"Agent\" log hook is replaced: exactly one PreToolUse entry runs log-agent-run.sh" bash -c "HOME='$ch3' bash '$root/scripts/install-cloud.sh' && python3 -c 'import json,sys;pre=json.load(open(sys.argv[1]))[\"hooks\"][\"PreToolUse\"];n=sum(1 for e in pre if any(\".claude/studio/log-agent-run.sh\" in h.get(\"command\",\"\") for h in e.get(\"hooks\",[])));assert n==1, f\"want 1 entry referencing log-agent-run.sh, got {n}: {pre}\"' '$ch3/.claude/settings.json'"

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
  case "$c" in story-keeper-*)
    # story-keeper cases (STORY-PROD): tagged story-keeper, listed in the evals README, invented people and example.com only.
    tags="$(field "$d/prompt.md" tags | tr -d '[] ' | tr , '\n')"
    check "eval $c: tagged story-keeper and listed in evals/README.md" bash -c "echo '$tags' | grep -qx story-keeper || { echo 'missing tag: story-keeper (have: $(echo $tags))'; exit 1; }; grep -qF '\`$c\`' '$root/plugins/studio/evals/README.md' || { echo 'not in evals/README.md'; exit 1; }"
    check "eval $c: only example.com emails and domains in the prompt" bash -c "! grep -oE '[A-Za-z0-9._%+-]*@?[a-z0-9.-]+\.(com|org|net|io|app|dev)\b' '$d/prompt.md' | grep -vqE '^([A-Za-z0-9._%+-]+@)?example\.com\$'"
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
