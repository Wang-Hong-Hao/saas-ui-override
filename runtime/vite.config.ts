import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      // 单一数据契约:与 extension 共用仓库根目录 shared/
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    target: 'es2018',
    minify: 'esbuild',
    lib: {
      entry: 'src/index.ts',
      name: 'SaaSUIOverride',
      formats: ['iife'],
      fileName: () => 'runtime.js',
    },
  },
})
