# Agent Context System

`.agents/` is the persistent context layer for Situm Explore.

Root `AGENTS.md` is the router. `.agents/state.md` owns current focus/blockers; durable decisions own current project decisions; sessions/completed plans are chronological evidence and may become stale. With no active plan, new implementation work must first create explicit scope from updated `main`.


## Boundary with project documentation

`.agents/` documents **the work**, not the product manual. Keep branch/plan state, execution decisions, evidence, reviews, sessions, protocols, and handoff context here.

Current product/runtime documentation belongs outside `.agents/`:

- `README.md` — project overview, setup, capabilities, and entry points;
- `ARCHITECTURE.md` — current runtime/security architecture;
- `DESIGN.md` + `design/` — current product UI/UX and implementation contracts;
- `docs/` — developer/operator procedures such as mobile release/distribution.

Agent files may link to those documents and record why/when they changed, but should not become duplicate product documentation.

## Mandatory implementation reads

1. `AGENTS.md`;
2. `.agents/identity.md`;
3. `.agents/state.md`;
4. relevant protocols;
5. `.agents/memory/decisions.md`;
6. for completed-roadmap context: `.agents/memory/roadmap-021-025.md` and `plans/021-025-prerequisites.md`;
7. `ARCHITECTURE.md`;
8. `plans/README.md`;
9. `design/data-source-matrix.md` when Situm/product scope matters;
10. explicitly active plan, when one exists;
11. `DESIGN.md` / `design/IMPLEMENTATION.md` for presentation changes.

## Truth hierarchy

When guidance conflicts, prefer:

1. user's latest explicit instruction;
2. current `.agents/state.md` and active durable decisions;
3. current architecture/design contracts;
4. explicitly active plan, when one exists, plus current capability matrix;
5. current source/runtime behavior;
6. historical plans/session notes;
7. agent inference.

Historical files do not regain authority merely because they contain more detail.

## Current scope

Plans 017–020 are complete/integrated into `main` by PR #12.

Plans 026–035 are closed/integrated. Plans 028–034 delivered and closed the native companion roadmap; Plan 035 separately remediated Realtime/foreground-positioning lifecycle and was integrated through PR #32 at merge commit `840c0f9`.

Plans 021–041 are historical execution. Plan 042 — Repository Engineering Governance is currently active. `plans/028-034-native-mobile-roadmap.md` and prior plan evidence remain historical authority for why the current runtime looks the way it does; current execution authority is Plan 042 plus current state/decisions.

The roadmap moves the product from the pre-refactor env-defined user/global Situm runtime to DB-backed users, private workspaces, protected workspace configuration, workspace-scoped Situm/analytics context, reused observability, end-to-end correlation, and safe client errors.

## Documentation policy

Current authority files are reconciled for Plans 021–025. Do not use completed plan/session wording to override them.

Historical plan/session files are intentionally preserved as evidence. Do not rewrite history merely to make old execution notes sound current.

## Evidence / persistence rules

For external Situm behavior, verify exact official/current contracts and installed SDK compatibility. Missing material evidence stays unresolved.

For future implementation phases, update plan/state/session evidence and required durable decisions, run validation, review the diff, commit, and push.

Never persist real credentials, API keys, JWTs, passwords, session cookies, encryption-key values, or sensitive payloads in repository context.

## Governance and closure gates

`.agents/scripts/` owns manual agent governance:

- `engineering-guard.sh <web|mobile> <fast|full|release>` — component quality entry point;
- `maintainability.py <web|mobile>` — closure-only non-growing debt ratchet;
- `codebase-policy.sh <web|mobile>` — component/repository policy enforcement, including the no-persistent-test rule;
- `environment-guard.sh <web|mobile> <mutate|runtime|read|validate>` — bounded environment safety checks;
- `validate.sh` — agent-workspace/governance structure validation only; it does not implicitly run product guards.

These wrappers are **not implementation-loop commands**. During implementation/trial-error use focused direct checks only. Product work is codebase-serial (`web -> mobile` by default for multi-codebase tasks), including closure verification. Run Engineering Guard/maintainability at explicit closure or when the user directly requests them. No Git hook, package script, Make target, CI workflow, or background automation may invoke them implicitly under the current policy.
