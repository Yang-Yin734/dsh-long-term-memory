# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/).

## [0.1.0] — 2026-10-25

首个公开发布。

### Added
- **host 半**：注册一个 `systemPrompt` 段（`name: 'long-term-memory:user-text'`、`order: 10250`、`interpolate: false`），把用户在设置页填写的文本注入每个新会话的系统提示词；文本为空时不注入任何内容。
- **browser 半**：在设置侧栏注册「长时记忆 / Long-term memory」分区（`settings.section`，`order: 60`），16 行文本框 + 保存 / 撤销修改按钮 + 状态行（未保存 / 已生效 / 保存失败 / 后端未加载 / 只读）。
- `Config.text` 为 **volatile** 字段：保存后 host 立即重算系统提示词，无需重启 Harness。
- 内置中英双语字典（`settings.longMemory`），跟随 DSH 界面语言。
- `cordis.patch.yml` bundle patch：向组合树插入插件条目，安装时无需手写 profile 配置。
- 主题适配的 CSS（全部使用 DSH 设计变量，`dslm_` 前缀，单次注入不重复挂载样式表）。

### Fixed
- 主按钮初版把前景色变量（`--dsw-alias-label-primary`）当背景色用，且 `--dsw-alias-bg-l1` 变量并不存在、`var()` 静默回退为白色，深色主题下按钮呈白底白字（看起来是空白按钮）。改为 `background: 0 0` + `color: var(--dsw-alias-label-primary)`，hover 使用 `--dsw-alias-interactive-bg-hover`。

### Verified
- `node --check` 通过；volatile 引用、`meta.volatile`、`role: 'textarea'`、section 名称 / 顺序 / `interpolate` 均按预期注册。
- 端到端：设置页输入 → 保存 → 写回 profile `cordis.patch.yml` → 新建独立会话读到该段落原文（跨工作区、跨重启）。