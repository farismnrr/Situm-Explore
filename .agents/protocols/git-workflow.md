# Git Workflow Protocol

This protocol is mandatory for Codex whenever executing a plan under `plans/` or making implementation changes on behalf of a plan.

The goals are isolation, reviewability, recoverability, and low process overhead.

## Core rules

1. One plan = one dedicated Git branch.
2. Use the repository's normal working directory. Linked Git worktrees are **not required** and should not be created unless the user explicitly requests them later.
3. Never implement a plan directly on `main`.
4. Every completed implementation phase must end with a commit and push to the plan branch.
5. Before every phase commit, update the active plan and relevant `.agents/` persistent context.
6. Never open a pull request until the user explicitly asks for one.
7. CI is intentionally deferred for now.
8. Persistent unit tests are prohibited. Temporary E2E/white-box/black-box checks are allowed only during execution and must be deleted before staging/commit/closeout.
9. Engineering Guard and maintainability are not implementation-time requirements. During implementation use focused direct checks; explicit closure runs the component guard and maintainability lifecycle described below.
10. Never commit secrets, `.env`, API keys, database credentials, tokens, or generated credential files.
11. Prefer small, phase-scoped commits with clear Conventional Commit-style messages.
12. Do not force-push or destructively rewrite branch history as normal workflow.
13. **Sequential plan dependencies must be integrated into `main` before the dependent plan starts**, unless the user explicitly requests stacked branches.

## 1. Start a plan safely

Before switching branches:

```bash
git status --short
git fetch origin
```

Do not silently discard local changes. If the current working directory contains unrelated changes, preserve them safely before switching branches; never use destructive reset/clean as a shortcut.

### Check dependencies before creating the branch

Read the active plan's `Depends on:` line.

If it depends on an earlier roadmap plan:

1. confirm that dependency is complete;
2. confirm it has been reviewed/accepted as required by the roadmap;
3. confirm its implementation is already integrated into `main`;
4. only then create the dependent plan branch from updated `origin/main`.

If the dependency is complete but still exists only on its plan branch because PR/integration authorization is pending, **stop**. Do not silently branch from stale `main`, cherry-pick dependency commits, copy files manually, or create a stacked branch.

Stacked plan branches are allowed only when the user explicitly asks for that workflow and the active plan records the non-main base clearly.

For a normal new sequential plan, synchronize `main` first:

```bash
git switch main
git pull --ff-only origin main
```

For a plan such as `plans/004-ui-foundation-public-auth.md`:

```bash
git switch -c plan/004-ui-foundation-public-auth origin/main
```

Then verify:

```bash
git branch --show-current
git status --short
```

If the plan branch already exists locally or remotely, inspect and reuse it instead of recreating it or forcing it to another commit.

Examples:

```bash
# existing local branch
git switch plan/004-ui-foundation-public-auth

# remote branch not yet tracked locally
git switch --track origin/plan/004-ui-foundation-public-auth
```

Rules:

- A new independent plan normally starts from the latest fetched `origin/main`.
- A sequential dependent plan also starts from latest `origin/main`, **after its dependency has landed there**.
- Do not use `git switch -C`, `git checkout -B`, `git reset --hard`, `git clean -fd`, or `--force` as routine shortcuts.
- Only one plan needs to be checked out in the normal working directory at a time.

## 2. Branch naming

Plan branches use:

```text
plan/<plan-number>-<short-slug>
```

Examples:

```text
plan/004-ui-foundation-public-auth
plan/005-authenticated-shell-dashboard
plan/006-situm-map-workspace
```

Non-plan maintenance may use conventional prefixes such as `docs/`, `chore/`, `fix/`, or `refactor/`, but plan execution uses the `plan/` convention.

Do not mix multiple plans into one branch.

## Codebase-serial execution

