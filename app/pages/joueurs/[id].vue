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
      <p class="player__elo">
        <span class="player__elo-value">{{ profile.elo }}</span> Elo
      </p>
      <p class="muted">
        {{ profile.groupName }} · {{ profile.history.length }} match{{
          profile.history.length > 1 ? 's' : ''
        }}
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

<style scoped lang="scss">
.player__elo {
  margin: 0 0 $space-1;
  font-family: $font-display;
  font-size: 1.4rem;
  font-weight: 700;
  text-transform: uppercase;
  color: $color-primary;
}

.player__elo-value {
  font-size: 3rem;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
</style>
