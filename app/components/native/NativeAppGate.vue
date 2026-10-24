<script setup lang="ts">
import QRCode from 'qrcode'
import { getNativeInstallOptions, type NativeInstallPlatform } from './install-options'

type Feature = 'map' | 'realtime'

const props = withDefaults(defineProps<{
  feature: Feature
  workspaceId?: string | null
  buildingId?: number | null
  title?: string
  description?: string
}>(), {
  workspaceId: null,
  buildingId: null,
  title: undefined,
  description: undefined
})

const config = useRuntimeConfig()
const mobileConfig = config.public.mobile
const copied = ref(false)
const qrCode = ref('')
const platform = ref<NativeInstallPlatform>('unknown')

const destinationLabel = computed(() => props.feature === 'map' ? 'Map' : 'Realtime')
const destinationPath = computed(() => props.feature === 'map' ? 'map' : 'realtime')
const routeQuery = computed(() => {
  const query = new URLSearchParams()
  if (props.workspaceId && /^[a-zA-Z0-9_-]{1,128}$/.test(props.workspaceId)) query.set('workspaceId', props.workspaceId)
  if (props.feature === 'map' && props.buildingId && Number.isSafeInteger(props.buildingId) && props.buildingId > 0) query.set('buildingId', String(props.buildingId))
  return query.toString()
})
const deepLink = computed(() => {
  const base = mobileConfig.universalLinkBaseUrl?.replace(/\/$/, '') || `${mobileConfig.appScheme}:/`
  return `${base}/${destinationPath.value}${routeQuery.value ? `?${routeQuery.value}` : ''}`
})
const installOptions = computed(() => getNativeInstallOptions(platform.value, mobileConfig))
const openConfigured = computed(() => Boolean(mobileConfig.universalLinkBaseUrl || mobileConfig.appScheme))
const hasInstallFallback = computed(() => installOptions.value.length > 0)

async function generateQr() {
  if (!import.meta.client || !deepLink.value) return
  qrCode.value = await QRCode.toDataURL(deepLink.value, { margin: 1, width: 192, errorCorrectionLevel: 'M' })
}

async function copyLink() {
  if (!import.meta.client || !navigator.clipboard) return
  await navigator.clipboard.writeText(deepLink.value)
  copied.value = true
  window.setTimeout(() => { copied.value = false }, 1800)
}

onMounted(() => {
  const userAgent = navigator.userAgent
  platform.value = /android/i.test(userAgent) ? 'android' : /iphone|ipad|ipod/i.test(userAgent) ? 'ios' : 'unknown'
  void generateQr()
})
watch(deepLink, () => { void generateQr() })
</script>

<template>
  <section class="native-gate rounded-xl border border-default bg-default/50 px-6 py-8 sm:px-8 sm:py-10" :aria-labelledby="`native-gate-${feature}-title`">
    <div class="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex items-start gap-4">
        <div class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info" aria-hidden="true"><UIcon name="i-lucide-smartphone" class="size-5" /></div>
        <div class="max-w-2xl space-y-2">
          <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Senar Mobile</p>
          <h2 :id="`native-gate-${feature}-title`" class="text-base font-semibold text-highlighted">{{ title || `${destinationLabel} is ready in the mobile app` }}</h2>
          <p class="text-sm leading-6 text-muted">{{ description || `Open Senar Mobile for the native ${destinationLabel.toLowerCase()} experience.` }}</p>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2 lg:justify-end">
        <UButton v-if="openConfigured" :href="deepLink" label="Open in app" icon="i-lucide-external-link" target="_self" />
        <UButton v-for="option in installOptions" :key="`${option.kind}-${option.platform}`" :href="option.url" :label="option.label" icon="i-lucide-download" target="_blank" rel="noreferrer" color="neutral" variant="outline" />
      </div>
    </div>
    <div class="mt-7 flex flex-col gap-5 border-t border-default pt-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-xs font-semibold text-highlighted">Open or install Senar Mobile</p>
        <p v-if="hasInstallFallback" class="mt-1 text-xs leading-5 text-muted">On another device? Scan the code or use the configured install link.</p>
        <p v-else class="mt-1 text-xs leading-5 text-muted">The app link is configured. Store and download destinations will appear when distribution is published.</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <UButton size="xs" color="neutral" variant="outline" :label="copied ? 'Copied' : 'Copy app link'" icon="i-lucide-copy" @click="copyLink" />
          <code class="max-w-full overflow-x-auto rounded-md bg-elevated px-2 py-1.5 text-[11px] text-muted">{{ deepLink }}</code>
        </div>
      </div>
      <div v-if="qrCode" class="shrink-0 rounded-lg border border-default bg-white p-2" aria-label="QR code for the non-secret Senar app link"><img :src="qrCode" alt="Scan to open Senar Mobile" width="144" height="144"></div>
    </div>
  </section>
</template>
