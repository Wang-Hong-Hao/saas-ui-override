# SaaS UI Override V1 开发方案

## 1. 项目概述

### 1.1 项目名称

SaaS UI Override V1

### 1.2 项目目标

解决 SaaS 多客户交付过程中大量“轻量级 UI 定制”问题。

当前常见需求包括：

- 修改字体大小
- 修改字体颜色
- 修改背景颜色
- 修改宽高
- 修改 margin / padding
- 修改 border / border-radius
- 调整 position
- 隐藏元素
- 替换图片
- 添加 / 删除 Tailwind CSS Class
- 开发人员直接编写 Custom CSS

V1 的核心目标：

> 开发人员通过浏览器插件选择 SaaS 页面中的元素，实时修改 CSS / Tailwind Class / Custom CSS，并将修改保存为 JSON 配置；SaaS 页面通过一个简单的 `<script>` 标签加载配置文件，在运行时动态注入 CSS 和修改 Class，无需修改源码、重新打包和重新部署前端。

---

# 2. V1 核心原则

## 2.1 第一版采用 CSS Override

V1 不修改 Vue / React / HTML 源代码。

采用：

```text
原始 SaaS 页面
        +
UI Override Config
        ↓
运行时注入 CSS / Class
        ↓
最终页面
```

---

## 2.2 第一版不引入复杂 SDK

SaaS 端只需要通过一个 `<script>` 标签加载 Runtime。

示例：

```html
<script
  src="https://cdn.example.com/ui-override/runtime.js"
  data-customer-id="customer-001"
  data-config-url="https://cdn.example.com/ui-config/customer-001.json"
></script>
```

Runtime 自动：

1. 获取配置
2. 判断当前 URL 是否匹配规则
3. 注入 CSS
4. 添加 Tailwind Class
5. 删除 Tailwind Class

不要求 SaaS 项目安装 npm 包。

---

## 2.3 V1 不考虑 data-ui-id

V1 不要求修改现有 SaaS 代码，不引入：

```html
data-ui-id
```

元素定位全部基于 CSS Selector。

未来可以增加 `data-ui-id` 作为更稳定的定位方式，但不属于 V1。

---

## 2.4 V1 不考虑 CSS Token

不设计：

```css
--primary-color
--font-size-base
```

等主题 Token。

V1 只针对具体元素进行 Override。

---

# 3. 产品结构

项目由两个主要部分组成：

```text
SaaS UI Override
│
├── Browser Extension
│   └── 开发人员使用
│
└── Runtime
    └── SaaS 页面使用
```

可选的配置服务器不是 V1 核心依赖。

V1 首先保证：

```text
插件
 ↓
导出 JSON
 ↓
服务器静态文件
 ↓
script 加载
 ↓
SaaS 生效
```

---

# 4. 完整工作流程

```text
开发人员打开 SaaS
        ↓
打开 Browser Extension
        ↓
点击「选择元素」
        ↓
鼠标移动高亮 DOM 元素
        ↓
点击目标元素
        ↓
生成 CSS Selector
        ↓
编辑：
    ├── 高频 CSS
    ├── Tailwind Class
    └── Custom CSS
        ↓
实时预览
        ↓
保存 Rule
        ↓
保存整个 UI Config
        ↓
导出 JSON
        ↓
上传到服务器
        ↓
SaaS script Runtime 加载 JSON
        ↓
运行时注入 CSS / Class
        ↓
无需重新构建
```

---

# 5. 技术栈

## 5.1 Browser Extension

推荐：

- Vue 3
- TypeScript
- Vite
- Chrome Extension Manifest V3
- CodeMirror 6

不要求：

- React
- Electron
- Monaco Editor

CodeMirror 用于 Custom CSS 编辑器。

---

## 5.2 Runtime

Runtime 尽量保持原生 JavaScript：

- TypeScript 开发
- 最终构建为单个浏览器可执行 JS
- 不依赖 Vue
- 不依赖 React
- 不要求 SaaS 安装 npm 包

