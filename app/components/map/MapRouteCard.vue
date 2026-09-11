<script setup lang="ts">
import type { SitumCartographyPoi } from '#shared/situm-cartography'

defineProps<{
  startPoi?: SitumCartographyPoi | null
  destinationPoi?: SitumCartographyPoi | null
  startFloorName?: string
  destinationFloorName?: string
  state: 'idle' | 'loading' | 'ready' | 'error'
  error?: string
}>()

const emit = defineEmits<{
  calculate: []
  clear: []
}>()
</script>

<template>
  <section class="route-card" aria-label="Indoor route">
    <div class="route-heading">
      <div>
        <span>STATIC ROUTE</span>
        <strong>Situm wayfinding paths</strong>
      </div>
      <button type="button" aria-label="Clear route" @click="emit('clear')"><UIcon name="i-lucide-x" /></button>
    </div>

    <div class="route-endpoints">
      <div>
        <span class="role">START</span>
        <span class="marker start" aria-hidden="true">A</span>
        <p><strong>{{ startPoi?.name || 'Choose a place' }}</strong><small v-if="startPoi">{{ startFloorName || 'Floor' }}</small></p>
      </div>
      <div>
        <span class="role">DESTINATION</span>
        <span class="marker destination" aria-hidden="true">B</span>
        <p><strong>{{ destinationPoi?.name || 'Choose a place' }}</strong><small v-if="destinationPoi">{{ destinationFloorName || 'Floor' }}</small></p>
      </div>
    </div>

    <UButton
      block
      icon="i-lucide-route"
      label="Show route"
      :loading="state === 'loading'"
      :disabled="!startPoi || !destinationPoi || state === 'loading'"
      @click="emit('calculate')"
    />
    <p v-if="state === 'ready'" class="route-status" role="status">Route shown from the venue's configured Situm wayfinding paths.</p>
    <p v-else-if="state === 'error'" class="route-error" role="alert">{{ error || 'No configured route is available between these places.' }}</p>
  </section>
</template>

<style scoped>
.route-card {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 19;
  width: min(360px, calc(100% - 32px));
  padding: 13px;
  border: 1px solid rgb(255 255 255 / 88%);
  border-radius: 16px;
  background: rgb(255 255 255 / 97%);
  box-shadow: 0 12px 36px rgb(15 23 42 / 16%);
  backdrop-filter: blur(16px);
}
.route-heading { display: flex; align-items: center; gap: 8px; }
.route-heading > div { min-width: 0; flex: 1; }
.route-heading span { display: block; color: #7b8794; font-size: 9px; font-weight: 850; letter-spacing: .11em; }
.route-heading strong { display: block; margin-top: 2px; color: #10233f; font-size: 13px; }
.route-heading button {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
}
.route-heading button:hover { background: #f1f5f9; color: #10233f; }
.route-endpoints { display: grid; gap: 8px; margin: 11px 0; }
.route-endpoints > div { position: relative; display: grid; grid-template-columns: 26px 1fr; align-items: center; min-height: 38px; padding-top: 11px; }
.role { position: absolute; left: 34px; top: 0; color: #7b8794; font-size: 8px; font-weight: 850; letter-spacing: .09em; }
.marker {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border: 2px solid #fff;
  border-radius: 999px;
  box-shadow: 0 0 0 1px rgb(16 35 63 / 12%);
  font-size: 9px;
  font-weight: 900;
}
.marker.start { background: #10233f; color: #fff; }
.marker.destination { background: #fff; color: #246bfd; border-color: #246bfd; }
.route-endpoints p { min-width: 0; margin: 0; }
.route-endpoints strong, .route-endpoints small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.route-endpoints strong { color: #10233f; font-size: 12px; }
.route-endpoints small { margin-top: 2px; color: #7b8794; font-size: 10px; }
.route-status, .route-error { margin: 9px 1px 0; font-size: 10px; line-height: 1.4; }
.route-status { color: #526274; }
.route-error { color: #b42318; }
@media (max-width: 640px) {
  .route-card { right: 12px; bottom: 12px; width: calc(100% - 24px); }
}
</style>
