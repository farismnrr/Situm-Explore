<script setup lang="ts">
import { isAsyncDataLoading, isWorkspaceRequestLoading } from '~/utils/async-state'

definePageMeta({ middleware: 'auth', layout: 'app', title: 'Dashboard' })

const { data: foundation, status: foundationStatus } = await useFetch('/api/me')
const { selectedWorkspaceId, loaded: workspaceLoaded } = useWorkspaceContext()
const { data: situm, error: situmError, status: situmStatus, refresh: refreshSitum } = await useFetch<{ configured?: boolean }>(useWorkspaceEndpoint('/situm/status'), { immediate: false })
type DashboardAnalytics = {
  visitors: Array<{ visitors: number | string }>
  positioning: Array<{ total: number | string }>
  geofencing: Array<{ seconds: number | string }>
}
const today = new Date()
const analyticsQuery = computed(() => ({
  fromDate: new Date(today.getTime() - 6 * 86400000).toISOString().slice(0, 10),
  toDate: today.toISOString().slice(0, 10),
}))
const analyticsUrl = computed(() => selectedWorkspaceId.value ? `/api/workspaces/${selectedWorkspaceId.value}/analytics/summary` : '')
const { data: analytics, error: analyticsError, status: analyticsStatus, refresh: refreshAnalytics } = await useFetch<DashboardAnalytics>(analyticsUrl, { query: analyticsQuery, immediate: false })
watch(selectedWorkspaceId, (workspaceId) => { if (workspaceId) { refreshSitum(); refreshAnalytics() } }, { immediate: true })

const databaseLabel = computed(() => isAsyncDataLoading(String(foundationStatus.value)) ? 'Loading' : foundation.value?.status === 'connected' || foundation.value?.status === 'connected-empty' ? 'Connected' : 'Unavailable')
const databaseColor = computed(() => databaseLabel.value === 'Connected' ? 'success' : databaseLabel.value === 'Loading' ? 'neutral' : 'error')
const situmLoading = computed(() => isWorkspaceRequestLoading(workspaceLoaded.value, selectedWorkspaceId.value, String(situmStatus.value)))
const analyticsLoading = computed(() => isWorkspaceRequestLoading(workspaceLoaded.value, selectedWorkspaceId.value, String(analyticsStatus.value)))
const situmLabel = computed(() => situmLoading.value ? 'Loading' : !selectedWorkspaceId.value ? 'No workspace' : situmError.value ? 'Unavailable' : situm.value?.configured ? 'Configured' : 'Not configured')
const situmColor = computed(() => situmLabel.value === 'Configured' ? 'success' : situmLabel.value === 'Loading' || situmLabel.value === 'No workspace' ? 'neutral' : situmLabel.value === 'Unavailable' ? 'error' : 'warning')
const analyticsLoaded = computed(() => String(analyticsStatus.value) === 'success' && !analyticsError.value)
const hasAnalytics = computed(() => analyticsLoaded.value && Boolean(analytics.value && (analytics.value.visitors.length || analytics.value.positioning.length || analytics.value.geofencing.length)))
const visitorTotal = computed(() => analytics.value?.visitors.reduce((sum, row) => sum + Number(row.visitors), 0) ?? 0)
const positioningMinutes = computed(() => analytics.value?.positioning[0] ? Math.round(Number(analytics.value.positioning[0].total) / 60 * 10) / 10 : 0)
const geofenceHours = computed(() => analytics.value?.geofencing[0] ? Math.round(Number(analytics.value.geofencing[0].seconds) / 3600 * 10) / 10 : 0)
</script>

