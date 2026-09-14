<script setup lang="ts">
const { loggedIn, fetch: refreshSession } = useUserSession()
const email = ref('')
const password = ref('')
const code = ref('')
const sentEmail = ref('')
const loading = ref(false)
const sendingCode = ref(false)
const errorMessage = ref('')
const infoMessage = ref('')
const resendAvailableAt = ref(0)
const now = ref(Date.now())
let countdownTimer: ReturnType<typeof setInterval> | undefined

const resendSeconds = computed(() => Math.max(0, Math.ceil((resendAvailableAt.value - now.value) / 1000)))
const codeWasSent = computed(() => sentEmail.value === email.value.trim().toLowerCase())
const canSendCode = computed(() => Boolean(email.value.trim()) && !sendingCode.value && resendSeconds.value === 0)
const canSubmit = computed(() => codeWasSent.value && /^\d{6}$/.test(code.value) && password.value.length >= 8 && !loading.value)

if (loggedIn.value) await navigateTo('/app', { replace: true })

onMounted(() => {
  countdownTimer = setInterval(() => { now.value = Date.now() }, 1_000)
})

onBeforeUnmount(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

watch(email, () => {
  if (!sentEmail.value || sentEmail.value === email.value.trim().toLowerCase()) return
  sentEmail.value = ''
  code.value = ''
  resendAvailableAt.value = 0
  infoMessage.value = ''
})

function fetchErrorMessage(error: unknown, fallback: string) {
  const fetchError = error as { data?: { statusMessage?: string }, statusMessage?: string }
  return fetchError.data?.statusMessage || fetchError.statusMessage || fallback
}

async function sendCode() {
  errorMessage.value = ''
  infoMessage.value = ''
  sendingCode.value = true
  try {
    const result = await $fetch<{ resendAvailableAt: string }>('/api/auth/send-verification-code', {
      method: 'POST',
      body: { email: email.value },
    })
    sentEmail.value = email.value.trim().toLowerCase()
    code.value = ''
    resendAvailableAt.value = Date.parse(result.resendAvailableAt)
    now.value = Date.now()
    infoMessage.value = `Verification code sent to ${sentEmail.value}. It expires in 5 minutes.`
  } catch (error: unknown) {
    errorMessage.value = fetchErrorMessage(error, 'Unable to send a verification code. Please try again.')
  } finally {
    sendingCode.value = false
  }
}

async function submit() {
  errorMessage.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: { email: email.value, password: password.value, code: code.value },
    })
    await refreshSession()
    await navigateTo('/app')
  } catch (error: unknown) {
    errorMessage.value = fetchErrorMessage(error, 'Unable to create your account. Please try again.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell active="register" title="Create your account" intro="Verify your email, then set up your Situm Explore account.">
    <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
    <div v-if="infoMessage" class="auth-success" role="status"><span>{{ infoMessage }}</span></div>

    <form class="auth-form" @submit.prevent="submit">
      <UFormField label="Email" name="email" required>
        <UInput v-model="email" type="email" autocomplete="email" placeholder="you@example.com" required class="w-full" />
      </UFormField>

      <UFormField label="Verification code" name="code" required hint="6 digits · valid for 5 minutes">
        <div class="register-code-row">
          <UInput v-model="code" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="000000" pattern="[0-9]{6}" maxlength="6" :disabled="!codeWasSent" required class="w-full" />
          <UButton type="button" variant="outline" color="neutral" :loading="sendingCode" :disabled="!canSendCode" @click="sendCode">
            {{ codeWasSent ? (resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code') : 'Send code' }}
          </UButton>
        </div>
      </UFormField>

      <UFormField label="Password" name="password" required hint="At least 8 characters">
        <FormPasswordInput v-model="password" autocomplete="new-password" placeholder="Create a password" minlength="8" required class="w-full" />
      </UFormField>

      <UButton type="submit" block size="lg" :loading="loading" :disabled="!canSubmit">Create account <span aria-hidden="true">→</span></UButton>
    </form>

    <p class="auth-helper">Already have an account? <NuxtLink to="/login" class="font-medium text-primary">Sign in</NuxtLink></p>
  </AuthShell>
</template>

<style scoped>
.register-code-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}
@media(max-width:480px){.register-code-row{grid-template-columns:1fr}.register-code-row :deep(button){width:100%;justify-content:center}}
</style>
