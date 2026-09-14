<script setup lang="ts">
const { loggedIn } = useUserSession()
const config = useRuntimeConfig()

const continuePath = computed(() => loggedIn.value ? '/app' : '/register')
const primaryLabel = computed(() => loggedIn.value ? 'Open workspace' : 'Start exploring')
const androidDownloadUrl = computed(() => config.public.mobile.androidDownloadUrl || '')

useHead({
  title: 'Situm Explore — Indoor mapping, navigation & operations',
  meta: [
    {
      name: 'description',
      content: 'Explore indoor maps, static web routes, Digital Twin walkthroughs, Realtime device positions, analytics and native indoor navigation in one workspace.'
    }
  ]
})

const capabilities = [
  {
    icon: 'i-lucide-map',
    title: '2D indoor exploration',
    text: 'Browse real floorplans and POIs, switch floors, search places and keep spatial context at the center of the workflow.'
  },
  {
    icon: 'i-lucide-route',
    title: 'Same-floor web routing',
    text: 'Plan verified POI-to-POI routes over real Situm wayfinding paths without inventing route metrics or unsupported guidance.'
  },
  {
    icon: 'i-lucide-box',
    title: 'Digital Twin 3D',
    text: 'Step into an explicit eye-level walkthrough for supported buildings and floors, while keeping 2D as the primary web map.'
  },
  {
    icon: 'i-lucide-radio',
    title: 'Realtime operations',
    text: 'Monitor authorized device and position data with building, floor, coordinate, accuracy and source-time context.'
  },
  {
    icon: 'i-lucide-bar-chart-3',
    title: 'Workspace analytics',
    text: 'Keep analytics isolated to the active workspace and review operational signals through the same application backend.'
  },
  {
    icon: 'i-lucide-shield-check',
    title: 'Private workspaces',
    text: 'Separate each owner’s Situm configuration, cartography and operational context with server-side authorization boundaries.'
  }
]

const webHighlights = [
  'Map-first 2D workspace',
  'POI search and floor switching',
  'Same-floor static route planning',
  'Explicit Digital Twin 3D mode',
  'Administration and analytics'
]

const nativeHighlights = [
  'Indoor positioning and blue dot',
  'Turn-by-turn navigation',
  'Foreground positioning lifecycle',
  'Realtime position operations',
  'Digital Twin 3D walkthrough'
]
</script>

