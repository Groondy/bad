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
          <td class="ranking__rank">{{ row.rank }}</td>
          <td>
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
  width: 2.5rem;
  font-weight: 700;
  color: $color-muted;
}

.ranking__number {
  text-align: right;
  white-space: nowrap;
}

.ranking__elo {
  font-weight: 700;
}

.ranking__optional {
  display: none;

  @include md-up {
    display: table-cell;
  }
}
</style>