目标：

```html
<script src=".../runtime.js"></script>
```

即可运行。

---

# 6. Browser Extension 功能

## 6.1 元素选择

提供：

```text
🎯 选择元素
```

进入选择模式后：

- mouseover 高亮元素
- 显示元素边界
- 显示 CSS Selector
- click 锁定元素
- ESC 退出选择模式

高亮建议：

```css
outline: 2px solid #1677ff;
outline-offset: 2px;
```

不要修改元素原本的：

- border
- background
- box-shadow

只使用 outline。

---

# 7. Selector Generator

## 7.1 V1 定位原则

V1 只使用 CSS Selector。

优先生成稳定、短、可读的 Selector。

优先级：

```text
1. 唯一 ID
2. 唯一 class
3. class 组合
4. 父级 + class
5. 多级父级路径
6. nth-child / nth-of-type
```

示例：

```html
<button class="start-button">
```

如果页面中唯一：

```css
.start-button
```

如果不唯一：

```css
.exam-page .start-button
```

如果仍不唯一：

```css
.exam-page .toolbar .start-button
```

最后才：

```css
.exam-page .toolbar button:nth-of-type(2)
```

---

## 7.2 Selector 必须验证唯一性

生成 Selector 后执行：

```js
document.querySelectorAll(selector)
```

检查：

```text
0 个 → 无效
1 个 → 最理想
>1 个 → 不够精确
```

插件 UI 显示：

```text
Selector

.exam-page .toolbar .start-button

✓ 匹配 1 个元素
```

或者：

```text
⚠ 当前 Selector 匹配 3 个元素
```

---

## 7.3 支持手动编辑 Selector

用户可以直接修改：

```text
.exam-page .toolbar .start-button
```

修改后立即重新检测匹配数量。

---

# 8. 高频 CSS 编辑器

V1 支持以下 CSS 属性。

## 8.1 Typography

```text
font-family
font-size
font-weight
font-style
line-height
letter-spacing
text-align
text-decoration
color
```

---

## 8.2 Box Model

```text
width
height
min-width
max-width
min-height
max-height

margin-top
margin-right
margin-bottom
margin-left

padding-top
padding-right
padding-bottom
padding-left
```

---

## 8.3 Background

```text
background
background-color
background-image
background-size
background-position
background-repeat
```

---

## 8.4 Border

```text
border
border-width
border-style
border-color
border-radius
```

---

## 8.5 Layout

```text
display
visibility
opacity
overflow
```

---

## 8.6 Position

```text
position
top
right
bottom
left
z-index
```

---

## 8.7 Flex

```text
flex
flex-direction
justify-content
align-items
align-self
gap
```

---

# 9. 高频 CSS 数据结构

不要直接保存整个 `style` 对象。

推荐：

```json
{
  "styles": {
    "fontSize": "16px",
    "fontWeight": "500",
    "color": "#333333",
    "backgroundColor": "#1677ff",
    "borderRadius": "8px",
    "padding": "8px 16px"
  }
}
```

Runtime 将 camelCase 转换为 kebab-case：

```text
fontSize
↓
font-size

backgroundColor
↓
background-color

borderRadius
↓
border-radius
```

---

# 10. Custom CSS

V1 必须支持开发人员直接编写 CSS。

使用 CodeMirror。

示例：

```css
.exam-button {
  transition: all 0.2s ease;
}

.exam-button:hover {
  transform: translateY(-2px);
}

.exam-button::before {
  content: '';
}
```

---

# 11. Custom CSS 的重要设计

Custom CSS 是 Rule 的一部分。

例如：

```json
{
  "selector": ".exam-button",
  "customCss": ".exam-button:hover { transform: translateY(-2px); }"
}
```

但是为了避免 Selector 语义不清，推荐 V1 的 Custom CSS 直接作为全局 CSS 注入。

也就是说：

