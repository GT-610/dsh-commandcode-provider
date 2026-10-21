/**
 * Service-status tests (node:test, zero deps). Run with `npm test`.
 *
 * These pin the browser-half contract of the status row: which facts are read
 * out of the Upptime files, the source order (raw host, then jsDelivr), the
 * cache TTL, and the rule that NO failure ever throws — a broken check degrades
 * to a stale snapshot or an explicit "unknown". The view cases pin the copy
 * keys and the age buckets, so a wording or threshold change fails here rather
 * than only in the browser.
 *
 * The React tree is not rendered: `./service-status.ts` is deliberately
 * React-free, like the other controller modules in this directory.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { zh, type SettingsCommandCodeKey } from '../src/client/locales.ts'
import {
  SERVICE_STATUS_CACHE_KEY,
  SERVICE_STATUS_TTL_MS,
  STATUS_PAGE_URL,
  checkServiceStatus,
  localStorageServiceStatusStore,
  parseStateFile,
  parseSummary,
  serviceStatusView,
} from '../src/client/service-status.ts'
import type { ServiceStatusSnapshot, ServiceStatusStore } from '../src/client/service-status.ts'

/** The real Chinese dictionary, with `{name}` params substituted. */
const t = (key: SettingsCommandCodeKey, params: Record<string, unknown> = {}): string =>
  zh[key].replace(/\{(\w+)\}/g, (_match, name: string) => String(params[name] ?? ''))

const NOW = Date.parse('2026-10-21T10:00:00.000Z')
const CHECKED = Date.parse('2026-10-21T09:00:00.000Z')
const RAW = 'https://raw.test/history'
const CDN = 'https://cdn.test/history'
const SOURCES = [RAW, CDN]

const SUMMARY_BODY = JSON.stringify([
  {
    name: 'Command Code',
    url: 'https://api.commandcode.ai',
    slug: 'command-code',
    status: 'up',
    uptimeWeek: '100.00%',
    uptimeMonth: '99.98%',
    timeWeek: 114,
  },
])

const STATE_BODY = [
  'url: https://api.commandcode.ai',
  'status: up',
  'code: 200',
  'responseTime: 159',
  `lastUpdated: ${new Date(CHECKED).toISOString()}`,
  '',
].join('\n')

interface FetchStub extends Function {
  (...args: Parameters<typeof fetch>): Promise<Response>
  calls: number
  urls: string[]
}

function textResponse(body: string): Response {
  return { ok: true, status: 200, text: async () => body } as unknown as Response
}

function notFoundResponse(): Response {
  return { ok: false, status: 404, text: async () => '' } as unknown as Response
}

/** A scripted fetch: `impl` answers by URL, undefined becomes a 404. */
function makeFetch(impl: (url: string) => Response | undefined): FetchStub {
  const stub = ((input: RequestInfo | URL) => {
    stub.calls += 1
    const url = String(input)
    stub.urls.push(url)
    return Promise.resolve(impl(url) ?? notFoundResponse())
  }) as FetchStub
  stub.calls = 0
  stub.urls = []
  return stub
}

/** An in-memory stand-in for localStorage. */
function makeMemoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: () => null,
    removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => void map.set(key, value),
  } as unknown as Storage
}

/** A storage whose every method throws, for the degrade-silently paths. */
function makeBrokenStorage(): Storage {
  return {
    getItem: () => {
      throw new Error('blocked')
    },
    setItem: () => {
      throw new Error('blocked')
    },
  } as unknown as Storage
}

interface MemoryStore extends ServiceStatusStore {
  current: ServiceStatusSnapshot | undefined
}

function memoryStore(initial?: ServiceStatusSnapshot): MemoryStore {
  const store: MemoryStore = {
    current: initial,
    read: () => store.current,
    write: (next) => {
      store.current = next
    },
  }
  return store
}

function upSnapshot(overrides: Partial<ServiceStatusSnapshot> = {}): ServiceStatusSnapshot {
  return {
    level: 'up',
    checkedAt: NOW - 5 * 60_000,
    uptimeWeek: '100.00%',
    uptimeMonth: '99.98%',
    responseTimeWeekMs: 114,
    live: true,
    stale: false,
    fetchedAt: NOW,
    ...overrides,
  }
}

