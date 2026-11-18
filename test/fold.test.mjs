import test from 'node:test'
import assert from 'node:assert/strict'
import { apply, inject } from '../index.js'

const WED_PEAK = Date.UTC(2026, 10, 18, 2, 0, 0)
const WED_OFF_PEAK = Date.UTC(2026, 10, 18, 12, 0, 0)
const SAT_PEAK_HOUR = Date.UTC(2026, 10, 21, 2, 0, 0)

async function definition(config) {
  let captured
  const ctx = {
    sessionProjections: {
      async register(value) {
        captured = value
        return { async dispose() {} }
      },
    },
  }
  await apply(ctx, config)
  assert.ok(captured, 'apply registers a projection definition')
  return captured
}

function header(provider, model, time = WED_PEAK) {
  return {
    type: 'request/header',
    time,
    data: { header: { config: { provider, model } }, reason: 'initial' },
  }
}

function message(turn, step, usage, time = WED_PEAK) {
  return {
    type: 'assistant/message',
    time,
    data: { turn, step, message: {}, stream: [], usage },
  }
}

function attempt(turn, step, usage, time = WED_PEAK) {
  return {
    type: 'assistant/attempt',
    time,
    data: { turn, step, stream: [{ type: 'chunk', time, chunk: { type: 'usage', usage } }] },
  }
}

function fold(def, events) {
  let state = def.init({}, 0)
  for (const event of events) state = def.apply(state, event)
  return state
}

function viewOf(def, events) {
  const state = fold(def, events)
  assert.doesNotThrow(() => def.stateSchema.parse(JSON.parse(JSON.stringify(state))))
  const view = def.wire.view(state)
  assert.doesNotThrow(() => def.wire.viewSchema.parse(view))
  return view
}

