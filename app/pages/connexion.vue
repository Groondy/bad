<script setup lang="ts">
useHead({ title: 'Connexion' })

const route = useRoute()
const { fetch: refreshSession } = useUserSession()

const form = reactive({ email: '', password: '' })
const errors = ref<Record<string, string>>({})
const message = ref('')
const pending = ref(false)

function safeRedirect(): string {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : '/'
}

async function submit() {
  pending.value = true
  errors.value = {}
  message.value = ''
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: form })
    await refreshSession()
    await navigateTo(safeRedirect())
  } catch (error) {
    errors.value = getFieldErrors(error)
    message.value = getErrorMessage(error)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <section>
    <h1>Connexion</h1>
    <form class="form card" novalidate @submit.prevent="submit">
      <FormField label="Email" :error="errors.email">
        <input v-model="form.email" type="email" autocomplete="email" required />
      </FormField>
      <FormField label="Mot de passe" :error="errors.password">
        <input v-model="form.password" type="password" autocomplete="current-password" required />
      </FormField>
      <p v-if="message && Object.keys(errors).length === 0" class="alert">{{ message }}</p>
      <button type="submit" class="btn btn--primary btn--block" :disabled="pending">
        {{ pending ? 'Connexion…' : 'Se connecter' }}
      </button>
      <p class="muted">
        Pas encore de compte ? <NuxtLink to="/inscription">Inscris-toi</NuxtLink>.<br />
        Mot de passe oublié ? Demande à un admin de le réinitialiser.
      </p>
    </form>
  </section>
</template>
