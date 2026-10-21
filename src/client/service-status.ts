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

/** What the row renders; every string is already localized. */
export interface ServiceStatusView {
  level: ServiceLevel
  /** The first check has not finished yet (no cache to paint from). */
  checking: boolean
  /** `服务正常` / `部分降级` / `服务中断` / `状态未知` / `正在检查…`. */
  label: string
  /** Uptime and response aggregates; absent when the source published none. */
  detail?: string | undefined
  /** The monitor's last check as a relative time. */
  meta?: string | undefined
  /** A failure/staleness note; absent on a live, successful check. */
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

/** The relative check age: `刚刚检测` / N minutes / N hours / N days ago. */
function checkedCopy(checkedAt: number, now: number, t: Translate<SettingsCommandCodeKey>): string {
  const age = Math.max(0, now - checkedAt)
  if (age < 60_000) return t('serviceStatusCheckedJustNow')
  const minutes = Math.floor(age / 60_000)
  if (minutes < 60) return t('serviceStatusCheckedMinutes', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('serviceStatusCheckedHours', { count: hours })
  return t('serviceStatusCheckedDays', { count: Math.floor(hours / 24) })
}

/** The aggregate line, or undefined when this check carried no aggregates. */
function detailCopy(snapshot: ServiceStatusSnapshot, t: Translate<SettingsCommandCodeKey>): string | undefined {
  const parts: string[] = []
  if (snapshot.uptimeWeek !== undefined) {
    parts.push(t('serviceStatusUptimeWeek', { value: snapshot.uptimeWeek }))
  }
  if (snapshot.uptimeMonth !== undefined) {
    parts.push(t('serviceStatusUptimeMonth', { value: snapshot.uptimeMonth }))
  }
  if (snapshot.responseTimeWeekMs !== undefined) {
    parts.push(t('serviceStatusResponseWeek', { value: `${Math.round(snapshot.responseTimeWeekMs)} ms` }))
  }
  return parts.length === 0 ? undefined : parts.join(' · ')
}

/**
 * Project a snapshot into the row's copy. Pure and React-free so the labels,
 * the age buckets and the failure wording are pinned by node tests rather than
 * by rendering.
 *
 * `snapshot === undefined` means the first check is still in flight (the hook
 * paints the cache first, so this only shows on a cold cache).
 */
export function serviceStatusView(
  snapshot: ServiceStatusSnapshot | undefined,
  t: Translate<SettingsCommandCodeKey>,
  now: number,
): ServiceStatusView {
  if (snapshot === undefined) {
    return {
      level: 'unknown',
      checking: true,
      label: t('serviceStatusChecking'),
      detail: t('serviceStatusHint'),
      hint: t('serviceStatusHint'),
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

  return {
    level: snapshot.level,
    checking: false,
    label,
    detail: detailCopy(snapshot, t),
    meta: snapshot.checkedAt === undefined
      ? t('serviceStatusCheckedUnknown')
      : checkedCopy(snapshot.checkedAt, now, t),
    notice,
    hint: t('serviceStatusHint'),
    linkLabel: t('serviceStatusOpen'),
  }
}
