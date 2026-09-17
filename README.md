# SaaS UI Override

**不改一行 SaaS 源码,完成客户级 UI 定制。**

SaaS UI Override 是一个面向 SaaS 多客户交付场景的轻量级 UI 定制工具:开发人员通过浏览器扩展在页面上**点选元素、可视化修改样式**,导出为一份 JSON 配置;SaaS 页面只需引入**一个 `<script>` 标签**,即可在运行时动态应用这些覆盖 —— 无需修改源码、无需重新构建、无需重新部署。

```text
传统定制:  需求 → 找代码 → 改 CSS → Build → Deploy → 客户验证 → 再改 → 再 Build → 再 Deploy
UI Override: 需求 → 选元素 → 实时预览 → 导出 JSON → 上传 CDN → 完成
```

---

## 特性

**Browser Extension(开发人员使用)**

- 🎯 **元素点选**:鼠标悬停高亮、点击锁定、ESC 退出,自动生成稳定且唯一的 CSS Selector(唯一性实时校验,匹配数 0 / 1 / N 一目了然)
- 🎨 **可视化样式编辑**:Typography / Box Model / Background / Border / Layout / Position / Flex 七组高频属性,实时预览
- 🌬️ **Tailwind Class 管理**:内置词表 + 中文搜索,添加 / 删除 class 并检测对应 utility 是否存在于页面 CSS
- ✍️ **Custom CSS**:CodeMirror 6 编辑器,手写 CSS 原文注入,支持伪类 / 伪元素等任意选择器
- 🖼️ **attributes 覆盖**:替换 `<img>` 的 src / alt、`<a>` 的 href
- ↩️ **Undo / Redo**:属性级历史栈,编辑器内容与页面预览同步回退
- 💾 **草稿持久化**:按站点 host 自动保存到 chrome.storage.local,重开面板自动恢复
- 📦 **导入 / 导出 JSON**:导出前逐条校验 selector;导入时 schema 校验,错误精确定位到字段

**Runtime(SaaS 页面使用)**

- 📜 **零依赖单文件**:约 9 kB(gzip 约 3.3 kB),一个 `<script>` 标签接入,不依赖任何框架或 npm 包
- 🔄 **动态 DOM 支持**:MutationObserver 自动覆盖异步渲染的元素,框架重渲染冲掉 class / attribute 时自动重应用
- ⚡ **stale-while-revalidate 缓存**:localStorage 缓存首屏零等待,后台静默更新;网络失败自动回退缓存
- 🏷️ **多租户占位符**:`data-config-url` 支持 `{param}` 占位符,从 URL(query / hash query)解析租户标识
- 🛡️ **安全失败**:配置加载失败只 console.error 一次,绝不影响宿主页面
- 🔍 **调试模式**:`data-debug="true"` 输出 0 匹配 / 无效 selector 诊断

## 工作原理

```text
┌──────────────────────────────┐
│      Browser Extension       │
│                              │
│  🎯 Element Picker           │
│       ↓                      │
│  CSS Selector(唯一性验证)   │
│       ↓                      │
│  ┌──────────┬────────┬─────┐ │
│  │ 样式编辑  │Tailwind│Custom│ │
│  │          │ Classes│ CSS  │ │
│  └──────────┴────────┴─────┘ │
│       ↓ 实时预览 + Undo/Redo  │
│       UI Config JSON          │
└──────────────┬───────────────┘
               │ 导出 / 部署
               ↓
        Static JSON File(CDN / Nginx)
               ↓
┌──────────────────────────────┐
│            SaaS              │
│                              │
│  <script src="runtime.js">   │
│       ↓                      │
│  Config Loader(带缓存)      │
│       ↓                      │
│  Rule Engine(scope 匹配)    │
│       ↓                      │
│  ┌────────┴─────────┐        │
│  ↓                  ↓        │
│  CSS Injector   Class/Attr   │
│  (!important)   Applier      │
│       ↓                      │
│       Final UI               │
└──────────────────────────────┘
```