test('parseSummary picks the monitored site and maps its verdict', () => {
  const facts = parseSummary([
    { url: 'https://other.example', status: 'down', uptimeWeek: '1.00%' },
    { url: 'https://api.commandcode.ai', status: 'degraded', uptimeWeek: '99.50%', uptimeMonth: '99.90%', timeWeek: 210 },
  ])
  assert.equal(facts.level, 'degraded')
  assert.equal(facts.uptimeWeek, '99.50%')
  assert.equal(facts.uptimeMonth, '99.90%')
  assert.equal(facts.responseTimeWeekMs, 210)
})

test('parseSummary falls back to the slug, then the first record', () => {
  assert.equal(parseSummary([{ slug: 'command-code', status: 'down' }]).level, 'down')
  assert.equal(parseSummary([{ name: 'Renamed', status: 'up' }]).level, 'up')
})

test('parseSummary rejects payloads that cannot answer', () => {
  assert.throws(() => parseSummary({}))
  assert.throws(() => parseSummary([]))
  assert.throws(() => parseSummary([{ url: 'https://api.commandcode.ai', status: 'weird' }]))
})

test('parseStateFile reads the monitor scalar fields and ignores junk', () => {
  const state = parseStateFile(STATE_BODY)
  assert.equal(state.level, 'up')
  assert.equal(state.code, 200)
  assert.equal(state.responseTimeMs, 159)
  assert.equal(state.checkedAt, CHECKED)

  const sparse = parseStateFile('not yaml at all\nstatus: down\n')
  assert.equal(sparse.level, 'down')
  assert.equal(sparse.checkedAt, undefined)
  assert.equal(sparse.code, undefined)
})

test('checkServiceStatus returns a fresh cache without touching the network', async () => {
  const cached = upSnapshot({ fetchedAt: NOW - SERVICE_STATUS_TTL_MS + 1 })
  const store = memoryStore(cached)
  const fetchImpl = makeFetch(() => {
    throw new Error('must not fetch')
  })
  const snapshot = await checkServiceStatus({ store, now: NOW, fetchImpl, sources: SOURCES })
  assert.equal(snapshot, cached)
  assert.equal(fetchImpl.calls, 0)
})

test('checkServiceStatus reads both files from the first source and caches the result', async () => {
  const store = memoryStore()
  const fetchImpl = makeFetch((url) => {
    if (url === `${RAW}/summary.json`) return textResponse(SUMMARY_BODY)
    if (url === `${RAW}/command-code.yml`) return textResponse(STATE_BODY)
    return undefined
  })
  const snapshot = await checkServiceStatus({ store, now: NOW, fetchImpl, sources: SOURCES })
  assert.equal(snapshot.live, true)
  assert.equal(snapshot.stale, false)
  assert.equal(snapshot.level, 'up')
  assert.equal(snapshot.checkedAt, CHECKED)
  assert.equal(snapshot.uptimeWeek, '100.00%')
  assert.equal(snapshot.uptimeMonth, '99.98%')
  assert.equal(snapshot.responseTimeWeekMs, 114)
  assert.equal(snapshot.fetchedAt, NOW)
  assert.equal(fetchImpl.calls, 2)
  assert.equal(store.current?.fetchedAt, NOW)
})

test('checkServiceStatus falls back to the next mirror when the first fails', async () => {
  const store = memoryStore()
  const fetchImpl = makeFetch((url) => {
    if (url === `${CDN}/summary.json`) return textResponse(SUMMARY_BODY)
    if (url === `${CDN}/command-code.yml`) return textResponse(STATE_BODY)
    return undefined
  })
  const snapshot = await checkServiceStatus({ store, now: NOW, fetchImpl, sources: SOURCES })
  assert.equal(snapshot.live, true)
  assert.deepEqual(fetchImpl.urls, [
    `${RAW}/summary.json`,
    `${RAW}/command-code.yml`,
    `${CDN}/summary.json`,
    `${CDN}/command-code.yml`,
  ])
})

test('checkServiceStatus serves a stale cache when every source fails', async () => {
  const cached = upSnapshot({ fetchedAt: NOW - SERVICE_STATUS_TTL_MS - 1 })
  const store = memoryStore(cached)
  const fetchImpl = makeFetch(() => undefined)
  const snapshot = await checkServiceStatus({ store, now: NOW, fetchImpl, sources: SOURCES })
  assert.equal(snapshot.live, false)
  assert.equal(snapshot.stale, true)
  assert.equal(snapshot.level, 'up')
  assert.equal(snapshot.fetchedAt, cached.fetchedAt)
})

