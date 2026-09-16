# SaaS UI Override

面向 SaaS 多客户交付的轻量级 UI 定制工具:开发人员通过浏览器扩展选择页面元素,修改 CSS / Tailwind Class / Custom CSS,保存为 JSON 配置;SaaS 页面通过一个 `<script>` 标签加载 Runtime,在运行时动态应用覆盖,无需修改源码、重新构建和部署。

详细设计见 [saas-ui-override-v1-development-plan.md](./saas-ui-override-v1-development-plan.md)。

## 当前状态:Phase 6(V1 全部完成)

已完成(方案第 44 章 Phase 1 ~ Phase 6):

**共享契约**:仓库根目录 `shared/`(types/config.ts、css/style-builder.ts、validation.ts)由 extension 与 runtime 通过 `@shared` alias 共同引用,与 `schema/ui-config.schema.json` 三者一致。

**Phase 1:Extension 基础**

- Manifest V3 扩展脚手架(Vite + Vue 3 + TypeScript + @crxjs/vite-plugin)
- Side Panel(点击扩展图标打开)
- Element Picker:mouseover 高亮(仅 `outline`,不修改 border/background/box-shadow,退出时恢复)、浮层提示、click 锁定并阻止点击穿透、ESC 退出
- Selector Generator:按 唯一 ID → 唯一 class → class 组合 → 父级 + class → 多级父级路径 → nth-of-type 优先级生成,每个候选都用 `querySelectorAll` 验证唯一性
- Selector 匹配数统计(0 / 1 / N),支持手动编辑 Selector 并防抖重新检测
- 单一数据契约:`extension/src/shared/types/config.ts` + `schema/ui-config.schema.json`

**Phase 2:实时 CSS**

- Style Editor:按方案第 8 章七组属性(Typography / Box Model / Background / Border / Layout / Position / Flex)分组渲染;长度类文本输入、颜色 color picker + 文本、枚举类 select;空值表示不覆盖
- 实时预览:styles 变化立即注入/更新页面的 `<style class="saas-ui-override-preview">`,编译为 `selector { prop: value !important; }`;camelCase → kebab-case 转换在 `shared/css/style-builder.ts`,将来 Runtime 复用
- 当前编辑状态:`sidepanel/stores/config.ts` 模块级 reactive store(当前编辑对象为完整 UIRule);手动修改 Selector 同步进 rule 并刷新预览与匹配数
- Reset:清除当前 rule 全部 styles,预览立即恢复页面原样
- Undo/Redo:Toolbar 按钮 + history stack,粒度为属性值落定(blur/change),Undo/Redo 后预览同步刷新;选中元素后保持锁定高亮

**Phase 3:Custom CSS**

- Custom CSS 编辑器:CodeMirror 6(css 语法高亮、行号、浅色主题),内容绑定当前 rule 的 `customCss` 字段
- 实时注入:customCss 防抖 ~300ms 后原样追加进预览 `<style>`(作为全局 CSS,不改写、不自动加 `!important`,selector 由开发人员自己负责);selector 语法无效时 styles 规则不编译,但 customCss 仍注入
- 「清除 Custom CSS」按钮:清空 customCss,预览立即移除对应 CSS
- 花括号配平轻量提示(不引入完整 CSS parser;语法错误的规则由浏览器静默忽略)
- Undo/Redo 升级为对整个 rule 可编辑子集(selector + styles + customCss)做快照:编辑器 blur 落定记一步,Undo/Redo 后 CodeMirror 内容、Selector 输入框、预览、匹配数全部同步刷新

**Phase 4:Tailwind Class**

- Tailwind 编辑器:内置常见 utility 词表(`sidepanel/tailwind-classes.ts`,圆角/字重/字号/颜色/背景/间距/阴影/布局/Flex/边框/宽高等),支持中文关键词(如「圆角」「阴影」)与 class 名搜索,词表外可手动输入任意 class
- 「已添加」/「已删除」列表:写入 `rule.classes.add` / `rule.classes.remove`,每项带 × 移除;选中时展示元素现有 class,点击即可加入「已删除」
- 存在性检测(方案第 14 章):添加 class 时遍历 `document.styleSheets` 检测对应 CSS 是否存在,跨域 stylesheet 捕获 SecurityError 后跳过;检测不到显示 ⚠(悬停看原因)但 class 仍然添加
- 实时预览:classes.add/remove 立即作用于所有匹配元素的 classList(方案第 24 章);记录插件加/删的 class(Map 备份),切换元素 / 清除预览 / Reset 时精确恢复,不留残留
- Undo/Redo 快照扩展至 classes;新增 Rule Actions 区「重置 Rule」(清空 styles + classes + customCss,可 Undo)

