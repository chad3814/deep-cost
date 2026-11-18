window.__ModuleLoader__.load({
  id: '@local/deep-cost',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'deep-cost'

    const en = {
      'view.cost': 'Cost',
      'hero.title': 'Running cost',
      'hero.noPriced': 'No priced usage',
      'hero.caption': 'Estimated model spend for this conversation',
      'hero.excludes.one': 'excludes 1 unpriced model',
      'hero.excludes.other': 'excludes {count} unpriced models',
      'calls.one': '1 model call',
      'calls.other': '{count} model calls',
      'metric.input': 'Input',
      'metric.cacheRead': 'Cache read',
      'metric.cacheWrite': 'Cache write',
      'metric.output': 'Output',
      'metric.cacheHit': 'Cache hit rate',
      'metric.cacheHit.title': 'Cache read ÷ (uncached input + cache read + cache write)',
      'list.title': 'By model',
      'calls.windows': '{peak} peak · {offPeak} off-peak calls',
      'table.input': 'Input',
      'table.cacheRead': 'Cache read',
      'table.cacheWrite': 'Cache write',
      'table.output': 'Output',
      'empty.title': 'No model usage yet',
      'empty.body': 'The running total appears after the first model reply settles.',
      'unpriced.title': 'Some models have no price',
      'unpriced.body': 'These models have no configured price, so their tokens are shown but their spend is excluded from the total: {models}.',
      'unpriced.hint': 'Add them under prices in the plugin configuration.',
      'unpriced.model': '{provider} / {model}',
      'unpriced.more': '+{count} more',
      'unpriced.row': 'No price',
      'unpriced.row.title': 'Add a price under prices in the plugin configuration.',
      'unpriced.separator': ', ',
      'note.auto': 'Peak hours are 01:00–04:00 and 06:00–10:00 UTC, Monday to Friday. Off-peak rates apply outside them.',
      'note.peak': 'All usage is priced at peak rates because the plugin configuration forces peak pricing.',
      'note.offPeak': 'All usage is priced at off-peak rates because the plugin configuration forces off-peak pricing.',
      'note.currency': 'Rates are in {currency}.',
      'note.scope': 'Model token spend for this session only; subagent sessions, web search, fetch, file parsing, and speech fees are not included.',
      'note.estimate': 'An estimate from provider-reported usage that updates when each model call settles, not a bill.',
      'note.singleModel': 'Model: {provider} / {model}',
      'unavailable.title': "Cost data isn't available yet",
      'unavailable.body': 'If this persists, check that Conversation cost is enabled in Plugins.',
      'aria.table': 'Cost by model',
      'chip.title': 'Estimated model spend for this conversation: {cost} over {calls}. Not a bill.',
    }

    const zh = {
      'view.cost': '花费',
      'hero.title': '对话花费',
      'hero.noPriced': '暂无已定价用量',
      'hero.caption': '本次对话的模型花费估算',
      'hero.excludes.one': '不含 1 个未定价模型',
      'hero.excludes.other': '不含 {count} 个未定价模型',
      'calls.one': '1 次模型调用',
      'calls.other': '{count} 次模型调用',
      'metric.input': '输入',
      'metric.cacheRead': '缓存读取',
      'metric.cacheWrite': '缓存写入',
      'metric.output': '输出',
      'metric.cacheHit': '缓存命中率',
      'metric.cacheHit.title': '缓存读取 ÷（未缓存输入 + 缓存读取 + 缓存写入）',
      'list.title': '按模型',
      'calls.windows': '高峰 {peak} 次 · 低谷 {offPeak} 次',
      'table.input': '输入',
      'table.cacheRead': '缓存读取',
      'table.cacheWrite': '缓存写入',
      'table.output': '输出',
      'empty.title': '还没有模型用量',
      'empty.body': '第一次模型回复结算后，这里会显示累计花费。',
      'unpriced.title': '部分模型未配置价格',
      'unpriced.body': '以下模型没有配置价格，其 token 会显示，但花费不计入总额：{models}。',
      'unpriced.hint': '请在插件配置的 prices 中补充这些模型。',
      'unpriced.model': '{provider} / {model}',
      'unpriced.more': '另有 {count} 个',
      'unpriced.row': '未配置',
      'unpriced.row.title': '请在插件配置的 prices 中补充价格。',
      'unpriced.separator': '、',
      'note.auto': '高峰时段为 UTC 周一至周五 01:00–04:00 与 06:00–10:00；其余时间按低谷价计算。',
      'note.peak': '插件配置强制使用高峰价，全部用量按高峰价计算。',
      'note.offPeak': '插件配置强制使用低谷价，全部用量按低谷价计算。',
      'note.currency': '价格以 {currency} 计。',
      'note.scope': '仅包含本次会话的模型 token 花费，不含子代理会话、联网搜索、抓取、文件解析和语音费用。',
      'note.estimate': '按服务商上报的用量估算，每次模型调用结算后更新，不是账单。',
      'note.singleModel': '模型：{provider} / {model}',
      'unavailable.title': '暂时没有花费数据',
      'unavailable.body': '如果一直这样，请检查“插件”中是否启用了“对话花费”。',
      'aria.table': '按模型统计花费',
      'chip.title': '本次对话的模型花费估算：{cost}，共 {calls}。不是账单。',
    }

    const styles = {
      root: {
        boxSizing: 'border-box',
        height: '100%',
        overflowY: 'auto',
        paddingBottom: 'calc(var(--dsh-composer-height, 152px) + 8px)',
        color: 'var(--dsw-alias-label-primary)',
        font: 'var(--dsw-font-xxs-12)',
      },
      page: {
        boxSizing: 'border-box',
        display: 'grid',
        gap: '16px',
        maxWidth: '720px',
        margin: '0 auto',
        padding: '24px 20px 16px',
      },
      hero: {
        padding: '18px 20px 16px',
        border: '0.5px solid var(--dsw-alias-border-l2)',
        borderRadius: 'var(--dsw-radius-lg, 12px)',
        background: 'var(--dsw-alias-bg-layer-1)',
      },
      label: {
        margin: 0,
        color: 'var(--dsw-alias-label-secondary)',
        font: 'var(--dsw-font-xxs-12)',
      },
      total: {
        marginTop: '6px',
        fontSize: '32px',
        fontWeight: 600,
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums',
      },
      caption: {
        marginTop: '6px',
        color: 'var(--dsw-alias-label-secondary)',
        font: 'var(--dsw-font-xxs-12)',
      },
      metrics: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))',
        gap: '12px',
        margin: '16px 0 0',
        paddingTop: '14px',
        borderTop: '0.5px solid var(--dsw-alias-border-l1)',
      },
      metricLabel: {
        color: 'var(--dsw-alias-label-secondary)',
        font: 'var(--dsw-font-xxxs-11)',
      },
      metricValue: {
        margin: 0,
        marginTop: '2px',
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
      },
      card: {
        overflow: 'hidden',
        border: '0.5px solid var(--dsw-alias-border-l2)',
        borderRadius: 'var(--dsw-radius-lg, 12px)',
        background: 'var(--dsw-alias-bg-layer-1)',
      },
      cardTitle: {
        margin: 0,
        padding: '10px 16px',
        borderBottom: '0.5px solid var(--dsw-alias-border-l1)',
        color: 'var(--dsw-alias-label-secondary)',
        fontSize: 'inherit',
        fontWeight: 500,
      },
      list: {
        margin: 0,
        padding: 0,
        listStyle: 'none',
      },
      item: {
        padding: '12px 16px',
        borderTop: '0.5px solid var(--dsw-alias-border-l1)',
      },
      itemFirst: {
        padding: '12px 16px',
      },
      itemTop: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '12px',
      },
      itemName: {
        fontWeight: 600,
        overflowWrap: 'anywhere',
      },
      itemMeta: {
        marginTop: '2px',
        color: 'var(--dsw-alias-label-secondary)',
        font: 'var(--dsw-font-xxxs-11)',
        overflowWrap: 'anywhere',
      },
      itemCost: {
        flexShrink: 0,
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
      },
      itemUnpriced: {
        flexShrink: 0,
        color: 'var(--dsw-alias-label-secondary)',
        font: 'var(--dsw-font-xxxs-11)',
        fontWeight: 600,
      },
      itemTokens: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px 14px',
        marginTop: '8px',
        color: 'var(--dsw-alias-label-secondary)',
        font: 'var(--dsw-font-xxxs-11)',
        fontVariantNumeric: 'tabular-nums',
      },
      tokenLabel: {
        color: 'var(--dsw-alias-label-secondary)',
      },
      warn: {
        padding: '12px 16px',
        border: '0.5px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 55%, transparent)',
        borderRadius: 'var(--dsw-radius-lg, 12px)',
        background: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary) 8%, transparent)',
      },
      warnTitle: {
        fontWeight: 600,
      },
      warnBody: {
        marginTop: '4px',
        color: 'var(--dsw-alias-label-secondary)',
        overflowWrap: 'anywhere',
      },
      warnHint: {
        marginTop: '4px',
        color: 'var(--dsw-alias-label-secondary)',
        font: 'var(--dsw-font-xxxs-11)',
        overflowWrap: 'anywhere',
      },
      empty: {
        padding: '24px 20px',
        border: '0.5px solid var(--dsw-alias-border-l2)',
        borderRadius: 'var(--dsw-radius-lg, 12px)',
        background: 'var(--dsw-alias-bg-layer-1)',
      },
      emptyTitle: {
        fontWeight: 600,
      },
      emptyBody: {
        marginTop: '6px',
        color: 'var(--dsw-alias-label-secondary)',
      },
      notes: {
        display: 'grid',
        gap: '4px',
        color: 'var(--dsw-alias-label-secondary)',
        font: 'var(--dsw-font-xxxs-11)',
        lineHeight: 1.5,
        overflowWrap: 'anywhere',
      },
      chip: {
        display: 'inline-flex',
        alignItems: 'center',
        height: '22px',
        padding: '0 8px',
        border: '0.5px solid var(--dsw-alias-border-l2)',
        borderRadius: '999px',
        color: 'var(--dsw-alias-label-secondary)',
        font: 'var(--dsw-font-xxs-12)',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
      },
    }

    /** Compact token count; the exact value lives in a title attribute. */
    function formatTokens(value) {
      if (!Number.isFinite(value)) return '—'
      if (value < 1000) return String(value)
      const thousands = value / 1000
      if (thousands < 999.5) {
        return `${thousands >= 100 ? String(Math.round(thousands)) : thousands.toFixed(1).replace(/\.0$/, '')}K`
      }
      const millions = value / 1_000_000
      return `${millions >= 100 ? String(Math.round(millions)) : millions.toFixed(2).replace(/\.?0+$/, '')}M`
    }

    /** A small money figure: four decimals below one cent, then three, then two. */
    function formatCost(value, symbol) {
      if (!Number.isFinite(value)) return '—'
      if (value > 0 && value < 0.0001) return `<${symbol}0.0001`
      if (value === 0) return `${symbol}0.00`
      if (value < 0.01) return `${symbol}${value.toFixed(4)}`
      if (value < 1) return `${symbol}${value.toFixed(3)}`
      const grouped = value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      return `${symbol}${grouped}`
    }

    /** Count-aware call label; the locale service has no plural rules. */
    function callsLabel(t, count) {
      return count === 1 ? t('calls.one') : t('calls.other', { count: count.toLocaleString() })
    }

    /** Count-aware "excludes N unpriced models" label. */
    function excludesLabel(t, count) {
      return count === 1 ? t('hero.excludes.one') : t('hero.excludes.other', { count: count.toLocaleString() })
    }

    /**
     * Cache-hit share of prompt-side tokens. Rounding never shows 100% while
     * misses exist, so a near-perfect reuse still reads as less than perfect.
     */
    function formatCacheHit(read, prompt) {
      if (prompt <= 0) return null
      if (read === prompt) return '100'
      const share = (read / prompt) * 100
      return Math.round(share) < 100
        ? String(Math.round(share))
        : (Math.floor(share * 10) / 10).toFixed(1)
    }

    /** The scrolling, labelled view region; it opts into the composer overlay. */
    function shell(children, t) {
      return h('div', {
        style: styles.root,
        'data-conversation-composer-overlay': '',
        role: 'region',
        'aria-label': t('view.cost'),
        tabIndex: 0,
      }, h('div', { style: styles.page }, children))
    }

    /** One token figure with its exact count exposed to assistive technology. */
    function token(label, value) {
      const exact = value.toLocaleString()
      return h('span', { key: label, title: exact, 'aria-label': `${label} ${exact}` },
        h('span', { style: styles.tokenLabel }, `${label} `),
        formatTokens(value))
    }

    /** The conversation view entry. */
    function CostView(props) {
      const { useProjection, t } = props
      const data = useProjection('deepCost')

      if (data === undefined) {
        return shell([
          h('div', { style: styles.empty, key: 'unavailable' },
            h('div', { style: styles.emptyTitle }, t('unavailable.title')),
            h('div', { style: styles.emptyBody }, t('unavailable.body'))),
        ], t)
      }

      if (data.hasUsage !== true) {
        return shell([
          h('div', { style: styles.empty, key: 'empty' },
            h('div', { style: styles.emptyTitle }, t('empty.title')),
            h('div', { style: styles.emptyBody }, t('empty.body'))),
        ], t)
      }

      const totals = data.totals
      const pricedModels = data.models.filter(row => row.priced)
      const hasPriced = pricedModels.length > 0
      const unpricedCount = data.unpriced.length
      const promptTokens = totals.input + totals.cacheRead + totals.cacheWrite
      const cacheHit = formatCacheHit(totals.cacheRead, promptTokens)
      const peakNote = data.peakMode === 'peak'
        ? t('note.peak')
        : data.peakMode === 'offPeak' ? t('note.offPeak') : t('note.auto')
      const caption = [t('hero.caption'), callsLabel(t, totals.calls)]
      if (unpricedCount > 0) caption.push(excludesLabel(t, unpricedCount))

      const shownUnpriced = data.unpriced.slice(0, 3)
        .map(row => t('unpriced.model', { provider: row.provider, model: row.model }))
      const hiddenUnpriced = data.unpriced.length - shownUnpriced.length
      const unpricedNames = shownUnpriced.join(t('unpriced.separator'))
        + (hiddenUnpriced > 0
          ? `${t('unpriced.separator')}${t('unpriced.more', { count: hiddenUnpriced.toLocaleString() })}`
          : '')
      const singleModel = data.models.length === 1 ? data.models[0] : null

      return shell([
        h('section', { style: styles.hero, 'aria-label': t('hero.title'), key: 'hero' },
          h('h2', { style: styles.label }, hasPriced ? t('hero.title') : t('hero.noPriced')),
          h('div', {
            style: styles.total,
            'aria-live': 'polite',
            title: hasPriced ? undefined : t('unpriced.row.title'),
          }, hasPriced ? formatCost(data.totalCost, data.symbol) : '—'),
          h('div', { style: styles.caption }, caption.join(' · ')),
          h('dl', { style: styles.metrics },
            h('div', { key: 'input' },
              h('dt', { style: styles.metricLabel }, t('metric.input')),
              h('dd', { style: styles.metricValue, title: totals.input.toLocaleString(), 'aria-label': totals.input.toLocaleString() }, formatTokens(totals.input))),
            h('div', { key: 'cacheRead' },
              h('dt', { style: styles.metricLabel }, t('metric.cacheRead')),
              h('dd', { style: styles.metricValue, title: totals.cacheRead.toLocaleString(), 'aria-label': totals.cacheRead.toLocaleString() }, formatTokens(totals.cacheRead))),
            totals.cacheWrite > 0
              ? h('div', { key: 'cacheWrite' },
                h('dt', { style: styles.metricLabel }, t('metric.cacheWrite')),
                h('dd', { style: styles.metricValue, title: totals.cacheWrite.toLocaleString(), 'aria-label': totals.cacheWrite.toLocaleString() }, formatTokens(totals.cacheWrite)))
              : null,
            h('div', { key: 'output' },
              h('dt', { style: styles.metricLabel }, t('metric.output')),
              h('dd', { style: styles.metricValue, title: totals.output.toLocaleString(), 'aria-label': totals.output.toLocaleString() }, formatTokens(totals.output))),
            h('div', { key: 'cacheHit', title: t('metric.cacheHit.title') },
              h('dt', { style: styles.metricLabel }, t('metric.cacheHit')),
              h('dd', { style: styles.metricValue }, cacheHit === null ? '—' : `${cacheHit}%`)))),
        unpricedCount > 0
          ? h('section', { style: styles.warn, role: 'status', key: 'unpriced' },
            h('div', { style: styles.warnTitle }, t('unpriced.title')),
            h('div', { style: styles.warnBody }, t('unpriced.body', { models: unpricedNames })),
            h('div', { style: styles.warnHint }, t('unpriced.hint')))
          : null,
        data.models.length > 1
          ? h('section', { style: styles.card, 'aria-label': t('aria.table'), key: 'models' },
            h('h3', { style: styles.cardTitle }, t('list.title')),
            h('ul', { style: styles.list },
              data.models.map((row, index) => h('li', {
                key: `${row.provider}/${row.model}`,
                style: index === 0 ? styles.itemFirst : styles.item,
              },
              h('div', { style: styles.itemTop },
                h('div', null,
                  h('div', { style: styles.itemName }, row.model),
                  h('div', { style: styles.itemMeta },
                    row.provider, ' · ', callsLabel(t, row.calls),
                    data.peakMode === 'auto'
                      ? ` · ${t('calls.windows', {
                        peak: row.peakCalls.toLocaleString(),
                        offPeak: row.offPeakCalls.toLocaleString(),
                      })}`
                      : '')),
                h('div', {
                  style: row.priced ? styles.itemCost : styles.itemUnpriced,
                  title: row.priced ? undefined : t('unpriced.row.title'),
                }, row.priced ? formatCost(row.cost, data.symbol) : t('unpriced.row'))),
              h('div', { style: styles.itemTokens },
                token(t('table.input'), row.input),
                token(t('table.cacheRead'), row.cacheRead),
                row.cacheWrite > 0 ? token(t('table.cacheWrite'), row.cacheWrite) : null,
                token(t('table.output'), row.output))))))
          : null,
        h('footer', { style: styles.notes, key: 'notes' },
          singleModel
            ? h('div', null, t('note.singleModel', { provider: singleModel.provider, model: singleModel.model }))
            : null,
          h('div', null, peakNote),
          h('div', null, t('note.currency', { currency: data.currency })),
          h('div', null, t('note.scope')),
          h('div', null, t('note.estimate'))),
      ], t)
    }

    /**
     * Always-visible running total in the Session header. The tab label itself
     * cannot carry it: the View roster is a global string list rebuilt only on
     * registration changes, so it is neither per-Session nor live.
     */
    function HeaderCost({ useProjection, t }) {
      const data = useProjection('deepCost')
      if (data === undefined || data.hasUsage !== true || data.totalCost <= 0) return null
      const cost = formatCost(data.totalCost, data.symbol)
      const title = t('chip.title', { cost, calls: callsLabel(t, data.totals.calls) })
      return h('span', { style: styles.chip, title, 'aria-label': title }, cost)
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'deep-cost: dictionaries')
        const t = ctx.locale.bind(NS)
        ctx.slots.inject('conversation.view', () => ctx.slots.register({
          name: 'conversation.view',
          id: 'cost',
          order: 30,
          locale: NS,
          label: () => t('view.cost'),
        }, CostView))
        ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
          name: 'conversation.session.header.utilities',
          id: 'cost-total',
          order: 10,
          locale: NS,
        }, HeaderCost))
      },
    }
  },
})
