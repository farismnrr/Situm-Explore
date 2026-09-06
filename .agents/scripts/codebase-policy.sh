#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=.agents/scripts/lib/codebases.sh
source "$ROOT/.agents/scripts/lib/codebases.sh"

codebase="${1:-}"
if [[ $# -ne 1 ]] || ! codebase_exists "$codebase"; then
  echo 'usage: ./.agents/scripts/codebase-policy.sh <codebase>' >&2
  codebase_usage_list >&2
  exit 64
fi

root_rel="$(codebase_root "$codebase")"
component_root="$ROOT/$root_rel"
[[ -d "$component_root" ]] || { echo "codebase-policy: missing codebase root $root_rel" >&2; exit 1; }
errors=()

IFS=',' read -r -a source_roots <<<"$(codebase_source_roots "$codebase")"
for source_rel in "${source_roots[@]}"; do
  [[ -d "$component_root/$source_rel" ]] || errors+=("missing source root for $codebase: $root_rel/$source_rel")
done

is_test_artifact() {
  local path="$1" rel="/$1/" base="${1##*/}"
  case "$base" in
    *.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx|*.test.js|*.test.jsx|*.spec.js|*.spec.jsx|*.test.mjs|*.test.cjs|*.spec.mjs|*.spec.cjs|*_test.go|*.e2e-spec.ts|*.fixture.ts|*.fixture.tsx)
      return 0 ;;
  esac
  [[ "$rel" == */test/* || "$rel" == */tests/* || "$rel" == */__tests__/* || "$rel" == */e2e/* || "$rel" == */androidTest/* || "$rel" == */fixtures/* ]]
}

while IFS= read -r path; do
  [[ -n "$path" ]] || continue
  if is_test_artifact "$path"; then
    errors+=("persistent test artifact is forbidden: $path")
  fi
done < <({ git -C "$ROOT" ls-files; git -C "$ROOT" ls-files --others --exclude-standard; } | sort -u)

while IFS= read -r -d '' temp_dir; do
  errors+=("temporary test directory must be deleted before closure: ${temp_dir#$ROOT/}")
done < <(find "$ROOT" \
  -path "$ROOT/.git" -prune -o \
  -path '*/node_modules' -prune -o \
  -path '*/.gradle-agent-home' -prune -o \
  -type d -name '.tmp-tests' -print0)

for package_file in "$ROOT/package.json" "$ROOT/mobile/package.json"; do
  [[ -f "$package_file" ]] || continue
  while IFS= read -r finding; do
    [[ -n "$finding" ]] && errors+=("$finding")
  done < <(node - "$package_file" <<'NODE'
const fs = require('node:fs')
const file = process.argv[2]
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'))
const rel = file.replace(process.cwd() + '/', '')
for (const name of Object.keys(pkg.scripts || {})) {
  if (/(^|:)test($|:)|(^|:)e2e($|:)|(^|:)spec($|:)/i.test(name)) {
    console.log(`persistent test package script is forbidden: ${rel}#scripts.${name}`)
  }
}
const forbidden = /^(jest|vitest|mocha|ava|jasmine|cypress|@playwright\/test|@testing-library\/.*)$/i
for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
  for (const name of Object.keys(pkg[section] || {})) {
    if (forbidden.test(name)) console.log(`persistent test framework is forbidden: ${rel}#${section}.${name}`)
  }
}
NODE
  )
done

for source_rel in "${source_roots[@]}"; do
  source_root="$component_root/$source_rel"
  [[ -d "$source_root" ]] || continue
  while IFS= read -r -d '' helper; do
    errors+=("product source helper script is forbidden: ${helper#$ROOT/}; agent governance belongs in .agents/scripts/ and operational helpers belong in the existing product script surfaces")
  done < <(find "$source_root" -type f \( -name '*.py' -o -name '*.sh' \) -print0)
done

if ((${#errors[@]})); then
  echo "codebase policy failed: $codebase"
  printf -- '- %s\n' "${errors[@]}"
  exit 1
fi
printf 'codebase policy passed: %s\n' "$codebase"
