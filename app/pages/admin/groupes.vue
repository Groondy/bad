<script setup lang="ts">
import type { Group } from '#shared/models'

definePageMeta({ middleware: 'admin' })
useHead({ title: 'Admin · Groupes' })

const { data: groups, refresh } = await useFetch<Group[]>('/api/groups', { default: () => [] })
const names = ref<Record<number, string>>({})
const message = ref('')
const success = ref('')

watch(
  groups,
  (list) => {
    names.value = Object.fromEntries(list.map((group) => [group.id, group.name]))
  },
  { immediate: true },
)

async function save(id: number) {
  message.value = ''
  success.value = ''
  try {
    await $fetch(`/api/admin/groups/${id}`, {
      method: 'PATCH',
      body: { name: names.value[id] ?? '' },
    })
    success.value = 'Groupe renommé.'
    await refresh()
  } catch (error) {
    message.value = getFieldErrors(error).name ?? getErrorMessage(error)
  }
}
</script>

<template>
  <section>
    <h1>Administration</h1>
    <AdminNav />
    <p v-if="success" class="success">{{ success }}</p>
    <p v-if="message" class="alert">{{ message }}</p>
    <form
      v-for="group in groups"
      :key="group.id"
      class="form card groups__item"
      @submit.prevent="save(group.id)"
    >
      <FormField :label="`Groupe ${group.id}`">
        <input v-model="names[group.id]" type="text" maxlength="30" />
      </FormField>
      <button type="submit" class="btn btn--primary">Renommer</button>
    </form>
  </section>
</template>

<style scoped lang="scss">
.groups__item {
  margin-bottom: $space-3;
}
</style>
