# Human Documentation

`docs/` is the human-facing developer/operator documentation area for Situm Explore.

Use these files to understand or operate the product **as it exists now**. Historical execution state, branch history, agent memory, and closure evidence belong under `plans/` and `.agents/` instead.

## Current product and operations docs

- [`../README.md`](../README.md) — project overview, setup, capability summary, and documentation entry points.
- [`../ARCHITECTURE.md`](../ARCHITECTURE.md) — current runtime, security, data ownership, and web/native boundaries.
- [`../DESIGN.md`](../DESIGN.md) — current product UX rules.
- [`../design/IMPLEMENTATION.md`](../design/IMPLEMENTATION.md) — production implementation contract.
- [`../design/data-source-matrix.md`](../design/data-source-matrix.md) — current capability/data-source ownership matrix.
- [`mobile-distribution.md`](mobile-distribution.md) — Android release, verification, publishing, and public download contract.
- [`situm-3d-models.md`](situm-3d-models.md) — Blender/GLB authoring plus workspace/building-scoped Digital Twin runtime boundary.

## Research notes

`docs/research/` contains sanitized technical investigations that are useful to humans but are **not current product contracts** unless a current architecture/design document explicitly adopts their result.

- [`research/situm-path-investigation.md`](research/situm-path-investigation.md) — current evidence for the missing Situm Path aggregate on building `19954`, including the supported post-provisioning uploader path.
- [`research/situm-path-phase-2-findings.md`](research/situm-path-phase-2-findings.md) — supporting legacy API/SDK archaeology.

Research may describe external blockers or experiments. Do not infer product capability from research alone.

## Agent documentation is separate

Agent-facing execution and memory live outside `docs/`:

- [`../AGENTS.md`](../AGENTS.md) — agent entry point;
- [`../.agents/README.md`](../.agents/README.md) — agent-context authority model;
- [`../.agents/state.md`](../.agents/state.md) — current agent execution state;
- [`../plans/README.md`](../plans/README.md) — implementation-plan index and historical roadmap.

Historical agent evidence and sessions should not be rewritten merely to make old snapshots sound current. Current product truth belongs in the human documents listed above.
