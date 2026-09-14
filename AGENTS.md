# AGENTS.md

This repository is a persistent agent workspace for Situm Explore.

Keep this file short. Current authority lives in `.agents/state.md`.

## Mandatory read order

1. `.agents/identity.md`
2. `.agents/state.md`
3. the active plan execution brief under `.agents/execution/` when a new plan is explicitly active
4. `.agents/protocols/chat-lifecycle.md`
5. `.agents/protocols/git-workflow.md`
6. `.agents/memory/decisions.md`
7. `.agents/memory/roadmap-021-025.md` for completed-roadmap context when needed
8. `ARCHITECTURE.md`
9. `plans/README.md`
10. `plans/021-025-prerequisites.md` when historical prerequisite context is needed
11. `design/data-source-matrix.md` when Situm/product capability scope matters
12. the relevant plan
13. `DESIGN.md` / `design/IMPLEMENTATION.md` for presentation changes

Historical plans/sessions/branches are evidence only and do not override current state, durable decisions, current human product documentation, architecture, or a future explicitly activated plan.

## Current roadmap

Completed/integrated:

```text
Plan 017 -> 018 -> 019 -> 019A -> 020 [complete/integrated]
```

Completed implementation roadmap:

```text
Plan 021 -> Plan 022 -> Plan 023 -> Plan 024 -> Plan 025 [complete on stacked branch]
```

Plans 026–047 are closed/integrated historical work. Plan 041 shipped the app-owned native indoor map/navigation experience, Plans 045–046 established the current web 2D-primary + explicit Digital Twin 3D + static same-floor routing direction, and Plan 047 integrated native Digital Twin 3D parity through PR #46. PR #48 then integrated the web workspace/building-scoped Digital Twin model boundary. No implementation plan is currently active. Google OAuth runtime remains user-owned and deferred.

## Backend-refactor direction

The completed roadmap introduced DB-backed users, real email/password registration/login, private single-owner workspaces, workspace-managed Situm configuration, permission-aware behavior, reuse of existing observability infrastructure, request correlation/tracing, workspace-isolated analytics, and sanitized client error boundaries.

Google OAuth is prepared but real runtime acceptance is deferred to the user.

The legacy env-defined auth/global Situm context is historical migration evidence from before Plans 021–025. The current integrated source/runtime and completed-plan outcomes are authoritative; do not resurrect the legacy global model.

## External integration rule

For Situm behavior: **no evidence, no implementation**. Verify current official contracts and installed SDK/runtime behavior. Keep unresolved capabilities absent rather than guessing.

## Git workflow

- one plan = one dedicated plan branch;
- never implement directly on `main`;
- avoid destructive history rewriting;
- PR creation and merge are user-gated;
- dependent plans normally start after the preceding plan is integrated into updated `main`;
- implementation/fixes for an explicitly active plan go to the configured `worker` subagent;
- parent owns orchestration, review, state/plan persistence, commits, pushes, and transitions.

## Governance ownership

- Agent governance and quality automation lives under `.agents/scripts/`.
- Root `scripts/` and `mobile/scripts/` remain product-owned operational/build helpers; do not move working product tooling into `.agents/scripts/` merely for symmetry.
- Governance commands are codebase-scoped. Current codebases are `web` (`app/`, `server/`, `shared/`) and `mobile` (`mobile/src/`). Do not invent an implicit repository-wide product guard.

## Codebase-serial workflow

- Only one product codebase may be actively implemented or verified at a time. Do not parallelize `web` and `mobile` implementation or closure validation through sibling agents/background jobs.
- For work that genuinely changes both codebases, default to `web -> mobile` unless the active plan records a concrete reason for another order. Finish the current codebase's implementation, focused verification, temporary-test cleanup, and task-owned persistence before moving to the next.
- Cross-codebase contracts may be traced end to end, but edits and governance execution remain serial.

## Closure and Engineering Guard Lifecycle

