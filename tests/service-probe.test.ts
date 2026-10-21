/**
 * Host-side connectivity probe tests (node:test, zero deps). Run with `npm test`.
 *
 * The probe is the row's real-time half, so its classification is the part that
 * must not drift: the official monitor's default `expectedStatusCodes` decide
 * what "up" means, a timeout and a transport failure stay distinguishable, and
 * the request always goes to the host root. The wire codec is pinned here too,
 * because the browser trusts `parseProbeResult` to reject anything the Host
 * should never have sent.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { PROBE_TIMEOUT_MS, probeCommandCode, probeOutcomeForStatus } from '../src/service-probe.ts'
import { parseProbeResult } from '../src/service-probe-wire.ts'

/** Minimal Response stand-in; the probe only reads `status` and cancels the body. */
function response(status: number): Response {
  return { status, body: null } as unknown as Response
}

/** A fetch stub that records the URL it was asked for. */
function recordingFetch(urls: string[], status = 200): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    urls.push(String(input))
    return response(status)
  }) as unknown as typeof fetch
}

test('probeOutcomeForStatus mirrors the monitor default statuses', () => {
  for (const status of [200, 201, 204, 226, 301, 308]) {
    assert.equal(probeOutcomeForStatus(status), 'ok', String(status))
  }
  for (const status of [0, 401, 404, 429, 500, 503]) {
    assert.equal(probeOutcomeForStatus(status), 'http-error', String(status))
  }
})

test('probeCommandCode reports a reachable endpoint with latency', async () => {
  const urls: string[] = []
  const probe = await probeCommandCode({
    apiBase: 'https://api.commandcode.ai',
    fetchImpl: recordingFetch(urls),
    now: () => 1234,
  })
  assert.deepEqual(urls, ['https://api.commandcode.ai/'])
  assert.equal(probe.outcome, 'ok')
  assert.equal(probe.status, 200)
  assert.ok(probe.latencyMs >= 0)
  assert.equal(probe.checkedAt, 1234)
})

test('probeCommandCode always probes the host root, even from a pathed base', async () => {
  const urls: string[] = []
  await probeCommandCode({
    apiBase: 'https://example.test/some/path//',
    fetchImpl: recordingFetch(urls),
  })
  assert.deepEqual(urls, ['https://example.test/'])
})

test('probeCommandCode keeps an HTTP failure distinct from a transport failure', async () => {
  const httpError = await probeCommandCode({
    apiBase: 'https://api.commandcode.ai',
    fetchImpl: recordingFetch([], 503),
  })
  assert.equal(httpError.outcome, 'http-error')
  assert.equal(httpError.status, 503)

  const unreachable = await probeCommandCode({
    apiBase: 'https://api.commandcode.ai',
    fetchImpl: (async () => {
      throw new TypeError('fetch failed')
    }) as unknown as typeof fetch,
  })
  assert.equal(unreachable.outcome, 'unreachable')
  assert.equal(unreachable.status, 0)
  assert.equal(unreachable.latencyMs, 0)
})

test('probeCommandCode aborts a hung request as a timeout', async () => {
  const started = Date.now()
  const probe = await probeCommandCode({
    apiBase: 'https://api.commandcode.ai',
    timeoutMs: 20,
    fetchImpl: ((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
      })) as unknown as typeof fetch,
  })
  assert.equal(probe.outcome, 'timeout')
  assert.equal(probe.status, 0)
  assert.ok(Date.now() - started < PROBE_TIMEOUT_MS)
})

test('probeCommandCode treats an unparsable base as unreachable', async () => {
  const probe = await probeCommandCode({
    apiBase: 'not a url',
    fetchImpl: recordingFetch([]),
  })
  assert.equal(probe.outcome, 'unreachable')
  assert.equal(probe.status, 0)
})

test('parseProbeResult accepts the Host frame and rejects malformed ones', () => {
  assert.deepEqual(
    parseProbeResult({ outcome: 'http-error', status: 503, latencyMs: 12, checkedAt: 99 }),
    { outcome: 'http-error', status: 503, latencyMs: 12, checkedAt: 99 },
  )
  assert.throws(() => parseProbeResult({}))
  assert.throws(() => parseProbeResult({ outcome: 'weird', status: 200, latencyMs: 1, checkedAt: 1 }))
  assert.throws(() => parseProbeResult({ outcome: 'ok', status: '200', latencyMs: 1, checkedAt: 1 }))
})
