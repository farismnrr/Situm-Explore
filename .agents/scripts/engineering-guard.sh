#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=.agents/scripts/lib/codebases.sh
source "$ROOT/.agents/scripts/lib/codebases.sh"

usage() {
  echo 'usage: ./.agents/scripts/engineering-guard.sh <codebase> <fast|full|release>' >&2
  echo 'codebases:' >&2
  codebase_usage_list >&2
  exit 64
}

CODEBASE="${1:-}"
MODE="${2:-}"
[[ $# -eq 2 ]] && codebase_exists "$CODEBASE" || usage
case "$MODE" in fast|full|release) ;; *) usage ;; esac
CODEBASE_ROOT="$(codebase_root "$CODEBASE")"
cd "$ROOT"

step() { printf '\n==> %s\n' "$1"; shift; "$@"; }
run_policy() { step "$CODEBASE policy" ./.agents/scripts/codebase-policy.sh "$CODEBASE"; }

run_fast() {
  run_policy
  case "$CODEBASE" in
    web)
      if [[ ! -f .nuxt/eslint.config.mjs ]]; then
        step 'web Nuxt prepare' npx nuxt prepare
      fi
      step 'web lint' npm run lint
      step 'web typecheck' npm run typecheck
      ;;
    mobile)
      step 'mobile lint' bash -lc "cd '$CODEBASE_ROOT' && npm run lint"
      step 'mobile typecheck' bash -lc "cd '$CODEBASE_ROOT' && npm run typecheck"
      ;;
  esac
}

run_full() {
  case "$CODEBASE" in
    web)
      step 'web production build' npm run build
      step 'web dependency audit' npm audit --audit-level=high
      ;;
    mobile)
      step 'mobile Expo config' bash -lc "cd '$CODEBASE_ROOT' && npx expo config --type public >/dev/null"
      step 'mobile dependency audit' bash -lc "cd '$CODEBASE_ROOT' && npm audit --audit-level=high"
      ;;
  esac
}

run_release() {
  case "$CODEBASE" in
    web)
      echo 'NOTE: web full already performs the production Nuxt build; image publication/deployment remains a separate user-authorized operation.'
      ;;
    mobile)
      step 'mobile release environment' ./.agents/scripts/environment-guard.sh mobile validate
      : "${EXPO_PUBLIC_APP_VERSION:?EXPO_PUBLIC_APP_VERSION is required for mobile release guard}"
      : "${EXPO_PUBLIC_ANDROID_VERSION_CODE:?EXPO_PUBLIC_ANDROID_VERSION_CODE is required for mobile release guard}"
      : "${EXPO_PUBLIC_API_BASE_URL:?EXPO_PUBLIC_API_BASE_URL is required for mobile release guard}"
      step 'mobile arm64 release build' bash -lc "cd '$CODEBASE_ROOT' && npm run build:android:release"
      ;;
  esac
}

run_fast
[[ "$MODE" == full || "$MODE" == release ]] && run_full
[[ "$MODE" == release ]] && run_release
printf '\nSITUM_ENGINEERING_GUARD_PASS codebase=%s mode=%s\n' "$CODEBASE" "$MODE"
