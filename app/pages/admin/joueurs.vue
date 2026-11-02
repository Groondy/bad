<script setup lang="ts">
import type { AdminUserRow, Group, Role } from '#shared/models'

definePageMeta({ middleware: 'admin' })
useHead({ title: 'Admin · Joueurs' })

const { user } = useUserSession()
const { data: users, refresh } = await useFetch<AdminUserRow[]>('/api/admin/users', {
  default: () => [],
})
const { data: groups } = await useFetch<Group[]>('/api/groups', { default: () => [] })

const message = ref('')
const success = ref('')

async function run(action: () => Promise<unknown>, successText: string) {
  message.value = ''
  success.value = ''
  try {
    await action()
    success.value = successText
  } catch (error) {
    message.value = getErrorMessage(error)
  }
  await refresh()
}

function changeGroup(target: AdminUserRow, groupId: number) {
  return run(
    () => $fetch<unknown>(`/api/admin/users/${target.id}`, { method: 'PATCH', body: { groupId } }),
    `Groupe de ${target.firstName} ${target.lastName} modifié.`,
  )
}

function changeRole(target: AdminUserRow, role: Role) {
  return run(
    () => $fetch<unknown>(`/api/admin/users/${target.id}`, { method: 'PATCH', body: { role } }),
    `Rôle de ${target.firstName} ${target.lastName} modifié.`,
  )
}

function resetPassword(target: AdminUserRow) {
  const password = prompt(
    `Nouveau mot de passe temporaire pour ${target.firstName} ${target.lastName} (8 caractères minimum) :`,
  )
  if (!password) return
  return run(
    () =>
      $fetch<unknown>(`/api/admin/users/${target.id}/reset-password`, {
        method: 'POST',
        body: { password },
      }),
    `Mot de passe de ${target.firstName} réinitialisé. Transmets-le-lui et demande-lui de le changer.`,
  )
}

function remove(target: AdminUserRow) {
  if (
    !confirm(
      `Supprimer le compte de ${target.firstName} ${target.lastName} ? Ses matchs seront conservés de façon anonyme.`,
    )
  ) {
    return
  }
  return run(
    () => $fetch<unknown>(`/api/admin/users/${target.id}`, { method: 'DELETE' }),
    'Compte supprimé.',
  )
}
</script>

<template>
  <section>
    <h1>Administration</h1>
    <AdminNav />
    <p v-if="success" class="success">{{ success }}</p>
    <p v-if="message" class="alert">{{ message }}</p>
    <ul class="users">
      <li v-for="target in users" :key="target.id" class="users__item card">
        <div class="users__head">
          <strong>{{ target.firstName }} {{ target.lastName }}</strong>
          <span class="muted">{{ target.email }} · {{ target.elo }} Elo</span>
        </div>
        <div class="users__controls">
          <FormField label="Groupe">
            <select
              :value="target.groupId"
              @change="changeGroup(target, Number(($event.target as HTMLSelectElement).value))"
            >
              <option v-for="group in groups" :key="group.id" :value="group.id">
                {{ group.name }}
              </option>
            </select>
          </FormField>
          <FormField label="Rôle">
            <select
              :value="target.role"
              :disabled="target.id === user?.id"
              @change="changeRole(target, ($event.target as HTMLSelectElement).value as Role)"
            >
              <option value="player">Joueur</option>
              <option value="admin">Admin</option>
            </select>
          </FormField>
        </div>
        <div class="actions">
          <button type="button" class="btn" @click="resetPassword(target)">
            Réinitialiser le mot de passe
          </button>
          <button
            v-if="target.id !== user?.id"
            type="button"
            class="btn btn--danger"
            @click="remove(target)"
          >
            Supprimer
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped lang="scss">
.users {
  display: grid;
  gap: $space-3;
  margin: 0;
  padding: 0;
  list-style: none;
}

.users__head {
  display: grid;
  margin-bottom: $space-3;
}

.users__controls {
  display: grid;
  gap: $space-3;

  @include md-up {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
