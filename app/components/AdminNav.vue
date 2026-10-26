<template>
  <nav class="admin-nav" aria-label="Administration">
    <NuxtLink to="/admin/matchs" class="btn">Matchs</NuxtLink>
    <NuxtLink to="/admin/joueurs" class="btn">Joueurs</NuxtLink>
    <NuxtLink to="/admin/groupes" class="btn">Groupes</NuxtLink>
  </nav>
</template>

<style scoped lang="scss">
.admin-nav {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
  margin-bottom: $space-6;

  .router-link-exact-active {
    color: #fff;
    background: $color-primary;
    border-color: $color-primary;
  }
}
</style>
