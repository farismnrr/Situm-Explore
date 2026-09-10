# Situm Explore Design

This document defines the current product design rules for the web and native Situm Explore clients.

## Canonical visual references

Shared web/product reference:

`design/reference/situm-explore-interactive-prototype.html`

Native/responsive reference:

`design/reference/situm-explore-native-responsive-prototype.html`

These references define hierarchy, density, spacing, typography, surface treatment, navigation vocabulary, and responsive intent. They do **not** override real backend, security, SDK, or data capability.

## Product visual direction

- clean minimalist SaaS presentation;
- light mode with restrained cool-neutral surfaces;
- premium but not decorative;
- consistent Situm Explore brand and icon language across clients;
- responsive layouts instead of scaled-up phone screens;
- accessible labels, focus behavior, touch targets, keyboard behavior, and large-text resilience;
- truthful loading, empty, denied, unavailable, and error states;
- workspace-scoped async surfaces treat unresolved workspace context plus Nuxt `idle`/`pending` requests as loading; data-derived empty, count, configuration, and unavailable states appear only after resolution;
- no fake product data or fake capability for prototype parity.

## Responsive navigation

Native intent:

- phone: bottom navigation with reachable scroll content;
- tablet/POS: compact rail;
- wide displays: expanded rail and multi-column feature layouts;
- very wide displays: use available space without an artificial narrow content cap.

Web keeps its responsive authenticated shell and uses native handoff where defined by the product capability matrix.

## Authentication UX

Email/password login and registration are real application flows.

- use visible field labels and accessible validation;
- keep submit/loading/error states clear;
- keep software-keyboard layouts usable, including landscape/small-height Android devices;
- use generic safe invalid-credential feedback;
- do not expose session, password-hash, provider-token, or server diagnostic details.

## Workspace UX

A workspace is a private app-owned container for one user's Situm configuration and product context.

- one user may own multiple workspaces;
- switching workspace changes active cartography/operations context;
- stored Situm credential values are write-only and are never rendered back;
- deletion must clearly refer to application workspace state, not deletion of the external Situm organization;
- there is no invite/member/team UI in the current product model.

## Credential/configuration UX

Workspace configuration distinguishes exactly two Situm credentials:

- Only Read API key — used for mobile positioning and read-only Situm access; the app-owned browser Map consumes server-mediated cartography and does not need the raw key, while any separate verified direct Viewer caller may receive it only through a bounded authenticated endpoint;
- Read & Write API key — server-only authority for operations that modify Situm data and must never be returned to browser/mobile clients;
- Situm account/organization ID — derived server-side from whichever verified credential establishes the workspace context rather than manually entered.

Either key may be configured independently. Configuration UI should explain these roles without exposing stored secrets, and replacing one credential must not require or erase the other.

## Explore / Map UX

Native Explore is map-first and uses real Situm cartography.

- search and selection operate on real current-building POIs;
- building/floor/selected-place context comes from real cartography;
- location intent uses end-user language such as finding/centering location rather than SDK lifecycle jargon;
- permission/sensor failures leave non-positioning map exploration usable where possible;
- navigation actions use actual supported Situm behavior and do not invent ETA, route steps, or geometry fields that are not available;
- positioning, follow, floor, and guidance states must remain tied to real runtime state.

Web Explore is a 3D-only digital-twin walkthrough rather than a top-down floorplan. The primary camera is perspective/eye-level, with mouse-look and keyboard/touch walking controls, searchable model-derived rooms, floor switching, and camera travel to a selected destination. If the floor GLB, WebGL runtime, or discoverable semantic-room data is unavailable, Explore shows an explicit error instead of falling back to 2D. Sensor-backed blue-dot positioning and turn-by-turn guidance remain native-only.

## Realtime UX

Realtime is a device/position operations view, not a people-presence product.

- show only authorized device/position identity and supported building/floor, accuracy, coordinate, and source-time information;
- search/filter may use already-authorized real data;
- do not invent online/idle/offline state or local freshness semantics;
- do not fabricate remote map markers/focus when the installed native MapView does not expose that capability;
- native Realtime remains visually useful as list/detail while remote reads remain server-mediated.

## Recent UX

Do not fabricate recent activity or create an artificial audit backend solely to populate the screen. Without a trustworthy user-scoped history source, use a polished truthful empty/unavailable state.

## Settings UX

Settings should expose real workspace/session/location state only:

- workspace context/switching;
- contextual location-access information;
- background location as not requested while the product does not request it;
- authenticated account identity;
- sign out using the actual session/logout contract.

Sign out is a destructive-session action and should be visually differentiated accordingly.

## Error and support UX

Expected validation/auth/forbidden/not-found/conflict failures use clear product language. Unexpected failures use a safe generic message and may include a support/reference ID.

Never render stack traces, SQL details, raw upstream bodies, SDK internals, credentials, tokens, or telemetry internals.

## Capability rule

For Situm-domain behavior: **no evidence = no implementation**. Verify the current installed SDK/integration capability and runtime owner before changing behavior. Prototype labels and historical plans are not capability evidence.

## Implementation guidance

Use Nuxt UI primitives first on web and the existing native token/layout primitives on mobile. Prefer small semantic components over broad framework-like abstractions. Add custom styling only when it serves a real product gap.

See `design/IMPLEMENTATION.md` for production implementation boundaries and `design/data-source-matrix.md` for current capability ownership.