```css
.exam-button:hover {
  transform: translateY(-2px);
}
```

由开发人员自己负责 Selector。

不要在 Runtime 中自动修改 Custom CSS。

---

# 12. Tailwind CSS 支持

V1 支持：

```text
Add Class
Remove Class
```

配置：

```json
{
  "classes": {
    "add": [
      "rounded-xl",
      "font-medium",
      "shadow-sm"
    ],
    "remove": [
      "rounded-md"
    ]
  }
}
```

Runtime：

```js
element.classList.remove("rounded-md");

element.classList.add(
  "rounded-xl",
  "font-medium",
  "shadow-sm"
);
```

---

# 13. Tailwind Class 编辑器

提供：

```text
Tailwind CSS

[ 搜索 Class ]

已添加：

rounded-xl       ×
font-medium      ×
shadow-sm        ×
```

支持搜索：

```text
圆角
字体
颜色
背景
间距
阴影
```

---

# 14. Tailwind V1 的重要限制

Tailwind Class 只有在对应 CSS 已存在于页面 CSS 中时才能真正产生样式。

例如：

```html
class="rounded-xl"
```

前提是页面已有：

```css
.rounded-xl {
  ...
}
```

因此插件应该检测目标 Class 对应的 CSS 是否存在。

如果无法检测到：

```text
⚠ 页面中没有检测到 rounded-xl 对应的 CSS。

可能原因：
Tailwind 构建产物没有包含该 Utility。
```

允许：

```text
[仍然添加]
```

---

# 15. Tailwind Class 与 CSS 的关系

V1 不负责重新运行 Tailwind JIT。

不做：

```text
浏览器
 ↓
实时运行 Tailwind
```

也不要求：

```text
重新 build Tailwind
```

因此 V1 的 Tailwind 定位是：

> 直接复用 SaaS 生产环境已经存在的 Tailwind Utility。

如果生产环境不存在某个 Utility，后续可以增加：

```text
Tailwind Class → CSS
```

转换能力。

该能力不作为 V1 必须项。

---

# 16. UI Config 数据结构

推荐 V1 Schema：

```json
{
  "version": 1,
  "customerId": "customer-001",
  "site": {
    "host": "exam.example.com"
  },
  "rules": [
    {
      "id": "rule-001",
      "scope": {
        "path": "/exam"
      },
      "selector": ".exam-page .start-button",
      "styles": {
        "fontSize": "16px",
        "color": "#ffffff",
        "backgroundColor": "#ff6600",
        "borderRadius": "8px"
      },
      "classes": {
        "add": [
          "font-medium",
          "shadow-sm"
        ],
        "remove": [
          "rounded-md"
        ]
      },
      "customCss": ".exam-page .start-button:hover { transform: translateY(-1px); }",
      "enabled": true
    }
  ]
}
```

---

# 17. Rule 字段定义

## id

唯一 Rule ID。

例如：

```text
rule-001
```

---

## scope

控制规则在哪些 URL 生效。

V1 支持：

```json
{
  "path": "/exam"
}
```

建议支持：

```text
/exam
/exam/*
```

匹配当前：

```js
location.pathname
```

---

## selector

CSS Selector。

例如：

```text
.exam-page .start-button
```

---

## styles

可视化 CSS。

---

## classes.add

需要增加的 Tailwind Class。

---

## classes.remove

需要删除的 Class。

---

## customCss

开发人员手写 CSS。

---

## enabled

允许临时禁用 Rule。

---

# 18. Runtime 加载方式

V1 不开发复杂 SDK。

SaaS 页面只需要：

```html
<script
  src="https://cdn.example.com/ui-override/runtime.js"
  data-customer-id="customer-001"
  data-config-url="https://cdn.example.com/ui-config/customer-001.json"
></script>
```

Runtime 自动读取：

```js
const script = document.currentScript;

const customerId =
  script.dataset.customerId;

const configUrl =
  script.dataset.configUrl;
```

