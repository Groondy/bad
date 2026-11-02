<script setup lang="ts">
import type { MatchView } from '#shared/models'

definePageMeta({ middleware: 'admin' })
useHead({ title: 'Admin · Matchs' })

const { data: matches, refresh } = await useFetch<MatchView[]>('/api/admin/matches', {
  default: () => [],
})
</script>

<template>
  <section>
    <h1>Administration</h1>
    <AdminNav />
    <p v-if="matches.length === 0" class="muted">Aucun match.</p>
    <MatchHistory v-else :matches="matches">
      <template #actions="{ match }">
        <MatchActions :match="match" @changed="refresh()" />
      </template>
    </MatchHistory>
  </section>
</template>
