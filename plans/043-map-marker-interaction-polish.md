# Plan 043 — Map Marker & Interaction Polish

Status: implementation + closure validation complete; integrated locally into main

## Goal
Polish the app-owned indoor map based on physical-office screenshots: POIs must identify what they are without obscuring the floorplan, the live-position cursor must stay visually compact, and tapping the map must dismiss the open search surface.

## Scope
- Replace oversized plain POI circles with compact marker + readable POI label treatment.
- Keep marker/label visual size stable enough across map zoom instead of scaling into large floorplan-obscuring circles.
- Suppress colliding POI labels and prioritize selected/important labels so the floorplan remains readable.
- Reduce current-location dot and heading cursor footprint while retaining bounded accuracy information.
- Tap on map background dismisses keyboard and collapses search results without clearing the typed query.
- Make direct POI taps deterministic on the Android POS through screen-space press targets without enlarging the visual marker.
- Turn active guidance into a navigation-focused mode: hide browse chrome, use a compact responsive turn card and bottom summary/Stop card, add a small recenter control, and keep the live user position in a closer lower-center follow view.
- Preserve pan/pinch, floor switching, routing, recenter, fullscreen, and headless Situm positioning.

## Physical evidence — 2026-09-03
- POS viewport/runtime: 1366px-wide landscape Android device, real Situm building `19866` positioning.
- Browse map: visible labels `Toilet`, `Kitchen`, and `Ruang Kerja 3`; measured hierarchy had zero label-label and zero label-marker overlap for the rendered floor-2 set.
- Direct marker selection: `Open Ruang Kerja 3` press target opened the destination sheet successfully.
- Search dismissal: tapping the map reduced open search results from one panel to none and left the search input unfocused without clearing the selected query.
- Live location: Locate me transitioned to Recenter and fresh native Situm fixes continued arriving.
- Guidance: Start navigation entered the compact navigation-focused UI and the responsive pass measured the blue turn card at 560x65px on a 1366x768 screencap; the dark Stop control measured about 53x44px. POS instruction typography resolves to roughly 16px instead of the previous fixed 21px, with a ~47px turn icon.
- Focused `mobile` lint and TypeScript checks passed after the responsive/follow-camera patch. Bounded post-navigation logcat showed no fatal/React runtime error.

## Validation
During implementation use focused checks only. At explicit closure run the mobile Engineering Guard + maintainability once, per repository governance.

## Integration
Local commit is allowed after validation. Push/PR/merge remain user-gated.