---

# 19. Runtime 初始化流程

```text
runtime.js
    ↓
读取 script data 属性
    ↓
获取 config.json
    ↓
解析 JSON
    ↓
验证 version
    ↓
遍历 rules
    ↓
检查 enabled
    ↓
检查 path scope
    ↓
查找 selector
    ↓
应用 styles
    ↓
应用 classes
    ↓
注入 customCss
```

---

# 20. CSS Override 实现

Runtime 创建：

```html
<style id="saas-ui-override">
```

将 styles 转换成：

```css
.exam-page .start-button {
  font-size: 16px !important;
  color: #ffffff !important;
  background-color: #ff6600 !important;
  border-radius: 8px !important;
}
```

插入：

```js
document.head.appendChild(styleElement);
```

---

# 21. 为什么默认使用 !important

SaaS 项目原本可能存在：

```css
.exam-button {
  background: blue;
}
```

或者：

```css
.el-button.el-button--primary {
  background: blue;
}
```

UI Override 的目的就是：

> 明确覆盖原来的样式。

因此 V1 的可视化 styles 默认使用：

```css
!important
```

Custom CSS 不强制添加 `!important`。

开发人员可以自行决定。

---

# 22. Runtime 必须支持动态 DOM

Vue / React 页面可能存在：

```text
首次加载
↓
DOM 尚未出现
↓
异步请求
↓
组件渲染
↓
目标元素出现
```

因此不能只执行：

```js
document.querySelector(selector)
```

一次。

V1 Runtime 使用：

```js
MutationObserver
```

监听 DOM 变化。

流程：

```text
初始化
 ↓
立即应用 Rule
 ↓
监听 DOM
 ↓
发现目标元素出现
 ↓
重新应用 Rule
```

---

# 23. 避免 MutationObserver 无限循环

Runtime 自己注入：

```html
<style>
```

或者修改：

```html
class
```

可能触发 MutationObserver。

因此需要：

```text
防重复应用
```

和：

```text
Rule Applied State
```

避免：

```text
修改 DOM
 ↓
MutationObserver
 ↓
修改 DOM
 ↓
MutationObserver
 ↓
无限循环
```

---

# 24. 多元素匹配

一个 Selector 可能匹配多个元素。

V1 默认：

> 对所有匹配元素应用 Rule。

例如：

```css
.exam-button
```

匹配：

```text
3 个元素
```

则全部应用。

插件保存前提示：

```text
⚠ 当前 Selector 匹配 3 个元素。
保存后将同时修改这 3 个元素。
```

---

# 25. 图片修改

V1 可以支持两种方式。

## 方式一：CSS Background Image

通过：

```css
background-image
```

修改。

## 方式二：img src

如果选择的是：

```html
<img>
```

可以配置：

```json
{
  "attributes": {
    "src": "https://cdn.example.com/logo.png"
  }
}
```

虽然 V1 的核心是 CSS Override，但图片替换属于高频 SaaS 定制需求，建议保留这一扩展字段。

Runtime：

```js
element.setAttribute("src", value);
```

---

# 26. 建议的数据结构进一步统一

完整 Rule：

```json
{
  "id": "rule-001",

  "selector": ".exam-page .logo",

  "scope": {
    "path": "/exam"
  },

  "styles": {},

  "classes": {
    "add": [],
    "remove": []
  },

  "attributes": {},

  "customCss": "",

  "enabled": true
}
```

这样未来扩展：

```text
styles
classes
attributes
customCss
```

不会破坏 Schema。

---

# 27. 本地编辑状态

插件必须支持 Local Storage。

例如：

```text
Chrome Storage
    ↓
draft config
```

开发人员修改后：

```text
实时预览
```

但是不一定立即上传服务器。

状态：

```text
Draft
Saved
Exported
```

V1 可以简单实现：

```text
保存
导出 JSON
导入 JSON
```

---

# 28. Undo / Redo