<template>
  <div class="landing-page">
    <a href="#main-content" class="skip-link">Skip to content</a>

    <header class="site-header">
      <div class="landing-container header-inner">
        <NuxtLink to="/" class="brand-link" aria-label="Situm Explore home">
          <BrandMark size="sm" />
          <span>Situm Explore</span>
        </NuxtLink>

        <nav class="desktop-nav" aria-label="Primary navigation">
          <a href="#capabilities">Capabilities</a>
          <a href="#platform">Platform</a>
          <a href="#workflow">Workflow</a>
        </nav>

        <div class="header-actions">
          <UButton
            v-if="!loggedIn"
            to="/login"
            color="neutral"
            variant="ghost"
          >
            Sign in
          </UButton>
          <UButton :to="continuePath" trailing-icon="i-lucide-arrow-right">
            {{ primaryLabel }}
          </UButton>
        </div>
      </div>
    </header>

    <main id="main-content">
      <section class="hero-section">
        <div class="landing-container hero-grid">
          <div class="hero-copy">
            <div class="hero-kicker">
              <span class="kicker-dot" aria-hidden="true" />
              Indoor exploration & operations
            </div>

            <h1>Make indoor spaces easier to understand, navigate and operate.</h1>
            <p class="hero-lede">
              Situm Explore brings indoor cartography, route planning, Digital Twin walkthroughs,
              Realtime position operations and analytics into one calm workspace — with native
              positioning and navigation when sensors matter.
            </p>

            <div class="hero-actions">
              <UButton
                :to="continuePath"
                size="xl"
                trailing-icon="i-lucide-arrow-right"
              >
                {{ primaryLabel }}
              </UButton>
              <UButton
                v-if="androidDownloadUrl"
                :href="androidDownloadUrl"
                target="_blank"
                rel="noreferrer"
                size="xl"
                color="neutral"
                variant="outline"
                icon="i-lucide-download"
              >
                Download Android
              </UButton>
              <UButton
                v-else
                href="#capabilities"
                size="xl"
                color="neutral"
                variant="outline"
              >
                View capabilities
              </UButton>
            </div>

            <div class="hero-proof" aria-label="Product highlights">
              <span><UIcon name="i-lucide-monitor" /> Web workspace</span>
              <span><UIcon name="i-lucide-smartphone" /> Native companion</span>
              <span><UIcon name="i-lucide-layers-3" /> 2D + Digital Twin 3D</span>
            </div>
          </div>

          <div class="hero-product" aria-label="Situm Explore product preview">
            <div class="product-window">
              <div class="window-topbar">
                <div class="window-dots" aria-hidden="true"><i /><i /><i /></div>
                <div class="window-title">Explore · Main Building · Floor 1</div>
                <div class="window-status"><span /> Connected workspace</div>
              </div>

              <div class="window-body">
                <aside class="preview-rail" aria-hidden="true">
                  <div class="preview-logo"><BrandMark size="sm" /></div>
                  <i class="active"><UIcon name="i-lucide-map" /></i>
                  <i><UIcon name="i-lucide-building-2" /></i>
                  <i><UIcon name="i-lucide-radio" /></i>
                  <i><UIcon name="i-lucide-bar-chart-3" /></i>
                  <span />
                  <i><UIcon name="i-lucide-settings" /></i>
                </aside>

                <div class="preview-workspace">
                  <div class="preview-toolbar">
                    <div>
                      <small>Indoor map</small>
                      <strong>Explore</strong>
                    </div>
                    <div class="mode-switch" aria-hidden="true">
                      <b>2D Map</b><span>Digital Twin 3D</span>
                    </div>
                  </div>

                  <div class="preview-map">
                    <img
                      src="/building-layouts/gedung-lt1-big.jpeg"
                      alt="Indoor floorplan used by Situm Explore"
                    >
                    <div class="map-search"><UIcon name="i-lucide-search" /> Search places</div>
                    <div class="floor-pill">Floor 1 <UIcon name="i-lucide-chevron-down" /></div>
                    <svg class="route-line" viewBox="0 0 500 220" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M104 156 C 150 156, 160 109, 223 110 S 322 124, 385 78" />
                    </svg>
                    <i class="map-point point-start" aria-hidden="true" />
                    <i class="map-point point-end" aria-hidden="true" />
                    <div class="route-card">
                      <span class="route-icon"><UIcon name="i-lucide-route" /></span>
                      <div><small>Static route</small><strong>Lobby → Workroom</strong></div>
                      <span class="route-ready">Ready</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="floating-card floating-card-realtime">
              <span class="floating-icon"><UIcon name="i-lucide-radio" /></span>
              <div><small>Realtime</small><strong>Position updates</strong></div>
            </div>
            <div class="floating-card floating-card-twin">
              <span class="floating-icon"><UIcon name="i-lucide-box" /></span>
              <div><small>Explore</small><strong>Digital Twin 3D</strong></div>
            </div>
          </div>
        </div>
      </section>

      <section class="signal-strip" aria-label="Situm Explore product areas">
        <div class="landing-container signal-inner">
          <span>Built for real indoor operations</span>
          <div>
            <b>Cartography</b>
            <b>Routing</b>
            <b>Digital Twin</b>
            <b>Realtime</b>
            <b>Analytics</b>
          </div>
        </div>
      </section>

      <section id="capabilities" class="section-block capabilities-section">
        <div class="landing-container">
          <div class="section-heading">
            <span class="section-eyebrow">Capabilities</span>
            <h2>Spatial context first. Operational tools close behind.</h2>
            <p>
              Situm Explore keeps the map primary while the surrounding workspace gives teams the
              context they need to inspect, navigate and understand indoor environments.
            </p>
          </div>

          <div class="capability-grid">
            <article v-for="capability in capabilities" :key="capability.title" class="capability-card">
              <span class="capability-icon"><UIcon :name="capability.icon" /></span>
              <h3>{{ capability.title }}</h3>
              <p>{{ capability.text }}</p>
            </article>
          </div>
        </div>
      </section>

      <section id="platform" class="section-block platform-section">
        <div class="landing-container platform-grid">
          <div class="section-heading platform-copy">
            <span class="section-eyebrow">One product, two clients</span>
            <h2>Use the web for operations. Use native when the building needs sensors.</h2>
            <p>
              The browser and mobile companion share the same application backend and workspace
              authority, while each client owns the jobs it can perform truthfully and well.
            </p>
          </div>

          <div class="platform-cards">
            <article class="platform-card">
              <div class="platform-card-top">
                <span class="platform-icon"><UIcon name="i-lucide-monitor" /></span>
                <div><small>Browser</small><h3>Web workspace</h3></div>
              </div>
              <ul>
                <li v-for="item in webHighlights" :key="item"><UIcon name="i-lucide-check" /> {{ item }}</li>
              </ul>
              <UButton :to="continuePath" color="neutral" variant="outline" trailing-icon="i-lucide-arrow-right">
                Open web app
              </UButton>
            </article>

            <article class="platform-card platform-card-dark">
              <div class="platform-card-top">
                <span class="platform-icon"><UIcon name="i-lucide-smartphone" /></span>
                <div><small>Android / iOS-oriented</small><h3>Native companion</h3></div>
              </div>
              <ul>
                <li v-for="item in nativeHighlights" :key="item"><UIcon name="i-lucide-check" /> {{ item }}</li>
              </ul>
              <UButton
                v-if="androidDownloadUrl"
                :href="androidDownloadUrl"
                target="_blank"
                rel="noreferrer"
                color="neutral"
                variant="solid"
                icon="i-lucide-download"
              >
                Download Android
              </UButton>
              <span v-else class="native-note">Android delivery is exposed when a release URL is configured.</span>
            </article>
          </div>
        </div>
      </section>

      <section id="workflow" class="section-block workflow-section">
        <div class="landing-container workflow-grid">
          <div class="workflow-visual" aria-hidden="true">
            <div class="workflow-card workflow-map-card">
              <div class="workflow-card-label"><UIcon name="i-lucide-map" /> Explore</div>
              <strong>Start with the floorplan.</strong>
              <span>Search POIs, switch floors and understand the space in 2D.</span>
            </div>
            <div class="workflow-connector"><span>01</span><i /></div>
            <div class="workflow-card">
              <div class="workflow-card-label"><UIcon name="i-lucide-route" /> Route</div>
              <strong>Plan what the web can prove.</strong>
              <span>Build same-floor static routes over verified wayfinding paths.</span>
            </div>
            <div class="workflow-connector"><span>02</span><i /></div>
            <div class="workflow-card">
              <div class="workflow-card-label"><UIcon name="i-lucide-navigation" /> Continue</div>
              <strong>Hand off when sensors matter.</strong>
              <span>Move to native positioning and navigation for live indoor guidance.</span>
            </div>
          </div>

          <div class="section-heading workflow-copy">
            <span class="section-eyebrow">Designed around real boundaries</span>
            <h2>The interface changes modes instead of pretending every surface can do everything.</h2>
            <p>
              Web Explore stays 2D-first, Digital Twin 3D is explicit, Realtime reads are
              server-mediated, and native owns sensor-backed positioning and turn-by-turn guidance.
              That keeps the experience clear without inventing capability.
            </p>

            <div class="principle-list">
              <span><UIcon name="i-lucide-lock-keyhole" /> Workspace-scoped authorization</span>
              <span><UIcon name="i-lucide-shield-check" /> Least-privilege Situm credentials</span>
              <span><UIcon name="i-lucide-circle-off" /> No synthetic presence or route metrics</span>
            </div>
          </div>
        </div>
      </section>

      <section class="final-cta-section">
        <div class="landing-container final-cta">
          <div>
            <span class="section-eyebrow section-eyebrow-light">Situm Explore</span>
            <h2>Turn indoor cartography into an operating workspace.</h2>
            <p>Explore the web product, then move to native when live indoor positioning is the job.</p>
          </div>
          <div class="final-cta-actions">
            <UButton :to="continuePath" size="xl" color="neutral" trailing-icon="i-lucide-arrow-right">
              {{ primaryLabel }}
            </UButton>
            <UButton v-if="!loggedIn" to="/login" size="xl" color="neutral" variant="ghost">
              Sign in
            </UButton>
          </div>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <div class="landing-container footer-inner">
        <NuxtLink to="/" class="brand-link footer-brand">
          <BrandMark size="sm" />
          <span>Situm Explore</span>
        </NuxtLink>
        <p>Indoor exploration, navigation and operations — built around Situm.</p>
        <div class="footer-links">
          <a href="#capabilities">Capabilities</a>
          <NuxtLink to="/login">Sign in</NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing-page {
  --landing-ink: #101318;
  --landing-muted: #5b6470;
  --landing-line: #e7e9ed;
  --landing-soft: #f7f8fa;
  --landing-blue: #2563eb;
  min-height: 100vh;
  background: #fff;
  color: var(--landing-ink);
}

