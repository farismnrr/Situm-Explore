<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'app', title: 'Realtime' })
</script>

<template>
  <div class="operations-page space-y-6">
    <ProductPageHeader eyebrow="Operations" title="Realtime positions" description="Realtime is a native Senar experience for desktop, tablet, and phone.">
      <template #actions><ProductStatusBadge label="Native experience" tone="info" /></template>
    </ProductPageHeader>
    <NativeAppGate feature="realtime" title="Open Realtime in Senar Mobile" description="Use the native app to view authorized workspace positions with the supported foreground Realtime experience." />
  </div>
</template>

<style scoped>
.operations-page { max-width: 1480px; }
</style>
