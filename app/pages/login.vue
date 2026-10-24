<script setup lang="ts">
const { loggedIn, fetch: refreshSession } = useUserSession()
const route = useRoute()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

const redirectPath = computed(() => {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.startsWith('/\\/') ? redirect : '/app'
})

if (loggedIn.value) {
  await navigateTo('/app', { replace: true })
}

async function submit() {
  errorMessage.value = ''
  loading.value = true

  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value }
    })
    await refreshSession()
    await navigateTo(redirectPath.value)
  } catch (error: unknown) {
    const fetchError = error as { data?: { statusMessage?: string }; statusMessage?: string }
    errorMessage.value = fetchError.data?.statusMessage || fetchError.statusMessage || 'Unable to sign in. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell active="login" title="Welcome back" intro="Sign in to continue to your workspace.">
        <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
        <form class="auth-form" @submit.prevent="submit">
          <UFormField label="Email" name="email" required>
            <UInput v-model="email" type="email" autocomplete="email" placeholder="you@example.com" required class="w-full" />
          </UFormField>
          <UFormField label="Password" name="password" required>
            <FormPasswordInput v-model="password" autocomplete="current-password" placeholder="Enter your password" required class="w-full" />
          </UFormField>
          <UButton type="submit" block size="lg" :loading="loading" :disabled="loading">Sign in <span aria-hidden="true">→</span></UButton>
        </form>
        <p class="auth-helper">New to Senar? <NuxtLink to="/register" class="font-medium text-primary">Create an account</NuxtLink></p>
  </AuthShell>
</template>
