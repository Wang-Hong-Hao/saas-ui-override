import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'SaaS UI Override',
  version: '0.1.0',
  description: '面向 SaaS 交付的轻量级 UI 定制工具(Phase 1:元素选择 + CSS Selector 生成)',
  action: {
    default_title: 'SaaS UI Override',
  },
  side_panel: {
    default_path: 'sidepanel.html',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  permissions: ['sidePanel', 'storage'],
})
