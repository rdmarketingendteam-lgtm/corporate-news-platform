import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { 'server-only': new URL('./tests/server-only-stub.ts', import.meta.url).pathname } },
  test: { environment: 'node', include: ['tests/**/*.test.{ts,tsx}'] },
  oxc: { jsx: { runtime: 'automatic' } },
})