.landing-container {
  width: min(1180px, calc(100% - 48px));
  margin-inline: auto;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 30;
  border-bottom: 1px solid rgb(231 233 237 / 78%);
  background: rgb(255 255 255 / 88%);
  backdrop-filter: blur(18px) saturate(145%);
}

.header-inner {
  min-height: 68px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 28px;
}

.brand-link {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 10px;
  color: inherit;
  font-size: 0.875rem;
  font-weight: 730;
  letter-spacing: -0.02em;
  text-decoration: none;
}

.desktop-nav {
  display: flex;
  align-items: center;
  gap: 30px;
  color: var(--landing-muted);
  font-size: 0.8125rem;
  font-weight: 560;
}

.desktop-nav a,
.footer-links a {
  color: inherit;
  text-decoration: none;
  transition: color 150ms ease;
}

.desktop-nav a:hover,
.footer-links a:hover {
  color: var(--landing-ink);
}

.header-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.hero-section {
  position: relative;
  overflow: hidden;
  padding: 100px 0 86px;
  background:
    radial-gradient(circle at 72% 16%, rgb(37 99 235 / 7%), transparent 34%),
    linear-gradient(#fff, #fcfcfd);
}

.hero-section::after {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--landing-line) 18%, var(--landing-line) 82%, transparent);
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(520px, 1.08fr);
  align-items: center;
  gap: 70px;
}

