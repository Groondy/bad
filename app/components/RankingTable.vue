<script setup lang="ts">
import type { RankingRow } from '#shared/models'

defineProps<{
  rows: RankingRow[]
}>()
</script>

<template>
  <div class="ranking card">
    <table>
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Joueur</th>
          <th scope="col" class="ranking__optional">Groupe</th>
          <th scope="col" class="ranking__number">Elo</th>
          <th scope="col" class="ranking__optional ranking__number">Matchs</th>
          <th scope="col" class="ranking__number">V / D</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <td class="ranking__rank">
            <span
              class="ranking__medal"
              :class="{ [`ranking__medal--${row.rank}`]: row.rank <= 3 }"
            >
              {{ row.rank }}
            </span>
          </td>
          <td class="ranking__name">
            <NuxtLink :to="`/joueurs/${row.id}`">{{ row.firstName }} {{ row.lastName }}</NuxtLink>
          </td>
          <td class="ranking__optional">{{ row.groupName }}</td>
          <td class="ranking__number ranking__elo">{{ row.elo }}</td>
          <td class="ranking__optional ranking__number">{{ row.matches }}</td>
          <td class="ranking__number">{{ row.wins }} / {{ row.losses }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped lang="scss">
.ranking {
  padding: 0;
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: $space-3 $space-2;
  text-align: left;
  border-bottom: 1px solid $color-border;
}

th {
  font-size: 0.85rem;
  color: $color-muted;
}

tbody tr:last-child td {
  border-bottom: 0;
}

.ranking__rank {
  width: 3rem;
}

.ranking__name {
  overflow-wrap: anywhere;
}

.ranking__medal {
  display: inline-grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  font-family: $font-display;
  font-size: 1.1rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: $color-primary;
  background: $color-bg;
  border-radius: 50%;

  &--1 {
    background: $color-gold;
  }

  &--2 {
    background: $color-silver;
  }

  &--3 {
    background: $color-bronze;
  }
}

.ranking__number {
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.ranking__elo {
  font-family: $font-display;
  font-size: 1.35rem;
  font-weight: 700;
  color: $color-primary;
}

.ranking__optional {
  display: none;

  @include md-up {
    display: table-cell;
  }
}
</style>
