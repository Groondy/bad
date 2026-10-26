<script setup lang="ts">
import type { MatchView, PlayerOption } from '#shared/models'
import type { MatchInput } from '#shared/schemas'

definePageMeta({ middleware: 'admin' })
useHead({ title: 'Admin · Matchs' })

const { data: matches, refresh } = await useFetch<MatchView[]>('/api/admin/matches', {
  default: () => [],
})
const { data: players } = await useFetch<PlayerOption[]>('/api/players', { default: () => [] })

const editingId = ref<number | null>(null)
const pending = ref(false)
const errors = ref<Record<string, string>>({})
const message = ref('')

function toInput(match: MatchView): MatchInput {
  return {
    type: match.type,
    sideA: match.sideA.map((p) => p.id),
    sideB: match.sideB.map((p) => p.id),
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    playedAt: match.playedAt,
  }
}

/** Ajoute les joueurs supprimés du match pour qu'ils restent affichés dans le formulaire. */
function playersFor(match: MatchView): PlayerOption[] {
  const known = new Set(players.value.map((p) => p.id))
  const missing = [...match.sideA, ...match.sideB]
    .filter((p) => !known.has(p.id))
    .map((p) => ({ id: p.id, firstName: p.firstName, lastName: p.lastName, groupId: 0 }))
  return [...players.value, ...missing]
}

function startEdit(id: number) {
  editingId.value = id
  errors.value = {}
  message.value = ''
}

async function save(id: number, input: MatchInput) {
  pending.value = true
  errors.value = {}
  message.value = ''
  try {
    await $fetch(`/api/admin/matches/${id}`, { method: 'PATCH', body: input })
    editingId.value = null
    await refresh()
  } catch (error) {
    errors.value = getFieldErrors(error)
    message.value = getErrorMessage(error)
  } finally {
    pending.value = false
  }
}

async function remove(match: MatchView) {
  if (
    !confirm(
      `Supprimer ce match (${match.scoreA} – ${match.scoreB}) ? Le classement sera recalculé.`,
    )
  )
    return
  message.value = ''
  try {
    await $fetch(`/api/admin/matches/${match.id}`, { method: 'DELETE' })
    await refresh()
  } catch (error) {
    message.value = getErrorMessage(error)
  }
}
</script>

<template>
  <section>
    <h1>Administration</h1>
    <AdminNav />
    <p v-if="message && Object.keys(errors).length === 0" class="alert">{{ message }}</p>
    <p v-if="matches.length === 0" class="muted">Aucun match.</p>
    <MatchHistory v-else :matches="matches">
      <template #actions="{ match }">
        <div v-if="editingId === match.id" class="admin-edit">
          <MatchForm
            :players="playersFor(match)"
            :initial="toInput(match)"
            :pending="pending"
            :errors="errors"
            submit-label="Enregistrer les modifications"
            @submit="save(match.id, $event)"
          />
          <button type="button" class="btn btn--block" @click="editingId = null">Annuler</button>
        </div>
        <div v-else class="actions">
          <button type="button" class="btn" @click="startEdit(match.id)">Modifier</button>
          <button type="button" class="btn btn--danger" @click="remove(match)">Supprimer</button>
        </div>
      </template>
    </MatchHistory>
  </section>
</template>

<style scoped lang="scss">
.admin-edit {
  display: grid;
  gap: $space-2;
  margin-top: $space-4;
  padding-top: $space-4;
  border-top: 1px solid $color-border;
}
</style>
