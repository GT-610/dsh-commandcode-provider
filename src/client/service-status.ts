/**
 * Official Command Code service status (browser half).
 *
 * The public status page (status.commandcode.ai) is an Upptime deployment: a
 * GitHub Actions workflow probes https://api.commandcode.ai every few minutes
 * and commits the result to the CommandCodeAI/commandcode-status repository,
 * which also publishes the page. The browser therefore reads the same two data
 * files the page itself reads instead of scraping the SPA — no Host round-trip,
 * no API key, no new remote contract.
 *
 * - `history/summary.json` carries the verdict (`up` / `down` / `degraded`) and
 *   the uptime/response-time aggregates the page renders.
 * - `history/command-code.yml` carries the monitor's own `lastUpdated`, which
 *   is the ONLY honest freshness signal: the workflow cron is every five
 *   minutes, but GitHub throttles scheduled runs (observed gaps of two to six
 *   hours), and the summary file is regenerated only once a day. A surface that
 *   printed "live" here would routinely lie, so the view always shows the
 *   monitor's last check time instead.
 *
 * `raw.githubusercontent.com` is the freshest source and serves
 * `access-control-allow-origin: *`; jsDelivr mirrors the same files for
 * networks where raw.githubusercontent.com is unreachable, at the cost of its
 * longer `@master` cache (up to twelve hours). Sources are tried in that order.
 *
 * Nothing here throws to the caller: a failed check serves the last successful
 * snapshot marked `stale`, and with no cache at all the view degrades to an
 * explicit "unknown" instead of inventing a state.
 *
 * @module dsh-commandcode-provider/client/service-status
 */

import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'
import type { SettingsCommandCodeKey } from './locales.ts'
import type { CommandCodeProbeResult } from '../service-probe-wire.ts'

/** The public status page the row links to. */
export const STATUS_PAGE_URL = 'https://status.commandcode.ai/'

/** Upptime data files, freshest host first. */
const STATUS_SOURCES: readonly string[] = [
  'https://raw.githubusercontent.com/CommandCodeAI/commandcode-status/master/history',
  'https://cdn.jsdelivr.net/gh/CommandCodeAI/commandcode-status@master/history',
]

/** Files inside a source directory (the monitor's naming, not ours to change). */
const SUMMARY_FILE = 'summary.json'
const STATE_FILE = 'command-code.yml'

/** The one site the Upptime config monitors. */
const MONITORED_URL = 'https://api.commandcode.ai'
const MONITORED_SLUG = 'command-code'

/**
 * How long a successful check answers without a new request. The data itself
 * only moves when the monitor commits, so a shorter TTL would just add traffic;
 * the page's raw host caches for five minutes anyway.
 */
export const SERVICE_STATUS_TTL_MS = 5 * 60 * 1000

/** Abort a hung source rather than keep the row waiting; two sources at worst. */
export const SERVICE_STATUS_FETCH_TIMEOUT_MS = 5_000

/**
 * How old the published record may get before the row says it may lag.
 *
 * Two hours is deliberately below the observed cadence: Upptime only rewrites
 * its state file on a status change or the daily forced commit, so a stable
 * service legitimately shows a record from several hours ago. The line exists
 * to explain that instead of letting "operational" look like a live verdict;
 * the local probe below is the real-time half.
 */
export const SERVICE_STATUS_LAG_WARN_MS = 2 * 60 * 60 * 1000

/** The `localStorage` key holding the last successful snapshot. */
export const SERVICE_STATUS_CACHE_KEY = '@mars-sea/dsh-commandcode-provider/service-status'

/** The service verdict the page publishes. */
export type ServiceLevel = 'up' | 'degraded' | 'down' | 'unknown'

const LEVELS: readonly ServiceLevel[] = ['up', 'degraded', 'down', 'unknown']

/** What the status page knows as of the last successful check. */
export interface ServiceStatusSnapshot {
  level: ServiceLevel
  /** When the monitor last checked, epoch ms; absent when the state file failed. */
  checkedAt?: number | undefined
  /** 7-day uptime, verbatim from the summary (`100.00%`). */
  uptimeWeek?: string | undefined
  /** 30-day uptime, verbatim from the summary. */
  uptimeMonth?: string | undefined
  /** Average response time over the last seven days, milliseconds. */
  responseTimeWeekMs?: number | undefined
  /** This run reached a source (false = the cached/unknown fallback). */
  live: boolean
  /** Served from the cache because every source failed this run. */
  stale: boolean
  /** When this snapshot was learned, epoch ms. */
  fetchedAt: number
}