## 快速开始

### 1. 安装浏览器扩展

```bash
cd extension
npm install
npm run build
```

然后:

1. 打开 `chrome://extensions`,开启右上角「开发者模式」
2. 点击「加载已解压的扩展程序」,选择 `extension/dist` 目录
3. 点击工具栏扩展图标,右侧打开 Side Panel

### 2. 制作 UI 定制

1. 打开目标 SaaS 页面,点击「🎯 选择元素」,点选要修改的元素
2. 在样式 / Tailwind / Custom CSS / Attributes 编辑器中修改,页面实时预览
3. 点击「保存」,再点击「导出 JSON」,得到 `ui-config-<host>.json`
4. 将 JSON 部署到任意静态托管(CDN / Nginx 均可)

### 3. SaaS 页面接入 Runtime

```bash
cd runtime
npm install
npm run build   # 产出 dist/runtime.js
```

在页面中引入:

```html
<script
  src="https://cdn.example.com/ui-override/runtime.js"
  data-customer-id="customer-001"
  data-config-url="https://cdn.example.com/ui-config/customer-001.json"
></script>
```

刷新页面,定制自动生效。推荐放在 `</body>` 前,或由基础模板统一引入。

## Runtime 集成参考

### script 属性

| 属性 | 必填 | 说明 |
| --- | --- | --- |
| `data-config-url` | ✅ | 配置文件 URL,支持 `{param}` 占位符 |
| `data-customer-id` | 否 | 客户标识;未提供时可由占位符解析结果兜底 |
| `data-config-version` | 否 | 追加 `?v=N` 穿透缓存,版本号由开发人员手动管理 |
| `data-cache` | 否 | `"false"` 关闭 localStorage 缓存(默认开启) |
| `data-debug` | 否 | `"true"` 输出 rule 匹配诊断,生产环境不要开 |

### 多租户占位符

多租户共用同一份 HTML 时,`data-config-url` 中的 `{param}` 从当前 URL 解析:`location.search` 优先,hash 中的 query 兜底(`#/guidePage?vhost=2025` 取 `?` 之后部分):

```html
<!-- https://example.com/wsbm/#/guidePage?vhost=2025 -->
<script
  src="https://cdn.example.com/ui-override/runtime.js"
  data-config-url="https://cdn.example.com/ui-config/{vhost}.json"
></script>
<!-- 实际请求 https://cdn.example.com/ui-config/2025.json -->
```

解析出的租户字段(vhost / customerId / tenant 等)同时作为 customerId 兜底。任一占位符无法解析时 console.warn 一次并安全退出,不影响页面。

### 缓存策略(stale-while-revalidate)

```text
首次加载:  fetch 配置 → 应用 → 写入 localStorage
二次加载:  同步读缓存立即应用(首屏零等待)→ 后台 fetch → 成功后覆盖并更新缓存
降级:      网络失败静默用缓存;缓存损坏自动忽略;localStorage 不可用时退化为纯 fetch
```

缓存 key 为 `saas-ui-override:<最终 URL>`(占位符替换之后)。

### scope.path 与 hash 路由

`scope.path` 匹配「有效路径」:hash 路由(`#/guidePage?...`)取 hash 中 `#/` 之后、`?` 之前的部分,否则取 `location.pathname`。`/guidePage` 与 `/guidePage/*` 等价,精确匹配或其子路径;缺失 / 空 = 全站生效。

### 调试钩子

页面上可通过 `window.saasUIOverride` 访问内部 API(`applyRule` / `removeRule` / `destroy` 等,非对外 SDK)。`destroy()` 断开 observer、移除注入的 style、恢复全部 class / attribute 原始状态。

## UI Config 格式

```json
{
  "version": 1,
  "customerId": "customer-001",
  "site": { "host": "exam.example.com" },
  "rules": [
    {
      "id": "rule-001",
      "selector": ".exam-page .start-button",
      "scope": { "path": "/exam" },
      "styles": { "fontSize": "16px", "backgroundColor": "#ff6600" },
      "classes": { "add": ["font-medium"], "remove": ["rounded-md"] },
      "attributes": { "src": "https://cdn.example.com/logo.png" },
      "customCss": ".start-button:hover { transform: translateY(-2px); }",
      "enabled": true
    }
  ]
}
```