.hero-copy {
  position: relative;
  z-index: 2;
}

.hero-kicker,
.section-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #44505f;
  font-size: 0.6875rem;
  font-weight: 740;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.kicker-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #16a36a;
  box-shadow: 0 0 0 5px rgb(22 163 106 / 10%);
}

.hero-copy h1 {
  max-width: 680px;
  margin: 20px 0 24px;
  font-size: clamp(3.2rem, 5.7vw, 5.25rem);
  font-weight: 690;
  line-height: 0.99;
  letter-spacing: -0.066em;
}

.hero-lede {
  max-width: 640px;
  margin: 0;
  color: var(--landing-muted);
  font-size: clamp(1rem, 1.3vw, 1.125rem);
  line-height: 1.72;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 32px;
}

.hero-proof {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: 28px;
  color: #6b7280;
  font-size: 0.75rem;
}

.hero-proof span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.hero-proof :deep(svg) {
  width: 14px;
  height: 14px;
  color: #374151;
}

.hero-product {
  position: relative;
  padding: 26px 0 36px;
}

.product-window {
  position: relative;
  z-index: 2;
  overflow: hidden;
  border: 1px solid #dfe3e8;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 34px 90px rgb(16 24 40 / 15%), 0 4px 14px rgb(16 24 40 / 5%);
  transform: perspective(1200px) rotateY(-2.1deg) rotateX(0.8deg);
}

.window-topbar {
  min-height: 46px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  padding: 0 14px;
  border-bottom: 1px solid #eceef1;
  background: #fbfcfd;
  color: #737b86;
  font-size: 0.625rem;
}

.window-dots {
  display: flex;
  gap: 6px;
}

.window-dots i {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #d5d9df;
}

.window-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #555e69;
  font-weight: 640;
}

