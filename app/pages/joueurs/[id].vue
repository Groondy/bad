<script setup lang="ts">
import type { MatchView, PlayerProfile } from '#shared/models'

const route = useRoute()
const { user } = useUserSession()
const {
  data: profile,
  error,
  refresh,
} = await useFetch<PlayerProfile>(() => `/api/players/${route.params.id}`)

useHead({
  title: () => (profile.value ? `${profile.value.firstName} ${profile.value.lastName}` : 'Joueur'),
})

function canEdit(match: MatchView): boolean {
  if (!user.value) return false
  return (
    user.value.role === 'admin' ||
    [...match.sideA, ...match.sideB].some((p) => p.id === user.value?.id)
  )
}
</script>

<template>
  <section>
    <p v-if="error" class="alert">Joueur introuvable.</p>
    <template v-else-if="profile">
      <h1>{{ profile.firstName }} {{ profile.lastName }}</h1>
      <p class="muted">
        {{ profile.groupName }} · <strong>{{ profile.elo }}</strong> Elo ·
        {{ profile.history.length }} match{{ profile.history.length > 1 ? 's' : '' }}
      </p>
      <h2>Historique</h2>
      <p v-if="profile.history.length === 0" class="muted">Aucun match joué.</p>
      <MatchHistory v-else :matches="profile.history" :player-id="profile.id">
        <template #actions="{ match }">
          <MatchActions v-if="canEdit(match)" :match="match" @changed="refresh()" />
        </template>
      </MatchHistory>
    </template>
  </section>
</template>
