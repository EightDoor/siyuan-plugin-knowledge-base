import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    server: {
      deps: {
        external: [/@xenova\/transformers/],
      },
    },
    pool: 'forks',
    isolate: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      siyuan: resolve(__dirname, 'vitest/mocks/siyuan.ts'),
    },
  },
})