V1 建议支持简单 Undo。

例如：

```text
14px
 ↓
16px
 ↓
18px
```

点击：

```text
Undo
```

恢复：

```text
16px
```

不需要做复杂历史版本管理。

可以使用：

```text
history stack
```

实现。

---

# 29. 插件页面结构

推荐 Side Panel：

```text
UI Override
│
├── Toolbar
│   ├── 选择元素
│   ├── Undo
│   ├── Redo
│   └── 保存
│
├── Selected Element
│   ├── Tag
│   ├── Selector
│   └── Match Count
│
├── Styles
│   ├── Typography
│   ├── Box
│   ├── Background
│   ├── Border
│   ├── Layout
│   └── Position
│
├── Tailwind
│   ├── Search
│   ├── Added
│   └── Removed
│
├── Custom CSS
│   └── CodeMirror
│
└── Rule Actions
    ├── Reset
    ├── Disable
    └── Save
```

---

# 30. 插件项目结构

推荐：

```text
ui-override/
│
├── extension/
│   ├── src/
│   │   ├── background/
│   │   │   └── index.ts
│   │   │
│   │   ├── content/
│   │   │   ├── index.ts
│   │   │   ├── element-picker.ts
│   │   │   ├── selector-generator.ts
│   │   │   ├── preview-applier.ts
│   │   │   └── dom-utils.ts
│   │   │
│   │   ├── sidepanel/
│   │   │   ├── App.vue
│   │   │   ├── components/
│   │   │   │   ├── Toolbar.vue
│   │   │   │   ├── ElementInfo.vue
│   │   │   │   ├── StyleEditor.vue
│   │   │   │   ├── TailwindEditor.vue
│   │   │   │   ├── CustomCssEditor.vue
│   │   │   │   └── RuleEditor.vue
│   │   │   │
│   │   │   ├── stores/
│   │   │   │   └── config.ts
│   │   │   │
│   │   │   └── main.ts
│   │   │
│   │   ├── shared/
│   │   │   ├── types/
│   │   │   │   └── config.ts
│   │   │   ├── css/
│   │   │   │   ├── css-parser.ts
│   │   │   │   └── style-builder.ts
│   │   │   └── utils/
│   │   │
│   │   └── manifest.json
│   │
│   └── package.json
│
├── runtime/
│   ├── src/
│   │   ├── index.ts
│   │   ├── config-loader.ts
│   │   ├── rule-engine.ts
│   │   ├── css-injector.ts
│   │   ├── class-applier.ts
│   │   ├── attribute-applier.ts
│   │   ├── scope-matcher.ts
│   │   └── dom-observer.ts
│   │
│   └── package.json
│
├── schema/
│   └── ui-config.schema.json
│
└── README.md
```

---

# 31. Runtime 模块职责

## config-loader

负责：

```text
加载 JSON
解析 JSON
校验 JSON
```

---

## rule-engine

负责：

```text
Rule 遍历
enabled 判断
scope 判断
selector 匹配
```

---

## css-injector

负责：

```text
styles → CSS
customCss → CSS
<style> 注入
```

---

## class-applier

负责：

```text
classes.add
classes.remove
```

---

## attribute-applier

负责：

```text
src
href
alt
```

等属性覆盖。

---

## dom-observer

负责：

```text
MutationObserver
动态 DOM
重新应用规则
```

---

# 32. Runtime API

虽然 V1 不做 SDK，但 Runtime 内部仍然应该保持模块化。

内部 API：

```ts
interface UIOverrideRuntime {
  init(): Promise<void>;

  loadConfig(url: string): Promise<UIConfig>;

  applyConfig(config: UIConfig): void;

  applyRule(rule: UIRule): void;

  removeRule(ruleId: string): void;

  destroy(): void;
}
```

注意：

> 这些是 Runtime 内部 API，不代表需要提供 npm SDK。

---

# 33. JSON Schema

必须为配置文件建立：

