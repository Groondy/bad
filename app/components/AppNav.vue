<script setup lang="ts">
const { loggedIn, user, clear } = useUserSession()
const isAdmin = computed(() => user.value?.role === 'admin')

async function logout() {
  await clear()
  await navigateTo('/')
}
</script>

<template>
  <header class="topbar">
    <div class="topbar__inner">
      <NuxtLink to="/" class="topbar__brand">🏸 Bad Elo</NuxtLink>
      <nav class="topbar__links" aria-label="Navigation principale">
        <NuxtLink to="/" class="topbar__link topbar__link--desktop">Classement</NuxtLink>
        <template v-if="loggedIn">
          <NuxtLink to="/matchs/nouveau" class="btn btn--primary topbar__link--desktop">
            Saisir un match
          </NuxtLink>
          <NuxtLink to="/profil" class="topbar__link topbar__link--desktop">Profil</NuxtLink>
          <NuxtLink v-if="isAdmin" to="/admin/matchs" class="topbar__link">Admin</NuxtLink>
          <button type="button" class="topbar__link topbar__logout" @click="logout">
            Déconnexion
          </button>
        </template>
        <template v-else>
          <NuxtLink to="/connexion" class="topbar__link">Connexion</NuxtLink>
          <NuxtLink to="/inscription" class="topbar__link topbar__link--desktop"
            >Inscription</NuxtLink
          >
        </template>
      </nav>
    </div>
  </header>

  <nav class="tabbar" aria-label="Navigation mobile">
    <NuxtLink to="/" class="tabbar__item">Classement</NuxtLink>
    <template v-if="loggedIn">
      <NuxtLink to="/matchs/nouveau" class="tabbar__item tabbar__item--cta">+ Match</NuxtLink>
      <NuxtLink to="/profil" class="tabbar__item">Profil</NuxtLink>
    </template>
    <NuxtLink v-else to="/inscription" class="tabbar__item tabbar__item--cta">Inscription</NuxtLink>
  </nav>
</template>

<style scoped lang="scss">
.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: $color-surface;
  border-bottom: 1px solid $color-border;
}

.topbar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 960px;
  margin: 0 auto;
  padding: $space-2 $space-4;
}

.topbar__brand {
  font-weight: 800;
  color: $color-text;
  text-decoration: none;
}

.topbar__links {
  display: flex;
  align-items: center;
  gap: $space-4;
}

.topbar__link {
  padding: 0;
  font: inherit;
  color: $color-text;
  text-decoration: none;
  background: none;
  border: 0;
  cursor: pointer;

  &.router-link-exact-active {
    color: $color-primary;
    font-weight: 700;
  }
}

.topbar__link--desktop {
  display: none;

  @include md-up {
    display: inline-flex;
  }
}

.topbar__logout {
  color: $color-muted;
}

.tabbar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 10;
  display: flex;
  height: $tabbar-height;
  background: $color-surface;
  border-top: 1px solid $color-border;

  @include md-up {
    display: none;
  }
}

.tabbar__item {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: $color-muted;
  text-decoration: none;

  &.router-link-exact-active {
    color: $color-primary;
  }

  &--cta {
    margin: $space-2;
    color: #fff;
    background: $color-primary;
    border-radius: $radius;

    &.router-link-exact-active {
      color: #fff;
      background: $color-primary-dark;
    }
  }
}
</style>
