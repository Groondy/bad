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
      <NuxtLink to="/" class="topbar__brand"
        >BAD <span class="topbar__brand-accent">ELO</span></NuxtLink
      >
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
  background: $color-primary;

  // Contour blanc : le marine par défaut disparaît sur la barre
  :focus-visible {
    outline-color: $color-on-primary;
  }
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
  font-family: $font-display;
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: $color-on-primary;
  text-decoration: none;
}

.topbar__brand-accent {
  color: $color-accent;
}

.topbar__links {
  display: flex;
  align-items: center;
  gap: $space-4;
}

.topbar__link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: $space-1 0;
  font: inherit;
  font-weight: 600;
  color: $color-on-primary;
  text-decoration: none;
  background: none;
  border: 0;
  border-bottom: 3px solid transparent;
  cursor: pointer;

  &.router-link-exact-active {
    border-bottom-color: $color-accent;
  }
}

.topbar__link--desktop {
  display: none;

  @include md-up {
    display: inline-flex;
  }
}

.topbar__logout {
  font-weight: 400;
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
  font-family: $font-display;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: $color-muted;
  text-decoration: none;

  &.router-link-exact-active {
    color: $color-primary;
    box-shadow: inset 0 3px 0 $color-accent;
  }

  &--cta {
    margin: $space-2;
    color: $color-primary;
    background: $color-accent;
    border-radius: $radius;

    &.router-link-exact-active {
      background: $color-accent-dark;
      box-shadow: none;
    }
  }
}
</style>