| 字段 | 说明 |
| --- | --- |
| `version` | 配置版本,V1 固定为 `1` |
| `customerId` | 客户标识,可省略(由 URL 占位符解析回填) |
| `site.host` | 配置所属站点 host |
| `rules[].selector` | CSS Selector,对所有匹配元素生效 |
| `rules[].scope.path` | 生效路径,缺失 / 空 = 全站 |
| `rules[].styles` | 可视化样式(camelCase),运行时编译为带 `!important` 的 CSS |
| `rules[].classes` | `add` / `remove` 的 class 列表,直接操作 classList |
| `rules[].attributes` | 属性覆盖(如 img 的 src / alt,a 的 href) |
| `rules[].customCss` | 手写 CSS,原文全局注入,不自动加 `!important` |
| `rules[].enabled` | 临时禁用某条规则 |

完整约束见 [`schema/ui-config.schema.json`](./schema/ui-config.schema.json)(单一数据契约)与 [`ui-config/customer-001.json`](./ui-config/customer-001.json)(完整示例)。

## 项目结构

```text
├── shared/               # 单一数据契约:extension 与 runtime 共用(@shared alias)
│   ├── types/config.ts
│   ├── css/style-builder.ts
│   └── validation.ts
├── extension/            # 浏览器扩展(MV3 + Vue 3 + Vite + @crxjs/vite-plugin)
│   ├── src/
│   │   ├── background/   # MV3 service worker:打开 side panel + 消息路由
│   │   ├── content/      # element-picker / selector-generator / preview-applier / dom-utils
│   │   ├── sidepanel/    # Vue 3 Side Panel UI(components/ + stores/ + messaging + persistence)
│   │   └── shared/       # 扩展内私有:消息协议
│   └── manifest.config.ts
├── runtime/              # Runtime:产出单个 dist/runtime.js,零运行时依赖
│   └── src/              # config-loader / rule-engine / css-injector / class-applier /
│                         # attribute-applier / scope-matcher / dom-observer
├── schema/               # ui-config JSON Schema
├── ui-config/            # 示例配置
└── saas-ui-override-v1-development-plan.md   # 完整开发方案
```

## 本地开发

```bash
# Extension(构建前自动 vue-tsc 类型检查)
cd extension && npm install
npm run dev        # 开发模式
npm run build      # 产物在 extension/dist/
npm run typecheck  # 仅类型检查

# Runtime(构建前自动 tsc 类型检查)
cd runtime && npm install
npm run build      # 产出 runtime/dist/runtime.js
npm run typecheck
```

## 设计原则

- **不修改源代码**:UI 定制过程不触碰 Vue / React / CSS 源码
- **不重新构建**:配置更新不需要 build 和部署
- **失败不影响宿主**:配置错误只 console.error,SaaS 正常运行
- **单一数据契约**:类型定义、JSON Schema、校验器三者一致,extension 与 runtime 共享
- **可视化 styles 默认 `!important`**,Custom CSS 不强制,由开发人员自行决定
- **Tailwind 只复用页面已有的 utility**,不运行 JIT 编译

V1 明确不做:`data-ui-id`、CSS Token、配置后台、数据库、版本管理、多人协作等(见开发方案第 46 章)。

## Roadmap

- **V2**:配置服务器、管理后台、草稿 / 发布、版本管理、回滚、配置 Diff、失效检测
- **V3**:data-ui-id 稳定定位、CSS Token / Theme、Design System、可视化 UI Builder

## 文档

- [SaaS UI Override V1 开发方案](./saas-ui-override-v1-development-plan.md) —— 完整设计文档(选型理由、数据结构、错误处理、分阶段验收)

## License

[MIT](./LICENSE)
