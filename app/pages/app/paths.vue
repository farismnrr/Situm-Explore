<script setup lang="ts">
import type { SitumPathsResponse } from '#shared/situm-paths'
import { isWorkspaceRequestLoading } from '~/utils/async-state'

const { selectedWorkspaceId, loaded: workspaceLoaded } = useWorkspaceContext()
const { data, error, status, refresh } = await useFetch<SitumPathsResponse>(useWorkspaceEndpoint('/situm/paths'), { immediate: false })
watch(selectedWorkspaceId, (workspaceId) => { if (workspaceId) refresh() }, { immediate: true })
const paths = computed(() => data.value?.paths ?? [])
const loading = computed(() => isWorkspaceRequestLoading(workspaceLoaded.value, selectedWorkspaceId.value, String(status.value)))
const pathSummary = computed(() => paths.value.map(path => `${path.nodes.length} nodes · ${path.links.length} links`))

definePageMeta({ middleware: 'auth', layout: 'app', title: 'Paths & routing' })
</script>

<template>
  <div class="cartography-page space-y-6">
    <ProductPageHeader eyebrow="Routing" title="Paths" description="Inspect verified Situm path and cartography metadata." />
    <div v-if="loading" class="space-y-2" aria-label="Loading paths" aria-busy="true"><USkeleton class="h-16 w-full" /><USkeleton class="h-16 w-full" /></div>
    <UAlert v-else-if="!selectedWorkspaceId" color="neutral" variant="subtle" title="No workspace selected" description="Create or select a workspace before loading path metadata." />
    <UAlert v-else-if="error" color="error" variant="subtle" title="Paths unavailable" description="The authenticated Situm path read failed. No fixture network is shown." />
    <template v-else-if="String(status) === 'success'">
      <UCard v-for="(summary, index) in pathSummary" :key="index"><p class="text-sm font-semibold text-highlighted">Path network {{ index + 1 }}</p><p class="mt-1 text-xs text-muted">{{ summary }}</p></UCard>
      <UCard v-if="paths.length === 0"><p class="py-8 text-center text-sm text-muted">No real path networks are available.</p></UCard>
    </template>
    <UAlert color="neutral" variant="subtle" title="Route planning controls unavailable" description="This page exposes verified Situm path metadata only. Route planning controls are not available in the current web surface, so no route details or steps are shown." />
    <UButton to="/app/map" icon="i-lucide-map" label="Open Map for cartography" color="neutral" variant="outline" />
  </div>
</template>

<style scoped>
.cartography-page { max-width: 1480px; }
</style>