```text
schema/ui-config.schema.json
```

用途：

- IDE 自动提示
- AI 生成配置
- 插件校验
- Runtime 校验
- 后端校验
- 防止配置格式混乱

---

# 34. V1 配置示例

```json
{
  "version": 1,
  "customerId": "customer-001",
  "site": {
    "host": "exam.example.com"
  },
  "rules": [
    {
      "id": "rule-start-button",
      "scope": {
        "path": "/exam"
      },
      "selector": ".exam-page .start-button",
      "styles": {
        "fontSize": "16px",
        "backgroundColor": "#ff6600",
        "borderRadius": "8px"
      },
      "classes": {
        "add": [
          "font-medium"
        ],
        "remove": [
          "rounded-md"
        ]
      },
      "customCss": ".exam-page .start-button:hover { transform: translateY(-2px); }",
      "enabled": true
    }
  ]
}
```

---

# 35. SaaS 接入方式

只需要：

```html
<script
  src="https://cdn.example.com/ui-override/runtime.js"
  data-customer-id="customer-001"
  data-config-url="https://cdn.example.com/ui-config/customer-001.json"
></script>
```

推荐将 Script 放在：

```html
<body>
```

结束前，或者由 SaaS 基础模板统一引入。

如果需要尽可能早地应用样式，也可以放在：

```html
<head>
```

---

# 36. 配置文件部署

V1 不需要数据库。

可以直接：

```text
CDN
│
└── ui-config/
    ├── customer-001.json
    ├── customer-002.json
    └── customer-003.json
```

或者：

```text
Nginx
│
└── /ui-config/
```

例如：

```text
https://cdn.example.com/ui-config/customer-001.json
```

---

# 37. 配置更新流程

```text
开发人员
 ↓
Browser Extension
 ↓
修改
 ↓
保存
 ↓
导出 JSON
 ↓
上传 customer-001.json
 ↓
CDN / Nginx
 ↓
客户 SaaS
 ↓
刷新页面
 ↓
新 UI 生效
```

整个过程：

```text
不需要：
❌ 修改 Vue
❌ 修改 SCSS
❌ npm run build
❌ 构建 dist
❌ 发布前端
```

---

# 38. 缓存处理

V1 使用配置版本。

例如：

```json
{
  "version": 12
}
```

Script URL 可以：

```text
/ui-config/customer-001.json?v=12
```

或者 Runtime 请求时：

```text
/ui-config/customer-001.json?version=12
```

未来可以接入：

```text
ETag
Cache-Control
CDN
```

---

# 39. 错误处理

Runtime 不能因为 UI Config 出错而影响 SaaS 正常运行。

必须：

```text
try {
  load config
} catch {
  console.error(...)
}
```

原则：

> UI Override 失败 ≠ SaaS 失败。

例如 JSON 损坏：

```text
Runtime 报错
↓
忽略 UI Override
↓
SaaS 正常运行
```

---

# 40. Selector 失效处理

V1 不解决 data-ui-id，但必须能够检测：

```text
selector 匹配 0 个元素
```

插件显示：

```text
⚠ 当前 Selector 未匹配到元素
```

Runtime 可以在 development/debug 模式输出：

```text
[UI Override]
Rule rule-001
selector ".exam-page .start-button"
matched 0 elements
```

生产环境不建议大量 console 输出。

---

# 41. CSS 安全限制

由于 Custom CSS 最终会注入页面，必须明确：

> UI Config 是内部开发人员配置，不是普通客户输入。

如果未来允许客户自己提交 Custom CSS，必须增加：

```text
CSS 白名单
CSS Sanitization
权限控制
```

V1 默认只允许内部开发人员使用插件。

---

# 42. 权限模型

V1 可以非常简单：

```text
开发人员
    ↓
浏览器插件
    ↓
生成配置
```

不允许普通终端客户直接修改配置。

---

# 43. V1 不做服务器 API 的原因

