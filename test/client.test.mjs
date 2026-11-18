import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

/**
 * The browser half is a plain script for the page's module loader, so these
 * tests run its factory against a minimal React stub and inspect the element
 * tree. They cover registration, visible strings, and formatting logic; they
 * are not a rendered-browser check.
 */
const source = await readFile(new URL('../client.js', import.meta.url), 'utf8')

/** Flatten an element tree produced by the stub createElement into its text. */
function textOf(node) {
  if (node === null || node === undefined || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  return textOf(node.props?.children)
}

/** Build the client plugin, its registration, and a bound translate per locale. */
async function loadClient() {
  let definition
  const fakeWindow = { __ModuleLoader__: { load(value) { definition = value } } }
  new Function('window', source)(fakeWindow)
  assert.equal(definition.id, '@local/deep-cost')

  const createElement = (type, props, ...children) => ({
    type,
    props: { ...props, children: children.length === 1 ? children[0] : children },
  })
  const plugin = definition.factory(name => {
    assert.equal(name, 'react')
    return { createElement }
  })

  const dictionaries = {}
  const registrations = []
  const usedKeys = new Set()
  const ctx = {
    effect(run, label) {
      assert.equal(label, 'deep-cost: dictionaries')
      run()
      return () => {}
    },
    locale: {
      register(namespace, values) {
        dictionaries[namespace] = values
        return () => {}
      },
      bind(namespace) {
        return (key, params) => {
          usedKeys.add(key)
          const template = dictionaries[namespace].en[key]
          assert.equal(typeof template, 'string', `missing English key "${key}"`)
          return params === undefined
            ? template
            : template.replace(/\{(\w+)\}/g, (match, name) => {
              assert.ok(name in params, `missing value "${name}" for "${key}"`)
              return String(params[name])
            })
        }
      },
    },
    slots: {
      inject(name, register) {
        assert.ok(
          name === 'conversation.view' || name === 'conversation.session.header.utilities',
          `unexpected slot "${name}"`,
        )
        register()
      },
      register(options, component) {
        registrations.push({ options, component })
        return () => {}
      },
    },
  }
  plugin.apply(ctx)
  assert.equal(registrations.length, 2)
  const view = registrations.find(entry => entry.options.name === 'conversation.view')
  const chip = registrations.find(entry => entry.options.name === 'conversation.session.header.utilities')
  assert.ok(view, 'registers the Cost conversation view')
  assert.ok(chip, 'registers the header cost chip')
  return {
    dictionaries,
    options: view.options,
    component: view.component,
    chip,
    usedKeys,
    t: ctx.locale.bind('deep-cost'),
  }
}

/** One priced session shaped like the Host projection's wire view. */
const PRICED = {
  currency: 'USD',
  symbol: '$',
  peakMode: 'auto',
  totalCost: 0.05014,
  totals: { calls: 77, input: 99714, cacheRead: 5839744, cacheWrite: 0, output: 29440 },
  models: [{
    provider: 'deepseek-account',
    model: 'deepseek-flash',
    calls: 77,
    peakCalls: 0,
    offPeakCalls: 77,
    input: 99714,
    cacheRead: 5839744,
    cacheWrite: 0,
    output: 29440,
    cost: 0.05014,
    priced: true,
  }],
  unpriced: [],
  hasUsage: true,
}

test('registers the Cost tab beside the other conversation views', async () => {
  const { options, t } = await loadClient()
  assert.equal(options.name, 'conversation.view')
  assert.equal(options.id, 'cost')
  assert.equal(options.order, 30)
  assert.equal(options.locale, 'deep-cost')
  assert.equal(options.label(), t('view.cost'))
  assert.equal(options.label(), 'Cost')
})

test('puts a live running total in the Session header and hides it without spend', async () => {
  const { chip, t } = await loadClient()
  assert.equal(chip.options.name, 'conversation.session.header.utilities')
  assert.equal(chip.options.id, 'cost-total')
  assert.equal(chip.options.order, 10)
  assert.equal(chip.options.locale, 'deep-cost')

  const rendered = chip.component({ useProjection: () => PRICED, t })
  assert.equal(textOf(rendered), '$0.050')
  assert.match(rendered.props.title, /Estimated model spend for this conversation: \$0\.050 over 77 model calls/)
  assert.match(rendered.props.title, /Not a bill\./)
  assert.equal(rendered.props['aria-label'], rendered.props.title)

  assert.equal(chip.component({ useProjection: () => undefined, t }), null)
  assert.equal(chip.component({ useProjection: () => ({ ...PRICED, hasUsage: false }), t }), null)
  assert.equal(chip.component({ useProjection: () => ({ ...PRICED, totalCost: 0 }), t }), null)
})

test('explains when the Host projection is unavailable or has no usage', async () => {
  const { component, t } = await loadClient()
  const unavailable = textOf(component({ useProjection: () => undefined, t }))
  assert.match(unavailable, /Cost data isn't available yet/)
  const empty = textOf(component({ useProjection: () => ({ ...PRICED, hasUsage: false }), t }))
  assert.match(empty, /No model usage yet/)
})

test('shows the running total, tokens, cache hit rate, and single-model note', async () => {
  const { component, t } = await loadClient()
  const text = textOf(component({ useProjection: () => PRICED, t }))
  assert.match(text, /Running cost/)
  assert.match(text, /\$0\.050/)
  assert.match(text, /Estimated model spend for this conversation · 77 model calls/)
  assert.match(text, /Input\s*99\.7K/)
  assert.match(text, /Cache read\s*5\.84M/)
  assert.match(text, /Output\s*29\.4K/)
  assert.match(text, /Cache hit rate\s*98%/)
  assert.match(text, /Model: deepseek-account \/ deepseek-flash/)
  assert.match(text, /not a bill/)
  assert.match(text, /web search, fetch, file parsing, and speech fees are not included/)
})

test('says how the unpriced models are excluded without showing a false zero', async () => {
  const { component, t } = await loadClient()
  const view = {
    ...PRICED,
    totalCost: 0,
    models: [{
      ...PRICED.models[0],
      calls: 1,
      peakCalls: 1,
      offPeakCalls: 0,
      cost: 0,
      priced: false,
    }],
    unpriced: [{ provider: 'openrouter', model: 'mystery', calls: 1 }],
  }
  const text = textOf(component({ useProjection: () => view, t }))
  assert.match(text, /No priced usage/)
  assert.match(text, /—/)
  assert.match(text, /excludes 1 unpriced model/)
  assert.match(text, /Some models have no price/)
  assert.match(text, /openrouter \/ mystery/)
})

test('marks an unpriced row in a mixed per-model breakdown', async () => {
  const { component, t } = await loadClient()
  const view = {
    ...PRICED,
    models: [
      { ...PRICED.models[0], cost: 0.05, priced: true },
      {
        provider: 'openrouter',
        model: 'mystery',
        calls: 1,
        peakCalls: 0,
        offPeakCalls: 1,
        input: 10,
        cacheRead: 0,
        cacheWrite: 0,
        output: 5,
        cost: 0,
        priced: false,
      },
    ],
    unpriced: [{ provider: 'openrouter', model: 'mystery', calls: 1 }],
  }
  const text = textOf(component({ useProjection: () => view, t }))
  assert.match(text, /\$0\.050/)
  assert.match(text, /mystery/)
  assert.match(text, /No price/)
  assert.match(text, /excludes 1 unpriced model/)
  assert.match(text, /0 peak · 77 off-peak calls/)
  assert.match(text, /tokens are shown but their spend is excluded/)
})

test('names a longer unpriced list with a remainder count', async () => {
  const { component, t } = await loadClient()
  const view = {
    ...PRICED,
    unpriced: [
      { provider: 'a', model: 'one', calls: 1 },
      { provider: 'b', model: 'two', calls: 1 },
      { provider: 'c', model: 'three', calls: 1 },
      { provider: 'd', model: 'four', calls: 1 },
    ],
  }
  const text = textOf(component({ useProjection: () => view, t }))
  assert.match(text, /excludes 4 unpriced models/)
  assert.match(text, /a \/ one, b \/ two, c \/ three, \+1 more/)
})

test('formats sub-cent totals without rounding them to zero', async () => {
  const { component, t } = await loadClient()
  const tiny = textOf(component({ useProjection: () => ({ ...PRICED, totalCost: 0.00001 }), t }))
  assert.match(tiny, /<\$0\.0001/)
  const mill = textOf(component({ useProjection: () => ({ ...PRICED, totalCost: 0.005 }), t }))
  assert.match(mill, /\$0\.0050/)
  const dollars = textOf(component({ useProjection: () => ({ ...PRICED, totalCost: 12.345 }), t }))
  assert.match(dollars, /\$12[.,]35/)
})

test('never claims a perfect cache hit while misses remain', async () => {
  const { component, t } = await loadClient()
  const nearPerfect = {
    ...PRICED,
    totalCost: 0.1,
    totals: { calls: 1, input: 1, cacheRead: 1999, cacheWrite: 0, output: 1 },
    models: [{ ...PRICED.models[0], calls: 1, input: 1, cacheRead: 1999, cacheWrite: 0, output: 1 }],
  }
  assert.match(textOf(component({ useProjection: () => nearPerfect, t })), /Cache hit rate\s*99\.9%/)
  const perfect = {
    ...nearPerfect,
    totals: { calls: 1, input: 0, cacheRead: 2000, cacheWrite: 0, output: 1 },
    models: [{ ...PRICED.models[0], calls: 1, input: 0, cacheRead: 2000, cacheWrite: 0, output: 1 }],
  }
  assert.match(textOf(component({ useProjection: () => perfect, t })), /Cache hit rate\s*100%/)
})

test('every translated key exists in both shipped locales', async () => {
  const { dictionaries, component, options, t } = await loadClient()
  const { en, zh } = dictionaries['deep-cost']
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort())
  // Exercise both branches of the empty and unpriced states so those keys are read.
  textOf(component({ useProjection: () => undefined, t }))
  textOf(component({ useProjection: () => PRICED, t }))
  textOf(component({
    useProjection: () => ({
      ...PRICED,
      models: [{ ...PRICED.models[0], priced: false, cost: 0 }],
      unpriced: [{ provider: 'p', model: 'm', calls: 1 }],
    }),
    t,
  }))
  options.label()
  // Every t() call in the source is covered by a dictionary entry.
  for (const match of source.matchAll(/\bt\('([^']+)'/g)) {
    assert.equal(typeof en[match[1]], 'string', `source key "${match[1]}" is missing from en`)
    assert.equal(typeof zh[match[1]], 'string', `source key "${match[1]}" is missing from zh`)
  }
})
