# Situm Explore

Situm Explore is an indoor-operations and exploration product built around Situm. It has two clients that share one application backend:

- a Nuxt 4 web application for workspace administration, browser map exploration, organization/operations views, analytics, and installation handoff;
- a React Native + Expo companion application for Android/iOS-oriented indoor positioning, native map/navigation, and Realtime positions.

Nitro is the single application backend for both clients. PostgreSQL stores application identity/workspace state, ClickHouse stores workspace-isolated analytics, and Situm provides cartography, positioning, navigation, Viewer, and operational data within the capability boundaries documented in this repository.

## Product capabilities

Current product behavior includes:

- database-backed email/password authentication;
- private single-owner workspaces;
- workspace-managed Situm credentials with exactly two authorities: Only Read for client/read flows and Read & Write for server-side mutation/admin flows;
- workspace-scoped Situm cartography and operational data;
- app-owned web Explore with a 2D-primary indoor floorplan, real same-floor Situm path routing, and explicit Digital Twin 3D walkthrough mode;
- native indoor positioning, map exploration, POI navigation, foreground positioning lifecycle, and explicit native Digital Twin 3D walkthrough mode;
- server-mediated native Realtime position monitoring;
- ClickHouse-backed workspace analytics;
- web-to-native Map/Realtime handoff;
- public direct Android APK download without requiring application login.

Google OAuth plumbing exists but provider runtime acceptance is not part of the currently verified product path. iOS build/device delivery and store distribution require the corresponding Apple environment and release setup.

## Repository layout

```text
app/                  Nuxt/Vue web client
server/               Nitro API, application services, integrations, persistence
shared/               runtime-neutral shared contracts/helpers
mobile/               React Native + Expo companion app
design/               product UI/UX implementation references
docs/                 human-facing operator/developer/research documentation
deploy/               staging deployment configuration
scripts/              repository operational helpers
plans/                historical and future scoped implementation plans
.agents/               agent-only work state, decisions, evidence, sessions, protocols
```

## Documentation map

Documentation is intentionally split by audience:

### Human documentation

- [README.md](README.md) — project overview, setup, capabilities, and entry points.
- [ARCHITECTURE.md](ARCHITECTURE.md) — current runtime, security, and ownership boundaries.
- [DESIGN.md](DESIGN.md) and [`design/`](design/) — current product UX and implementation contracts.
- [`docs/README.md`](docs/README.md) — operator/developer documentation index, including Android distribution, Digital Twin assets, and research notes.

These files describe the product **as it exists now**. Update them when current runtime behavior or operating procedures change.

### Agent documentation

- [AGENTS.md](AGENTS.md) — agent entry point and mandatory read order.
- [`.agents/`](.agents/) — current agent state, durable decisions, execution protocols, evidence, and session history.
- [`plans/`](plans/) — implementation plans and historical execution records.

Agent evidence, sessions, and completed plans are historical records unless a current-authority file explicitly says otherwise. They must not override the human product contracts above.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the current runtime and security boundaries, [DESIGN.md](DESIGN.md) for product design rules, and [design/data-source-matrix.md](design/data-source-matrix.md) for the current Situm capability matrix.

The important invariant is that mobile is a second client, **not a second backend**. User identity, workspace authorization, server-side Situm authority, analytics ownership, and safe error handling remain centralized in Nitro.

## Setup

```sh
npm install
cp .env.example .env
npm run dev
```

The standalone mobile package lives under `mobile/`:

```sh
cd mobile
npm install
npm run typecheck
```

Runtime configuration is documented through `.env.example` and the relevant deployment/release documents. Never commit credentials, sessions, encryption keys, signing material, or local environment files.

## Validation

For web/backend changes, the normal baseline is:

```sh
git diff --check
npm run lint
npm run typecheck
npm run build
```

For mobile changes, also run:

```sh
cd mobile
npm run lint
npm run typecheck
```

Persistent unit tests are intentionally not kept in this repository. When a task needs E2E, white-box, or black-box checks, they are temporary execution artifacts and must be deleted before commit/closeout.

Runtime acceptance should use a production build/preview for the web application. Android release verification is documented in [docs/mobile-distribution.md](docs/mobile-distribution.md). The Blender-to-Situm 3D asset workflow is documented in [docs/situm-3d-models.md](docs/situm-3d-models.md).

## Deployment and Android distribution

The Makefile is the routine interface for image publication and staging operations. Staging Compose is pull-only and reuses external PostgreSQL, ClickHouse, and observability services; runtime secrets remain external to images and source control.

Android standalone releases are arm64 artifacts with deterministic semantic-version filenames and a stable public download alias. Build, verification, MinIO publishing, branding, and download behavior are documented in [docs/mobile-distribution.md](docs/mobile-distribution.md).

## Product and integration rules

For Situm behavior, do not infer capabilities from UI prototypes or old implementation history. New or changed behavior must be supported by the installed SDK/current integration contract and must preserve least privilege.

The Read & Write Situm credential remains server-only. The authenticated browser Viewer and native positioning flow receive only the workspace Only Read credential through bounded backend endpoints, while native Realtime remote reads remain server-mediated.