`./.agents/scripts/engineering-guard.sh <web|mobile> <fast|full|release>` is the component quality entry point. `python3 .agents/scripts/maintainability.py <web|mobile>` is a separate non-growing debt ratchet.

- **Implementation / trial-error:** do **not** run Engineering Guard, maintainability, or agent-workspace validation wrappers unless the user explicitly asks. Use focused direct checks that help the current change and keep iteration fast. A task does not need every repository quality surface green while implementation is still in progress.
- **Explicit closure:** finish one changed codebase at a time. Run the relevant requested/focused verification, then the appropriate Engineering Guard mode, then run maintainability exactly once for each changed codebase immediately before the requested PR/merge/branch-close sequence.
- **Governance-only work:** when no product codebase changed, validate the governance files directly plus `.agents/scripts/validate.sh`; do not manufacture a product guard requirement solely for ceremony.
- **Release:** `release` is explicit. In particular, Android release packaging is never part of routine `mobile full`; use `mobile release` only when the user requests release/package verification and supplies the required release environment.
- **No hidden automation:** never wire Engineering Guard or maintainability into pre-commit, pre-push, package scripts, Make targets, CI, or background hooks unless the user explicitly changes this policy.
- Never weaken security, architecture, maintainability ceilings, or runtime correctness merely to make a guard green.

## Testing policy

- Persistent unit tests are prohibited in this repository. Do not add, restore, or commit unit-test files, unit-test scripts, unit-test fixtures, or a unit-test framework.
- E2E, white-box, and black-box checks may be created only as temporary execution aids when needed. Keep them outside tracked source or under an ignored `.tmp-tests/` directory, and delete them before staging, committing, or closing the task.
- Durable validation uses the checks appropriate to the change: lint, typecheck, build, migration/static inspection, runtime/browser/device acceptance, and bounded logs/screenshots. Never claim a check that was not actually executed.
- Historical plans/evidence may mention tests that existed at the time; those references are historical evidence only and do not authorize restoring the deleted suites.

## Android build safety

- The physical acceptance POS is `arm64-v8a`; ordinary agent Android builds must not compile x86/x86_64/armeabi-v7a unless a task explicitly requires another ABI.
- Shared Android toolchain lives at `/home/farismnrr/Services/android-toolchain/` (also symlinked at `/home/farismnrr/Documents/Projects/.toolchains/android/`). Sourcing `/home/farismnrr/Services/android-toolchain/env.sh` sets `JAVA_HOME`, `ANDROID_HOME`, `ANDROID_SDK_ROOT`, and PATH. Build scripts also auto-fallback to this path.
- Prefer `cd mobile && npm run build:android:release` for release candidates; its script pins `-PreactNativeArchitectures=arm64-v8a`, uses non-clean Expo Prebuild plus the persistent Gradle build cache, and validates the public API origin. Do not replace its `--no-clean` prebuild with Expo's default clean prebuild during ordinary release iteration.
- `expo-build-properties` also pins `android.buildArchs` to `arm64-v8a`, so `expo prebuild` must preserve the single-ABI default in `android/gradle.properties`.
- Before a long physical-device build, verify the target ABI with `adb shell getprop ro.product.cpu.abi` and inspect the effective `reactNativeArchitectures` value. If the build starts CMake tasks for four ABIs, stop and correct the invocation/config instead of letting it burn CPU.
- For normal React Native UI/TypeScript E2E iteration, do **not** regenerate native projects or run a release build on every change. Build/install the native debug shell once with `cd mobile && npm run build:android:device`, then keep Metro running with the required API env and iterate through JS/TS reloads. Rebuild native only after native dependencies/config plugins/app config change.
- The MCP terminal sandbox does not preserve the normal user Gradle home reliably between calls. The device-build script therefore uses the ignored `mobile/.gradle-agent-home` cache by default; direct agent Gradle commands must set that same `GRADLE_USER_HOME` explicitly. Never use `--no-daemon` for iterative local/device builds.

## Mandatory closeout

Follow `.agents/protocols/persistence.md` and keep durable state aligned with exact current truth.
