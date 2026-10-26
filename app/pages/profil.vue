<script setup lang="ts">
import type { Group } from '#shared/models'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Mon profil' })

const { user, fetch: refreshSession } = useUserSession()
const { data: groups } = await useFetch<Group[]>('/api/groups', { default: () => [] })

const info = reactive({
  firstName: user.value?.firstName ?? '',
  lastName: user.value?.lastName ?? '',
  groupId: user.value?.groupId ?? 0,
})
const infoErrors = ref<Record<string, string>>({})
const infoMessage = ref('')
const infoSuccess = ref('')
const infoPending = ref(false)

async function saveInfo() {
  infoPending.value = true
  infoErrors.value = {}
  infoMessage.value = ''
  infoSuccess.value = ''
  try {
    await $fetch('/api/me', { method: 'PATCH', body: info })
    await refreshSession()
    infoSuccess.value = 'Profil mis à jour.'
  } catch (error) {
    infoErrors.value = getFieldErrors(error)
    infoMessage.value = getErrorMessage(error)
  } finally {
    infoPending.value = false
  }
}

const passwords = reactive({ currentPassword: '', newPassword: '' })
const passwordErrors = ref<Record<string, string>>({})
const passwordMessage = ref('')
const passwordSuccess = ref('')
const passwordPending = ref(false)

async function savePassword() {
  passwordPending.value = true
  passwordErrors.value = {}
  passwordMessage.value = ''
  passwordSuccess.value = ''
  try {
    await $fetch('/api/me/password', { method: 'PATCH', body: passwords })
    passwords.currentPassword = ''
    passwords.newPassword = ''
    passwordSuccess.value = 'Mot de passe modifié.'
  } catch (error) {
    passwordErrors.value = getFieldErrors(error)
    passwordMessage.value = getErrorMessage(error)
  } finally {
    passwordPending.value = false
  }
}
</script>

<template>
  <section>
    <h1>Mon profil</h1>
    <p v-if="user">
      <NuxtLink :to="`/joueurs/${user.id}`">Voir mon historique et mon Elo</NuxtLink>
    </p>

    <h2>Mes informations</h2>
    <form class="form card" novalidate @submit.prevent="saveInfo">
      <FormField label="Prénom" :error="infoErrors.firstName">
        <input v-model="info.firstName" type="text" autocomplete="given-name" />
      </FormField>
      <FormField label="Nom" :error="infoErrors.lastName">
        <input v-model="info.lastName" type="text" autocomplete="family-name" />
      </FormField>
      <FormField label="Ma séance" :error="infoErrors.groupId">
        <select v-model.number="info.groupId">
          <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option>
        </select>
      </FormField>
      <p v-if="infoSuccess" class="success">{{ infoSuccess }}</p>
      <p v-if="infoMessage && Object.keys(infoErrors).length === 0" class="alert">{{ infoMessage }}</p>
      <button type="submit" class="btn btn--primary" :disabled="infoPending">Enregistrer</button>
    </form>

    <h2>Changer mon mot de passe</h2>
    <form class="form card" novalidate @submit.prevent="savePassword">
      <FormField label="Mot de passe actuel" :error="passwordErrors.currentPassword">
        <input v-model="passwords.currentPassword" type="password" autocomplete="current-password" />
      </FormField>
      <FormField label="Nouveau mot de passe (8 caractères minimum)" :error="passwordErrors.newPassword">
        <input v-model="passwords.newPassword" type="password" autocomplete="new-password" />
      </FormField>
      <p v-if="passwordSuccess" class="success">{{ passwordSuccess }}</p>
      <p v-if="passwordMessage && Object.keys(passwordErrors).length === 0" class="alert">
        {{ passwordMessage }}
      </p>
      <button type="submit" class="btn btn--primary" :disabled="passwordPending">Changer le mot de passe</button>
    </form>
  </section>
</template>