/** Storage seam so node tests can stand in for `localStorage`. */
export interface ServiceStatusStore {
  read(): ServiceStatusSnapshot | undefined
  write(snapshot: ServiceStatusSnapshot): void
}

/** The facts `summary.json` carries for the monitored site. */
export interface SummaryFacts {
  level: ServiceLevel
  uptimeWeek?: string | undefined
  uptimeMonth?: string | undefined
  responseTimeWeekMs?: number | undefined
}

/** The facts the monitor's per-site state file carries. */
export interface StateFacts {
  level?: ServiceLevel | undefined
  /** `lastUpdated` parsed to epoch ms. */
  checkedAt?: number | undefined
  /** The last probe's response time, milliseconds. */
  responseTimeMs?: number | undefined
  /** The last probe's HTTP status. */
  code?: number | undefined
}

/**
 * The live half's client-side lifecycle, as the settings hook hands it to the
 * view. `checking` is the first probe still in flight; `unavailable` means the
 * Host serves no probe endpoint (an older Host) or the call itself failed.
 */
export type ServiceProbe =
  | { kind: 'checking' }
  | { kind: 'unavailable' }
  | { kind: 'result'; result: CommandCodeProbeResult }

/** The tone of the local-connectivity dot. */
export type ServiceLocalTone = 'muted' | 'ok' | 'error'

/** A verdict's dot tone, mapped onto the harness StateDot by the page. */
export type ServiceTone = 'checking' | 'ok' | 'warn' | 'error' | 'idle'

/** What the row renders; every string is already localized. */
export interface ServiceStatusView {
  level: ServiceLevel
  /** The first published-data check has not finished yet (no cache to paint from). */
  checking: boolean
  /** The published verdict: `服务正常` / `部分降级` / `服务中断` / `状态未知` / `正在检查…`. */
  label: string
  /** The published verdict's dot tone. */
  officialTone: ServiceTone
  /**
   * The one verdict the group heading shows. A failed local probe outranks the
   * published record — the page cannot reach the service from here, whatever
   * the status page says — and reads as a warning; otherwise it is the
   * published verdict.
   */
  badge: { label: string; tone: ServiceTone }
  /**
   * Compact aggregates as separate segments (`可用率 7 天 100% / 30 天 99.98%`,
   * `平均响应 114 ms`) so the page can keep each one whole when it wraps; empty
   * when none were published.
   */
  detailParts: string[]
  /** The published record's age (`8 小时前更新`), not a live check. */
  updated?: string | undefined
  /** The publication-lag explanation, once the record is old enough; the page shows it as the age's tooltip. */
  lag?: string | undefined
  /** The Host probe of the configured API base, run just now (`连通正常 · 188 ms`). */
  local: string
  /** Which colour the local-connectivity dot takes. */
  localTone: ServiceLocalTone
  /** The local probe is still in flight (dot breathes instead of sitting idle). */
  localChecking: boolean
  /** A failure/staleness note for the published record; absent on a live check. */
  notice?: string | undefined
  /** Why the numbers can lag, shown as the row's tooltip. */
  hint: string
  /** The link copy for the status page. */
  linkLabel: string
}

