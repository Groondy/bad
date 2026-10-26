<script setup lang="ts">
import type { MatchView, Participant } from '#shared/models'

const props = defineProps<{
  matches: MatchView[]
  playerId?: number
}>()

defineSlots<{
  actions?: (props: { match: MatchView }) => unknown
}>()

function deltaFor(match: MatchView): number | undefined {
  return [...match.sideA, ...match.sideB].find((p) => p.id === props.playerId)?.eloDelta
}

function sideDelta(side: Participant[]): number {
  return side[0]?.eloDelta ?? 0
}

function deltaClass(delta: number): string {
  return delta >= 0 ? 'delta--up' : 'delta--down'
}
</script>

<template>
  <ul class="history">
    <li v-for="match in matches" :key="match.id" class="history__item card">
      <div class="history__meta muted">
        {{ formatDate(match.playedAt) }} · {{ match.type === 'single' ? 'Simple' : 'Double' }}
      </div>
      <div class="history__line">
        <span
          class="history__side"
          :class="{ 'history__side--winner': match.scoreA > match.scoreB }"
        >
          <template v-for="(p, index) in match.sideA" :key="p.id">
            <template v-if="index > 0"> &amp; </template>
            <NuxtLink :to="`/joueurs/${p.id}`">{{ p.firstName }} {{ p.lastName }}</NuxtLink>
          </template>
        </span>
        <strong class="history__score">{{ match.scoreA }} – {{ match.scoreB }}</strong>
        <span
          class="history__side"
          :class="{ 'history__side--winner': match.scoreB > match.scoreA }"
        >
          <template v-for="(p, index) in match.sideB" :key="p.id">
            <template v-if="index > 0"> &amp; </template>
            <NuxtLink :to="`/joueurs/${p.id}`">{{ p.firstName }} {{ p.lastName }}</NuxtLink>
          </template>
        </span>
      </div>
      <div v-if="playerId !== undefined" class="history__delta">
        <span v-if="deltaFor(match) !== undefined" :class="deltaClass(deltaFor(match) ?? 0)">
          {{ formatDelta(deltaFor(match) ?? 0) }} Elo
        </span>
      </div>
      <div v-else class="history__delta">
        <span :class="deltaClass(sideDelta(match.sideA))">{{
          formatDelta(sideDelta(match.sideA))
        }}</span>
        /
        <span :class="deltaClass(sideDelta(match.sideB))">{{
          formatDelta(sideDelta(match.sideB))
        }}</span>
      </div>
      <slot name="actions" :match="match" />
    </li>
  </ul>
</template>

<style scoped lang="scss">
.history {
  display: grid;
  gap: $space-3;
  margin: 0;
  padding: 0;
  list-style: none;
}

.history__meta {
  font-size: 0.85rem;
}

.history__line {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: $space-2;
  align-items: center;
  margin: $space-1 0;
}

.history__side:last-child {
  text-align: right;
}

.history__side--winner {
  font-weight: 700;
}

.history__score {
  font-family: $font-display;
  font-size: 1.4rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: $color-primary;
}

.history__delta {
  font-size: 0.9rem;
}
</style>
