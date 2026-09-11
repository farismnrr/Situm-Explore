<script setup lang="ts">
import TransientFeedback from '~/components/feedback/TransientFeedback.vue'

const { user, clear } = useUserSession()
const { loadWorkspaces } = useWorkspaceContext()
const route = useRoute()
const mobileOpen = ref(false)
const isDesktop = ref(false)
const searchOpen = ref(false)
const searchQuery = ref('')
const displayName = computed(() => {
  const localPart = user.value?.email?.split('@')[0] || 'Workspace user'
  return localPart.split(/[._-]/).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
})
const initials = computed(() => displayName.value.split(' ').map(part => part.charAt(0)).slice(0, 2).join('').toUpperCase())

useHead({
  title: computed(() => {
    const pageTitle = typeof route.meta.title === 'string' ? route.meta.title.trim() : ''
    return pageTitle ? `${pageTitle} · Situm Explore` : 'Situm Explore'
  })
})

const searchDestinations = [
  { label: 'Home', detail: 'Workspace', to: '/app', icon: 'i-lucide-house' },
  { label: 'Dashboard', detail: 'Workspace', to: '/app/dashboard', icon: 'i-lucide-layout-dashboard' },
  { label: 'Explore', detail: 'Workspace', to: '/app/map', icon: 'i-lucide-compass' },
  { label: 'Buildings & floors', detail: 'Cartography', to: '/app/buildings', icon: 'i-lucide-building-2' },
  { label: 'Points of interest', detail: 'Cartography', to: '/app/pois', icon: 'i-lucide-map-pin' },
  { label: 'Realtime', detail: 'Operations', to: '/app/realtime', icon: 'i-lucide-radio' },
  { label: 'Analytics & reports', detail: 'Operations', to: '/app/analytics', icon: 'i-lucide-bar-chart-3' },
  { label: 'Groups', detail: 'Organization', to: '/app/groups', icon: 'i-lucide-users-round' }
]

const searchResults = computed(() => {
  const records = searchDestinations
  const query = searchQuery.value.trim().toLowerCase()
  return query ? records.filter((record) => `${record.label} ${record.detail}`.toLowerCase().includes(query)) : records
})

function openSearch() {
  searchOpen.value = true
}

function closeSearch() {
  searchOpen.value = false
  searchQuery.value = ''
}

function handleGlobalShortcut(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    openSearch()
  }
  if (event.key === 'Escape' && searchOpen.value) closeSearch()
}

onMounted(() => window.addEventListener('keydown', handleGlobalShortcut))
onBeforeUnmount(() => window.removeEventListener('keydown', handleGlobalShortcut))

onMounted(() => {
  void loadWorkspaces().catch(() => undefined)
})

let desktopMedia: MediaQueryList | undefined
function updateDesktopState() {
  isDesktop.value = desktopMedia?.matches ?? false
}

onMounted(() => {
  desktopMedia = window.matchMedia('(min-width: 801px)')
  updateDesktopState()
  desktopMedia.addEventListener('change', updateDesktopState)
})
onBeforeUnmount(() => desktopMedia?.removeEventListener('change', updateDesktopState))

const navigationHidden = computed(() => !isDesktop.value && !mobileOpen.value)

const navigation = [
  { group: 'Workspace', items: [{ label: 'Home', to: '/app', icon: 'i-lucide-house' }, { label: 'Workspaces', to: '/app/workspaces', icon: 'i-lucide-panels-top-left' }, { label: 'Dashboard', to: '/app/dashboard', icon: 'i-lucide-layout-dashboard' }, { label: 'Explore', to: '/app/map', icon: 'i-lucide-compass' }] },
  { group: 'Cartography', items: [{ label: 'Buildings & floors', to: '/app/buildings', icon: 'i-lucide-building-2' }, { label: 'Points of interest', to: '/app/pois', icon: 'i-lucide-map-pin' }, { label: 'Geofences', to: '/app/geofences', icon: 'i-lucide-scan' }, { label: 'Paths & routing', to: '/app/paths', icon: 'i-lucide-route' }] },
  { group: 'Operations', items: [{ label: 'Realtime', to: '/app/realtime', icon: 'i-lucide-radio' }, { label: 'Analytics & reports', to: '/app/analytics', icon: 'i-lucide-bar-chart-3' }, { label: 'Alarms', to: '/app/alarms', icon: 'i-lucide-triangle-alert' }] },
  { group: 'Organization', items: [{ label: 'Users & groups', to: '/app/users', icon: 'i-lucide-users' }, { label: 'Groups', to: '/app/groups', icon: 'i-lucide-users-round' }, { label: 'Organization', to: '/app/organization', icon: 'i-lucide-building' }] }
]

async function logout() {
  await clear()
  await navigateTo('/')
}

</script>