function levelOf(value: unknown): ServiceLevel | undefined {
  return typeof value === 'string' && (LEVELS as readonly string[]).includes(value)
    ? value as ServiceLevel
    : undefined
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/**
 * Read the monitored site's verdict out of `summary.json`.
 *
 * The file is an array because an Upptime config may monitor several sites; we
 * match our API host, then the known slug, then the first record so a rename on
 * their side degrades to "show what the page shows" rather than to nothing.
 * Rejects only when the payload cannot answer at all — a rejection makes the
 * caller try the next mirror.
 */
export function parseSummary(payload: unknown): SummaryFacts {
  if (!Array.isArray(payload)) throw new Error('status summary is not an array')
  const records = payload.filter(
    (entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null,
  )
  const record = records.find((entry) => entry['url'] === MONITORED_URL)
    ?? records.find((entry) => entry['slug'] === MONITORED_SLUG)
    ?? records[0]
  if (record === undefined) throw new Error('status summary has no site record')
  const level = levelOf(record['status'])
  if (level === undefined) throw new Error('status summary has no usable status')
  return {
    level,
    uptimeWeek: stringOrUndefined(record['uptimeWeek']),
    uptimeMonth: stringOrUndefined(record['uptimeMonth']),
    responseTimeWeekMs: finiteNumber(record['timeWeek']),
  }
}

/**
 * Read the monitor's own state file (`key: value` YAML the robot writes).
 *
 * Only scalar lines are needed, so this stays a line parser: pulling a YAML
 * library into the client bundle for five fields would be the larger risk. A
 * malformed line is ignored; the caller treats missing fields as unknown rather
 * than failing the whole source, because the summary (not this file) is what
 * carries the verdict.
 */
export function parseStateFile(text: string): StateFacts {
  const fields = new Map<string, string>()
  for (const line of text.split('\n')) {
    const match = /^([A-Za-z][A-Za-z0-9]*):[ \t]*(.*)$/.exec(line.trim())
    if (match !== null) fields.set(match[1]!, match[2]!.trim())
  }
  const checkedRaw = fields.get('lastUpdated')
  const checkedAt = checkedRaw === undefined ? Number.NaN : Date.parse(checkedRaw)
  const codeRaw = fields.get('code')
  const code = codeRaw === undefined ? Number.NaN : Number.parseInt(codeRaw, 10)
  const responseRaw = fields.get('responseTime')
  const responseTime = responseRaw === undefined ? Number.NaN : Number.parseFloat(responseRaw)
  return {
    level: levelOf(fields.get('status')),
    checkedAt: Number.isFinite(checkedAt) ? checkedAt : undefined,
    responseTimeMs: Number.isFinite(responseTime) ? responseTime : undefined,
    code: Number.isFinite(code) ? code : undefined,
  }
}

/** Fetch one text resource with a hard timeout; rejects on any non-OK answer. */
async function fetchText(url: string, fetchImpl: typeof fetch, timeoutMs: number): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchImpl(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`status source responded ${response.status}`)
    return await response.text()
  } finally {
    clearTimeout(timer)
  }
}

/** Read one mirror: the summary is required, the state file is best-effort. */
async function readSource(
  base: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<{ summary: SummaryFacts; state: StateFacts }> {
  const [summaryText, stateText] = await Promise.all([
    fetchText(`${base}/${SUMMARY_FILE}`, fetchImpl, timeoutMs),
    fetchText(`${base}/${STATE_FILE}`, fetchImpl, timeoutMs).catch(() => undefined),
  ])
  const summary = parseSummary(JSON.parse(summaryText) as unknown)
  const state = stateText === undefined ? {} : parseStateFile(stateText)
  return { summary, state }
}

/**
 * A {@link ServiceStatusStore} backed by `localStorage`. Tolerates a missing or
 * throwing storage (private modes): reads yield `undefined`, writes are
 * dropped, and the status row still works for the lifetime of the page.
 */
export function localStorageServiceStatusStore(
  storage: Storage | undefined = typeof localStorage === 'undefined' ? undefined : localStorage,
): ServiceStatusStore {
  return {
    read(): ServiceStatusSnapshot | undefined {
      if (storage === undefined) return undefined
      try {
        const raw = storage.getItem(SERVICE_STATUS_CACHE_KEY)
        if (raw === null) return undefined
        return snapshotFrom(JSON.parse(raw) as unknown)
      } catch {
        return undefined
      }
    },
    write(snapshot: ServiceStatusSnapshot): void {
      if (storage === undefined) return
      try {
        storage.setItem(SERVICE_STATUS_CACHE_KEY, JSON.stringify(snapshot))
      } catch {
        // Quota/private-mode failures must never break the settings page.
      }
    },
  }
}

/** Validate a cached payload; storage may have been written by an older build. */
function snapshotFrom(value: unknown): ServiceStatusSnapshot | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const record = value as Record<string, unknown>
  const level = levelOf(record['level'])
  const fetchedAt = finiteNumber(record['fetchedAt'])
  if (level === undefined || fetchedAt === undefined) return undefined
  return {
    level,
    checkedAt: finiteNumber(record['checkedAt']),
    uptimeWeek: stringOrUndefined(record['uptimeWeek']),
    uptimeMonth: stringOrUndefined(record['uptimeMonth']),
    responseTimeWeekMs: finiteNumber(record['responseTimeWeekMs']),
    live: record['live'] === true,
    stale: record['stale'] === true,
    fetchedAt,
  }
}

