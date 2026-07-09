import { defineConfig, loadEnv, Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { copyFileSync, readdirSync, mkdirSync, existsSync } from 'fs'

function siyuanCopyPlugin(): Plugin {
  let outDir = ''
  return {
    name: 'siyuan-copy',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      outDir = config.build.outDir
    },
    writeBundle() {
      const copyFile = (src: string, dest: string, optional = false): void => {
        if (!existsSync(src)) {
          if (!optional) console.warn(`[siyuan-copy] missing required file: ${src}`)
          return
        }
        try {
          copyFileSync(src, dest)
        } catch (err) {
          console.error(`[siyuan-copy] failed to copy ${src} -> ${dest}:`, err)
        }
      }
      const safeReaddir = (dir: string): string[] => {
        try {
          return readdirSync(dir)
        } catch (err) {
          console.error(`[siyuan-copy] failed to read ${dir}:`, err)
          return []
        }
      }

      copyFile(resolve(__dirname, 'plugin.json'), resolve(outDir, 'plugin.json'))
      copyFile(resolve(__dirname, 'icon.png'), resolve(outDir, 'icon.png'), true)
      copyFile(resolve(__dirname, 'preview.png'), resolve(outDir, 'preview.png'), true)

      for (const file of safeReaddir(__dirname)) {
        if (file.startsWith('README') && file.endsWith('.md')) {
          copyFile(resolve(__dirname, file), resolve(outDir, file), true)
        }
      }

      const i18nSrcDir = resolve(__dirname, 'src', 'i18n')
      const i18nDestDir = resolve(outDir, 'i18n')
      if (existsSync(i18nSrcDir)) {
        try {
          if (!existsSync(i18nDestDir)) mkdirSync(i18nDestDir, { recursive: true })
          for (const file of safeReaddir(i18nSrcDir)) {
            if (file.endsWith('.json')) {
              copyFile(resolve(i18nSrcDir, file), resolve(i18nDestDir, file))
            }
          }
        } catch (err) {
          console.error(`[siyuan-copy] failed to setup i18n directory:`, err)
        }
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname)
  const siyuanPluginDir = env.VITE_SIYUAN_PLUGIN_DIR
  const isSiyuan = mode === 'siyuan' && !!siyuanPluginDir
  const distDir = isSiyuan ? resolve(siyuanPluginDir) : resolve(__dirname, 'dist')

  if (isSiyuan) {
    console.log(`[vite] siyuan mode: outDir = ${distDir}`)
  }

  return {
    plugins: [
      vue(),
      siyuanCopyPlugin(),
    ],
    build: {
      outDir: distDir,
      emptyOutDir: true,
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
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) return 'index.css'
            return assetInfo.name ?? '[name][extname]'
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
  }
})
