# Situm Explore Capability & Data Source Matrix

This is the current product capability and runtime-owner matrix. Detailed technical rules live in `ARCHITECTURE.md` and `design/IMPLEMENTATION.md`.

| Capability | Current source / owner |
| --- | --- |
| Email/password authentication | PostgreSQL-backed application identity + Nitro session APIs |
| Google OAuth | Provider plumbing exists; runtime provider acceptance is not part of the verified path |
| Private workspaces | PostgreSQL/Drizzle + owner-scoped Nitro APIs |
| Workspace Situm configuration | Nitro + encrypted PostgreSQL workspace credential storage |
| Situm read/client authority | Verified Only Read credential; used for server read paths and issued through authenticated owner scope to native positioning or a concrete verified direct Viewer caller when needed; the app-owned web Map consumes server-mediated cartography |
| Situm mutation/admin authority | Verified Read & Write credential; server-only and never returned to browser/mobile |
| App-owned browser Map authority | Authenticated workspace cartography and wayfinding paths through Nitro; no Situm credential is issued to the Map renderer |
| Native positioning authority | Workspace Only Read credential requested from Nitro after authenticated workspace-owner authorization |
| Browser Explore / digital twin | App-owned 2D floorplan renderer is primary over authenticated workspace cartography; explicit Digital Twin 3D lazy-mounts the Three.js/WebGL eye-level renderer over authenticated workspace/building-scoped floor GLB assets |
| Buildings/Floors/POIs/Categories | Workspace-scoped Situm/cartography; web and native consume authorized real data |
| Geofences/Paths | Workspace-scoped server Situm integration where implemented |
| Web static routing | App-owned same-floor POI-to-POI route calculation over real Situm wayfinding paths; 2D renders the normalized route, tagged graphs fail explicitly until route-filter semantics are proven, and 3D projection is not yet implemented |
| Web navigation | No sensor-backed guidance in browser Map; native app owns positioning/navigation handoff, and web must not synthesize route metrics, ETA, rerouting, arrival, or turn-by-turn guidance |
| Native Map/positioning/navigation | `@situm/react-native` + shared `ForegroundPositioningSession`; 2D remains the live positioning/navigation authority |
| Native Digital Twin 3D | Explicit lazy opt-in using authenticated workspace/building GLB retrieval, `expo-gl`, mobile-owned Three `0.162.0`, and shared runtime-neutral view/semantic contracts; no fabricated 3D blue dot, route, ETA, arrival/off-route, or turn-by-turn guidance |
| Native Realtime remote positions | Server-mediated owner-scoped workspace Realtime API |
| Own-device Realtime positioning | Shared foreground native positioning session; reported position reaches server-mediated Realtime |
| Realtime presence/online state | Not supported; omitted |
| Generic native remote-position Map markers/focus | Not supported by the current proven MapView surface; omitted |
| Share Live Location | Separate Situm capability; not used as Realtime Positions |
| Organization/Users/Groups/Alarms reads | Workspace-scoped server Situm integration |
| Analytics + CSV | Workspace-isolated ClickHouse analytics through Nitro |
| Legacy pre-workspace analytics rows | Historical/unscoped; not attributed without evidence/policy |
| Trajectory | Unresolved/omitted |
| Route steps/geometry/ETA synthesis | Not supported; do not invent |
| Android direct installation | Public anonymous-download APK via the distribution contract in `docs/mobile-distribution.md` |
| iOS store/device delivery | External Apple/macOS/signing gate; not part of the currently verified local release path |

## Web/native routing policy

- desktop/tablet/phone-sized web Explore: app-owned 2D floorplan renderer by default, with explicit Digital Twin 3D opt-in over workspace/building-scoped floor GLB assets;
- web 2D static routing: real Situm POIs + authenticated Situm wayfinding paths, with app-owned same-floor route calculation and no synthetic fallback;
- tagged path graphs and cross-floor web routing: explicit unsupported cases until their routing semantics are proven;
- web Explore destinations: canonical semantic room objects from the active GLB when Situm POIs are empty; never synthetic POIs;
- after explicit 3D opt-in, missing GLB/WebGL/semantic-room capability is an explicit 3D error; the mode never silently falls back to 2D;
- sensor-backed positioning/navigation from web Explore: explicit native-app handoff;
- web Realtime on desktop/tablet/phone: native handoff;
- native positioning/navigation: native 2D client surface only; native Digital Twin 3D is a separate explicit walkthrough mode and does not take over live guidance;
- analytics/admin/workspace configuration: web product.

For new or changed Situm behavior, verify the installed/current endpoint or SDK method, auth/permission, runtime owner, consumed data/events, and failure behavior. No evidence means unresolved/absent.
