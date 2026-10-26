<script setup lang="ts">
defineProps<{
  label: string
  error?: string
}>()
</script>

<template>
  <label class="field">
    <span class="field__label">{{ label }}</span>
    <slot />
    <span v-if="error" class="field__error">{{ error }}</span>
  </label>
</template>

<style scoped lang="scss">
.field {
  display: grid;
  gap: $space-1;
}

.field__label {
  font-size: 0.9rem;
  font-weight: 600;
}

.field__error {
  font-size: 0.85rem;
  color: $color-danger;
}
</style>