<template>
  <div class="dashboard-page">
    <ProductPageHeader eyebrow="Overview" title="Dashboard" description="Operational snapshot of the indoor workspace.">
      <template #actions><UButton to="/app/analytics" color="neutral" variant="outline">Open reports</UButton><UButton to="/app/map">Open map</UButton></template>
    </ProductPageHeader>

    <div class="content-grid mb-4">
      <UCard :ui="{ body: 'space-y-4' }">
        <div><h2 class="font-semibold text-highlighted">Workspace metrics</h2><p class="mt-1 text-xs text-muted">Reported analytics for the last 7 days. Each metric keeps its source semantics.</p></div>
        <div v-if="analyticsLoading" class="grid gap-3 sm:grid-cols-3" aria-label="Loading workspace metrics" aria-busy="true"><USkeleton class="h-16 w-full" /><USkeleton class="h-16 w-full" /><USkeleton class="h-16 w-full" /></div>
        <UAlert v-else-if="!selectedWorkspaceId" color="neutral" variant="subtle" title="No workspace selected" description="Create or select a workspace before loading workspace metrics." />
        <UAlert v-else-if="analyticsError" color="error" variant="subtle" title="Metrics unavailable" description="The workspace analytics summary could not be loaded." />
        <UAlert v-else-if="!hasAnalytics" color="neutral" variant="subtle" title="No reported metrics" description="No synced analytics rows are available for the last 7 days." />
        <div v-else class="grid gap-3 sm:grid-cols-3"><ProductStatCard label="Visitors" :value="visitorTotal" note="Reported visitor count" /><ProductStatCard label="Positioning time" :value="`${positioningMinutes} min`" note="Reported positioning time" /><ProductStatCard label="Geofence stay" :value="`${geofenceHours} hr`" note="Reported matched-fence time" /></div>
      </UCard>
      <UCard :ui="{ body: 'p-0' }"><div class="panel-head"><h2 class="font-semibold text-highlighted">System status</h2><span class="text-xs text-muted">Just now</span></div><div class="status-list panel-body"><div><span>Map</span><ProductStatusBadge label="Open map to verify" /></div><div><span>Database</span><ProductStatusBadge :label="databaseLabel" :tone="databaseColor" /></div><div><span>Situm configuration</span><ProductStatusBadge :label="situmLabel" :tone="situmColor" /></div></div></UCard>
    </div>
  </div>
</template>

<style scoped>
.eyebrow { color: var(--ui-text-muted); font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; }
.stat-grid, .content-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.75rem; }
.content-grid { grid-template-columns: minmax(0, 1.4fr) minmax(0, 0.6fr); }
.equal-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.trend-chart { position: relative; height: 15.625rem; padding: 1.25rem 0.75rem 1.75rem 2.625rem; }
.chart-grid { position: absolute; inset: 1.25rem 0.75rem 1.75rem 2.625rem; background: repeating-linear-gradient(to bottom, transparent 0 3rem, var(--explore-border) 3rem 3.0625rem); }
.chart-bars { position: relative; display: flex; height: 100%; align-items: end; justify-content: space-around; gap: 0.75rem; }
.chart-bar-wrap { display: flex; height: 100%; flex: 1; flex-direction: column; align-items: center; justify-content: end; gap: 0.5rem; }
.chart-bar { width: min(2rem, 65%); min-height: 0.5rem; border-radius: 0.35rem 0.35rem 0.15rem 0.15rem; background: #dfe3e8; }
.chart-bar.accent { background: var(--ui-primary); }
.chart-label { color: var(--ui-text-muted); font-size: 0.6875rem; }
.status-list { display: grid; gap: 0.8125rem; }
.status-list > div { display: flex; align-items: center; justify-content: space-between; gap: 1rem; color: var(--ui-text-muted); font-size: 0.8125rem; }
.occupancy-list { display: grid; gap: 1rem; }
.activity-dot { flex: 0 0 auto; width: 0.4375rem; height: 0.4375rem; margin-top: 0.25rem; border-radius: 999px; background: var(--ui-text-muted); }.tone-error { background: #dc2626; }.tone-warning { background: #d97706; }
@media (max-width: 900px) { .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .content-grid, .equal-grid, .stat-grid { grid-template-columns: 1fr; } .trend-chart { height: 12rem; } }
</style>