第一版优先验证：

> 这个工具到底能不能显著减少 SaaS UI 定制工作量。

所以：

```text
Browser Extension
+
JSON
+
Static Hosting
+
Runtime
```

已经足够。

不要一开始就加入：

```text
Spring Boot
MySQL
Redis
权限系统
配置管理后台
审批
版本
发布
```

这些都可以在 V2 做。

---

# 44. V1 开发阶段

## Phase 1：Extension 基础

目标：

```text
插件能够选择页面元素
```

完成：

- Manifest V3
- Content Script
- Side Panel
- Element Picker
- Hover Highlight
- Selector Generator
- Selector Match Count

验收：

```text
打开任意 SaaS 页面
→ 点击选择元素
→ 点击按钮
→ 正确显示 Selector
```

---

## Phase 2：实时 CSS

完成：

- Style Editor
- CSS 属性编辑
- Preview
- Reset
- Undo
- Redo

验收：

```text
选择按钮
→ 修改 font-size
→ 页面立即变化
→ 修改 background
→ 页面立即变化
→ Reset
→ 恢复原页面
```

---

## Phase 3：Custom CSS

完成：

- CodeMirror
- CSS syntax highlight
- 实时注入
- 保存
- 清除

验收：

```css
.button:hover {
  transform: translateY(-2px);
}
```

能够实时看到效果。

---

## Phase 4：Tailwind

完成：

- Add Class
- Remove Class
- Search
- Class List
- Conflict Warning

验收：

```text
选择元素
→ 添加 rounded-xl
→ 页面立即变化
→ 删除 rounded-md
→ 页面立即变化
```

---

## Phase 5：Config

完成：

- UI Config Schema
- Rule
- Local Storage
- Import
- Export
- JSON 校验

验收：

```text
修改页面
→ 保存
→ 导出 JSON
→ 清空页面修改
→ 导入 JSON
→ 页面恢复修改
```

---

## Phase 6：Runtime

完成：

- runtime.js
- Config Loader
- Rule Engine
- CSS Injector
- Class Applier
- MutationObserver
- Scope Matcher

验收：

```text
SaaS 页面
+
script 标签
+
JSON

刷新页面
→ 自动加载配置
→ 自动应用 CSS
→ 自动添加 Tailwind Class
```

---

## Phase 7：真实项目验证

选择一个真实 SaaS 项目。

准备：

```text
10~20 个真实客户 UI 修改需求
```

例如：

```text
Logo
字体
按钮颜色
按钮圆角
Banner
间距
隐藏模块
表格字体
侧边栏宽度
页面标题
```

对比：

```text
传统方式：
修改代码 → build → deploy

UI Override：
插件修改 → 保存 JSON
```

记录：

```text
平均修改时间
配置失败率
Selector 失效率
客户验证次数
```

---

# 45. V1 验收标准

必须满足：

### A. 不修改源代码

```text
UI 定制过程中不修改 Vue / CSS 源代码。
```

### B. 不重新构建

```text
配置更新后不需要 npm build。
```

### C. 实时预览

```text
插件修改后页面立即变化。
```

### D. 可持久化

```text
配置可以导出 JSON。
```

### E. Runtime

```text
script + JSON 可以恢复 UI 修改。
```

### F. Tailwind

```text
可以添加和删除 Tailwind Class。
```

### G. Custom CSS

```text
开发人员可以直接编写 CSS。
```

### H. 安全失败

```text
配置错误不能影响 SaaS 正常运行。
```

---

# 46. V1 明确不解决的问题

以下问题全部放到后续版本：

```text
data-ui-id
CSS Token
Theme Token
配置后台
数据库
版本管理
回滚
审批
多人协作
权限系统
自动发布
CDN 管理
AI 自动生成 CSS
Figma
拖拽布局
响应式可视化编辑
```

---

# 47. V2 可以发展的方向

当 V1 验证成功后，可以增加：