**Phase 5:Config(Rule 管理 / 持久化 / 导入导出)**

- 多 Rule 管理:store 升级为管理整个 UIConfig(version / customerId / site.host / rules[]);Rule 列表区支持切换编辑、删除、enabled 开关(禁用即预览失效)
- 预览语义:应用**所有 enabled rules 的叠加**(当前编辑 rule 的变化实时反映),content 端按 rule 应用 styles / classes / attributes / customCss,并完整记录原始 class / attribute 状态,清除预览时精确恢复
- 草稿持久化:chrome.storage.local 按当前 tab host 关联(`ui-config:<host>`),编辑后防抖自动保存;重开 side panel 自动恢复该 host 的配置与预览
- 状态机:任何编辑 → Draft,「保存」→ Saved,「导出 JSON」→ Exported;Toolbar 状态徽标实时显示
- 导出 JSON:完整 UIConfig 文件下载;导出前逐 rule 检测 selector(无效 / 匹配 0 / 匹配 N>1 汇总警告,确认后仍可导出)
- 导入 JSON:按 schema 手写校验器(`shared/validation.ts`)校验,错误定位到 `rules[i].字段`;失败拒绝导入并显示错误,成功即恢复预览
- attributes 编辑(方案第 25 章):选中 `<img>` 时可编辑 src / alt,`<a>` 可编辑 href,预览即时生效(setAttribute)且可 Undo
- Schema 校对:`schema/ui-config.schema.json` 与 `shared/types/config.ts` 已逐字段核对一致(含 attributes / scope / enabled 等完整 Rule 结构)

**Phase 6:Runtime**

- 独立包 `runtime/`:TypeScript + Vite lib 模式构建为单个 IIFE `dist/runtime.js`(7.6 kB,gzip 2.8 kB,零运行时依赖);模块按方案第 31 章划分(config-loader / rule-engine / css-injector / class-applier / attribute-applier / scope-matcher / dom-observer),内部 API 按第 32 章 `UIOverrideRuntime` 接口
- 初始化:`document.currentScript` 读取 `data-customer-id` / `data-config-url` / `data-config-version`(追加 `?v=N` 穿透缓存,方案第 38 章)/ `data-debug`;缺 `data-config-url` 时 warn 并安全退出
- **config-url 占位符**:`data-config-url` 支持 `{param}` 占位符,参数按 `location.search` → hash 中 query(`#/guidePage?vhost=2025` 取 `?` 之后)顺序解析;任一占位符无法解析则 warn 一次并安全退出;解析出的租户字段(vhost / customerId / tenant 等)作为 customerId 兜底
- **localStorage 缓存(stale-while-revalidate)**:init 时同步读缓存(`saas-ui-override:<最终URL>`)立即应用,首屏 CSS 零等待;随后照常 fetch,成功后覆盖应用并写缓存;fetch 失败但有缓存 → 静默用缓存;缓存读写全部 try/catch,内容损坏自动忽略
- Rule 应用:enabled + scope 匹配的 rule 全部生效;styles 编译为带 `!important` 的 CSS 注入单个 `<style id="saas-ui-override">`;customCss 原文注入;classes/attributes 对所有匹配元素应用(第 24 章)
- 动态 DOM:MutationObserver(childList + class/src/href/alt 属性变更)微任务合并 sync;写入前对比当前值,只在不一致时写,Runtime 自身写入不会触发再写入(防无限循环,第 23 章);框架重渲染冲掉 class/attribute 时自动重应用;异步插入的元素自动应用
- scope.path 语义:缺失/空 = 全站;`/exam` 与 `/exam/*` 等价,匹配 `/exam` 或其子路径 `/exam/...`;**支持 hash 路由**:URL 形如 `/wsbm/#/guidePage?vhost=2025` 时取 hash 中 `#/` 之后、`?` 之前的部分(`/guidePage`)作为有效路径,无 hash 路由时用 `location.pathname`,行为不变
- 错误处理(第 39 章):fetch 失败 / JSON 损坏 / 校验失败只 `console.error` 一次并终止,SaaS 页面不受影响;`data-debug="true"` 时输出 0 匹配 / 无效 selector 警告(同一 rule 状态不变时只警告一次),生产默认静默
- `destroy()`:断开 observer、移除 style、恢复全部 class/attribute 原始状态
- 调试钩子:页面上可通过 `window.saasUIOverride` 访问内部 API(`applyRule` / `removeRule` / `destroy` 等,非对外 SDK)

