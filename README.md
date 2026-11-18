# Conversation cost

Adds a **Cost** view beside **Chat** and **Trajectory** in a conversation. It shows the session's running model spend, the token totals behind it, and a per-model breakdown with cache hit rate.

A compact live total also sits in the Session header beside the title, so the running spend stays visible while another view is open. It appears once priced usage exists.

The figure is folded from the durable Session log, so it covers the whole conversation and survives reloads, paging, and compaction. Subagent sessions are separate Sessions and are not rolled into this total. It updates when each model call settles. Model token cost only: web search, fetch, file parsing, and speech fees are not included, and the total is an estimate from provider-reported usage, not a bill.

## Install

Published on npm as [`@chad3814/dsh-deep-cost`](https://www.npmjs.com/package/@chad3814/dsh-deep-cost). In the Web GUI, open **Plugins → Add plugin** and enter the package name:

```text
@chad3814/dsh-deep-cost
```

For a CLI-managed profile:

```sh
dsh plugin --profile <profile> add @chad3814/dsh-deep-cost
```

Or install straight from the repository (no build step is needed):

```sh
dsh plugin --profile <profile> add github:chad3814/deep-cost
```

The Desktop profile is managed from its **Plugins** page rather than the CLI. Enabling the bundle adds the Cost tab and the header total; turning it off removes both and the `deepCost` projection.

## Pricing

Built-in rates are the published DeepSeek rates in USD per 1M tokens. Off-peak rates are half the peak rates, and peak hours are 01:00–04:00 and 06:00–10:00 UTC, Monday through Friday.

| Model | Input (cache miss) | Input (cache hit) | Output |
|---|---|---|---|
| `deepseek-flash` | 0.30 peak / 0.15 off-peak | 0.006 peak / 0.003 off-peak | 1.20 peak / 0.60 off-peak |
| `deepseek-v4-pro` | 1.32 peak / 0.66 off-peak | 0.044 peak / 0.022 off-peak | 3.96 peak / 1.98 off-peak |

Built-ins match by model id, so they price the `deepseek-account` route used by this profile as well as a direct `deepseek` route. A `provider/model` entry overrides one route without changing the other.

A model with no configured price is listed as **No price** and its tokens are excluded from the total; the view shows which models are unpriced.

## Configuration

Override the plugin row in the profile's `cordis.patch.yml`:

```yaml
- id: deep-cost
  name: '@chad3814/dsh-deep-cost'
  config:
    peakMode: auto            # auto | peak | offPeak
    currency: USD
    symbol: '$'
    includeDefaultPrices: true
    prices:
      deepseek-flash:          # model id: matches any provider route
        input: 0.3            # USD per 1M uncached input tokens
        cacheRead: 0.006      # defaults to input when omitted
        cacheWrite: 0.3       # defaults to input when omitted
        output: 1.2
        offPeak:              # omitted offPeak means the same rates apply off-peak
          input: 0.15
          cacheRead: 0.003
          cacheWrite: 0.15
          output: 0.6
      'deepseek/deepseek-v4-pro':  # exact provider/model route
        input: 1.32
        cacheRead: 0.044
        output: 3.96
        offPeak:
          input: 0.66
          cacheRead: 0.022
          output: 1.98
      'openrouter/some-model':     # any provider/model key
        input: 1.0
        output: 2.0
    fallback:                 # optional: price any otherwise-unpriced model
      input: 1.0
      output: 2.0
```

Key rules:

- `prices` entries merge with the built-in table. Set an entry to `null` to remove a built-in price, or `includeDefaultPrices: false` to start from an empty table.
- A key of the form `provider/model` matches that exact route; a key of just `model` matches any provider. The exact route wins.
- `peakMode: auto` classifies each settled call from its event timestamp in UTC (weekends are off-peak). Beijing-holiday exclusions are not detected; force `offPeak` when a holiday rate matters.
- `cacheWrite` defaults to the input (cache miss) rate for routes that report cache writes separately. DeepSeek reports uncached input in its input bucket, so this default does not add a charge on a DeepSeek route.

## Notes

- The view shares the Host projection `deepCost`; if the Host half is disabled the tab explains that cost data is unavailable.
- A streamed usage sample is replaced by the settlement for the same attempt, and a model retry counts as a separate billed attempt.
- Peak classification uses the settlement event's timestamp, so a request crossing a peak boundary is priced by when it settled.
- A subagent runs in its own Session with its own log, so its spend appears in that Session's Cost tab, not the parent's total.

## Releasing

Versions publish from GitHub Actions with [npm trusted publishing](https://docs.npmjs.com/trusted-publishers); no npm token is stored in the repository. The package's trusted publisher names this repository and the `publish.yml` workflow file. If it also names an environment, add the same `environment` to the workflow's job.

1. Bump `version` in `package.json` and commit it.
2. Tag the commit with the same version and push the tag:

   ```sh
   git tag v1.1.0
   git push origin main --tags
   ```

3. The **Publish** workflow installs dependencies, runs the full verification, checks that the tag matches `package.json`, and publishes with provenance. Re-running a tag whose version is already on npm is a no-op.
