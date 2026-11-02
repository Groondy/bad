<template>
  <nav class="admin-nav" aria-label="Administration">
    <NuxtLink to="/admin/matchs" class="pill">Matchs</NuxtLink>
    <NuxtLink to="/admin/joueurs" class="pill">Joueurs</NuxtLink>
    <NuxtLink to="/admin/groupes" class="pill">Groupes</NuxtLink>
  </nav>
</template>

<style scoped lang="scss">
.admin-nav {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
  margin-bottom: $space-6;
}
</style>
