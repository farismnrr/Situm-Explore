<script setup lang="ts">
import type { SitumCartographyPoi } from '#shared/situm-cartography'

defineProps<{
  poi: SitumCartographyPoi
  floorName: string
  nativeHref?: string
}>()

const emit = defineEmits<{
  close: []
  change: []
  setRouteStart: []
  setRouteDestination: []
}>()
</script>

<template>
  <section class="destination-card" aria-label="Selected destination">
    <div class="sheet-handle" aria-hidden="true" />
    <div class="destination-header">
      <span class="destination-icon" aria-hidden="true"><UIcon name="i-lucide-map-pin" /></span>
      <div class="destination-copy">
        <span class="eyebrow">DESTINATION</span>
        <strong>{{ poi.name }}</strong>
        <span class="meta">{{ poi.categoryName || 'Place' }} · {{ floorName }}</span>
      </div>
      <button type="button" class="close-button" aria-label="Clear destination" @click="emit('close')"><UIcon name="i-lucide-x" /></button>
    </div>
    <div class="route-actions" aria-label="Use place for static route">
      <UButton size="sm" color="neutral" variant="soft" icon="i-lucide-circle-dot" label="Set as start" @click="emit('setRouteStart')" />
      <UButton size="sm" color="neutral" variant="soft" icon="i-lucide-map-pin-check" label="Set as destination" @click="emit('setRouteDestination')" />
    </div>
    <div class="destination-actions">
      <UButton v-if="nativeHref" :href="nativeHref" target="_self" icon="i-lucide-navigation" label="Open in app" class="primary-action" />
      <UButton color="neutral" variant="outline" label="Change" @click="emit('change')" />
    </div>
    <p>Static web routes use the venue's configured Situm wayfinding paths. Indoor positioning and turn-by-turn guidance stay in Situm Explore Mobile.</p>
  </section>
</template>

<style scoped>
.destination-card {
  position: absolute;
  left: 126px;
  bottom: 16px;
  z-index: 20;
  width: min(410px, calc(100% - 154px));
  padding: 14px 15px 13px;
  border: 1px solid rgb(255 255 255 / 88%);
  border-radius: 18px;
  background: rgb(255 255 255 / 97%);
  box-shadow: 0 12px 36px rgb(15 23 42 / 16%);
  backdrop-filter: blur(16px);
}
.sheet-handle {
  width: 36px;
  height: 4px;
  margin: 0 auto 10px;
  border-radius: 999px;
  background: #d8dce2;
}
.destination-header { display: flex; align-items: center; gap: 11px; }
.destination-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 999px;
  background: #eaf1ff;
  color: #246bfd;
}
.destination-copy { min-width: 0; flex: 1; }
.eyebrow { display: block; color: #7b8794; font-size: 9px; font-weight: 850; letter-spacing: 0.11em; }
.destination-copy strong {
  display: block;
  overflow: hidden;
  margin-top: 2px;
  color: #10233f;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta {
  display: block;
  overflow: hidden;
  margin-top: 3px;
  color: #64748b;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.close-button {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  flex: 0 0 auto;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
}
.close-button:hover { background: #f1f5f9; color: #10233f; }
.route-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-top: 12px; }
.route-actions :deep(button) { justify-content: center; }
.destination-actions { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.primary-action { flex: 1; justify-content: center; }
p { margin: 9px 0 0; color: #7b8794; font-size: 10px; line-height: 1.45; }
@media (max-width: 640px) {
  .destination-card { left: 12px; right: 12px; bottom: 12px; width: auto; }
}
</style>