.window-status {
  display: inline-flex;
  justify-self: end;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

.window-status span {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #22a06b;
}

.window-body {
  min-height: 425px;
  display: grid;
  grid-template-columns: 58px 1fr;
}

.preview-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 11px 8px;
  border-right: 1px solid #eceef1;
  background: #fbfbfc;
}

.preview-logo {
  margin-bottom: 6px;
  transform: scale(0.78);
}

.preview-rail > i {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  color: #808894;
  font-style: normal;
}

.preview-rail > i.active {
  border: 1px solid #e1e4e9;
  background: #fff;
  color: #111827;
  box-shadow: 0 2px 6px rgb(16 24 40 / 4%);
}

.preview-rail > i :deep(svg) {
  width: 15px;
  height: 15px;
}

.preview-rail > span {
  flex: 1;
}

.preview-workspace {
  min-width: 0;
  padding: 18px;
  background: #f8f9fb;
}

.preview-toolbar {
  min-height: 47px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
}

.preview-toolbar small,
.route-card small,
.floating-card small,
.platform-card small {
  display: block;
  color: #8a929d;
  font-size: 0.5625rem;
  font-weight: 620;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.preview-toolbar strong {
  display: block;
  margin-top: 2px;
  font-size: 1.05rem;
  letter-spacing: -0.035em;
}

.mode-switch {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px;
  border: 1px solid #e2e5e9;
  border-radius: 9px;
  background: #fff;
  color: #818995;
  font-size: 0.56rem;
}

.mode-switch b,
.mode-switch span {
  padding: 6px 8px;
  border-radius: 6px;
  font-weight: 650;
}

.mode-switch b {
  background: #111827;
  color: #fff;
}

.preview-map {
  position: relative;
  height: 315px;
  overflow: hidden;
  border: 1px solid #dde1e6;
  border-radius: 14px;
  background: #eef1f4;
}

.preview-map::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 45%);
}

.preview-map img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.78;
  filter: grayscale(1) contrast(0.76) brightness(1.18);
  transform: scale(1.08);
}

.map-search,
.floor-pill {
  position: absolute;
  z-index: 4;
  top: 12px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 31px;
  border: 1px solid rgb(216 220 226 / 95%);
  border-radius: 9px;
  background: rgb(255 255 255 / 94%);
  box-shadow: 0 5px 16px rgb(16 24 40 / 7%);
  color: #6a7280;
  font-size: 0.62rem;
  font-weight: 600;
}

.map-search {
  left: 12px;
  width: 148px;
  padding: 0 10px;
}

.floor-pill {
  right: 12px;
  padding: 0 10px;
  color: #3f4752;
}

.route-line {
  position: absolute;
  z-index: 2;
  inset: 42px 18px 70px 18px;
  width: calc(100% - 36px);
  height: calc(100% - 112px);
  overflow: visible;
}

.route-line path {
  fill: none;
  stroke: var(--landing-blue);
  stroke-width: 7;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 3px 4px rgb(37 99 235 / 18%));
}

.map-point {
  position: absolute;
  z-index: 3;
  width: 13px;
  height: 13px;
  border: 3px solid #fff;
  border-radius: 999px;
  background: var(--landing-blue);
  box-shadow: 0 0 0 3px rgb(37 99 235 / 15%);
}

