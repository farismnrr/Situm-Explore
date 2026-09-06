#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=.agents/scripts/lib/codebases.sh
source "$ROOT/.agents/scripts/lib/codebases.sh"

codebase="${1:-}"
action="${2:-}"
if [[ $# -ne 2 ]] || ! codebase_exists "$codebase"; then
  echo 'usage: ./.agents/scripts/environment-guard.sh <codebase> <mutate|runtime|read|validate>' >&2
  codebase_usage_list >&2
  exit 64
fi
case "$action" in mutate|runtime|read|validate) ;; *) echo 'environment-guard: action must be mutate, runtime, read, or validate' >&2; exit 64 ;; esac

if [[ "$codebase" == web && ( "$action" == mutate || "$action" == runtime ) ]]; then
  if [[ -n "${DOCKER_HOST:-}" ]]; then
    echo 'BLOCKED: DOCKER_HOST is set; web runtime mutations must target the local laptop unless explicitly handled outside this guard' >&2
    exit 78
  fi
  if command -v docker >/dev/null 2>&1; then
    context="$(docker context show 2>/dev/null || true)"
    if [[ -n "$context" && "$context" != default ]]; then
      echo "BLOCKED: Docker context '$context' is not the local default context" >&2
      exit 78
    fi
  fi
fi

if [[ "$codebase" == mobile && "$action" == validate ]]; then
  grep -Fq "buildArchs: ['arm64-v8a']" "$ROOT/mobile/app.config.ts" || {
    echo 'BLOCKED: mobile app config no longer pins android.buildArchs to arm64-v8a' >&2
    exit 78
  }
  grep -Fq -- "-PreactNativeArchitectures=arm64-v8a" "$ROOT/mobile/scripts/build-android-release.cjs" || {
    echo 'BLOCKED: Android release helper no longer pins reactNativeArchitectures=arm64-v8a' >&2
    exit 78
  }
fi

if [[ "$codebase" == mobile && "$action" == runtime ]]; then
  command -v adb >/dev/null 2>&1 || { echo 'BLOCKED: adb is required for mobile runtime checks' >&2; exit 78; }
  serial="${ADB_SERIAL:-}"
  if [[ -z "$serial" ]]; then
    mapfile -t devices < <(adb devices | awk 'NR>1 && $2 == "device" {print $1}')
    (( ${#devices[@]} == 1 )) || { echo 'BLOCKED: set ADB_SERIAL or connect exactly one Android device' >&2; exit 78; }
    serial="${devices[0]}"
  fi
  abi="$(adb -s "$serial" shell getprop ro.product.cpu.abi | tr -d '\r')"
  [[ "$abi" == arm64-v8a ]] || { echo "BLOCKED: Android runtime target must be arm64-v8a, got: $abi" >&2; exit 78; }
  printf 'environment-guard: codebase=mobile action=runtime adb_serial=%s abi=%s\n' "$serial" "$abi"
  exit 0
fi

printf 'environment-guard: codebase=%s action=%s\n' "$codebase" "$action"
