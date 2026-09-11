#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
context_dir=${1:-"$(mktemp -d "${TMPDIR:-/tmp}/situm-explore-docker.XXXXXX")"}

if [[ -e "$context_dir" ]]; then
  [[ -d "$context_dir" ]] || { echo "context path is not a directory: $context_dir" >&2; exit 1; }
  [[ -z "$(find "$context_dir" -mindepth 1 -print -quit)" ]] || { echo "context directory must be empty: $context_dir" >&2; exit 1; }
else
  mkdir -p "$context_dir"
fi

for path in Dockerfile .dockerignore package.json package-lock.json nuxt.config.ts tsconfig.json eslint.config.mjs drizzle.config.ts app server shared drizzle public; do
  cp -R "$repo_dir/$path" "$context_dir/$path"
done

find "$context_dir" -type f \( -name '.env*' -o -name '*.pem' -o -name '*.key' \) -delete
printf '%s\n' "$context_dir"