## Runtime 用法(SaaS 接入)

```html
<script
  src="https://cdn.example.com/ui-override/runtime.js"
  data-customer-id="customer-001"
  data-config-url="https://cdn.example.com/ui-config/customer-001.json"
></script>
```

### config-url 占位符(多租户共用同一份 HTML 的场景)

`data-config-url` 支持 `{param}` 占位符,参数从当前 URL 解析:`location.search` 优先,hash 中的 query 兜底(`#/guidePage?vhost=2025&x=1` 取 `?` 之后部分;`location.search` 取不到 `#` 后的参数)。

例如租户标识在 hash query 的 `vhost` 里(`https://zybm.baoming001.com/wsbm/#/guidePage?vhost=2025`):

```html
<script
  src="https://cdn.example.com/ui-override/runtime.js"
  data-config-url="https://cdn.example.com/ui-config/{vhost}.json"
></script>
```

→ 实际请求 `https://cdn.example.com/ui-config/2025.json`;解析出的 `vhost` 同时作为 customerId 兜底(`data-customer-id` 显式给出时优先)。任一占位符无法解析(如访客 URL 没有 vhost)→ console.warn 一次并安全退出,不影响页面。

### 缓存策略(stale-while-revalidate)

- 首次加载:fetch 配置 → 应用 → 写入 localStorage(key:`saas-ui-override:<最终URL>`)
- 二次加载:同步读缓存**立即应用**(首屏零等待)→ 后台 fetch 最新配置 → 成功后覆盖应用并更新缓存
- fetch 失败但有缓存:静默使用缓存;缓存损坏:自动忽略并走正常 fetch;隐私模式等 localStorage 不可用时自动降级为纯 fetch

### scope.path 与 hash 路由

scope 匹配的是「有效路径」:hash 路由(`#/guidePage?...`)取 hash 中 `#/` 之后、`?` 之前的部分;否则取 `location.pathname`。`/guidePage` 与 `/guidePage/*` 等价:精确匹配或其子路径。缺失/空 = 全站生效。

### 其他可选属性

- `data-config-version="12"` → 请求配置时追加 `?v=12` 穿透缓存(版本号由开发人员手动管理;占位符替换之后追加)
- `data-cache="false"` → 关闭 localStorage 缓存(默认开启;关闭后每次都等网络配置,不读也不写缓存)
- `data-debug="true"` → 输出 rule 匹配诊断(0 匹配 / 无效 selector),生产环境不要开

示例配置见仓库 `ui-config/customer-001.json`(符合 `schema/ui-config.schema.json`,含 scope / styles / classes / attributes / customCss / enabled 全字段)。

构建 Runtime:

```bash
cd runtime
npm install
npm run build   # 产出 runtime/dist/runtime.js(约 9 kB,gzip 约 3.3 kB)
```

## 导出 JSON 字段说明

```json
{
  "version": 1,              // 配置版本号,V1 固定为 1;缓存版本(方案第 38 章)由开发人员手动管理
  "customerId": "customer-001",
  "site": { "host": "exam.example.com" },
  "rules": [
    {
      "id": "rule-001",
      "selector": ".exam-page .start-button",
      "scope": { "path": "/exam" },
      "styles": { "fontSize": "16px" },
      "classes": { "add": ["rounded-xl"], "remove": ["rounded-md"] },
      "attributes": { "src": "https://cdn.example.com/logo.png" },
      "customCss": ".start-button:hover { transform: translateY(-2px); }",
      "enabled": true
    }
  ]
}
```

字段含义与约束见 `schema/ui-config.schema.json`(单一数据契约)与开发方案第 16/17/26 章。

## 目录结构

