<script setup lang="ts">
import { todayInParis } from '#shared/date'
import type { MatchType, PlayerOption } from '#shared/models'
import type { MatchInput } from '#shared/schemas'

const props = defineProps<{
  players: PlayerOption[]
  submitLabel: string
  initial?: MatchInput
  lockedPlayerId?: number
  preferredGroupId?: number
  pending?: boolean
  errors?: Record<string, string>
}>()

const emit = defineEmits<{
  submit: [input: MatchInput]
}>()

const today = todayInParis()
const type = ref<MatchType>(props.initial?.type ?? 'single')
const a1 = ref<number | undefined>(props.initial?.sideA[0] ?? props.lockedPlayerId)
const a2 = ref<number | undefined>(props.initial?.sideA[1])
const b1 = ref<number | undefined>(props.initial?.sideB[0])
const b2 = ref<number | undefined>(props.initial?.sideB[1])
const scoreA = ref<number | ''>(props.initial?.scoreA ?? '')
const scoreB = ref<number | ''>(props.initial?.scoreB ?? '')
const playedAt = ref(props.initial?.playedAt ?? today)
const localError = ref('')

const isDouble = computed(() => type.value === 'double')
const isLocked = computed(() => props.lockedPlayerId !== undefined)
const selectedIds = computed(() =>
  (isDouble.value ? [a1.value, a2.value, b1.value, b2.value] : [a1.value, b1.value]).filter(
    (id): id is number => id !== undefined,
  ),
)
const sideError = computed(() => props.errors?.sideA ?? props.errors?.sideB)

function excludeFor(current: number | undefined): number[] {
  return selectedIds.value.filter((id) => id !== current)
}

function submit() {
  localError.value = ''
  const sideA = isDouble.value ? [a1.value, a2.value] : [a1.value]
  const sideB = isDouble.value ? [b1.value, b2.value] : [b1.value]
  const a = scoreA.value
  const b = scoreB.value
  if ([...sideA, ...sideB].some((id) => id === undefined) || a === '' || b === '') {
    localError.value = 'Complète tous les joueurs et les deux scores.'
    return
  }
  emit('submit', {
    type: type.value,
    sideA: sideA as number[],
    sideB: sideB as number[],
    scoreA: a,
    scoreB: b,
    playedAt: playedAt.value,
  })
}
</script>

<template>
  <form class="match-form" novalidate @submit.prevent="submit">
    <fieldset class="match-form__type">
      <legend>Type de match</legend>
      <label class="match-form__choice"><input v-model="type" type="radio" value="single" /> Simple</label>
      <label class="match-form__choice"><input v-model="type" type="radio" value="double" /> Double</label>
    </fieldset>

    <div class="match-form__sides">
      <fieldset class="match-form__side card">
        <legend>{{ isLocked ? 'Ton équipe' : 'Équipe A' }}</legend>
        <PlayerPicker
          v-model="a1"
          :label="isLocked ? 'Toi' : 'Joueur 1'"
          :players="players"
          :exclude-ids="excludeFor(a1)"
          :preferred-group-id="preferredGroupId"
          :locked="isLocked"
        />
        <PlayerPicker
          v-if="isDouble"
          v-model="a2"
          :label="isLocked ? 'Ton partenaire' : 'Joueur 2'"
          :players="players"
          :exclude-ids="excludeFor(a2)"
          :preferred-group-id="preferredGroupId"
        />
        <FormField label="Score" :error="errors?.scoreA">
          <input v-model.number="scoreA" type="number" inputmode="numeric" min="0" step="1" />
        </FormField>
      </fieldset>

      <fieldset class="match-form__side card">
        <legend>{{ isLocked ? 'Adversaires' : 'Équipe B' }}</legend>
        <PlayerPicker
          v-model="b1"
          :label="isDouble ? 'Adversaire 1' : 'Adversaire'"
          :players="players"
          :exclude-ids="excludeFor(b1)"
          :preferred-group-id="preferredGroupId"
        />
        <PlayerPicker
          v-if="isDouble"
          v-model="b2"
          label="Adversaire 2"
          :players="players"
          :exclude-ids="excludeFor(b2)"
          :preferred-group-id="preferredGroupId"
        />
        <FormField label="Score" :error="errors?.scoreB">
          <input v-model.number="scoreB" type="number" inputmode="numeric" min="0" step="1" />
        </FormField>
      </fieldset>
    </div>

    <p v-if="sideError" class="alert">{{ sideError }}</p>

    <FormField label="Date du match" :error="errors?.playedAt">
      <input v-model="playedAt" type="date" :max="today" required />
    </FormField>

    <p v-if="localError" class="alert">{{ localError }}</p>

    <button type="submit" class="btn btn--primary btn--block" :disabled="pending">
      {{ pending ? 'Enregistrement…' : submitLabel }}
    </button>
  </form>
</template>

<style scoped lang="scss">
.match-form {
  display: grid;
  gap: $space-4;
}

.match-form__type {
  display: flex;
  flex-wrap: wrap;
  gap: $space-4;
}

.match-form__choice {
  display: inline-flex;
  align-items: center;
  gap: $space-2;
  min-height: 44px;

  input {
    width: auto;
    min-height: 0;
  }
}

.match-form__sides {
  display: grid;
  gap: $space-4;

  @include md-up {
    grid-template-columns: 1fr 1fr;
  }
}

.match-form__side {
  display: grid;
  gap: $space-3;
  align-content: start;
}
</style>
