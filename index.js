/**
 * Conversation cost — Host half.
 *
 * Registers the client-visible `deepCost` Session projection: per-model token
 * usage folded from the durable Session log, priced with this plugin's
 * USD-per-million rate table. The client Cost view reads the finished wire
 * value; it never folds Session events itself.
 *
 * The projection state stores tokens only, split into peak and off-peak
 * buckets. Prices are applied in `wire.view`, so a configuration change
 * reprices existing history on the next read instead of restoring stale costs
 * from a persisted checkpoint.
 */

/**
 * USD, one million tokens, peak rate, as published by DeepSeek. Keyed by model
 * id so every DeepSeek adapter route is priced: the desktop profile uses the
 * `deepseek-account` provider, while a direct adapter may use `deepseek`.
 * A `provider/model` entry overrides one route; see `resolvePrices`.
 */
const DEFAULT_PRICES = {
  'deepseek-flash': {
    input: 0.3,
    cacheRead: 0.006,
    cacheWrite: 0.3,
    output: 1.2,
    offPeak: { input: 0.15, cacheRead: 0.003, cacheWrite: 0.15, output: 0.6 },
  },
  'deepseek-v4-pro': {
    input: 1.32,
    cacheRead: 0.044,
    cacheWrite: 1.32,
    output: 3.96,
    offPeak: { input: 0.66, cacheRead: 0.022, cacheWrite: 0.66, output: 1.98 },
  },
}

/** Peak windows in UTC, Monday through Friday: [startHour, endHour). */
const PEAK_WINDOWS_UTC = [[1, 4], [6, 10]]

