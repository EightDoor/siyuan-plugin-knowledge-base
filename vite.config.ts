import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'KnowledgeBase',
      formats: ['cjs'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['siyuan'],
      output: {
        globals: {
          siyuan: 'siyuan',
        },
      },
    },
    cssCodeSplit: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