```text
├── shared/               # 单一数据契约:extension 与 runtime 共用(@shared alias)
│   ├── types/config.ts
│   ├── css/style-builder.ts
│   └── validation.ts
├── extension/            # 浏览器扩展
│   ├── src/
│   │   ├── background/   # MV3 service worker:打开 side panel + 消息路由
│   │   ├── content/      # content script:element-picker / selector-generator / preview-applier / dom-utils
│   │   ├── sidepanel/    # Vue 3 Side Panel UI(components + stores/config.ts)
│   │   └── shared/       # 仅扩展内私有:消息协议
│   └── manifest.config.ts
├── runtime/              # Runtime:SaaS 页面 script 标签加载,产出单个 dist/runtime.js
│   └── src/              # index / config-loader / rule-engine / css-injector / class-applier / attribute-applier / scope-matcher / dom-observer
├── schema/               # ui-config JSON Schema
└── saas-ui-override-v1-development-plan.md
```

## 构建

```bash
cd extension
npm install
npm run build
```

构建产物在 `extension/dist/`,`manifest.json` 位于 dist 根目录。`npm run build` 会先执行 `vue-tsc` 类型检查再产出 bundle。

## 在 Chrome 中加载

1. 打开 `chrome://extensions`
2. 打开右上角「开发者模式」
3. 点击「加载已解压的扩展程序」,选择 `extension/dist` 目录
4. 点击工具栏扩展图标,即可在右侧打开 Side Panel

## 手动验收

### Phase 1:元素选择