.point-start { left: 22%; top: 61%; }
.point-end { right: 22%; top: 36%; background: #16a36a; box-shadow: 0 0 0 3px rgb(22 163 106 / 15%); }

.route-card {
  position: absolute;
  z-index: 5;
  right: 12px;
  bottom: 12px;
  left: 12px;
  min-height: 48px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border: 1px solid rgb(218 222 228 / 95%);
  border-radius: 11px;
  background: rgb(255 255 255 / 95%);
  box-shadow: 0 9px 24px rgb(16 24 40 / 9%);
}

.route-icon,
.floating-icon,
.capability-icon,
.platform-icon {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}

.route-icon {
  width: 31px;
  height: 31px;
  border-radius: 8px;
  background: #eff5ff;
  color: var(--landing-blue);
}

.route-card strong,
.floating-card strong {
  display: block;
  margin-top: 2px;
  color: #1d2430;
  font-size: 0.68rem;
}

.route-ready {
  border-radius: 999px;
  background: #edf8f2;
  color: #138257;
  padding: 4px 8px;
  font-size: 0.55rem;
  font-weight: 700;
}

.floating-card {
  position: absolute;
  z-index: 4;
  min-width: 150px;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 9px;
  padding: 10px 12px;
  border: 1px solid #e1e4e8;
  border-radius: 13px;
  background: rgb(255 255 255 / 96%);
  box-shadow: 0 15px 35px rgb(16 24 40 / 12%);
}

.floating-icon {
  width: 29px;
  height: 29px;
  border-radius: 8px;
  background: #f2f4f7;
  color: #313946;
}

.floating-card-realtime { right: -22px; top: 2px; }
.floating-card-twin { left: 42px; bottom: 5px; }

.signal-strip {
  border-bottom: 1px solid var(--landing-line);
  background: #fff;
}

.signal-inner {
  min-height: 82px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  color: #7a838f;
  font-size: 0.72rem;
}

.signal-inner > span {
  font-weight: 620;
}

.signal-inner div {
  display: flex;
  flex-wrap: wrap;
  gap: 30px;
}

.signal-inner b {
  color: #4b5563;
  font-weight: 650;
}

.section-block {
  padding: 104px 0;
}

.section-heading {
  max-width: 700px;
}

.section-heading h2 {
  margin: 13px 0 18px;
  font-size: clamp(2.2rem, 4vw, 3.6rem);
  font-weight: 660;
  line-height: 1.04;
  letter-spacing: -0.055em;
}

.section-heading > p {
  margin: 0;
  color: var(--landing-muted);
  font-size: 0.97rem;
  line-height: 1.75;
}

.capabilities-section {
  background: #fff;
}

.capability-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 48px;
}

.capability-card {
  min-height: 238px;
  padding: 25px;
  border: 1px solid var(--landing-line);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 1px 2px rgb(16 24 40 / 2%);
  transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
}

.capability-card:hover {
  transform: translateY(-2px);
  border-color: #d9dde4;
  box-shadow: 0 12px 32px rgb(16 24 40 / 6%);
}

.capability-icon {
  width: 39px;
  height: 39px;
  margin-bottom: 42px;
  border: 1px solid #e2e5e9;
  border-radius: 11px;
  background: #f8f9fb;
  color: #262e3a;
}

.capability-icon :deep(svg) {
  width: 17px;
  height: 17px;
}

.capability-card h3 {
  margin: 0 0 10px;
  font-size: 0.95rem;
  letter-spacing: -0.025em;
}

.capability-card p {
  margin: 0;
  color: var(--landing-muted);
  font-size: 0.79rem;
  line-height: 1.65;
}

.platform-section {
  border-block: 1px solid var(--landing-line);
  background: var(--landing-soft);
}

.platform-grid {
  display: grid;
  grid-template-columns: 0.82fr 1.18fr;
  align-items: start;
  gap: 72px;
}

.platform-copy {
  position: sticky;
  top: 112px;
}

.platform-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.platform-card {
  min-height: 440px;
  display: flex;
  flex-direction: column;
  padding: 26px;
  border: 1px solid var(--landing-line);
  border-radius: 18px;
  background: #fff;
}

.platform-card-dark {
  border-color: #1e2939;
  background: #111827;
  color: #fff;
  box-shadow: 0 22px 55px rgb(17 24 39 / 14%);
}

.platform-card-top {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 24px;
  border-bottom: 1px solid #eceef1;
}

.platform-card-dark .platform-card-top {
  border-bottom-color: #2c3545;
}

.platform-icon {
  width: 39px;
  height: 39px;
  border-radius: 11px;
  background: #f0f2f5;
  color: #29313d;
}

.platform-card-dark .platform-icon {
  background: #202939;
  color: #fff;
}

.platform-card-top h3 {
  margin: 2px 0 0;
  font-size: 1rem;
  letter-spacing: -0.025em;
}

.platform-card-dark small {
  color: #97a0ae;
}