/** The cached snapshot, for an instant first paint before the check lands. */
export function readCachedServiceStatus(store: ServiceStatusStore): ServiceStatusSnapshot | undefined {
  return store.read()
}

/**
 * Resolve the service status, preferring the cache while it is fresh and the
 * freshest mirror otherwise. Resolves with a snapshot in every case; the only
 * "failure" the caller sees is `live: false` (+ `stale` when a cache existed).
 */
export async function checkServiceStatus(options: {
  store: ServiceStatusStore
  now?: number
  fetchImpl?: typeof fetch
  sources?: readonly string[]
  timeoutMs?: number
}): Promise<ServiceStatusSnapshot> {
  const now = options.now ?? Date.now()
  const cached = options.store.read()
  if (cached !== undefined && now - cached.fetchedAt < SERVICE_STATUS_TTL_MS) return cached

  const fetchImpl = options.fetchImpl ?? fetch
  const sources = options.sources ?? STATUS_SOURCES
  const timeoutMs = options.timeoutMs ?? SERVICE_STATUS_FETCH_TIMEOUT_MS
  for (const source of sources) {
    try {
      const { summary, state } = await readSource(source, fetchImpl, timeoutMs)
      const snapshot: ServiceStatusSnapshot = {
        // The state file is the newest check; the summary can trail it because
        // the aggregate workflow only reruns once a day.
        level: state.level ?? summary.level,
        checkedAt: state.checkedAt,
        uptimeWeek: summary.uptimeWeek,
        uptimeMonth: summary.uptimeMonth,
        responseTimeWeekMs: summary.responseTimeWeekMs ?? state.responseTimeMs,
        live: true,
        stale: false,
        fetchedAt: now,
      }
      options.store.write(snapshot)
      return snapshot
    } catch {
      // Try the next mirror; the loop's failure branch below owns the fallback.
    }
  }

  if (cached !== undefined) return { ...cached, live: false, stale: true }
  return { level: 'unknown', live: false, stale: false, fetchedAt: now }
}

