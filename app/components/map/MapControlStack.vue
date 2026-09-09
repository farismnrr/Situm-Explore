<script setup lang="ts">
defineProps<{ fullscreen?: boolean }>()
const emit = defineEmits<{ reset: []; fullscreenToggle: [] }>()
</script>

<template>
  <div class="map-control-stack" aria-label="Map controls">
    <button type="button" class="map-control" :aria-label="fullscreen ? 'Exit fullscreen map' : 'Enter fullscreen map'" @click="emit('fullscreenToggle')">
      <UIcon :name="fullscreen ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'" />
      <span>{{ fullscreen ? 'Exit full screen' : 'Full screen' }}</span>
    </button>
    <button type="button" class="map-control" aria-label="Reset map view" @click="emit('reset')">
      <UIcon name="i-lucide-locate-fixed" />
      <span>Reset view</span>
    </button>
  </div>
</template>

<style scoped>
.map-control-stack {
  position: absolute;
  left: 16px;
  bottom: 18px;
  z-index: 15;
  display: grid;
  gap: 8px;
}
.map-control {
  display: flex;
  min-width: 44px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 11px;
  border: 1px solid #e2e8f0;
  border-radius: 13px;
  background: rgb(255 255 255 / 96%);
  box-shadow: 0 5px 15px rgb(15 23 42 / 11%);
  color: #334155;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  backdrop-filter: blur(12px);
}
.map-control:hover { border-color: #cbd5e1; background: white; color: #10233f; }
.map-control :deep(svg) { width: 19px; height: 19px; color: #246bfd; }
@media (max-width: 640px) {
  .map-control-stack { left: 12px; bottom: 12px; }
  .map-control { width: 44px; padding: 0; }
  .map-control span { display: none; }
}
</style>
