/**
 * dsh-long-term-memory — browser half.
 *
 * Adds a "长时记忆" section to the settings page: one textarea bound to this
 * plugin's `text` config field (a volatile field, so the host applies the new
 * value without a restart), plus save / discard controls.
 */
window.__ModuleLoader__.load({
  id: 'dsh-long-term-memory',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const { jsx, jsxs } = require('react/jsx-runtime')
    const primitives = require('@deepseek-ai/dsh-client-ui-primitives')

    /** Dictionary namespace owned by this plugin. */
    const NS = 'settings.longMemory'
    /** Config field this page edits. */
    const FIELD = 'text'
    /** Profile entry id this page's config scope is addressed by. */
    const ENTRY_ID = 'long-term-memory'
    /** CSS tag identity, so two mounts do not stack stylesheets. */
    const CSS_TAG = 'dsh-long-term-memory/LongMemorySection.css'

    const zh = {
      nav: '长时记忆',
      title: '长时记忆',
      intro:
        '这里填写的内容会作为系统提示词的一部分注入到之后每一个新会话（跨工作区、跨重启），用来记住你的长期偏好与约定。留空表示不注入。',
      placeholder:
        '例如：\n- 我的名字是 YG，回复一律用简体中文，不要开场客套。\n- 常用工作目录是 D:\\work，前端构建用 pnpm build。\n- 涉及危险操作时先给出可回滚的命令，不要直接执行不可逆步骤。',
      save: '保存',
      saving: '保存中…',
      discard: '撤销修改',
      dirty: '有未保存的修改',
      saved: '当前内容已生效',
      saveFailed: '后端没有接受这次修改，内容已保留供你调整。',
      unavailable: '后端未加载长时记忆插件，暂时无法编辑。',
      readOnly: '本部署的设置为只读。',
    }

    const en = {
      nav: 'Long-term memory',
      title: 'Long-term memory',
      intro:
        'What you type here is injected into the system prompt of every new session, across workspaces and restarts, so long-lived preferences stick. Leave it empty to inject nothing.',
      placeholder:
        'For example:\n- My name is YG; always answer in Simplified Chinese.\n- The main project lives in D:\\work; build with pnpm build.',
      save: 'Save',
      saving: 'Saving…',
      discard: 'Discard',
      dirty: 'Unsaved changes',
      saved: 'In effect',
      saveFailed: 'The host did not accept these values; they were left for you to correct.',
      unavailable: 'The long-term-memory plugin is not loaded, so nothing can be edited here.',
      readOnly: 'This deployment stores settings read-only.',
    }

    const css = [
      '.dslm_section{max-width:760px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:10px;display:flex}',
      '.dslm_heading{margin:0;font-size:18px;font-weight:600}',
      '.dslm_intro{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px;line-height:1.6}',
      '.dslm_textarea{box-sizing:border-box;width:100%;min-height:260px;resize:vertical;padding:10px 12px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l2);background:0 0;color:inherit;font:inherit;font-size:13px;line-height:1.6}',
      '.dslm_textarea[disabled]{opacity:.6;cursor:not-allowed}',
      '.dslm_textarea:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}',
      '.dslm_row{align-items:center;gap:10px;display:flex;flex-wrap:wrap}',
      '.dslm_button{font:inherit;font-size:13px;font-weight:500;line-height:20px;padding:5px 14px;border-radius:6px;cursor:pointer;border:.5px solid var(--dsw-alias-border-l2);background:0 0;color:var(--dsw-alias-label-primary)}',
      '.dslm_button:hover:not([disabled]){background:var(--dsw-alias-interactive-bg-hover)}',
      '.dslm_ghost{color:var(--dsw-alias-label-tertiary)}',
      '.dslm_button[disabled]{opacity:.45;cursor:not-allowed}',
      '.dslm_status{color:var(--dsw-alias-label-tertiary);font-size:12px}',
      '.dslm_status[data-tone=error]{color:var(--dsw-alias-state-error-primary,#d33)}',
      '.dslm_status[data-tone=warn]{color:var(--dsw-alias-state-business-primary)}',
    ].join('')

    if (
      typeof document !== 'undefined' &&
      document.querySelector('style[data-plugin-css=' + JSON.stringify(CSS_TAG) + ']') === null
    ) {
      const tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-long-term-memory'
      tag.dataset.pluginCss = CSS_TAG
      tag.textContent = css
      document.head.appendChild(tag)
    }

    /**
     * The staged form over this plugin's own config scope: one text field, a
     * shell carrying availability / dirty / saving state, and the actions the
     * page calls.
     */
    class LongMemoryForm {
      /**
       * @param scope - the config-form scope bound to this plugin's profile entry.
       */
      constructor(scope) {
        this.form = new primitives.SettingsFormModel(scope, [primitives.settingsTextField(FIELD)])
        this.store = this.form.bind(() => this.state())
      }

      /** Snapshot the page renders from. */
      state() {
        return { ...this.form.shell(), text: this.form.field(FIELD) }
      }

      /** The face the slot registration injects into the component props. */
      inject() {
        return {
          hooks: { longMemory: this.store },
          edit: (text) => {
            this.form.actions().edit(FIELD, text)
          },
          resetField: () => {
            this.form.actions().resetField(FIELD)
          },
          discard: () => {
            this.form.actions().discard()
          },
          save: () => {
            this.form.save()
          },
        }
      }

      /** Release the form's subscriptions. */
      dispose() {
        this.form.dispose()
      }
    }

    /**
     * Render the long-term-memory page.
     * @param props - locale, snapshot, and form actions.
     */
    function LongMemorySection(props) {
      const { t } = props
      const state = props.useLongMemory((snapshot) => snapshot)
      const disabled = !state.writable || state.saving
      const value = state.text?.text ?? ''
      const tone = state.failed ? 'error' : state.dirty ? 'warn' : 'ok'
      const status = !state.available
        ? t('unavailable')
        : !state.writable
          ? t('readOnly')
          : state.failed
            ? t('saveFailed')
            : state.dirty
              ? t('dirty')
              : t('saved')
      return jsxs('div', {
        className: 'dslm_section',
        children: [
          jsx('h2', { className: 'dslm_heading', children: t('title') }),
          jsx('p', { className: 'dslm_intro', children: t('intro') }),
          jsx('textarea', {
            className: 'dslm_textarea',
            value,
            rows: 16,
            spellCheck: false,
            autoComplete: 'off',
            disabled,
            placeholder: t('placeholder'),
            'aria-label': t('title'),
            onChange: (event) => {
              props.edit(event.target.value)
            },
          }),
          jsxs('div', {
            className: 'dslm_row',
            children: [
              jsx('button', {
                type: 'button',
                className: 'dslm_button',
                disabled: disabled || !state.dirty,
                onClick: () => {
                  props.save()
                },
                children: state.saving ? t('saving') : t('save'),
              }),
              jsx('button', {
                type: 'button',
                className: 'dslm_button dslm_ghost',
                disabled: disabled || !state.dirty,
                onClick: () => {
                  props.discard()
                },
                children: t('discard'),
              }),
              jsx('span', { className: 'dslm_status', 'data-tone': tone, children: status }),
            ],
          }),
        ],
      })
    }

    /** Required services (cordis fiber inject). */
    const inject = ['slots', 'locale', 'configForms']

    /**
     * Mount the settings section while the host serves this entry's config.
     * @param ctx - the browser plugin context.
     */
    function apply(ctx) {
      const t = ctx.locale.bind(NS)
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-long-term-memory: dictionaries')
      ctx.effect(
        () =>
          ctx.configForms.whileServed([ENTRY_ID], () => {
            const form = new LongMemoryForm(ctx.configForms.get(ENTRY_ID))
            const off = ctx.slots.inject('settings.section', () =>
              ctx.slots.register(
                {
                  name: 'settings.section',
                  id: 'long-term-memory',
                  order: 60,
                  label: () => t('nav'),
                  locale: NS,
                  inject: () => form.inject(),
                },
                LongMemorySection,
              ),
            )
            return () => {
              if (typeof off === 'function') off()
              form.dispose()
            }
          }),
        'dsh-long-term-memory: settings section',
      )
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})