/** The published record's age: `官方数据更新：刚刚` / N minutes / hours / days. */
function updatedCopy(checkedAt: number, now: number, t: Translate<SettingsCommandCodeKey>): string {
  const age = Math.max(0, now - checkedAt)
  if (age < 60_000) return t('serviceStatusUpdatedJustNow')
  const minutes = Math.floor(age / 60_000)
  if (minutes < 60) return t('serviceStatusUpdatedMinutes', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('serviceStatusUpdatedHours', { count: hours })
  return t('serviceStatusUpdatedDays', { count: Math.floor(hours / 24) })
}

/** The publication-lag explanation, shown once the record is old enough. */
function lagCopy(
  checkedAt: number | undefined,
  now: number,
  t: Translate<SettingsCommandCodeKey>,
): string | undefined {
  if (checkedAt === undefined) return undefined
  return now - checkedAt >= SERVICE_STATUS_LAG_WARN_MS ? t('serviceStatusLag') : undefined
}

/** The local-connectivity line and its dot tone. */
function localCopy(
  probe: ServiceProbe,
  t: Translate<SettingsCommandCodeKey>,
): { text: string; tone: ServiceLocalTone } {
  if (probe.kind === 'checking') return { text: t('serviceStatusLocalChecking'), tone: 'muted' }
  if (probe.kind === 'unavailable') return { text: t('serviceStatusLocalUnavailable'), tone: 'muted' }
  const { result } = probe
  if (result.outcome === 'ok') {
    return { text: t('serviceStatusLocalOk', { latency: result.latencyMs }), tone: 'ok' }
  }
  if (result.outcome === 'http-error') {
    return { text: t('serviceStatusLocalHttp', { status: result.status }), tone: 'error' }
  }
  if (result.outcome === 'timeout') return { text: t('serviceStatusLocalTimeout'), tone: 'error' }
  return { text: t('serviceStatusLocalUnreachable'), tone: 'error' }
}

/**
 * A published uptime without its padding zeros: the summary prints two
 * decimals verbatim (`100.00%`), which reads as noise, so `100.00%` becomes
 * `100%` and `99.90%` becomes `99.9%`; anything that is not a plain percentage
 * is shown as published.
 */
export function compactUptime(value: string): string {
  const match = /^(\d+)(?:\.(\d+))?%$/.exec(value.trim())
  if (match === null) return value
  const fraction = (match[2] ?? '').replace(/0+$/, '')
  return fraction === '' ? `${match[1]}%` : `${match[1]}.${fraction}%`
}

/** The aggregate segments; empty when this check carried no aggregates. */
function detailCopy(snapshot: ServiceStatusSnapshot, t: Translate<SettingsCommandCodeKey>): string[] {
  const parts: string[] = []
  const uptimes: string[] = []
  if (snapshot.uptimeWeek !== undefined) {
    uptimes.push(t('serviceStatusUptimeWeek', { value: compactUptime(snapshot.uptimeWeek) }))
  }
  if (snapshot.uptimeMonth !== undefined) {
    uptimes.push(t('serviceStatusUptimeMonth', { value: compactUptime(snapshot.uptimeMonth) }))
  }
  if (uptimes.length > 0) parts.push(t('serviceStatusUptime', { value: uptimes.join(' / ') }))
  if (snapshot.responseTimeWeekMs !== undefined) {
    parts.push(t('serviceStatusResponseWeek', { value: `${Math.round(snapshot.responseTimeWeekMs)} ms` }))
  }
  return parts
}

/** The heading verdict: a failed local probe first, else the published one. */
function badgeOf(
  probe: ServiceProbe,
  official: { label: string; tone: ServiceTone },
  t: Translate<SettingsCommandCodeKey>,
): { label: string; tone: ServiceTone } {
  if (probe.kind !== 'result' || probe.result.outcome === 'ok') return official
  const { outcome } = probe.result
  const label = outcome === 'http-error' ? t('serviceStatusBadgeLocalHttp')
    : outcome === 'timeout' ? t('serviceStatusBadgeLocalTimeout')
      : t('serviceStatusBadgeLocalUnreachable')
  return { label, tone: 'warn' }
}

/**
 * Project a snapshot + the live probe into the row's copy. Pure and React-free
 * so the labels, the age buckets, the lag rule and the failure wording are
 * pinned by node tests rather than by rendering.
 *
 * `snapshot === undefined` means the first published-data check is still in
 * flight (the hook paints the cache first, so this only shows on a cold cache).
 * The probe is independent: the row always renders both halves, and the local
 * half never borrows the published verdict.
 */
export function serviceStatusView(
  snapshot: ServiceStatusSnapshot | undefined,
  probe: ServiceProbe,
  t: Translate<SettingsCommandCodeKey>,
  now: number,
): ServiceStatusView {
  const local = localCopy(probe, t)
  const hint = t('serviceStatusHint')

  if (snapshot === undefined) {
    const label = t('serviceStatusChecking')
    return {
      level: 'unknown',
      checking: true,
      label,
      officialTone: 'checking',
      badge: badgeOf(probe, { label, tone: 'checking' }, t),
      detailParts: [],
      local: local.text,
      localTone: local.tone,
      localChecking: probe.kind === 'checking',
      hint,
      linkLabel: t('serviceStatusOpen'),
    }
  }

  const label = snapshot.level === 'up' ? t('serviceStatusUp')
    : snapshot.level === 'degraded' ? t('serviceStatusDegraded')
      : snapshot.level === 'down' ? t('serviceStatusDown')
        : t('serviceStatusUnknown')

  const notice = snapshot.live
    ? undefined
    : snapshot.stale ? t('serviceStatusStale') : t('serviceStatusUnavailable')
  const officialTone: ServiceTone = snapshot.level === 'up' ? 'ok'
    : snapshot.level === 'degraded' ? 'warn'
      : snapshot.level === 'down' ? 'error'
        : 'idle'

  return {
    level: snapshot.level,
    checking: false,
    label,
    officialTone,
    badge: badgeOf(probe, { label, tone: officialTone }, t),
    detailParts: detailCopy(snapshot, t),
    updated: snapshot.checkedAt === undefined
      ? t('serviceStatusUpdatedUnknown')
      : updatedCopy(snapshot.checkedAt, now, t),
    lag: lagCopy(snapshot.checkedAt, now, t),
    local: local.text,
    localTone: local.tone,
    localChecking: probe.kind === 'checking',
    notice,
    hint,
    linkLabel: t('serviceStatusOpen'),
  }
}
