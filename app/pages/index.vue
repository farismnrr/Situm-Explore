<script setup lang="ts">
const { loggedIn } = useUserSession()
const config = useRuntimeConfig()

const continuePath = computed(() => loggedIn.value ? '/app' : '/login')
const androidDownloadUrl = computed(() => config.public.mobile.androidDownloadUrl || '')
</script>

<template>
  <main class="landing-page">
    <nav class="landing-nav" aria-label="Primary navigation">
      <div class="landing-container landing-nav-inner">
        <NuxtLink to="/" class="landing-brand"><BrandMark size="sm" /><span>Situm Explore</span></NuxtLink>
        <div class="landing-links">
          <a href="#features">Product</a><a href="#operations">Operations</a><a href="#analytics">Analytics</a><a href="#about">About</a>
        </div>
        <div class="landing-actions">
          <UButton to="/login" variant="outline" color="neutral" class="landing-signin">Sign in</UButton>
          <UButton :to="continuePath">Start prototype</UButton>
        </div>
      </div>
    </nav>

    <header class="landing-hero">
      <div class="landing-container landing-hero-grid">
        <div class="landing-copy">
          <ProductStatusBadge label="Indoor operations workspace" tone="success" dot />
          <h1>Understand your indoor spaces at a glance.</h1>
          <p>Situm Explore brings maps, live positions, cartography, routes and analytics into one calm web workspace built for fast operational decisions.</p>
          <div class="landing-hero-actions"><UButton :to="continuePath" size="lg">Explore the prototype <span aria-hidden="true">→</span></UButton><UButton v-if="androidDownloadUrl" :href="androidDownloadUrl" target="_blank" rel="noreferrer" size="lg" variant="outline" color="neutral" icon="i-lucide-download">Download Android</UButton><UButton to="/login" size="lg" variant="outline" color="neutral">Sign in</UButton></div>
          <div class="landing-note"><span>✓ Interactive demo</span><span>✓ Dummy data only</span><span>✓ Light-mode product reference</span></div>
        </div>
        <div class="landing-preview" aria-label="Preview of the Situm Explore map workspace">
          <div class="preview-window"><div class="preview-bar"><i /><i /><i /></div><div class="preview-main"><div class="preview-sidebar"><b /><b class="active" /><b /><span /><b /><b /><b /></div><div class="preview-content"><strong /><small /><div class="preview-map"><div class="preview-floor" /><i class="pin one" /><i class="pin two" /><i class="pin three" /></div></div></div></div>
        </div>
      </div>
    </header>

    <div class="landing-trust"><div class="landing-container landing-trust-inner"><span>One POC workspace for</span><div><b>Indoor maps</b><b>POIs</b><b>Geofences</b><b>Realtime</b><b>Routing</b><b>Reports</b></div></div></div>

    <section id="features" class="landing-section"><div class="landing-container"><div class="landing-section-head"><UBadge variant="soft" color="neutral">Product</UBadge><h2>Everything important, without dashboard clutter.</h2><p>The UI keeps the indoor map primary while the rest of Situm’s operational data stays easy to reach when you need it.</p></div><div class="landing-feature-grid">
      <UCard v-for="feature in [{ icon: 'i-lucide-map', title: 'Map workspace', text: 'Explore real floorplans, switch floors, search POIs, pick destinations and hand off to the native app when indoor positioning or guidance is needed.' }, { icon: 'i-lucide-building-2', title: 'Cartography explorer', text: 'Browse buildings, floors, POIs, categories, geofences and path networks from one consistent information model.' }, { icon: 'i-lucide-radio', title: 'Realtime operations', text: 'See current people and device locations, online state, building context and live movement with clean operational status.' }, { icon: 'i-lucide-route', title: 'Directions & navigation', text: 'Build routes between indoor points, compare accessible routing options and surface step-by-step directions.' }, { icon: 'i-lucide-bar-chart-3', title: 'Analytics & reports', text: 'Explore visitors, heatmaps, geofence stay time, positioning time, user positions and map viewer usage.' }, { icon: 'i-lucide-settings', title: 'Organization context', text: 'Keep user, group, alarm, viewer configuration and organization metadata visible without turning the POC into an admin suite.' } ]" :key="feature.title" class="landing-feature-card"><div class="feature-icon"><UIcon :name="feature.icon" class="size-4" /></div><h3>{{ feature.title }}</h3><p>{{ feature.text }}</p></UCard>
    </div></div></section>

    <section id="operations" class="landing-section landing-operations"><div class="landing-container landing-two-column"><div class="landing-section-head"><UBadge variant="soft" color="neutral">Operations</UBadge><h2>Map-first by design.</h2><p>The map carries the spatial task. Everything else supports it: POI discovery, route planning, realtime position overlays, geofence context and trajectory playback.</p><UButton class="mt-5" :to="continuePath">Open map prototype</UButton></div><UCard class="landing-mini-card"><div class="mini-map"><div class="mini-floor" /><i class="mini-pin a" /><i class="mini-pin b" /><i class="mini-pin c" /></div></UCard></div></section>

    <section id="analytics" class="landing-section"><div class="landing-container"><div class="landing-section-head"><UBadge variant="soft" color="neutral">Analytics</UBadge><h2>Operational answers, not vanity charts.</h2><p>Reports are planned around visitors, positioning, geofencing, heatmaps and map viewer usage. Real report sources will be connected in Plan 014.</p></div></div></section>
    <section class="landing-container landing-cta"><div><h2>Ready to click through it?</h2><p>Use the configured account to explore the workspace.</p></div><UButton to="/login" class="cta-button">Sign in to explore <span aria-hidden="true">→</span></UButton></section>
    <footer id="about" class="landing-footer"><div class="landing-container"><span>Situm Explore · Interactive reference prototype</span><span>Sandboxed demo environment</span></div></footer>
  </main>
