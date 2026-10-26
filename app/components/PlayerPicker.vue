<script setup lang="ts">
import type { PlayerOption } from '#shared/models'
import { searchPlayers } from '#shared/playerSearch'

const props = defineProps<{
  label: string
  players: PlayerOption[]
  excludeIds: number[]
  preferredGroupId?: number
  locked?: boolean
  error?: string
}>()

const model = defineModel<number>()
const query = ref('')
const inputId = useId()

const selected = computed(() => props.players.find((p) => p.id === model.value))
const results = computed(() =>
  searchPlayers(props.players, query.value, {
    excludeIds: props.excludeIds,
    preferredGroupId: props.preferredGroupId,
    limit: 8,
  }),
)

function select(id: number) {
  model.value = id
  query.value = ''
}
</script>

<template>
  <div class="picker">
    <label :for="inputId" class="picker__label">{{ label }}</label>
    <div v-if="selected" class="picker__selected">
      <span>{{ selected.firstName }} {{ selected.lastName }}</span>
      <button v-if="!locked" type="button" class="btn" @click="model = undefined">Changer</button>
    </div>
    <template v-else>
      <input :id="inputId" v-model="query" type="search" placeholder="Rechercher un nom…" autocomplete="off" />
      <ul class="picker__results">
        <li v-for="player in results" :key="player.id">
          <button type="button" class="picker__option" @click="select(player.id)">
            {{ player.firstName }} {{ player.lastName }}
          </button>
        </li>
        <li v-if="results.length === 0" class="muted">Aucun joueur trouvé</li>
      </ul>
    </template>
    <span v-if="error" class="picker__error">{{ error }}</span>
  </div>
</template>

<style scoped lang="scss">
.picker {
  display: grid;
  gap: $space-1;
}

.picker__label {
  font-size: 0.9rem;
  font-weight: 600;
}

.picker__selected {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-2;
  min-height: 44px;
  padding: $space-1 $space-1 $space-1 $space-3;
  font-weight: 600;
  background: $color-bg;
  border: 1px solid $color-border;
  border-radius: $radius;
}

.picker__results {
  display: grid;
  max-height: 240px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
  border: 1px solid $color-border;
  border-radius: $radius;
}

.picker__option {
  width: 100%;
  min-height: 44px;
  padding: $space-2 $space-3;
  font: inherit;
  text-align: left;
  background: $color-surface;
  border: 0;
  border-bottom: 1px solid $color-border;
  cursor: pointer;
}

.picker__error {
  font-size: 0.85rem;
  color: $color-danger;
}
</style>
