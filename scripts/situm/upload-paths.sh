#!/usr/bin/env bash
set -euo pipefail

: "${SITUM_TOKEN:?Set SITUM_TOKEN to an owner-authorized bearer token}"

BUILDING_ID="${BUILDING_ID:-19954}"
FLOOR_ID="70557"
PATHS_FILE="${1:-docs/research/situm-paths.example.json}"
API_BASE="${SITUM_API_BASE:-https://api.situm.com}"
API_BASE="${API_BASE%/}"
PATH_URL="${API_BASE}/api/v1/buildings/${BUILDING_ID}/paths"

if [[ "${BUILDING_ID}" != "19954" ]]; then
  printf 'Refusing to modify building %s; this script is scoped to building 19954.\n' "${BUILDING_ID}" >&2
  exit 2
fi

if [[ ! -f "${PATHS_FILE}" ]]; then
  printf 'Path JSON file not found: %s\n' "${PATHS_FILE}" >&2
  exit 2
fi

if ! command -v jq >/dev/null 2>&1; then
  printf 'jq is required to validate and verify the path JSON.\n' >&2
  exit 2
fi

jq -e --argjson floor "${FLOOR_ID}" '
  (.nodes | type == "array") and
  (.links | type == "array") and
  (([.nodes[]? | (.floor_id // .floorId)] | all(. == $floor))) and
  (([
    .links[]?
    | select(has("floor_id") or has("floorId"))
    | (.floor_id // .floorId)
  ] | all(. == $floor)))
' "${PATHS_FILE}" >/dev/null

printf 'Uploading target-floor paths to %s\n' "${PATH_URL}"
curl --fail-with-body -sS \
  -X PUT \
  -H "Authorization: Bearer ${SITUM_TOKEN}" \
  -H 'Content-Type: application/json' \
  --data-binary "@${PATHS_FILE}" \
  "${PATH_URL}"
printf '\n'

printf 'Verifying persisted paths...\n'
VERIFIED_JSON="$(curl --fail-with-body -sS \
  -H "Authorization: Bearer ${SITUM_TOKEN}" \
  "${PATH_URL}")"
printf '%s\n' "${VERIFIED_JSON}"

if ! printf '%s\n' "${VERIFIED_JSON}" | jq -e '
  if type == "array" then length > 0
  else (.nodes | type == "array") and (.links | type == "array")
  end
' >/dev/null; then
  printf 'Verification failed: the scoped path response is empty or malformed.\n' >&2
  exit 1
fi

printf 'Path verification succeeded for building 19954 / floor 70557.\n'
