import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config'

export default defineConfig({
  plugins: [vue(), crx({ manifest })],
  resolve: {
    alias: {
      // 单一数据契约:与 runtime 共用仓库根目录 shared/
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
    },
  },
  server: {
    fs: { allow: ['..'] },
  },
  build: {
    outDir: 'dist',
  },
})