/** Whether a value is a finite non-negative number. */
function isCount(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/** Whether a value is a plain non-array object. */
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Normalize a configured price entry; undefined when it cannot be priced. */
function normalizeEntry(raw) {
  if (!isPlainObject(raw)) return undefined
  const input = isCount(raw.input) ? raw.input : undefined
  const output = isCount(raw.output) ? raw.output : undefined
  if (input === undefined || output === undefined) return undefined
  const cacheRead = isCount(raw.cacheRead) ? raw.cacheRead : input
  const cacheWrite = isCount(raw.cacheWrite) ? raw.cacheWrite : input
  const off = raw.offPeak
  let offPeak
  if (isPlainObject(off)) {
    const offInput = isCount(off.input) ? off.input : input
    offPeak = {
      input: offInput,
      cacheRead: isCount(off.cacheRead) ? off.cacheRead : offInput,
      cacheWrite: isCount(off.cacheWrite) ? off.cacheWrite : offInput,
      output: isCount(off.output) ? off.output : output,
    }
  }
  return {
    input, cacheRead, cacheWrite, output,
    ...offPeak === undefined ? {} : { offPeak },
  }
}

/** Merge the built-in table with the plugin row's `prices` map. */
function resolvePrices(config) {
  const prices = Object.create(null)
  if (config?.includeDefaultPrices !== false) {
    for (const [key, entry] of Object.entries(DEFAULT_PRICES)) prices[key] = normalizeEntry(entry)
  }
  if (isPlainObject(config?.prices)) {
    for (const [key, raw] of Object.entries(config.prices)) {
      // An explicit null removes a built-in price; an unusable entry is ignored
      // so a typo cannot silently drop the default rate it meant to override.
      if (raw === null) {
        delete prices[key]
        continue
      }
      const entry = normalizeEntry(raw)
      if (entry !== undefined) prices[key] = entry
    }
  }
  return { prices, fallback: normalizeEntry(config?.fallback) }
}

/** Normalize the row config into the immutable options the fold closes over. */
function normalizeConfig(config) {
  if (config !== undefined && config !== null && !isPlainObject(config)) {
    throw new TypeError('deep-cost: plugin config must be an object')
  }
  const requestedPeakMode = config?.peakMode
  const peakMode = requestedPeakMode === 'peak'
    ? 'peak'
    : requestedPeakMode === 'offPeak' || requestedPeakMode === 'off-peak' ? 'offPeak' : 'auto'
  const { prices, fallback } = resolvePrices(config)
  return {
    prices,
    fallback,
    peakMode,
    currency: typeof config?.currency === 'string' && config.currency.trim() !== ''
      ? config.currency.trim()
      : 'USD',
    symbol: typeof config?.symbol === 'string' && config.symbol.trim() !== ''
      ? config.symbol.trim()
      : '$',
  }
}

/** The billing rate class of one event timestamp. */
function rateClass(time, peakMode) {
  if (peakMode === 'peak') return 'peak'
  if (peakMode === 'offPeak') return 'offPeak'
  const date = new Date(time)
  const day = date.getUTCDay()
  if (day === 0 || day === 6) return 'offPeak'
  const hour = date.getUTCHours()
  return PEAK_WINDOWS_UTC.some(([start, end]) => hour >= start && hour < end) ? 'peak' : 'offPeak'
}

/** The usage sample one durable Assistant settlement reports, if any. */
function usageOf(event) {
  if (event.type === 'assistant/message' && event.data?.usage !== undefined) return event.data.usage
  if (event.type !== 'assistant/message' && event.type !== 'assistant/attempt') return undefined
  const stream = event.data?.stream
  if (!Array.isArray(stream)) return undefined
  for (let index = stream.length - 1; index >= 0; index -= 1) {
    const record = stream[index]
    if (record?.type === 'chunk' && record.chunk?.type === 'usage' && record.chunk.usage !== undefined) {
      return record.chunk.usage
    }
  }
  return undefined
}

/** The four disjoint billing buckets of one usage sample. */
function tokensOf(usage) {
  const count = value => (isCount(value) ? Math.floor(value) : 0)
  return {
    input: count(usage?.inputTokens),
    cacheRead: count(usage?.cacheReadTokens),
    cacheWrite: count(usage?.cacheWriteTokens),
    output: count(usage?.outputTokens),
  }
}

/** An all-zero bucket. */
function zeroBucket() {
  return { calls: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0 }
}

/** Add one billed sample to the model's bucket for its rate class. */
function addSample(models, provider, model, rate, tokens) {
  const key = `${provider}/${model}`
  const row = models[key] ?? { provider, model, peak: zeroBucket(), offPeak: zeroBucket() }
  const bucket = row[rate]
  return {
    ...models,
    [key]: {
      ...row,
      [rate]: {
        calls: bucket.calls + 1,
        input: bucket.input + tokens.input,
        cacheRead: bucket.cacheRead + tokens.cacheRead,
        cacheWrite: bucket.cacheWrite + tokens.cacheWrite,
        output: bucket.output + tokens.output,
      },
    },
  }
}

/** Remove one previously counted sample (an in-step replacement). */
function removeSample(models, sample) {
  const row = models[sample.key]
  if (row === undefined) return models
  const bucket = row[sample.rate]
  return {
    ...models,
    [sample.key]: {
      ...row,
      [sample.rate]: {
        calls: Math.max(0, bucket.calls - 1),
        input: Math.max(0, bucket.input - sample.tokens.input),
        cacheRead: Math.max(0, bucket.cacheRead - sample.tokens.cacheRead),
        cacheWrite: Math.max(0, bucket.cacheWrite - sample.tokens.cacheWrite),
        output: Math.max(0, bucket.output - sample.tokens.output),
      },
    },
  }
}

/** The empty projection state. */
function initialState() {
  return { route: null, models: Object.create(null), last: null }
}

/**
 * Build the projection definition for one normalized configuration.
 * @param options - resolved prices, currency, and peak mode.
 */
function createDefinition(options) {
  const priceFor = (provider, model) =>
    options.prices[`${provider}/${model}`] ?? options.prices[model] ?? options.fallback

  const costOf = (entry, bucket, rate) => {
    const rates = rate === 'offPeak' && entry.offPeak !== undefined ? entry.offPeak : entry
    return (bucket.input * rates.input
      + bucket.cacheRead * rates.cacheRead
      + bucket.cacheWrite * rates.cacheWrite
      + bucket.output * rates.output) / 1_000_000
  }

  const stateSchema = {
    parse(value) {
      if (!isPlainObject(value)) throw new TypeError('deep-cost: invalid projection state')
      if (value.route !== null && !(isPlainObject(value.route)
        && typeof value.route.provider === 'string'
        && typeof value.route.model === 'string')) {
        throw new TypeError('deep-cost: invalid projection route')
      }
      if (!isPlainObject(value.models)) throw new TypeError('deep-cost: invalid projection models')
      for (const row of Object.values(value.models)) {
        if (!isPlainObject(row) || typeof row.provider !== 'string' || typeof row.model !== 'string') {
          throw new TypeError('deep-cost: invalid projection model row')
        }
        for (const rate of ['peak', 'offPeak']) {
          const bucket = row[rate]
          if (!isPlainObject(bucket)
            || !isCount(bucket.calls) || !isCount(bucket.input) || !isCount(bucket.cacheRead)
            || !isCount(bucket.cacheWrite) || !isCount(bucket.output)) {
            throw new TypeError('deep-cost: invalid projection bucket')
          }
        }
      }
      if (value.last !== null) {
        const last = value.last
        if (!isPlainObject(last) || !Number.isSafeInteger(last.turn) || !Number.isSafeInteger(last.step)
          || typeof last.key !== 'string' || (last.rate !== 'peak' && last.rate !== 'offPeak')
          || !isPlainObject(last.tokens)
          || !isCount(last.tokens.input) || !isCount(last.tokens.cacheRead)
          || !isCount(last.tokens.cacheWrite) || !isCount(last.tokens.output)) {
          throw new TypeError('deep-cost: invalid projection replacement slot')
        }
      }
      return value
    },
  }

  const viewSchema = {
    parse(value) {
      if (!isPlainObject(value) || !isCount(value.totalCost)) {
        throw new TypeError('deep-cost: invalid cost view')
      }
      if (!Array.isArray(value.models) || !Array.isArray(value.unpriced)) {
        throw new TypeError('deep-cost: invalid cost view rows')
      }
      return value
    },
  }

  return {
    key: 'deepCost',
    stateVersion: 1,
    stateSchema,
    init: initialState,
    apply(state, event) {
      if (event.type === 'request/header') {
        const config = event.data?.header?.config
        const provider = config?.provider
        const model = config?.model
        if (typeof provider !== 'string' || typeof model !== 'string'
          || provider === '' || model === '') return state
        if (state.route?.provider === provider && state.route?.model === model) return state
        return { ...state, route: { provider, model } }
      }
      if (event.type === 'llm/retry-started') {
        const last = state.last
        return last !== null && last.turn === event.data?.turn && last.step === event.data?.step
          ? { ...state, last: null }
          : state
      }
      if (event.type !== 'assistant/message' && event.type !== 'assistant/attempt') return state
      if (state.route === null) return state
      const usage = usageOf(event)
      if (usage === undefined) return state
      const turn = event.data?.turn
      const step = event.data?.step
      if (!Number.isSafeInteger(turn) || !Number.isSafeInteger(step)) return state
      const tokens = tokensOf(usage)
      const rate = rateClass(event.time, options.peakMode)
      const key = `${state.route.provider}/${state.route.model}`
      let models = state.models
      // A streamed sample is replaced by the settlement for the same attempt;
      // a retry cleared `last`, so the retried attempt counts separately.
      if (state.last !== null && state.last.turn === turn && state.last.step === step) {
        models = removeSample(models, state.last)
      }
      models = addSample(models, state.route.provider, state.route.model, rate, tokens)
      return {
        ...state,
        models,
        last: { turn, step, key, rate, tokens },
      }
    },
    wire: {
      viewSchema,
      summary: false,
      view(state) {
        const models = []
        const unpriced = []
        const totals = { calls: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0 }
        let totalCost = 0
        for (const row of Object.values(state.models)) {
          const peak = row.peak
          const offPeak = row.offPeak
          const entry = priceFor(row.provider, row.model)
          const calls = peak.calls + offPeak.calls
          const input = peak.input + offPeak.input
          const cacheRead = peak.cacheRead + offPeak.cacheRead
          const cacheWrite = peak.cacheWrite + offPeak.cacheWrite
          const output = peak.output + offPeak.output
          const cost = entry === undefined ? 0 : costOf(entry, peak, 'peak') + costOf(entry, offPeak, 'offPeak')
          models.push({
            provider: row.provider,
            model: row.model,
            calls,
            peakCalls: peak.calls,
            offPeakCalls: offPeak.calls,
            input,
            cacheRead,
            cacheWrite,
            output,
            cost,
            priced: entry !== undefined,
          })
          if (entry === undefined) unpriced.push({ provider: row.provider, model: row.model, calls })
          totals.calls += calls
          totals.input += input
          totals.cacheRead += cacheRead
          totals.cacheWrite += cacheWrite
          totals.output += output
          totalCost += cost
        }
        models.sort((left, right) =>
          right.cost - left.cost
          || (right.input + right.output) - (left.input + left.output)
          || left.model.localeCompare(right.model))
        return {
          currency: options.currency,
          symbol: options.symbol,
          peakMode: options.peakMode,
          totalCost,
          totals,
          models,
          unpriced,
          hasUsage: totals.calls > 0
            && totals.input + totals.cacheRead + totals.cacheWrite + totals.output > 0,
        }
      },
    },
  }
}

/** The projection registry is this plugin's whole purpose. */
export const inject = ['sessionProjections']

/**
 * Register the `deepCost` unit on the calling fiber; unloading removes it.
 * @param ctx - Host context carrying the projection registry.
 * @param config - plugin row configuration.
 * @returns when the registration has been adopted.
 */
export async function apply(ctx, config) {
  await ctx.sessionProjections.register(createDefinition(normalizeConfig(config)))
}