Current product codebases are `web` and `mobile`. Only one may be actively implemented or verified at a time. For a task that changes both, default to `web -> mobile` unless the active plan records a concrete reason for another order. Finish implementation, focused verification, temporary-test cleanup, and task-owned persistence for the current codebase before moving to the next. Cross-codebase contract tracing is allowed; parallel sibling implementation/validation is not.

## 3. Phase boundaries

A phase is an explicit phase in the plan. If a plan does not use the word `phase`, treat each top-level numbered implementation section as a phase unless the plan clearly groups sections differently.

At the start of a phase:

- read the relevant plan section;
- inspect existing code/config before editing;
- confirm the current branch;
- keep scope limited to that phase.

Do not opportunistically implement future phases just because nearby code is easy to change.

## 4. Mandatory pre-commit persistence checkpoint

Before every phase commit, run the repository persistence workflow.

At minimum:

1. Update completed checkboxes/status in the active `plans/*.md` file.
2. Update `.agents/state.md` when current focus, open loops, blockers, or next action changed.
3. Update `.agents/memory/decisions.md` when the phase introduced a durable project/architecture decision.
4. Update `.agents/knowledge/` when reusable technical discoveries were learned.
5. Update `.agents/reflections/` when the phase produced a reusable process/agent lesson.
6. Append a concise phase/session trace to `.agents/sessions/YYYY-MM-DD.md`.
7. Do not fabricate durable updates when nothing durable changed.

The `.agents/` changes belong in the same phase commit as the implementation that produced them. Repository history should explain both **what changed** and **what the agent learned**.

Never persist secrets or credential values in `.agents/`.

## 5. Validation before commit

Always inspect the change first:

```bash
git status --short
git diff --check
git diff
```

After staging, review exactly what will be committed:

```bash
git diff --staged
```

### Implementation-time validation

During implementation and trial/error, use **focused direct checks only**. Do not run `.agents/scripts/engineering-guard.sh`, `.agents/scripts/maintainability.py`, or `.agents/scripts/validate.sh` as a reflexive implementation blocker unless the user explicitly asks.

Examples of useful focused checks include a directly relevant lint invocation, typecheck, build/config inspection, runtime repro, browser/device interaction, bounded logs, or a temporary E2E/white-box/black-box aid. Choose the smallest check that materially reduces uncertainty for the current change. Do not require every repository quality surface to pass while implementation is still in progress.

Do not switch package managers during a plan. Do not create or restore persistent unit tests. Temporary E2E/white-box/black-box checks may be used when they materially help validation, but they must be removed before staging, final closure commit, and task closeout.

For docs/resources/governance-only phases, use appropriate lightweight validation and `git diff --check`; do not manufacture product builds or framework tooling solely for ceremony.

### Explicit closure validation

Engineering governance is codebase-scoped and closure-oriented:

```bash
./.agents/scripts/engineering-guard.sh web fast|full|release
./.agents/scripts/engineering-guard.sh mobile fast|full|release
python3 .agents/scripts/maintainability.py web
python3 .agents/scripts/maintainability.py mobile
```

- Run guards only at explicit closure or when the user directly requests them.
- Finish changed codebases serially. Run the appropriate Engineering Guard mode, then maintainability exactly once for that changed codebase immediately before the requested PR/merge/branch-close sequence.
- `fast` is lint/typecheck plus policy. `full` adds broader build/audit/config validation appropriate to the component. `release` is explicit release/package verification; Android release packaging is never part of routine `mobile full`.
- Maintainability is a non-growing debt ratchet. Existing baseline debt may remain in unrelated work, but it may not grow. When debt improves, lower the baseline instead of preserving hidden capacity.
- `.agents/scripts/validate.sh` validates agent-governance structure only and never implicitly dispatches product guards.
- Do not wire Engineering Guard or maintainability into pre-commit, pre-push, package scripts, Make targets, CI, or hidden hooks under the current policy.

## 6. Commit discipline

Commit only after the phase is complete, persistence is updated, and required validation passes.

Use clear Conventional Commit-style subjects, for example:

