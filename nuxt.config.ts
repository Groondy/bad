export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  modules: ['nuxt-auth-utils', '@nuxt/eslint'],
  devtools: { enabled: true },
  css: ['~/assets/scss/main.scss'],
  // Tâches Nitro (pnpm db:seed), exécutables seulement via le serveur de dev
  nitro: { experimental: { tasks: true } },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "~/assets/scss/variables" as *; @use "~/assets/scss/mixins" as *;',
        },
      },
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      titleTemplate: '%s · Bad Elo',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    },
  },
})
