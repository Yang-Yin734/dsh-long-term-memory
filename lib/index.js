/**
 * dsh-long-term-memory — host half.
 *
 * Registers one system-prompt section whose text is the content the user typed
 * into the "长时记忆" box on the settings page. The text lives in this plugin's
 * own Config (`text`, volatile), so the settings page can edit it live and the
 * value already applies to every new session, in every workspace.
 */
import z from '@deepseek-ai/schemastery'

export const name = 'dsh-long-term-memory'

export const inject = ['systemPrompt']

export const Config = z.object({
  text: z.string().default('').role('textarea').volatile(),
})

/** Section id, kept namespaced so other contributions cannot shadow it. */
const SECTION_NAME = 'long-term-memory:user-text'

/**
 * The first-party deployment persona suffix sits at 10200; putting this right
 * after it keeps the earlier first-party prefix byte-identical when only the
 * user's long-term memory changes.
 */
const SECTION_ORDER = 10250

const HEADER = '## 长时记忆（用户在设置里填写的长期偏好，对本会话以及之后所有会话有效）'

/**
 * Read a config value that may be a volatile reference.
 * @param value - the raw config node.
 * @returns its literal string value.
 */
function readText(value) {
  if (value !== null && typeof value === 'object' && typeof value.get === 'function') {
    return String(value.get() ?? '')
  }
  return String(value ?? '')
}

/**
 * Register the long-term-memory prompt section.
 * @param ctx - the host plugin context.
 * @param config - this plugin's Config, whose `text` is a volatile reference.
 */
export function apply(ctx, config) {
  ctx.systemPrompt.section({
    name: SECTION_NAME,
    order: SECTION_ORDER,
    // User text may contain `{{…}}`; keep it literal instead of failing assembly.
    interpolate: false,
    text: () => {
      const body = readText(config?.text).trim()
      if (body === '') return ''
      return `${HEADER}\n\n${body}`
    },
  })
}