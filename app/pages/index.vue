<script setup lang="ts">
import type { Group, RankingRow } from '#shared/models'

useHead({ title: 'Classement' })

const selectedGroup = ref<number | undefined>()
const { data: groups } = await useFetch<Group[]>('/api/groups', { default: () => [] })
const { data: rows, status } = await useFetch<RankingRow[]>('/api/ranking', {
  query: computed(() => ({ group: selectedGroup.value })),
  default: () => [],
})
</script>

<template>
  <section>
    <h1>Classement</h1>
    <div class="filters" role="group" aria-label="Filtrer par groupe">
      <button
        type="button"
        class="pill"
        :class="{ 'pill--active': selectedGroup === undefined }"
        @click="selectedGroup = undefined"
      >
        Tous
      </button>
      <button
        v-for="group in groups"
        :key="group.id"
        type="button"
        class="pill"
        :class="{ 'pill--active': selectedGroup === group.id }"
        @click="selectedGroup = group.id"
      >
        {{ group.name }}
      </button>
    </div>
    <p v-if="status === 'error'" class="alert">Impossible de charger le classement.</p>
    <p v-else-if="rows.length === 0" class="muted">Aucun match joué pour l'instant.</p>
    <RankingTable v-else :rows="rows" />
  </section>
</template>

<style scoped lang="scss">
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
  margin-bottom: $space-4;
}
</style>
