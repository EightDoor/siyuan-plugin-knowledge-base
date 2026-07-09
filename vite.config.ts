import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { resolve } from 'path'
import { copyFileSync, existsSync } from 'fs'

function copySingleFile(srcPath: string, destPath: string, required = true): void {
  if (!existsSync(srcPath)) {
    if (required) {
      throw new Error(`[siyuan-copy] missing required file: ${srcPath}`)
    }
    return
  }
  copyFileSync(srcPath, destPath)
}

function siyuanSingleFilePlugin(files: Array<{ src: string; required?: boolean }>): Plugin {
  let outDir = ''
  return {
    name: 'siyuan-copy-single',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      outDir = config.build.outDir
    },
    writeBundle() {
      for (const f of files) {
        copySingleFile(resolve(__dirname, f.src), resolve(outDir, f.src), f.required)
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
      siyuanSingleFilePlugin([
        { src: 'plugin.json', required: true },
        { src: 'icon.png', required: true },
        { src: 'preview.png', required: false },
      ]),
      viteStaticCopy({
        targets: [
          { src: 'README*.md', dest: '.' },
          { src: 'src/i18n/*.json', dest: 'i18n' },
        ],
        silent: true,
      }),
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
