# Knowledge Index

This store contains reusable verified project/domain knowledge for agents. It must not compete with current state or human product documentation.

Current `.agents/state.md`, active durable decisions, `ARCHITECTURE.md`, `DESIGN.md`, `design/IMPLEMENTATION.md`, the capability matrix, and any explicitly active plan override older observations. Historical findings remain useful only when their scope/date is clear.

## Documentation authority

- Human current product/operations truth: `README.md`, `ARCHITECTURE.md`, `DESIGN.md`, `design/`, and `docs/`.
- Agent current execution/governance truth: `AGENTS.md`, `.agents/state.md`, `.agents/memory/decisions.md`, `.agents/protocols/`, and an explicitly active plan.
- Historical evidence: completed `plans/`, `.agents/evidence/`, `.agents/sessions/`, reviews, and old execution briefs. Do not rewrite historical snapshots merely to make them sound current.

Source: user direction on 2026-09-11 plus repository documentation policy.

## PostgreSQL application boundary

- Situm Explore uses PostgreSQL through `DATABASE_URL`.
- Application-owned Drizzle objects live in the dedicated `situm_explore` schema.
- The active staging database was migrated from the earlier `public.*` compatibility state into `situm_explore.*`; the old public-schema worktree overlay is obsolete and must not be resurrected.
- Application persistence owns users, provider identities, workspaces, and encrypted workspace Situm configuration metadata/envelopes.
- External Situm resources are not automatically cached in PostgreSQL without a concrete product requirement.

Source: current architecture + Plan 045 staging migration evidence.

## Authentication and workspace model

- Application users are PostgreSQL-backed; email/password registration/login is the verified path.
- Nuxt sealed sessions remain the application session mechanism; native transports the same sealed app session through `x-nuxt-session` and persists it only in SecureStore.
- Google OAuth plumbing exists, but real provider runtime acceptance remains external/user-owned.
- One application user may own many private workspaces; a workspace has one application owner in the current model.
- Client-provided user/workspace identity is context only. Nitro verifies authority server-side.

Source: current architecture and integrated Plans 021–029.

## Situm credential boundary

- The current workspace model has exactly two user-managed Situm credentials: **Only Read** and **Read & Write**.
- Only Read is encrypted at rest, powers server read paths, and may be issued only through bounded authenticated owner-scoped endpoints to native positioning or a concrete verified direct Viewer caller.
- Read & Write is encrypted at rest and server-only; it must never enter browser/mobile/public config/logs/docs.
- The app-owned browser Map itself consumes server-mediated cartography/paths and does not receive a raw Situm key.
- Native remote Realtime remains server-mediated.

Source: Plan 038 and current durable decisions.

## Browser Explore boundary

- `/app/map` is 2D-primary and app-owned.
- 2D consumes authenticated workspace cartography, POIs, floor images, and Situm wayfinding paths through Nitro.
- Same-floor static POI-to-POI routing is app-owned over the real Situm graph. Endpoint snapping, verified link directionality, path-object identity, and generation-owned async state are part of the durable route contract.
- Tagged generic graphs and cross-floor browser routing remain explicit unsupported cases until semantics are proven; no straight-line fallback or invented route metrics/guidance.
- Digital Twin 3D is explicit opt-in and lazy. It uses workspace + Situm building + floor/model-slot identity and no flat/global GLB fallback.
- Web 3D initial/reset orientation comes from the shared deterministic view descriptor; semantic rooms are discovery/travel targets only.
- Explicit 3D failures stay explicit and never silently switch to 2D.

Source: Plans 045–046 plus PR #48 integration.

## Native Explore boundary

- Native 2D remains the authority for live indoor positioning, blue dot, app-owned route rendering, ETA, arrival/off-route state, and turn-by-turn guidance.
- Digital Twin 3D is explicit opt-in and lazy; before entry there is no GLB request or GL context startup.
- Native 3D uses Expo GL + mobile-owned Three `0.162.0`, authenticated workspace/building model retrieval, and shared runtime-neutral model-slot/view + semantic-room contracts.
- Native 3D owns room search/Go/reset/floor selection/touch look-walk and renderer lifecycle cleanup only.
- Native 3D must not fabricate blue-dot projection, 2D route geometry, ETA, arrival/off-route state, turn-by-turn guidance, or vertical navigation.
- The renderer is deliberately frame-limited for the target Android POS.

Source: integrated Plan 047 / PR #46.

## Situm Path persistence research

- Building `19954` / floor `70557` is missing its server-side Situm Path aggregate.
- Current and historical public contracts expose organization/building GET plus building-scoped PUT, but no supported create/bootstrap operation.
- Authenticated Map Editor and direct scoped PUT reach the same `404 entity_not_found`; broader Read & Write auth does not reveal a hidden POST creation route.
- Current state is **BLOCKED BY SITUM BACKEND** until Situm provisions the aggregate or documents an official target-safe create/upsert endpoint.
- Human-readable sanitized evidence is in `docs/research/situm-path-investigation.md`; `scripts/situm/upload-paths.sh` is a guarded post-provisioning uploader, not a current working fix.

Source: PR #47 research preservation.

## Situm external evidence rule

- Model recollection, old plan wording, fixture shapes, and prototype labels are not implementation evidence.
- Verify exact current official endpoint/SDK method, installed-version compatibility, browser/server owner, web/native owner, auth/permission, consumed fields/events, and failure semantics before implementing changed Situm behavior.
- Missing material evidence means `UNRESOLVED`; do not guess or fabricate a successful fallback.

Source: active durable decision.

## Current SDK/runtime baselines

- Web: Nuxt `^4.5.2`, Three `^0.180.0`, `@situm/sdk-js` `^0.25.0`.
- Mobile: Expo `~57.0.14`, React Native `0.86.2`, React `19.2.3`, `@situm/react-native` `3.19.2`, `expo-gl ~57.0.2`, mobile Three `0.162.0`.
- The Situm React Native package still requires a narrow local TypeScript/source compatibility boundary because its published package metadata references missing `lib/` artifacts.
- Re-verify current installed versions/contracts whenever a future task materially changes SDK behavior.

Source: current package manifests and integrated Plan 047.

## ClickHouse analytics boundary

- Reuse the existing ClickHouse instance; do not provision another one.
- ClickHouse remains server-side analytics storage while PostgreSQL remains application relational storage.
- Analytics reads/writes are workspace-isolated.
- Legacy pre-workspace rows have no proven owner and must not be assigned arbitrarily.

Source: current architecture and completed analytics roadmap.

## Observability and safe errors

- Reuse existing observability infrastructure and supported protocols.
- Correlation/trace context may cross meaningful request boundaries, but credentials, cookies, passwords, tokens, sensitive bodies, and location streams must not be dumped into normal telemetry.
- Client responses expose sanitized product errors; detailed critical/internal diagnostics remain server-side.

Source: current architecture and durable decisions.

## Historical knowledge files

Focused `.agents/knowledge/*.md` files with older plan/phase names are scoped evidence from those plans. Reuse them when the exact external contract is still relevant, but they do not reactivate old roadmaps or override the current sources above.
