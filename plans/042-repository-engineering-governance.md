# Plan 042 — Repository Engineering Governance

Status: implementation + closure validation complete; integration pending user authorization
Branch: `plan/042-repository-engineering-governance`
Depends on: Plan 041 integrated into `main`

## Goal

Port the useful Sensio agent-governance model into Situm Explore without turning repository-wide validation into an implementation-time tax.

The resulting governance must be component-scoped (`web` or `mobile`), explicit, and closure-oriented:

- ordinary implementation/trial-error uses focused direct checks only;
- Engineering Guard does **not** run automatically during implementation;
- maintainability is a closure-only ratchet, run once per changed codebase immediately before requested integration/branch closure;
- full/release checks run only at closure when appropriate or when the user explicitly asks;
- no pre-commit/pre-push hook, CI workflow, or hidden automation may invoke these guards;
- persistent unit/regression tests remain prohibited; temporary E2E/white-box/black-box artifacts must be removed before closure.

## Codebases

- `web` — root Nuxt/Nitro application source under `app/`, `server/`, and `shared/`.
- `mobile` — React Native/Expo application source under `mobile/src/`.

Product-owned operational scripts remain where they already belong (`scripts/` and `mobile/scripts/`). Agent governance/quality automation belongs under `.agents/scripts/`.

## Phase 01 — governance surface

- [x] Add `.agents/codebases.conf` and codebase lookup helpers.
- [x] Add component-scoped `codebase-policy.sh`.
- [x] Add manual `engineering-guard.sh <web|mobile> <fast|full|release>`.
- [x] Add Situm-specific `environment-guard.sh`.
- [x] Add agent-workspace `validate.sh` that does not invoke product guards implicitly.

## Phase 02 — maintainability ratchet

- [x] Add component-scoped `.agents/scripts/maintainability.py`.
- [x] Freeze current non-growing debt baselines for `web` and `mobile`.
- [x] Enforce source-file, function, direct-directory-density, and inline-bypass ratchets without requiring existing debt to be paid in unrelated work.

## Phase 03 — lifecycle authority

- [x] Update `AGENTS.md`, Git workflow protocol, durable decisions, and `.agents/README.md` with closure-only semantics.
- [x] Make explicit that implementation-time Engineering Guard/maintainability runs are forbidden unless the user asks.
- [x] Preserve the current no-persistent-unit-test policy.
- [x] Keep release/native build checks explicit and user-gated; do not make Android release builds part of routine `mobile full` validation.

## Phase 04 — closure validation

Because this plan changes governance rather than product code, validation should prove the governance surfaces themselves without creating permanent tests.

- [x] shell syntax checks for governance shell scripts.
- [x] Python compile/syntax validation for maintainability script.
- [x] `.agents/scripts/validate.sh` passes.
- [x] `engineering-guard.sh web fast` passes at explicit Plan 042 closure.
- [x] `engineering-guard.sh mobile fast` passes at explicit Plan 042 closure.
- [x] `maintainability.py web` and `maintainability.py mobile` each pass once at closure.
- [x] `git diff --check` passes.
- [x] no persistent test artifact or temporary `.tmp-tests/` content remains.

## Integration policy

Local commits are allowed as normal plan execution. Push, PR, merge, branch deletion, deployment, OTA publication, or release publication require separate explicit user authorization unless the user explicitly requests that lifecycle in the same turn.

## Closure evidence

- Governance shell syntax checks: PASS.
- Maintainability Python compile/syntax check: PASS.
- `environment-guard.sh web read`: PASS.
- `environment-guard.sh mobile validate`: PASS; arm64 configuration/release pins remain intact.
- `.agents/scripts/validate.sh`: PASS.
- `engineering-guard.sh web fast`: PASS (`codebase-policy`, root lint, Nuxt typecheck).
- `maintainability.py web`: PASS once at closure — 127 source files scanned; 0 oversized-file debt, 0 oversized-function debt, 2 directory-density debt entries, 0 bypass debt.
- `engineering-guard.sh mobile fast`: PASS (`codebase-policy`, mobile lint, TypeScript typecheck).
- `maintainability.py mobile`: PASS once at closure — 21 source files scanned; 1 oversized-file debt entry, 2 oversized-function debt entries, 0 directory-density debt, 0 bypass debt.
- No Engineering Guard or maintainability command was run during ordinary implementation/trial-error; they were invoked only after implementation was complete and durable state was prepared for closure.
- No persistent test artifact, hidden guard hook, CI wiring, package-script wiring, or Make target was added.
- `full` and `release` modes were not run because this is governance-only work and no product release/package verification was requested.