</template>

<style scoped>
.landing-page{background:#fff;color:var(--explore-foreground)}.landing-container{width:min(1180px,calc(100% - 40px));margin:auto}.landing-nav{position:sticky;top:0;z-index:10;background:#ffffffe8;backdrop-filter:blur(16px);border-bottom:1px solid var(--explore-border)}.landing-nav-inner{height:66px;display:flex;align-items:center;justify-content:space-between;gap:20px}.landing-brand{display:flex;align-items:center;gap:9px;color:inherit;font-size:14px;font-weight:700}.landing-links{display:flex;gap:26px;font-size:13px;color:var(--explore-foreground-muted)}.landing-links a:hover{color:var(--explore-foreground)}.landing-actions{display:flex;gap:8px}.landing-hero{padding:92px 0 70px}.landing-hero-grid{display:grid;grid-template-columns:1.02fr .98fr;align-items:center;gap:64px}.landing-copy h1{font-size:clamp(42px,5vw,66px);line-height:1.04;letter-spacing:-.055em;max-width:650px;margin:20px 0}.landing-copy>p{font-size:17px;line-height:1.65;color:var(--explore-foreground-muted);max-width:600px;margin:0 0 30px}.landing-status-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#168754;margin-right:5px}.landing-hero-actions,.landing-note{display:flex;gap:10px;flex-wrap:wrap}.landing-note{gap:14px;margin-top:24px;color:var(--explore-foreground-subtle);font-size:11px}.preview-window{border:1px solid var(--explore-border);border-radius:20px;background:#fff;box-shadow:0 28px 80px #1018281f;overflow:hidden;transform:perspective(1000px) rotateY(-2deg) rotateX(1deg)}.preview-bar{height:46px;border-bottom:1px solid var(--explore-border);display:flex;align-items:center;padding:0 14px;gap:7px}.preview-bar i{width:8px;height:8px;border-radius:50%;background:#d9dde3}.preview-main{display:grid;grid-template-columns:142px 1fr;min-height:430px}.preview-sidebar{padding:13px 10px;background:#fbfbfc;border-right:1px solid var(--explore-border)}.preview-sidebar b{display:block;height:28px;border-radius:7px;margin-bottom:5px;background:#f3f4f6}.preview-sidebar b.active{background:#e9ebef}.preview-sidebar span{display:block;height:15px}.preview-content{padding:15px}.preview-content strong{display:block;width:170px;height:13px;background:#dfe3e7;border-radius:4px;margin-bottom:8px}.preview-content small{display:block;width:230px;height:8px;background:#eef0f2;border-radius:4px;margin-bottom:16px}.preview-map,.mini-map{height:310px;border:1px solid var(--explore-border);border-radius:13px;position:relative;overflow:hidden;background:repeating-linear-gradient(0deg,#fafbfc 0 25px,#f0f2f4 26px),repeating-linear-gradient(90deg,transparent 0 25px,#f0f2f4 26px)}.preview-floor,.mini-floor{position:absolute;inset:15% 12%;background:#fff;border:2px solid #d3d8de;border-radius:16px;transform:rotate(-3deg)}.preview-floor:before,.mini-floor:before{content:"";position:absolute;inset:18% 12%;border:1px solid #dde1e6;border-radius:9px}.pin,.mini-pin{position:absolute;width:16px;height:16px;border-radius:50% 50% 50% 2px;background:#2563eb;transform:rotate(-45deg)}.pin:after{content:"";position:absolute;width:5px;height:5px;border-radius:50%;background:#fff;left:5.5px;top:5.5px}.pin.one{left:36%;top:34%}.pin.two{left:62%;top:58%;background:#168754}.pin.three{left:70%;top:30%;background:#7c3aed}.landing-trust{border-block:1px solid var(--explore-border);background:#fbfbfc}.landing-trust-inner{min-height:82px;display:flex;align-items:center;justify-content:space-between;gap:20px;color:var(--explore-foreground-subtle);font-size:12px}.landing-trust-inner div{display:flex;gap:28px;flex-wrap:wrap}.landing-trust b{color:#676f79}.landing-section{padding:92px 0}.landing-section-head{max-width:680px;margin-bottom:38px}.landing-section-head h2{font-size:clamp(28px,3vw,40px);letter-spacing:-.045em;margin:10px 0 14px}.landing-section-head p{margin:0;color:var(--explore-foreground-muted);line-height:1.65;font-size:15px}.landing-feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.landing-feature-card{min-height:205px}.feature-icon{width:36px;height:36px;border-radius:10px;background:#f1f3f5;border:1px solid var(--explore-border);display:grid;place-items:center;margin-bottom:34px}.landing-feature-card h3{font-size:15px;margin:0 0 8px}.landing-feature-card p{font-size:13px;line-height:1.55;color:var(--explore-foreground-muted);margin:0}.landing-operations{background:#fafbfc;border-block:1px solid var(--explore-border)}.landing-two-column{display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:center}.landing-mini-card{padding:16px}.mini-map{height:245px}.mini-floor{inset:14% 13%}.mini-pin{width:10px;height:10px;transform:none;border-radius:50%;box-shadow:0 0 0 4px #2563eb1f}.mini-pin.a{left:41%;top:36%}.mini-pin.b{left:62%;top:56%;background:#168754}.mini-pin.c{left:70%;top:30%;background:#7c3aed}.landing-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.landing-stats span,.landing-stats small{display:block;color:var(--explore-foreground-subtle);font-size:11px}.landing-stats strong{display:block;font-size:24px;letter-spacing:-.035em;margin:12px 0 5px}.landing-cta{margin-bottom:92px;background:#111827;color:#fff;border-radius:24px;padding:54px;display:flex;align-items:center;justify-content:space-between;gap:30px}.landing-cta h2{font-size:34px;letter-spacing:-.045em;margin:0 0 10px}.landing-cta p{color:#b7bec8;margin:0;font-size:14px}.cta-button{background:#fff;color:#111827}.cta-button:hover{background:#f1f3f5}.landing-footer{border-top:1px solid var(--explore-border);padding:30px 0 42px;color:var(--explore-foreground-subtle);font-size:12px}.landing-footer .landing-container{display:flex;justify-content:space-between;gap:20px}@media(max-width:900px){.landing-links{display:none}.landing-hero{padding:65px 0 45px}.landing-hero-grid{grid-template-columns:1fr;gap:34px}.landing-feature-grid{grid-template-columns:repeat(2,1fr)}.landing-trust-inner{padding:16px 0;align-items:flex-start;flex-direction:column}}@media(max-width:600px){.landing-container{width:min(100% - 28px,1180px)}.landing-nav-inner{height:58px;justify-content:center}.landing-actions{display:none}.landing-copy h1{font-size:44px}.preview-main{grid-template-columns:95px 1fr;min-height:330px}.preview-map{height:230px}.landing-feature-grid,.landing-two-column,.landing-stats{grid-template-columns:1fr}.landing-cta{margin-bottom:60px;padding:32px;display:grid}.landing-cta h2{font-size:28px}.landing-footer .landing-container{display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px}}
</style>

<style scoped>
.landing-container { width: min(1180px, calc(100% - 40px)); }
.landing-copy h1 { max-width: 600px; }
@media (max-width: 800px) {
  .landing-hero-grid { gap: 28px; }
  .landing-copy > p { max-width: 36rem; }
}
@media (max-width: 520px) {
  .landing-container { width: min(calc(100% - 28px), 1180px); }
  .landing-copy h1 { font-size: 44px; }
  .landing-copy > p { font-size: 15px; }
  .landing-actions .u-button:first-child { display: none; }
}
</style>
