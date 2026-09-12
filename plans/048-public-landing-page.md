# Plan 048 — Public Landing Page

Status: implementation complete; awaiting user review / PR authorization
Branch: `plan/048-public-landing-page`
Depends on: current integrated `main`

## Goal

Replace the stale prototype-era public home page with a production-quality Situm Explore landing page that accurately reflects the current web + native product, reuses the established visual system, and keeps all claims inside the verified capability boundary.

## Scope

- Rework `app/pages/index.vue` as the public marketing/product landing page.
- Preserve the existing Situm Explore light-mode visual language and brand mark.
- Lead with the real product value: indoor map exploration, same-floor static web routing, explicit Digital Twin 3D, native positioning/navigation, Realtime operations, workspace isolation, and analytics.
- Use truthful current capability copy only; remove prototype/dummy-data/old-plan messaging and unsupported presence/route claims.
- Keep signed-in users routed into the app and unauthenticated users routed to registration/login.
- Preserve the optional public Android download CTA when configured.
- Keep the page responsive, keyboard/focus friendly, and reduced-motion compatible through the existing shared CSS behavior.

## Out of scope

- Changes to authenticated product behavior, backend APIs, Situm capability, analytics semantics, or mobile code.
- New external assets, tracking, CMS, or third-party marketing dependencies.
- Browser 3D route projection, cross-floor web routing, presence/online state, ETA, or turn-by-turn web guidance.

## Phase 1 — Landing page implementation

- [x] Build the new public page in `app/pages/index.vue`.
- [x] Keep copy aligned with `README.md`, `DESIGN.md`, `design/IMPLEMENTATION.md`, and `design/data-source-matrix.md`.
- [x] Validate with `git diff --check`, lint, typecheck, and production build.
- [ ] Record final persistence after the implementation commit is pushed.

## Acceptance

- Public `/` reads as a current product landing page rather than an interactive-prototype placeholder.
- No unsupported Situm or Realtime capability is claimed.
- Main CTA works for both logged-in and logged-out sessions.
- Android download CTA remains conditional on runtime configuration.
- Page remains usable at desktop, tablet, and phone widths.
