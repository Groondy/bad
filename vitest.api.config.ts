import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/api/**/*.test.ts'],
    environment: 'node',
    hookTimeout: 180_000,
  },
})
