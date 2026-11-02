import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Tests des routes (build Nuxt, lents) : pnpm test:api
    exclude: ['tests/api/**'],
    environment: 'node',
  },
})
