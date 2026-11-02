<script setup lang="ts">
import type { MatchView, PlayerOption } from '#shared/models'
import type { MatchInput } from '#shared/schemas'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Saisir un match' })

const { user } = useUserSession()
const { data: players } = await useFetch<PlayerOption[]>('/api/players', { default: () => [] })

const pending = ref(false)
const errors = ref<Record<string, string>>({})
const message = ref('')
const created = ref<MatchView | null>(null)
const formKey = ref(0)

async function save(input: MatchInput) {
  pending.value = true
  errors.value = {}
  message.value = ''
  try {
    created.value = await $fetch<MatchView>('/api/matches', { method: 'POST', body: input })
  } catch (error) {
    errors.value = getFieldErrors(error)
    message.value = getErrorMessage(error)
  } finally {
    pending.value = false
  }
}

function enterAnother() {
  created.value = null
  formKey.value += 1
}
</script>

<template>
  <section>
    <h1>Saisir un match</h1>
    <template v-if="created">
      <p class="success">Match enregistré, le classement est à jour.</p>
      <MatchHistory :matches="[created]" :player-id="user?.id" />
      <div class="actions">
        <button type="button" class="btn btn--primary" @click="enterAnother">
          Saisir un autre match
        </button>
        <NuxtLink to="/" class="btn">Voir le classement</NuxtLink>
      </div>
    </template>
    <template v-else-if="user">
      <p v-if="message && Object.keys(errors).length === 0" class="alert">{{ message }}</p>
      <MatchForm
        :key="formKey"
        :players="players"
        :locked-player-id="user.id"
        :preferred-group-id="user.groupId"
        :pending="pending"
        :errors="errors"
        submit-label="Enregistrer le match"
        @submit="save"
      />
    </template>
  </section>
</template>