function close(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${label}: expected ${expected}, got ${actual}`)
}

test('registers a client-visible, non-summary projection', async () => {
  const def = await definition()
  assert.equal(def.key, 'deepCost')
  assert.equal(def.wire.summary, false)
  assert.deepEqual(inject, ['sessionProjections'])
})

test('prices a peak flash call from provider usage', async () => {
  const def = await definition()
  const view = viewOf(def, [
    header('deepseek', 'deepseek-flash'),
    message(0, 0, { inputTokens: 1_000_000, outputTokens: 1_000_000, cacheReadTokens: 0, cacheWriteTokens: 0 }),
  ])
  close(view.totalCost, 1.5, 'peak flash cost')
  assert.equal(view.hasUsage, true)
  assert.equal(view.totals.calls, 1)
  assert.equal(view.totals.input, 1_000_000)
  assert.equal(view.models.length, 1)
  assert.equal(view.models[0].priced, true)
  assert.equal(view.models[0].peakCalls, 1)
})

test('prices the deepseek-account route by model id', async () => {
  const def = await definition()
  const view = viewOf(def, [
    header('deepseek-account', 'deepseek-flash'),
    message(0, 0, { inputTokens: 1_000_000, outputTokens: 1_000_000 }),
  ])
  close(view.totalCost, 1.5, 'account-provider cost')
  assert.equal(view.models[0].priced, true)
})

test('prices cache reads at the cache-hit rate', async () => {
  const def = await definition()
  const view = viewOf(def, [
    header('deepseek', 'deepseek-flash'),
    message(0, 0, { inputTokens: 1_000_000, cacheReadTokens: 1_000_000 }),
  ])
  close(view.totalCost, 0.306, 'cache-read cost')
  assert.equal(view.totals.cacheRead, 1_000_000)
})

test('charges published off-peak rates outside peak windows', async () => {
  const def = await definition()
  const view = viewOf(def, [
    header('deepseek', 'deepseek-flash'),
    message(0, 0, { inputTokens: 1_000_000, outputTokens: 1_000_000 }, WED_OFF_PEAK),
  ])
  close(view.totalCost, 0.75, 'off-peak flash cost')
  assert.equal(view.models[0].offPeakCalls, 1)
})

test('treats weekends as off-peak', async () => {
  const def = await definition()
  const view = viewOf(def, [
    header('deepseek', 'deepseek-flash'),
    message(0, 0, { inputTokens: 1_000_000, outputTokens: 1_000_000 }, SAT_PEAK_HOUR),
  ])
  close(view.totalCost, 0.75, 'weekend cost')
})

test('accepts the off-peak alias', async () => {
  const def = await definition({ peakMode: 'off-peak' })
  const view = viewOf(def, [
    header('deepseek', 'deepseek-flash'),
    message(0, 0, { inputTokens: 1_000_000, outputTokens: 1_000_000 }, WED_PEAK),
  ])
  assert.equal(view.peakMode, 'offPeak')
  close(view.totalCost, 0.75, 'aliased off-peak cost')
})

test('forced peak mode prices off-peak events at peak rates', async () => {
  const def = await definition({ peakMode: 'peak' })
  const view = viewOf(def, [
    header('deepseek', 'deepseek-flash'),
    message(0, 0, { inputTokens: 1_000_000, outputTokens: 1_000_000 }, WED_OFF_PEAK),
  ])
  close(view.totalCost, 1.5, 'forced peak cost')
})

test('replaces a streamed sample with the settlement of the same attempt', async () => {
  const def = await definition()
  const view = viewOf(def, [
    header('deepseek', 'deepseek-flash'),
    attempt(0, 0, { inputTokens: 1000, outputTokens: 100 }),
    message(0, 0, { inputTokens: 1000, outputTokens: 100 }),
  ])
  assert.equal(view.totals.calls, 1)
  assert.equal(view.totals.input, 1000)
  assert.equal(view.totals.output, 100)
})

test('counts a retried attempt separately', async () => {
  const def = await definition()
  const view = viewOf(def, [
    header('deepseek', 'deepseek-flash'),
    attempt(0, 0, { inputTokens: 1000, outputTokens: 100 }),
    { type: 'llm/retry-started', time: WED_PEAK, data: { turn: 0, step: 0 } },
    message(0, 0, { inputTokens: 2000, outputTokens: 200 }),
  ])
  assert.equal(view.totals.calls, 2)
  assert.equal(view.totals.input, 3000)
  assert.equal(view.totals.output, 300)
})

test('attributes usage to the model in force at settlement', async () => {
  const def = await definition()
  const view = viewOf(def, [
    header('deepseek', 'deepseek-flash'),
    message(0, 0, { inputTokens: 1_000_000, outputTokens: 0 }),
    header('deepseek', 'deepseek-v4-pro'),
    message(1, 0, { inputTokens: 1_000_000, outputTokens: 0 }),
  ])
  const flash = view.models.find(row => row.model === 'deepseek-flash')
  const pro = view.models.find(row => row.model === 'deepseek-v4-pro')
  assert.ok(flash)
  assert.ok(pro)
  close(flash.cost, 0.3, 'flash input')
  close(pro.cost, 1.32, 'pro input')
  assert.equal(view.totals.calls, 2)
})

test('excludes unpriced models from the total and names them', async () => {
  const def = await definition()
  const view = viewOf(def, [
    header('openrouter', 'mystery'),
    message(0, 0, { inputTokens: 1_000_000, outputTokens: 1_000_000 }),
  ])
  assert.equal(view.hasUsage, true)
  close(view.totalCost, 0, 'unpriced total')
  assert.equal(view.models[0].priced, false)
  assert.equal(view.unpriced.length, 1)
  assert.deepEqual(view.unpriced[0], { provider: 'openrouter', model: 'mystery', calls: 1 })
})

test('bills an omitted cacheWrite at the input rate and reads cache prices', async () => {
  const def = await definition({ includeDefaultPrices: false, prices: { 'p/x': { input: 10, output: 20 } } })
  const view = viewOf(def, [
    header('p', 'x'),
    message(0, 0, { inputTokens: 1_000_000, cacheWriteTokens: 1_000_000, cacheReadTokens: 1_000_000 }),
  ])
  // peak: input 10 + cacheWrite 10 + cacheRead 10
  close(view.totalCost, 30, 'custom cache write fallback')
})

test('merges overrides and removes an entry with null', async () => {
  const def = await definition({
    prices: {
      'deepseek/deepseek-flash': { input: 1, output: 1 },
      'deepseek-v4-pro': null,
    },
  })
  const state = fold(def, [header('deepseek', 'deepseek-flash')])
  assert.equal(def.key, 'deepCost')
  assert.ok(state, 'fold still runs with an override')
  const view = viewOf(def, [header('deepseek', 'deepseek-flash'), message(0, 0, { inputTokens: 1_000_000 })])
  close(view.totalCost, 1, 'overridden flash input')
  const pro = viewOf(def, [header('deepseek', 'deepseek-v4-pro'), message(0, 0, { inputTokens: 1_000_000 })])
  close(pro.totalCost, 0, 'removed pro price')
  assert.equal(pro.unpriced.length, 1)
})

test('ignores an unusable override instead of dropping the built-in price', async () => {
  const def = await definition({ prices: { 'deepseek-flash': { input: 'nope' } } })
  const view = viewOf(def, [
    header('deepseek', 'deepseek-flash'),
    message(0, 0, { inputTokens: 1_000_000, outputTokens: 1_000_000 }),
  ])
  assert.equal(view.models[0].priced, true)
  close(view.totalCost, 1.5, 'built-in flash rate survives a bad override')
})

test('sums peak and off-peak calls of the same model', async () => {
  const def = await definition()
  const view = viewOf(def, [
    header('deepseek', 'deepseek-flash'),
    message(0, 0, { inputTokens: 1_000_000, outputTokens: 1_000_000 }, WED_PEAK),
    message(1, 0, { inputTokens: 1_000_000, outputTokens: 1_000_000 }, WED_OFF_PEAK),
  ])
  close(view.totalCost, 2.25, 'peak plus off-peak cost')
  assert.equal(view.models[0].peakCalls, 1)
  assert.equal(view.models[0].offPeakCalls, 1)
  assert.equal(view.totals.calls, 2)
})

test('ignores a header without a usable route', async () => {
  const def = await definition()
  const view = viewOf(def, [
    header('deepseek', ''),
    message(0, 0, { inputTokens: 1_000_000, outputTokens: 1_000_000 }),
  ])
  assert.equal(view.hasUsage, false)
  close(view.totalCost, 0, 'no attributable cost')
})

test('reports no usage when a settlement carried no billable tokens', async () => {
  const def = await definition()
  const view = viewOf(def, [
    header('deepseek', 'deepseek-flash'),
    message(0, 0, { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }),
  ])
  assert.equal(view.hasUsage, false)
  assert.equal(view.totals.calls, 1)
  close(view.totalCost, 0, 'no billable tokens')
})

test('fallback prices otherwise-unpriced models', async () => {
  const def = await definition({ includeDefaultPrices: false, fallback: { input: 2, output: 4 } })
  const view = viewOf(def, [header('p', 'x'), message(0, 0, { inputTokens: 1_000_000, outputTokens: 1_000_000 })])
  close(view.totalCost, 2 + 4, 'fallback cost')
})
