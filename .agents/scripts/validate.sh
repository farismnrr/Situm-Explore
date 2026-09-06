#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BASE="$ROOT/.agents"
errors=()

[[ $# -eq 0 ]] || { echo 'usage: ./.agents/scripts/validate.sh' >&2; exit 64; }

[[ -f "$ROOT/AGENTS.md" ]] || errors+=("missing root AGENTS.md")
if [[ -f "$ROOT/AGENTS.md" ]] && ! grep -q 'Closure and Engineering Guard Lifecycle' "$ROOT/AGENTS.md"; then
  errors+=("AGENTS.md is missing Closure and Engineering Guard Lifecycle")
fi

for folder in memory knowledge protocols scripts scripts/lib maintainability; do
  [[ -d "$BASE/$folder" ]] || errors+=("missing .agents/$folder/")
done
for file in codebases.conf scripts/codebase-policy.sh scripts/engineering-guard.sh scripts/environment-guard.sh scripts/maintainability.py scripts/validate.sh; do
  [[ -f "$BASE/$file" ]] || errors+=("missing governance file: .agents/$file")
done

secret_regex='api_key[[:space:]]*=|api-key[[:space:]]*=|secret[[:space:]]*=|token[[:space:]]*=|password[[:space:]]*=|private_key[[:space:]]*=|-----BEGIN PRIVATE KEY-----|-----BEGIN RSA PRIVATE KEY-----|-----BEGIN OPENSSH PRIVATE KEY-----'
for folder in memory knowledge protocols; do
  [[ -d "$BASE/$folder" ]] || continue
  while IFS= read -r -d '' file; do
    if grep -Eiq -- "$secret_regex" "$file"; then
      errors+=("possible secret-like content in ${file#$ROOT/}")
    fi
  done < <(find "$BASE/$folder" -type f -name '*.md' -print0)
done

if [[ -f "$BASE/codebases.conf" ]]; then
  duplicates="$(awk -F'|' 'NF && $1 !~ /^#/ {print $1}' "$BASE/codebases.conf" | sort | uniq -d)"
  [[ -z "$duplicates" ]] || errors+=("duplicate codebase names: $duplicates")
  while IFS='|' read -r name root _kind source_roots _eslint _traits; do
    [[ -n "$name" && "$name" != \#* ]] || continue
    [[ -d "$ROOT/$root" ]] || errors+=("codebase $name root is missing: $root")
    IFS=',' read -r -a roots <<<"$source_roots"
    for source_root in "${roots[@]}"; do
      [[ -d "$ROOT/$root/$source_root" ]] || errors+=("codebase $name source root is missing: $root/$source_root")
    done
  done < "$BASE/codebases.conf"
fi

for script in "$BASE/scripts/"*.sh "$BASE/scripts/lib/"*.sh; do
  [[ -f "$script" ]] || continue
  if ! bash -n "$script"; then errors+=("shell syntax failed: ${script#$ROOT/}"); fi
done
if [[ -f "$BASE/scripts/maintainability.py" ]]; then
  if ! python3 - "$BASE/scripts/maintainability.py" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
compile(path.read_text(), str(path), 'exec')
PY
  then
    errors+=("Python syntax failed: .agents/scripts/maintainability.py")
  fi
fi

for automation_surface in "$ROOT/package.json" "$ROOT/mobile/package.json" "$ROOT/Makefile"; do
  [[ -f "$automation_surface" ]] || continue
  if grep -Fq '.agents/scripts/engineering-guard.sh' "$automation_surface" || grep -Fq '.agents/scripts/maintainability.py' "$automation_surface"; then
    errors+=("closure-only guard is wired into routine automation: ${automation_surface#$ROOT/}")
  fi
done
if [[ -d "$ROOT/.githooks" ]] && grep -R -E -q '\.agents/scripts/(engineering-guard\.sh|maintainability\.py)' "$ROOT/.githooks"; then
  errors+=("closure-only guard is wired into .githooks")
fi
if [[ -d "$ROOT/.github/workflows" ]] && grep -R -E -q '\.agents/scripts/(engineering-guard\.sh|maintainability\.py)' "$ROOT/.github/workflows"; then
  errors+=("closure-only guard is wired into CI")
fi

if ((${#errors[@]})); then
  echo 'agent workspace validation failed:'
  printf -- '- %s\n' "${errors[@]}"
  exit 1
fi

echo 'agent workspace validation passed'