test('checkServiceStatus degrades to unknown with no cache and no source', async () => {
  const store = memoryStore()
  const fetchImpl = makeFetch(() => undefined)
  const snapshot = await checkServiceStatus({ store, now: NOW, fetchImpl, sources: SOURCES })
  assert.equal(snapshot.level, 'unknown')
  assert.equal(snapshot.live, false)
  assert.equal(snapshot.stale, false)
  assert.equal(store.current, undefined)
})

test('a missing state file still yields a live snapshot, without a check time', async () => {
  const store = memoryStore()
  const fetchImpl = makeFetch((url) => {
    if (url === `${RAW}/summary.json`) return textResponse(SUMMARY_BODY)
    return undefined
  })
  const snapshot = await checkServiceStatus({ store, now: NOW, fetchImpl, sources: SOURCES })
  assert.equal(snapshot.live, true)
  assert.equal(snapshot.checkedAt, undefined)
  assert.equal(snapshot.responseTimeWeekMs, 114)
})

test('serviceStatusView renders the checking state before the first check lands', () => {
  const view = serviceStatusView(undefined, t, NOW)
  assert.equal(view.checking, true)
  assert.equal(view.label, zh.serviceStatusChecking)
  assert.equal(view.detail, zh.serviceStatusHint)
  assert.equal(view.linkLabel, zh.serviceStatusOpen)
})

test('serviceStatusView names the verdict, the aggregates and the check age', () => {
  const view = serviceStatusView(upSnapshot(), t, NOW)
  assert.equal(view.checking, false)
  assert.equal(view.label, zh.serviceStatusUp)
  assert.equal(
    view.detail,
    [t('serviceStatusUptimeWeek', { value: '100.00%' }), t('serviceStatusUptimeMonth', { value: '99.98%' }), t('serviceStatusResponseWeek', { value: '114 ms' })].join(' · '),
  )
  assert.equal(view.meta, t('serviceStatusCheckedMinutes', { count: 5 }))
  assert.equal(view.notice, undefined)
})

test('serviceStatusView marks a stale snapshot with the last-known notice', () => {
  const stale = serviceStatusView(upSnapshot({ live: false, stale: true }), t, NOW)
  assert.equal(stale.label, zh.serviceStatusUp)
  assert.equal(stale.notice, zh.serviceStatusStale)

  const unavailable = serviceStatusView({ level: 'unknown', live: false, stale: false, fetchedAt: NOW }, t, NOW)
  assert.equal(unavailable.label, zh.serviceStatusUnknown)
  assert.equal(unavailable.notice, zh.serviceStatusUnavailable)
})

test('serviceStatusView buckets the check age and tolerates a missing timestamp', () => {
  assert.equal(serviceStatusView(upSnapshot({ checkedAt: NOW - 30_000 }), t, NOW).meta, zh.serviceStatusCheckedJustNow)
  assert.equal(
    serviceStatusView(upSnapshot({ checkedAt: NOW - 3 * 60 * 60_000 }), t, NOW).meta,
    t('serviceStatusCheckedHours', { count: 3 }),
  )
  assert.equal(
    serviceStatusView(upSnapshot({ checkedAt: NOW - 2 * 24 * 60 * 60_000 }), t, NOW).meta,
    t('serviceStatusCheckedDays', { count: 2 }),
  )
  assert.equal(serviceStatusView(upSnapshot({ checkedAt: undefined }), t, NOW).meta, zh.serviceStatusCheckedUnknown)
})

test('localStorageServiceStatusStore round-trips and tolerates damaged storage', () => {
  const storage = makeMemoryStorage()
  const store = localStorageServiceStatusStore(storage)
  assert.equal(store.read(), undefined)

  const snapshot = upSnapshot()
  store.write(snapshot)
  assert.deepEqual(store.read(), snapshot)
  assert.notEqual(storage.getItem(SERVICE_STATUS_CACHE_KEY), null)

  storage.setItem(SERVICE_STATUS_CACHE_KEY, '{not json')
  assert.equal(store.read(), undefined)

  const broken = localStorageServiceStatusStore(makeBrokenStorage())
  assert.equal(broken.read(), undefined)
  broken.write(snapshot)
})

test('the status page link is the public page', () => {
  assert.equal(STATUS_PAGE_URL, 'https://status.commandcode.ai/')
})
