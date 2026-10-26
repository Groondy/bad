<script setup lang="ts">
import type { Group } from '#shared/models'

useHead({ title: 'Inscription' })

const { fetch: refreshSession } = useUserSession()
const { data: groups } = await useFetch<Group[]>('/api/groups', { default: () => [] })

const form = reactive({ email: '', firstName: '', lastName: '', password: '', groupId: 0 })
const errors = ref<Record<string, string>>({})
const message = ref('')
const pending = ref(false)

async function submit() {
  pending.value = true
  errors.value = {}
  message.value = ''
  try {
    await $fetch('/api/auth/register', { method: 'POST', body: form })
    await refreshSession()
    await navigateTo('/')
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
    <h1>Inscription</h1>
    <form class="form card" novalidate @submit.prevent="submit">
      <FormField label="Email" :error="errors.email">
        <input v-model="form.email" type="email" autocomplete="email" required />
      </FormField>
      <FormField label="Prénom" :error="errors.firstName">
        <input v-model="form.firstName" type="text" autocomplete="given-name" required />
      </FormField>
      <FormField label="Nom" :error="errors.lastName">
        <input v-model="form.lastName" type="text" autocomplete="family-name" required />
      </FormField>
      <FormField label="Mot de passe (8 caractères minimum)" :error="errors.password">
        <input v-model="form.password" type="password" autocomplete="new-password" required />
      </FormField>
      <FormField label="Ta séance" :error="errors.groupId">
        <select v-model.number="form.groupId" required>
          <option :value="0" disabled>Choisis ton groupe</option>
          <option v-for="group in groups" :key="group.id" :value="group.id">
            {{ group.name }}
          </option>
        </select>
      </FormField>
      <p v-if="message && Object.keys(errors).length === 0" class="alert">{{ message }}</p>
      <button type="submit" class="btn btn--primary btn--block" :disabled="pending">
        {{ pending ? 'Création…' : 'Créer mon compte' }}
      </button>
      <p class="muted">Déjà inscrit ? <NuxtLink to="/connexion">Connecte-toi</NuxtLink>.</p>
    </form>
  </section>
</template>
