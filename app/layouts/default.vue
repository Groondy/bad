<template>
  <div>
    <AppNav />
    <main class="container layout__main">
      <slot />
    </main>
  </div>
</template>

<style scoped lang="scss">
.layout__main {
  padding-bottom: calc(#{$tabbar-height} + #{$space-6});

  @include md-up {
    padding-bottom: $space-8;
  }
}
</style>