<template>
  <div>
    <a href="#main-content" class="skip-link">Skip to main content</a>
    <div class="app-shell flex min-h-screen bg-[var(--explore-background)] text-default">
    <button v-if="mobileOpen" class="shell-menu-backdrop fixed inset-0 z-30 bg-gray-950/25" aria-label="Close navigation" @click="mobileOpen = false" />
    <aside id="workspace-navigation" class="app-sidebar fixed inset-y-0 left-0 z-40 flex w-[228px] flex-col border-r border-default bg-[var(--explore-surface-subtle)] transition-transform" :class="{ 'translate-x-0': mobileOpen }" :aria-hidden="navigationHidden ? 'true' : undefined" :inert="navigationHidden">
      <div class="flex h-16 items-center border-b border-default px-4">
        <NuxtLink to="/" class="flex items-center gap-2 text-sm font-semibold tracking-tight text-highlighted" @click="mobileOpen = false">
          <BrandMark size="sm" /><span>Situm Explore</span>
        </NuxtLink>
      </div>
      <nav class="flex-1 overflow-y-auto px-2.5 py-3" aria-label="Workspace navigation">
        <div v-for="section in navigation" :key="section.group" class="mb-5">
          <p class="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">{{ section.group }}</p>
          <NuxtLink v-for="item in section.items" :key="item.to" :to="item.to" class="group mb-0.5 flex min-h-9 items-center gap-2 rounded-lg px-2.5 text-xs text-muted transition hover:bg-elevated hover:text-highlighted" active-class="bg-elevated font-medium text-highlighted" @click="mobileOpen = false">
            <UIcon :name="item.icon" class="size-[18px] shrink-0 text-muted group-[.text-highlighted]:text-highlighted" aria-hidden="true" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </div>
      </nav>
      <div class="border-t border-default p-2.5">
        <div class="flex items-center gap-2 rounded-lg px-2 py-2">
          <span class="grid size-7 shrink-0 place-items-center rounded-full bg-elevated text-[11px] font-semibold text-highlighted">{{ initials }}</span>
          <span class="user-meta min-w-0 flex-1"><strong class="block truncate text-[11px] text-highlighted">{{ displayName }}</strong><span class="block truncate text-[10px] text-muted">{{ user?.email }}</span></span>
          <UButton icon="i-lucide-log-out" aria-label="Sign out" color="neutral" variant="ghost" size="sm" @click="logout" />
        </div>
      </div>
    </aside>

    <div class="app-shell-main min-w-0 flex-1">
      <header class="sticky top-0 z-20 flex h-16 min-w-0 items-center justify-between gap-2 border-b border-default bg-default/90 px-3 backdrop-blur sm:gap-3 sm:px-[22px]">
        <div class="flex min-w-0 items-center gap-3">
          <UButton icon="i-lucide-menu" aria-label="Open navigation" aria-controls="workspace-navigation" :aria-expanded="mobileOpen" color="neutral" variant="ghost" class="shell-menu-button" @click="mobileOpen = true" />
          <p class="truncate text-xs text-muted">Workspace <span class="px-1">/</span> <span class="text-highlighted">{{ $route.meta.title || 'Home' }}</span></p>
        </div>
        <div class="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button class="search-trigger hidden min-[801px]:flex" type="button" aria-haspopup="dialog" @click="openSearch"><span class="flex items-center gap-2"><UIcon name="i-lucide-search" />Search anything…</span><kbd>⌘ K</kbd></button>
          <ProductStatusBadge label="POC configured" tone="success" dot class="hidden sm:inline-flex" />
        </div>
      </header>
      <main id="main-content" tabindex="-1" class="app-content mx-auto min-h-[calc(100vh-4rem)] w-full px-4 py-6 outline-none sm:px-6 lg:px-7 lg:py-[30px]" :class="$route.meta.fullWidth ? 'max-w-none' : 'max-w-[1480px]'"><slot /></main>
    </div>
    </div>

    <UModal v-model:open="searchOpen" title="Search Situm Explore" description="Search local workspace destinations and prototype records." :ui="{ content: 'w-full sm:max-w-[520px]' }" @after:leave="searchQuery = ''">
    <template #body>
      <UInput v-model="searchQuery" autofocus icon="i-lucide-search" placeholder="Search buildings, POIs, users, reports…" aria-label="Search workspace" class="w-full" />
      <div class="mt-3 max-h-80 overflow-y-auto">
        <NuxtLink v-for="result in searchResults" :key="`${result.to}-${result.label}`" :to="result.to" class="flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-elevated" @click="closeSearch">
          <span class="grid size-8 shrink-0 place-items-center rounded-md bg-elevated text-highlighted" aria-hidden="true"><UIcon :name="result.icon" class="size-4" /></span>
          <span class="min-w-0"><strong class="block truncate text-sm text-highlighted">{{ result.label }}</strong><span class="block truncate text-xs text-muted">{{ result.detail }}</span></span>
        </NuxtLink>
        <p v-if="searchResults.length === 0" class="px-3 py-6 text-center text-sm text-muted">No local results found.</p>
      </div>
    </template>
    </UModal>
    <TransientFeedback />
  </div>
</template>