1. 打开任意普通网页(非 `chrome://` 内部页面;若页面在扩展安装前已打开,需先刷新以注入 content script)
2. 点击扩展图标打开 Side Panel
3. 点击「🎯 选择元素」,按钮变为「✕ 取消选择」
4. 移动鼠标:页面元素出现蓝色 outline 高亮(2px solid #1677ff),附近浮层显示 tag 与 selector;高亮不修改元素的 border/background/box-shadow
5. 点击页面中一个按钮:Side Panel 显示该元素的 Tag、自动生成的 Selector、匹配数(唯一时显示「✓ 匹配 1 个元素」),被点击元素保留蓝色高亮;点击不会触发页面原本的链接/按钮行为
6. 在 Selector 输入框中手动修改(例如改成 `button`):约 300ms 防抖后重新检测,匹配多个时显示「⚠ 当前 Selector 匹配 N 个元素」;改成语法错误的 selector 显示「⚠ 无效的 Selector」;改成不存在的 selector 显示「⚠ 未匹配到元素」
7. 再次点击「选择元素」进入选择模式后按 ESC:退出选择模式,所有高亮与浮层被清理

### Phase 2:实时 CSS(方案第 44 章验收)

1. 选中页面中一个按钮,面板下方出现「样式」编辑器(七组属性)
2. 展开 Typography,在 `fontSize` 输入 `20px`:输入过程中页面按钮立即变大;DevTools 中可见页面 `<head>` 注入了 `<style class="saas-ui-override-preview">`,内容为 `selector { font-size: 20px !important; }`
3. 展开 Background,在 `backgroundColor` 输入 `#ff6600`(或用取色器):按钮背景立即变化;编辑过程中选中元素的蓝色高亮不消失
4. 点击 Toolbar 的「↩ Undo」:`backgroundColor` 撤销、背景恢复原样,「↪ Redo」可用;点击「↪ Redo」:背景恢复为 `#ff6600`
5. 把 Selector 手动改为匹配多个元素的 selector:所有匹配元素同时应用样式
6. 点击「重置样式」:页面立即恢复原样,预览 `<style>` 被移除;再点「↩ Undo」可恢复重置前的样式

### Phase 3:Custom CSS(方案第 44 章验收)

1. 选中任意元素,面板出现「Custom CSS」区块(CodeMirror 编辑器)
2. 输入 `.button:hover { transform: translateY(-2px); }`(selector 自己写):停止输入约 300ms 后页面实时生效(鼠标悬停目标元素可见位移);预览 `<style>` 中该段 CSS 为原文注入,没有自动加 `!important`
3. Custom CSS 与可视化 styles 可共存:同时设置 `fontSize`,预览 `<style>` 中 styles 规则带 `!important`,customCss 原文追加在后
4. 点击「清除 Custom CSS」:页面立即移除对应 CSS;「↩ Undo」可恢复
5. 编辑器 blur 后 Undo/Redo 作用于 styles + customCss + selector:Undo 时 CodeMirror 内容、Selector 输入框、匹配数、页面预览同步回退
6. 输入花括号不配对的 CSS(如 `.button {`):编辑器下方出现「⚠ 花括号不配对」提示;页面与面板不受影响

### Phase 4:Tailwind Class(方案第 44 章验收)

1. 选中一个元素,面板出现「Tailwind CSS」区块;搜索框输入「圆角」出现 `rounded-*` 候选,输入 class 名片段(如 `shadow`)也能搜索
2. 点击候选 `rounded-xl`:页面元素立即变化(页面 CSS 中存在该 utility 时),「已添加」列表出现该项;若页面中不存在该 utility(如手动输入 `rounded-9xl`),项旁显示 ⚠(悬停可见原因),但 class 仍被添加
3. 「元素现有 Class」中点击元素已有的 class(如 `rounded-md`):加入「已删除」列表,页面立即变化;点「已删除」列表项的 × 可恢复
4. 点击「↩ Undo」/「↪ Redo」:class 的添加/删除随之撤销/重做,页面同步
5. 再次选择另一个元素:前一个元素上插件加/删的 class 完全恢复,无残留
6. 点击底部「重置 Rule」:styles / classes / customCss 全部清空,页面完全恢复;「↩ Undo」可整体恢复

### Phase 5:Config(方案第 44 章验收)

1. 选中元素并修改样式 → Toolbar 徽标显示 Draft;点击「保存」→ Saved,配置写入 chrome.storage.local(按当前页面 host 关联)
2. 关闭再打开 side panel:该 host 的配置自动恢复,Rule 列表与页面预览都在
3. 点击「导出 JSON」:下载 `ui-config-<host>.json`,徽标变为 Exported;若 rule 的 selector 匹配 0 个 / 多个 / 无效,先弹出警告汇总,确认后仍导出
4. 删除 Rule 列表中的 rule(×)→ 页面修改消失;点击「导入 JSON」选择刚导出的文件 → 页面恢复修改(方案 44 章验收链路)
5. 导入非法文件:非 JSON、version 不为 1、rule 缺字段等,都会显示具体错误(如 `rules[0](r1).selector: 必须是非空字符串`)且不会覆盖当前配置
6. 多条 rule:选择不同元素创建多条 rule,预览为所有 enabled rule 的叠加;在列表中取消勾选 enabled → 该 rule 预览立即失效
7. 选中 `<img>`:出现 Attributes 编辑(src / alt),修改 src 页面立即生效,Undo 可恢复原值

### Phase 6:Runtime(方案第 44 章验收)

1. 用 Extension 修改页面并导出 JSON,部署到静态服务器(如 `https://cdn.example.com/ui-config/customer-001.json`)
2. 在 SaaS 页面引入 `<script src=".../runtime.js" data-customer-id="customer-001" data-config-url=".../customer-001.json">`,刷新页面:配置自动加载,CSS / Tailwind Class / attributes / customCss 自动应用
3. 页面上异步渲染出来的元素(setTimeout / 接口返回后插入)也会自动应用规则;框架重渲染把加的 class 冲掉时自动重应用
4. DevTools 中可见单个 `<style id="saas-ui-override">`:styles 部分带 `!important`,customCss 为原文
5. 带 `scope.path` 的 rule 只在匹配路径生效;`enabled: false` 的 rule 不生效
6. 把 `data-config-url` 指向 404 或损坏的 JSON:页面无任何 JS 错误,SaaS 正常运行,console 只有一条 `[UI Override]` 错误
7. 加 `data-debug="true"` 刷新:console 输出 0 匹配 rule 的警告;去掉后静默

### Runtime 增强(占位符 / hash scope / 缓存)

1. 页面 URL `https://<host>/wsbm/#/guidePage?vhost=2025`,script 用 `data-config-url=".../ui-config/{vhost}.json"` → 实际请求 `2025.json` 且样式生效;URL 去掉 `vhost` → 安全退出、无 JS 错误、无样式注入
2. `scope.path: "/guidePage"` 在 `#/guidePage` 下生效,在 `#/other` 下不生效
3. 二次访问同一配置 URL:fetch 未完成前样式已从 localStorage 缓存注入(可用 DevTools Network 节流观察)
4. 配置 URL 404 但本地有缓存:页面静默使用缓存,无错误