.platform-card ul {
  flex: 1;
  display: grid;
  align-content: start;
  gap: 13px;
  margin: 28px 0 30px;
  padding: 0;
  list-style: none;
  color: #56606d;
  font-size: 0.78rem;
}

.platform-card-dark ul {
  color: #c3cad5;
}

.platform-card li {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  line-height: 1.45;
}

.platform-card li :deep(svg) {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
  margin-top: 1px;
  color: #168754;
}

.native-note {
  color: #919baa;
  font-size: 0.72rem;
  line-height: 1.5;
}

.workflow-section {
  background: #fff;
}

.workflow-grid {
  display: grid;
  grid-template-columns: 1.03fr 0.97fr;
  align-items: center;
  gap: 84px;
}

.workflow-visual {
  padding: 28px;
  border: 1px solid var(--landing-line);
  border-radius: 20px;
  background: #fafbfc;
}

.workflow-card {
  padding: 20px;
  border: 1px solid #e3e6ea;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 5px 14px rgb(16 24 40 / 3%);
}

.workflow-map-card {
  background: linear-gradient(135deg, #fff, #f8fbff);
}

.workflow-card-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #596372;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.workflow-card strong {
  display: block;
  margin-top: 15px;
  font-size: 0.95rem;
  letter-spacing: -0.025em;
}

.workflow-card > span {
  display: block;
  margin-top: 7px;
  color: var(--landing-muted);
  font-size: 0.75rem;
  line-height: 1.6;
}

.workflow-connector {
  height: 42px;
  display: grid;
  grid-template-columns: 32px 1fr;
  align-items: center;
  gap: 9px;
  padding-left: 18px;
}

.workflow-connector span {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 1px solid #e3e6ea;
  border-radius: 999px;
  background: #fff;
  color: #7d8692;
  font-size: 0.53rem;
  font-weight: 720;
}

.workflow-connector i {
  width: 1px;
  height: 18px;
  margin-left: 11px;
  background: #d8dce2;
}

.principle-list {
  display: grid;
  gap: 11px;
  margin-top: 28px;
}

.principle-list span {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #4e5866;
  font-size: 0.78rem;
  font-weight: 570;
}

.principle-list :deep(svg) {
  width: 15px;
  height: 15px;
  color: #1f2937;
}

.final-cta-section {
  padding: 0 0 100px;
  background: #fff;
}

.final-cta {
  min-height: 295px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 56px;
  padding: 54px 58px;
  overflow: hidden;
  position: relative;
  border-radius: 24px;
  background:
    radial-gradient(circle at 82% 24%, rgb(59 130 246 / 22%), transparent 30%),
    #111827;
  color: #fff;
}

.final-cta::after {
  content: '';
  position: absolute;
  right: -100px;
  bottom: -210px;
  width: 420px;
  height: 420px;
  border: 1px solid rgb(255 255 255 / 7%);
  border-radius: 999px;
  box-shadow: 0 0 0 70px rgb(255 255 255 / 2%), 0 0 0 140px rgb(255 255 255 / 1.5%);
}

.section-eyebrow-light {
  color: #9aa6b8;
}

.final-cta h2 {
  max-width: 650px;
  margin: 12px 0 13px;
  font-size: clamp(2rem, 3.6vw, 3.25rem);
  line-height: 1.03;
  letter-spacing: -0.055em;
}

.final-cta p {
  max-width: 620px;
  margin: 0;
  color: #aeb7c5;
  font-size: 0.9rem;
  line-height: 1.7;
}

