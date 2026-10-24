# dsh-long-term-memory · 长时记忆

> **在 DeepSeek Harness 的设置里放一个输入框。填一次，之后每一个新会话、每一个工作区、每一次重启，它都在系统提示词里。**

一个给 [DeepSeek Harness（DSH）](https://github.com/deepseek-ai) 用的双半插件（host + browser），补上 DSH 原生的一个缺口：**跨会话的长期偏好没有地方填**。

`~/.dsh/AGENTS.md` 管的是「指令与规则」，改它要动文件、要懂目录；这个插件把同一件事搬进 **设置页 → 长时记忆**，一个文本框、一次保存。

[English](README.en.md)

---

## 它解决什么

| 场景 | 没有它 | 有它 |
|---|---|---|
| 每次都想让 agent 用简体中文、别开场客套 | 每个新会话重说一遍 | 填一次，永久生效 |
| 常用目录、构建命令、代码风格约定 | 写进每个仓库的 `AGENTS.md`，一个仓库一份 | 一处填写，全局生效 |
| 想让 agent 记住「先给可回滚命令」这类硬规矩 | 忘了就忘 | 系统提示词里常驻 |
| 临时换一套偏好做实验 | 改文件、还要记得改回来 | 设置页改完点保存，随时清空 |

## 界面

设置侧栏多出一栏「长时记忆」（Long-term memory）：

```
┌─────────────────────────────────────────────┐
│ 长时记忆                                     │
│ 这里填写的内容会作为系统提示词的一部分注入到   │
│ 之后每一个新会话（跨工作区、跨重启）…          │
│ ┌─────────────────────────────────────────┐ │
│ │ 在每次新开一个项目时，先在该工作区内新建   │ │
│ │ 一个关于这个项目的文件夹…                  │ │
│ └─────────────────────────────────────────┘ │
│ [保存]  [撤销修改]        有未保存的修改       │
└─────────────────────────────────────────────┘
```

保存后状态行变为「当前内容已生效」——`text` 字段是 **volatile** 的，host 侧立刻重算系统提示词，**不需要重启**；下一个新会话就带着它。

## 安装

### 方式 A：DSH 商场（推荐，若已收录）

在 Harness 里打开 **设置 → 插件市场**，搜索 `long-term memory` 或 `dsh-long-term-memory`，一键安装。

### 方式 B：从 GitHub 手动挂载

```bash
# 1. 放到插件目录
git clone https://github.com/Yang-Yin734/dsh-long-term-memory.git \
  ~/.dsh/plugins/dsh-long-term-memory

# 2. 让 profile 能解析到它（实体复制，不要用符号链接）
cp -r ~/.dsh/plugins/dsh-long-term-memory \
      ~/.dsh/profiles/desktop/node_modules/dsh-long-term-memory
```

3. 在 `~/.dsh/profiles/desktop/package.json` 的 `dependencies` 里加一行：

```json
"dsh-long-term-memory": "file:C:/Users/<you>/.dsh/plugins/dsh-long-term-memory"
```

4. 在 `~/.dsh/profiles/desktop/cordis.patch.yml` 末尾加：

```yaml
- insert:
    - id: long-term-memory
      name: 'dsh-long-term-memory'
      config:
        text: ''
```

5. **重启 Harness**。host 不 watch 这个 patch 文件，新增插件行必须重启才生效。

### 方式 C：`plugin_manager` 工具

若你的 DSH 版本带 `plugin_manager`，直接用 `action: install_bundle`、`target` 指向包目录即可，返回 `application: applied` 表示已 live。

## 配置

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `text` | `string`（volatile，textarea） | `""` | 要注入的正文。空字符串表示**不注入任何内容**（不是注入空标题） |

保存会写回 profile 的 `cordis.patch.yml`（`insert` 建条目 + 顶层同 id 覆盖行，属合法层叠）。值随之持久化，重启后仍在。

## 工作原理

**host 半（`lib/index.js`）**

```js
ctx.systemPrompt.section({
  name: 'long-term-memory:user-text',
  order: 10250,          // 紧随一方 persona 后缀（10200）之后
  interpolate: false,    // 用户文本里的 {{…}} 保持字面，不参与插值
  text: () => body === '' ? '' : `${HEADER}\n\n${body}`,
})
```

三个要点：

1. **`interpolate: false`** —— 用户可能写 `{{...}}`，若参与插值，未解析的引用会让整个提示词组装抛错，把会话直接打挂。
2. **`order: 10250`** —— 排在一方部署 persona（`10200`）之后，保证只改长时记忆时，前面那一大段前缀字节不变（prompt cache 友好）。
3. **空则返回 `''`** —— DSH 的 `renderPrompt` 会 `filter(t => t.length > 0)`，空段不会留下空标题噪音。

**browser 半（`client.js`）**

- 从 `slots` / `locale` / `configForms` 三个服务取能力；
- `configForms.whileServed(['long-term-memory'], …)` —— host 真的服务这个条目时才挂 UI，没装 host 半就什么也不显示；
- 向 `settings.section` 槽注册一个分区（`id: 'long-term-memory'`, `order: 60`）；
- 表单是 `SettingsFormModel` + 一个 `settingsTextField('text')`，`inject()` 返回 `{ hooks: { longMemory: store }, edit, save, discard, resetField }`，框架把 `hooks.longMemory` 转成组件里的 `props.useLongMemory`。

## 兼容性

| 项目 | 要求 |
|---|---|
| DSH | 0.2.x（桌面版 / web 版；依赖 `settings.section` 槽、`configForms`、volatile 配置） |
| cordis | `^4.0.1` |
| Node | ≥ 18（仅用于包管理，插件本身跑在 DSH 里） |
| 平台 | 所有 DSH 支持的平台（纯 JS，无原生依赖） |

## 已知限制

- **改了 CSS 或 client 代码要整页刷新**（Ctrl+R），host 侧代码改动要重启 Harness。
- 文本是**明文**存在 profile 的 `cordis.patch.yml` 里 —— 别往里写密码、token、私钥。
- 只注入**系统提示词**，不做检索、不占 token 预算管理；请自行控制长度（建议 < 2 KB）。
- 不要和别的「往系统提示词里塞内容」的插件同时使用 —— 两边都会注入，容易重复。

## 开发

```
.
├── client.js            # browser 半：设置页分区
├── lib/index.js         # host 半：systemPrompt 段 + Config
├── cordis.patch.yml     # bundle patch：向组合树插入插件条目
├── package.json         # dsh.bundle.patch / dsh.client 声明
└── LICENSE
```

自检（不需要装进 DSH）：

```bash
node --check client.js
node --check lib/index.js
# 校验 Config 与 section 注册
node -e "import('./lib/index.js').then(m => console.log(m.name, m.inject, Object.keys(m.Config ? {} : {})))"
```

## 踩过的坑（写在这里，省你一次调试）

1. **别把前景色变量当背景色。** 第一版主按钮写了 `background: var(--dsw-alias-label-primary); color: var(--dsw-alias-bg-l1, #fff)` —— `--dsw-alias-bg-l1` 不存在，`var()` 静默回退成白色，深色主题下直接白底白字，按钮看起来「是空白的」。
2. **`edit` 工具改 `cordis.patch.yml` 前必须先读**，否则报 `file has not been read`；用 PowerShell here-string 写中文会变 `闀挎椂璁板繂`（写文件请走 UTF-8 编辑器 / Node 脚本）。
3. **新增插件行不重启不生效。** host 不 watch patch 文件。
4. **profile 的 `node_modules/<pkg>` 必须是实体目录**，用 junction/符号链接会让 `import '@deepseek-ai/schemastery'` 解析失败。

## 隐私

仓库内**不含**任何账号、密码、API key、token、私钥或机器相关绝对路径。插件运行时也不发起任何网络请求。

## License

[MIT](LICENSE) © Yang-Yin734