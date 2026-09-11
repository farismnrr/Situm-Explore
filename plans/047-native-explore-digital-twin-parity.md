# Plan 047 — Native Explore Digital Twin 3D Parity

Status: closure complete on branch; implementation commit `61fd329`; user physical E2E accepted for the product flow; final mode-switch layout remediation complete; integration pending user authorization
Owner: repository implementation under user authorization
Scope: native Explore plus the narrow runtime-neutral web/native Digital Twin contracts required for parity
Depends on: Plan 046 integrated on `main`

## Goal

Add an explicit Digital Twin 3D mode to React Native Explore while preserving the accepted app-owned 2D positioning/navigation experience.

Native Explore remains 2D-first. Digital Twin 3D is an explicit opt-in and must never silently replace or degrade 2D navigation.

## Product contract

- Explore opens in 2D by default.
- 2D continues to own floorplan rendering, Situm POIs, live positioning, blue dot, heading/accuracy, app-owned path routing, ETA, arrival/off-route state, and turn-by-turn guidance.
- Digital Twin 3D is explicit opt-in and lazy: no GLB request and no GL context before entering 3D.
- 3D owns authenticated GLB walkthrough, semantic room search, deterministic reset, room travel, floor selection, and touch look/walk controls.
- 3D v1 does not fabricate blue-dot projection, route geometry, turn-by-turn guidance, or vertical route transitions.
- An explicitly selected 3D failure remains an explicit 3D error. There is no silent fallback to 2D; the user may manually choose `2D Map`.
- Workspace/building/floor/model identity must prevent stale models from surviving context changes.

## Architecture decisions

### Shared deterministic view contract

Web and native consume one runtime-neutral Digital Twin view contract from `shared/indoor-walk-view.ts`.

The accepted canonical pose remains:

- model slots: floor level `0 -> lt1`, level `1 -> lt2`;
- canonical top axis: `-z`;
- normalized spawn: `x=0.50, z=0.78`;
- normalized look target: `x=0.94, z=0.78`;
- eye height: `1.620 m`.

Semantic rooms remain search/travel authority only and do not define orientation.

### Shared semantic-room parsing

Pure model-object naming/canonicalization is runtime-neutral and shared through `shared/indoor-walk-semantics.ts`. Web and native keep renderer traversal/platform code separate.

### Native renderer stack

Physical feasibility proof established the production candidate:

- Expo SDK 57 / React Native 0.86;
- `expo-gl ~57.0.2`;
- mobile-only `three 0.162.0` plus matching types/GLTFLoader;
- no WebView renderer;
- no `expo-three` dependency;
- no vendor patch or GLB asset rewrite.

Three `0.180.x` remains web-owned and is not forced into the native GL runtime.

A narrow native compatibility adapter owns browser-host assumptions and the Expo GL multisample gap. Unsupported multisampled renderbuffer behavior is handled at the renderer compatibility boundary rather than by mutating GLB transmission/thickness materials individually.

The native render loop is deliberately frame-limited rather than unrestricted so the target POS remains responsive.

### Authenticated GLB transport

Native binary model retrieval uses the existing authenticated Nitro endpoint:

`/api/workspaces/{workspaceId}/situm/3d-model/{slot}?buildingId={buildingId}`

The mobile API client preserves the existing session/request-id/timeout/abort boundary. No Situm Read & Write credential is exposed to mobile and no unauthenticated model route is introduced.

## Implementation summary

Implemented:

- `NativeMapScreen` explicit `2d | 3d` orchestration;
- lazy 3D mounting and authenticated binary GLB retrieval;
- `NativeDigitalTwin` renderer UI and lifecycle;
- Three/Expo GL compatibility adapter;
- deterministic camera/reset contract shared with web;
- shared semantic-room parsing;
- room search + Go;
- floor switching;
- drag-to-look and touch walk controls;
- app background/foreground pause/resume;
- stale request invalidation and renderer/resource disposal;
- explicit 3D unavailable/error states;
- Metro watch scope for the repository `shared/` runtime-neutral contracts;
- existing native 2D positioning/navigation retained as the default experience.

Final UI remediation places the 2D/3D switch inside the existing map-control cluster rather than as an independent bottom-right absolute control. In 2D, `Digital Twin 3D` is part of the accepted left control stack. In 3D, `2D Map` sits beside `Reset` in the bottom-left control row. This avoids collision with location status and destination surfaces.

## Physical evidence and acceptance

Phase 0 authenticated physical proof on the Android POS rendered actual workspace GLBs through Expo GL and Three:

- workspace `003b660a-dfa5-426f-b2e5-7f8023e084a3`;
- building `19954`;
- LT1: `180,332` bytes, 118 meshes;
- LT2: `156,012` bytes, 100 meshes;
- device: Android API 30, arm64-v8a, Mali-G52 / OpenGL ES 3.2-class context.

The user subsequently performed product E2E and stated the remaining 2D/3D behavior was safe/acceptable, with only the mode-switch button collision requiring revision. The final button relocation is a later UI-only remediation and is not falsely recorded as user-retested physical evidence unless separately exercised.

## Validation / closure gates

Required before branch closeout:

- mobile typecheck;
- mobile lint;
- `git diff --check`;
- web Engineering Guard because shared/web contract consumers changed;
- web maintainability ratchet;
- mobile Engineering Guard;
- mobile maintainability ratchet;
- repository agent/governance validation where applicable;
- no proof-only/test artifacts or debug diagnostic logging left behind;
- branch commit and push only; no PR or merge without explicit user authorization.

## Definition of Done

- [x] Native Explore defaults to current app-owned 2D.
- [x] Digital Twin 3D is explicit opt-in.
- [x] Native renders authenticated trusted GLB data directly through native GL, not a web page.
- [x] No GLB/GL startup occurs before 3D opt-in.
- [x] Web/native share deterministic model-slot/camera orientation authority.
- [x] F1/F2 use the same canonical orientation semantics.
- [x] Workspace/building/floor model state is generation-owned and stale-safe.
- [x] Missing/unavailable 3D is explicit and never silently falls back.
- [x] Search/Go uses model-derived semantic rooms.
- [x] Existing 2D positioning/navigation remains the native navigation authority.
- [x] Renderer lifecycle includes pause/resume and resource disposal.
- [x] Physical Android rendering feasibility passed for LT1/LT2.
- [x] User accepted the product E2E flow apart from the final reported button-placement issue.
- [x] Final mode-switch controls were relocated into existing control clusters.
- [x] Closure governance passes with the documented mobile `image-size` scanner residual remaining visible under the existing local parser remediation policy.
- [x] Implementation commit `61fd329` created; branch push is part of this explicit closeout sequence.
- [ ] PR/integration authorized separately by the user.