.final-cta-actions {
  position: relative;
  z-index: 2;
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.site-footer {
  border-top: 1px solid var(--landing-line);
  background: #fafbfc;
}

.footer-inner {
  min-height: 112px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 30px;
  color: #7a838f;
  font-size: 0.7rem;
}

.footer-inner p {
  margin: 0;
  text-align: center;
}

.footer-links {
  display: flex;
  justify-content: flex-end;
  gap: 20px;
}

.footer-brand {
  color: #303845;
}

@media (max-width: 1050px) {
  .hero-grid {
    grid-template-columns: 1fr;
    gap: 50px;
  }

  .hero-copy {
    max-width: 760px;
  }

  .hero-copy h1 {
    max-width: 760px;
  }

  .hero-product {
    max-width: 760px;
    width: 100%;
    margin-inline: auto;
  }

  .platform-grid,
  .workflow-grid {
    grid-template-columns: 1fr;
    gap: 46px;
  }

  .platform-copy {
    position: static;
  }

  .workflow-copy {
    order: -1;
  }
}

@media (max-width: 820px) {
  .landing-container {
    width: min(100% - 34px, 1180px);
  }

  .header-inner {
    grid-template-columns: 1fr auto;
  }

  .desktop-nav {
    display: none;
  }

  .hero-section {
    padding: 72px 0 62px;
  }

  .hero-copy h1 {
    font-size: clamp(3rem, 11vw, 4.8rem);
  }

  .floating-card-realtime { right: 10px; top: -2px; }
  .floating-card-twin { left: 26px; }

  .signal-inner {
    align-items: flex-start;
    flex-direction: column;
    padding-block: 20px;
  }

  .signal-inner div {
    gap: 18px 24px;
  }

  .capability-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .platform-cards {
    grid-template-columns: 1fr 1fr;
  }

  .section-block {
    padding: 82px 0;
  }

  .final-cta {
    align-items: flex-start;
    flex-direction: column;
    padding: 42px;
  }

  .final-cta-actions {
    justify-content: flex-start;
  }

  .footer-inner {
    grid-template-columns: 1fr auto;
  }

  .footer-inner p {
    display: none;
  }
}

@media (max-width: 620px) {
  .landing-container {
    width: min(100% - 28px, 1180px);
  }

  .site-header {
    position: relative;
  }

  .header-inner {
    min-height: 62px;
  }

  .header-actions > :first-child:not(:last-child) {
    display: none;
  }

  .hero-section {
    padding-top: 56px;
  }

  .hero-copy h1 {
    margin-top: 16px;
    font-size: clamp(2.75rem, 14vw, 4rem);
    letter-spacing: -0.06em;
  }

  .hero-lede {
    font-size: 0.94rem;
  }

  .hero-actions {
    display: grid;
  }

  .hero-actions :deep(a),
  .hero-actions :deep(button) {
    width: 100%;
    justify-content: center;
  }

  .hero-proof {
    display: grid;
    gap: 10px;
  }

  .hero-product {
    padding-top: 8px;
  }

  .product-window {
    border-radius: 16px;
    transform: none;
  }

  .window-topbar {
    grid-template-columns: 1fr auto;
  }

  .window-status {
    display: none;
  }

  .window-body {
    min-height: 360px;
    grid-template-columns: 46px 1fr;
  }

  .preview-workspace {
    padding: 11px;
  }

  .preview-rail {
    padding-inline: 5px;
  }

  .preview-rail > i {
    width: 30px;
    height: 30px;
  }

  .preview-toolbar {
    min-height: 42px;
  }

  .mode-switch span {
    display: none;
  }

  .preview-map {
    height: 270px;
  }

  .map-search {
    width: 128px;
  }

  .floating-card {
    display: none;
  }

  .signal-inner div {
    display: grid;
    grid-template-columns: repeat(2, auto);
  }

  .capability-grid,
  .platform-cards {
    grid-template-columns: 1fr;
  }

  .capability-card {
    min-height: 0;
  }

  .capability-icon {
    margin-bottom: 30px;
  }

  .platform-card {
    min-height: 0;
  }

  .workflow-visual {
    padding: 16px;
  }

  .section-block {
    padding: 72px 0;
  }

  .final-cta-section {
    padding-bottom: 72px;
  }

  .final-cta {
    min-height: 0;
    padding: 34px 28px;
    border-radius: 19px;
  }

  .final-cta-actions {
    width: 100%;
    display: grid;
  }

  .final-cta-actions :deep(a),
  .final-cta-actions :deep(button) {
    width: 100%;
    justify-content: center;
  }

  .footer-inner {
    min-height: 128px;
    grid-template-columns: 1fr;
    justify-items: center;
    gap: 14px;
    padding-block: 24px;
    text-align: center;
  }

  .footer-links {
    justify-content: center;
  }
}
</style>
