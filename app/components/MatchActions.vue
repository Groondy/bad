<script setup lang="ts">
import type { MatchView, PlayerOption } from '#shared/models'
import type { MatchInput } from '#shared/schemas'

const props = defineProps<{
  match: MatchView
}>()

const emit = defineEmits<{
  changed: []
}>()

const players = ref<PlayerOption[]>([])
const editing = ref(false)
const pending = ref(false)
const errors = ref<Record<string, string>>({})
const message = ref('')

const initial = computed<MatchInput>(() => ({
  type: props.match.type,
  sideA: props.match.sideA.map((p) => p.id),
  sideB: props.match.sideB.map((p) => p.id),
  scoreA: props.match.scoreA,
  scoreB: props.match.scoreB,
  playedAt: props.match.playedAt,
}))

/** Ajoute les joueurs supprimés du match pour qu'ils restent affichés dans le formulaire. */
const options = computed<PlayerOption[]>(() => {
  const known = new Set(players.value.map((p) => p.id))
  const missing = [...props.match.sideA, ...props.match.sideB]
    .filter((p) => !known.has(p.id))
    .map((p) => ({ id: p.id, firstName: p.firstName, lastName: p.lastName, groupId: 0 }))
  return [...players.value, ...missing]
})

async function startEdit() {
  errors.value = {}
  message.value = ''
  try {
    players.value = await $fetch<PlayerOption[]>('/api/players')
    editing.value = true
  } catch (error) {
    message.value = getErrorMessage(error)
  }
}

async function save(input: MatchInput) {
  pending.value = true
  errors.value = {}
  message.value = ''
  try {
    await $fetch(`/api/matches/${props.match.id}`, { method: 'PATCH', body: input })
    editing.value = false
    emit('changed')
  } catch (error) {
    errors.value = getFieldErrors(error)
    message.value = getErrorMessage(error)
  } finally {
    pending.value = false
  }
}

async function remove() {
  if (
    !confirm(
      `Supprimer ce match (${props.match.scoreA} – ${props.match.scoreB}) ? Le classement sera recalculé.`,
    )
  )
    return
  message.value = ''
  try {
    await $fetch(`/api/matches/${props.match.id}`, { method: 'DELETE' })
    emit('changed')
  } catch (error) {
    message.value = getErrorMessage(error)
  }
}
</script>

<template>
  <div v-if="editing" class="match-edit">
    <MatchForm
      :players="options"
      :initial="initial"
      :pending="pending"
      :errors="errors"
      submit-label="Enregistrer les modifications"
      @submit="save"
    />
    <p v-if="message && Object.keys(errors).length === 0" class="alert">{{ message }}</p>
    <button type="button" class="btn btn--block" @click="editing = false">Annuler</button>
  </div>
  <template v-else>
    <p v-if="message" class="alert">{{ message }}</p>
    <div class="actions">
      <button type="button" class="btn" @click="startEdit">Modifier</button>
      <button type="button" class="btn btn--danger" @click="remove">Supprimer</button>
    </div>
  </template>
</template>

<style scoped lang="scss">
.match-edit {
  display: grid;
  gap: $space-2;
  margin-top: $space-4;
  padding-top: $space-4;
  border-top: 1px solid $color-border;
}
</style>