```text
V2
│
├── 配置服务器
├── 管理后台
├── 客户配置
├── 草稿 / 发布
├── 版本管理
├── 回滚
├── 配置 Diff
└── 配置失效检测
```

然后：

```text
V3
│
├── data-ui-id
├── CSS Token
├── Theme
├── Design System
└── 可视化 UI Builder
```

---

# 48. AI 开发要求

本项目应该采用模块化、可迭代开发。

AI 编码工具必须：

1. 先理解现有代码结构。
2. 不擅自扩大 V1 范围。
3. 不引入 data-ui-id。
4. 不引入 CSS Token。
5. 不创建复杂 SDK。
6. SaaS 端只使用 script + JSON。
7. Extension 与 Runtime 解耦。
8. 所有核心类型定义统一维护。
9. UI Config Schema 必须作为单一数据契约。
10. Runtime 必须保证失败不影响宿主 SaaS。
11. 不修改用户 SaaS 源代码。
12. 不使用 `!important` 覆盖 Custom CSS，只有可视化 styles 默认使用 `!important`。
13. Tailwind Class 只负责 add/remove，不负责运行 Tailwind 编译器。
14. 所有 DOM 操作必须考虑动态渲染。
15. Selector 必须检测匹配数量。
16. 不使用脆弱的硬编码 DOM 路径作为默认方案。

---

# 49. AI 开发顺序

AI 不应该一次性生成整个项目。

严格按照：

```text
1. 初始化 Extension
2. 实现 Element Picker
3. 实现 Selector Generator
4. 实现 Style Editor
5. 实现 Preview Engine
6. 实现 Custom CSS
7. 实现 Tailwind Class
8. 定义 Config Schema
9. 实现 Import / Export
10. 初始化 Runtime
11. 实现 Config Loader
12. 实现 Rule Engine
13. 实现 CSS Injector
14. 实现 Class Applier
15. 实现 MutationObserver
16. 实现 Scope Matcher
17. 真实 SaaS 验证
```

每个阶段完成后运行测试，再进入下一阶段。

---

# 50. 最终目标

V1 最终形成：

```text
                   SaaS UI Override V1

┌─────────────────────────────────────────┐
│            Browser Extension            │
│                                         │
│  🎯 Element Picker                      │
│          ↓                              │
│  CSS Selector                           │
│          ↓                              │
│  ┌────────────┬────────────┬──────────┐ │
│  │ CSS Editor │  Tailwind  │ Custom   │ │
│  │            │  Classes   │ CSS      │ │
│  └────────────┴────────────┴──────────┘ │
│          ↓                              │
│       UI Config JSON                    │
└────────────────────┬────────────────────┘
                     │
                     ↓
              Static JSON File
                     │
                     ↓
┌─────────────────────────────────────────┐
│                SaaS                     │
│                                         │
│ <script src="runtime.js">               │
│          ↓                              │
│     Config Loader                       │
│          ↓                              │
│     Rule Engine                         │
│          ↓                              │
│   ┌────────┴─────────┐                  │
│   ↓                  ↓                  │
│ CSS Injector     Class Applier          │
│   ↓                  ↓                  │
│         Final UI                        │
└─────────────────────────────────────────┘
```

## 核心价值

```text
传统 SaaS UI 定制：

需求
 ↓
找代码
 ↓
修改 CSS
 ↓
Build
 ↓
Deploy
 ↓
客户验证
 ↓
再次修改
 ↓
再次 Build
 ↓
再次 Deploy


UI Override：

需求
 ↓
选择元素
 ↓
修改 CSS / Tailwind / Custom CSS
 ↓
实时预览
 ↓
保存 JSON
 ↓
Runtime 自动加载
 ↓
完成
```

最终 V1 要证明的不是“能不能改 CSS”，而是：

> **能否把 SaaS 中大量低复杂度、高频率的 UI 定制从“代码发布流程”中剥离出来，变成独立的运行时配置。**