```text
refactor: align Nuxt app directories
feat: add authenticated app shell
feat: build Situm map workspace
```

Guidelines:

- Keep each commit scoped to one completed phase.
- Do not bundle unrelated cleanup.
- Do not use vague completed-phase subjects such as `update`, `changes`, or `wip`.
- Do not amend/rewrite an already pushed phase commit without a concrete reason.
- Never force-push as normal workflow. Get explicit user approval before rewriting pushed history.

## 7. Push after every completed phase

The first push for a plan branch sets upstream explicitly:

```bash
git push -u origin plan/004-ui-foundation-public-auth
```

Later phase commits:

```bash
git push
```

After pushing, verify:

```bash
git status
git log -1 --oneline
```

Expected state: the working tree is clean and the local branch is synchronized with its upstream.

Do not push plan commits directly to `main`.

## 8. Pull request / integration gate

Pushing a branch does **not** authorize opening a PR or integrating it into `main`.

Until the user explicitly asks:

- do not run `gh pr create`;
- do not call a PR creation tool;
- do not auto-open a draft PR;
- do not merge the branch into `main`;
- keep the pushed branch available for review.

When the user asks for a PR/integration, review the full branch diff, validation results, active plan, and `.agents/` state first.

For a sequential roadmap, the next dependent plan stays blocked until this integration gate is completed and `main` contains the dependency.

## 9. CI and tests policy

### CI

CI is intentionally not configured yet.

- Do not add GitHub Actions or another CI service unless the user explicitly changes this decision.
- Local validation is the quality gate for now.

### Persistent tests

Persistent unit tests are prohibited by explicit user policy.

- Do not add, restore, or commit unit-test files, unit-test fixtures, unit-test scripts, snapshots, coverage harnesses, or a unit-test framework.
- Do not keep regression scripts that function as a persistent unit test under another name.
- E2E, white-box, and black-box checks are allowed only as temporary execution aids. Prefer `/tmp` or the ignored `.tmp-tests/` path.
- Every temporary test artifact must be deleted before staging, commit, push, PR handoff, or task closeout. A clean closeout must contain no authored temporary test artifact.
- Historical plans/evidence can retain truthful references to tests that existed when that work was performed; those references are not current execution authority.

Current durable validation is lint, typecheck, build, migration/static inspection, production-preview/runtime checks, physical-device/browser E2E, bounded logs/screenshots, and other evidence appropriate to the change. Never fabricate PASS when a runtime condition was not exercised.

## 10. Branch lifecycle

While a plan is awaiting review or PR/integration authorization, keep its pushed branch intact.

After the plan is merged/integrated:

```bash
git switch main
git pull --ff-only origin main
git branch -d plan/004-ui-foundation-public-auth
```

Delete a remote branch only when it is clearly no longer needed.

No linked-worktree cleanup is needed because normal plan execution uses the ordinary repository working directory.

## Phase closeout checklist

Before saying a phase is complete, all applicable items must be true:

- [ ] Correct plan branch is active; work is not being done on `main`.
- [ ] Phase scope is complete; future phases were not pulled in unnecessarily.
- [ ] Plan checklist/status is updated.
- [ ] `.agents/` persistence pass is complete.
- [ ] No secrets are staged.
- [ ] `git diff --check` passes.
- [ ] Focused implementation checks appropriate to the phase were used without reflexively running closure governance.
- [ ] At explicit task/branch closure, each changed codebase passed the appropriate Engineering Guard mode and one maintainability run, unless the user explicitly scoped closure differently.
- [ ] Governance-only closure passed `.agents/scripts/validate.sh` and direct syntax/static checks without manufacturing product work.
- [ ] Any additional validation required by the plan passes.
- [ ] Changes are committed with a clear phase-scoped message.
- [ ] Commit is pushed to the plan branch/upstream.
- [ ] No PR/integration happened unless the user explicitly requested it.
- [ ] A dependent next plan is not started until this plan is integrated into `main`, unless the user explicitly requested stacked branches.
