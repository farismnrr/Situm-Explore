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
| App-owned browser Map authority | Authenticated workspace cartography through Nitro; no Situm credential is issued to the Map renderer |
| Native positioning authority | Workspace Only Read credential requested from Nitro after authenticated workspace-owner authorization |
| Browser Map/cartography | App-owned responsive floorplan/POI renderer over workspace-scoped Situm cartography |
| Buildings/Floors/POIs/Categories | Workspace-scoped Situm/cartography; web and native consume authorized real data |
| Geofences/Paths | Workspace-scoped server Situm integration where implemented |
| Web navigation | No sensor-backed guidance in browser Map; native app owns positioning/navigation handoff, and web must not synthesize route metrics |
| Native Map/positioning/navigation | `@situm/react-native` + shared `ForegroundPositioningSession` |
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

- desktop/tablet/phone-sized web Map: app-owned responsive cartography renderer;
- sensor-backed positioning/navigation from web Map: explicit native-app handoff;
- web Realtime on desktop/tablet/phone: native handoff;
- native positioning/navigation: native client only;
- analytics/admin/workspace configuration: web product.

For new or changed Situm behavior, verify the installed/current endpoint or SDK method, auth/permission, runtime owner, consumed data/events, and failure behavior. No evidence means unresolved/absent.
