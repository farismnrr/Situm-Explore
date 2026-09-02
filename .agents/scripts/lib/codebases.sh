#!/usr/bin/env bash
set -euo pipefail

SITUM_REPO_ROOT="${SITUM_REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)}"
SITUM_CODEBASES_FILE="$SITUM_REPO_ROOT/.agents/codebases.conf"

codebase_rows() {
  awk -F'|' 'NF && $1 !~ /^#/ {print}' "$SITUM_CODEBASES_FILE"
}

codebase_names() {
  codebase_rows | cut -d'|' -f1
}

codebase_field() {
  local name="$1" field="$2"
  awk -F'|' -v name="$name" -v field="$field" '$1 == name {print $field; found=1; exit} END {if (!found) exit 1}' "$SITUM_CODEBASES_FILE"
}

codebase_exists() { codebase_field "$1" 1 >/dev/null 2>&1; }
codebase_root() { codebase_field "$1" 2; }
codebase_kind() { codebase_field "$1" 3; }
codebase_source_roots() { codebase_field "$1" 4; }
codebase_eslint_config() { codebase_field "$1" 5; }
codebase_traits() { codebase_field "$1" 6; }

codebase_usage_list() {
  codebase_names | sed 's/^/  /'
}
