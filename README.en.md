# dsh-long-term-memory

> **One input box in DeepSeek Harness settings. Type it once — and every new session, in every workspace, after every restart, carries it in its system prompt.**

A two-half plugin (host + browser) for [DeepSeek Harness (DSH)](https://github.com/deepseek-ai), filling a gap DSH leaves open: **there is no place to put long-lived preferences that survive a session.**

`~/.dsh/AGENTS.md` handles rules and instructions — but editing it means touching files and knowing the layout. This plugin puts the same capability behind **Settings → Long-term memory**: one textarea, one save.

[中文](README.md)

---

## What it solves

| Situation | Without it | With it |
|---|---|---|
| Always answer in Simplified Chinese, skip the pleasantries | Re-state it in every new session | Type once, it sticks |
| Common directories, build commands, code conventions | One `AGENTS.md` per repository | One box, global effect |
| Hard rules like "give me a rollback command first" | Forgotten when it matters | Resident in the system prompt |
| Swap in a different preference set temporarily | Edit files, remember to revert | Edit in settings, clear when done |

## The UI

The settings sidebar gains a **Long-term memory** section: a 16-row textarea bound to this plugin's `text` config field, plus **Save** / **Discard**, and a status line (`Unsaved changes` → `In effect`).

The field is **volatile**: saving makes the host recompute the system prompt immediately — **no restart**. The next new session already carries it.

## Install

### A — DSH Mall (recommended, if listed)

Open **Settings → Plugin Market** inside Harness, search `long-term memory` or `dsh-long-term-memory`, install in one click.

### B — Manual mount from GitHub

```bash
# 1. clone into the plugins directory
git clone https://github.com/Yang-Yin734/dsh-long-term-memory.git \
  ~/.dsh/plugins/dsh-long-term-memory

# 2. make it resolvable from the profile (real copy, never a symlink)
cp -r ~/.dsh/plugins/dsh-long-term-memory \
      ~/.dsh/profiles/desktop/node_modules/dsh-long-term-memory
```

3. Add a dependency in `~/.dsh/profiles/desktop/package.json`:

```json
"dsh-long-term-memory": "file:C:/Users/<you>/.dsh/plugins/dsh-long-term-memory"
```

4. Append to `~/.dsh/profiles/desktop/cordis.patch.yml`:

```yaml
- insert:
    - id: long-term-memory
      name: 'dsh-long-term-memory'
      config:
        text: ''
```

5. **Restart Harness.** The host does not watch that patch file; a new plugin entry only loads on restart.

### C — `plugin_manager`

If your DSH build ships `plugin_manager`, call `action: install_bundle` with `target` set to the package directory. `application: applied` means it is live.

## Configuration

| Field | Type | Default | Meaning |
|---|---|---|---|
| `text` | `string` (volatile, textarea) | `""` | The body to inject. An empty string injects **nothing at all** — not an empty header |

Saving writes back to the profile's `cordis.patch.yml` (an `insert` entry plus a top-level same-id override — legitimate layering). The value persists across restarts.

## How it works

**Host half (`lib/index.js`)**

```js
ctx.systemPrompt.section({
  name: 'long-term-memory:user-text',
  order: 10250,          // right after the first-party persona suffix (10200)
  interpolate: false,    // user text keeps {{…}} literal
  text: () => body === '' ? '' : `${HEADER}\n\n${body}`,
})
```

- `interpolate: false` — a user who types `{{...}}` would otherwise break prompt assembly for the whole session.
- `order: 10250` — sits after the deployment persona suffix, so changing only the memory leaves the preceding prefix byte-identical (prompt-cache friendly).
- Empty body returns `''`, and DSH's `renderPrompt` filters zero-length sections, so no stray heading is left behind.

**Browser half (`client.js`)**

- injects `slots`, `locale`, `configForms`;
- mounts only while the host actually serves the entry (`configForms.whileServed(['long-term-memory'], …)`);
- registers a `settings.section` (`id: 'long-term-memory'`, `order: 60`);
- the form is `SettingsFormModel` + one `settingsTextField('text')`; `inject()` returns `{ hooks: { longMemory: store }, edit, save, discard, resetField }` and the framework exposes `hooks.longMemory` as `props.useLongMemory`.

## Compatibility

| | Requirement |
|---|---|
| DSH | 0.2.x (desktop or web; needs the `settings.section` slot, `configForms`, volatile config) |
| cordis | `^4.0.1` |
| Node | ≥ 18 (package management only) |
| Platform | Any DSH target — plain JS, no native dependencies |

## Limitations

- CSS / client changes need a **full page reload** (Ctrl+R); host changes need a Harness restart.
- The text is stored **in plaintext** in the profile's `cordis.patch.yml` — do not put passwords, tokens, or keys in it.
- It only injects into the system prompt: no retrieval, no token budgeting. Keep it under ~2 KB.
- Do not run it alongside another plugin that appends to the system prompt — both will inject.

## Development

```
.
├── client.js            # browser half: the settings section
├── lib/index.js         # host half: systemPrompt section + Config
├── cordis.patch.yml     # bundle patch: inserts the plugin entry
├── package.json         # dsh.bundle.patch / dsh.client declaration
└── LICENSE
```

```bash
node --check client.js
node --check lib/index.js
```

## Pitfalls (so you don't have to)

1. **Never use a foreground color variable as a background.** The first version had `background: var(--dsw-alias-label-primary); color: var(--dsw-alias-bg-l1, #fff)` — the second variable does not exist, `var()` silently fell back to white, and in dark themes the button read as *blank*.
2. **`cordis.patch.yml` is not hot-reloaded.** A new plugin entry needs a restart.
3. **`node_modules/<pkg>` in the profile must be a real directory**; a junction/symlink breaks `import '@deepseek-ai/schemastery'` resolution.
4. **Read the file before editing it** with the `edit` tool, and write UTF-8 with a real editor or a Node script — PowerShell here-strings mangle CJK into mojibake.

## Privacy

This repository contains **no** accounts, passwords, API keys, tokens, private keys, or machine-specific absolute paths. The plugin makes no network requests at runtime.

## License

[MIT](LICENSE) © Yang-Yin734