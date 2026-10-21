/**
 * Host-side connectivity probe behind `commandcode/probe`.
 *
 * Sends one GET to the configured API base root and classifies the answer the
 * way Upptime's monitor does: its default `expectedStatusCodes` are the 2xx
 * family (minus 209+ quirks) plus 3xx redirects, so a 200/301 counts as up and
 * anything else (401, 404, 5xx) is an HTTP-level failure. A timeout or a
 * network error is reported separately, because "cannot reach it" and "it
 * answered 500" are different problems for the user.
 *
 * The probe never throws: every failure becomes an outcome the row can render.
 * The request is deliberately unauthenticated and body-less — it must not touch
 * the credential seam or the quota, and it measures the same surface the status
 * page monitors.
 *
 * @module dsh-commandcode-provider/service-probe
 */

import type { CommandCodeProbeResult, ProbeOutcome } from './service-probe-wire.ts'

/** Abort a hung probe; the settings row must not wait on a dead endpoint. */
export const PROBE_TIMEOUT_MS = 5_000

/**
 * HTTP statuses Upptime's default monitor accepts as `up` (from
 * `uptime-monitor`'s `expectedStatusCodes` fallback). Kept in sync with the
 * page's monitor rather than invented here: a 401 or 404 means the endpoint
 * answered but is not the surface the official check calls healthy.
 */
const UP_STATUSES: ReadonlySet<number> = new Set([
  200, 201, 202, 203, 204, 205, 206, 207, 208, 226,
  300, 301, 302, 303, 304, 305, 306, 307, 308,
])

/** Turn the response status into the outcome the row renders. */
export function probeOutcomeForStatus(status: number): ProbeOutcome {
  return UP_STATUSES.has(status) ? 'ok' : 'http-error'
}

/**
 * Probe the configured API base once. Never rejects: an invalid base, a
 * timeout and a transport failure all resolve to an outcome.
 *
 * `redirect: 'manual'` keeps the classification on the FIRST response, exactly
 * like the monitor's HTTP client; following a redirect would report the final
 * destination's status as if it were the API's own.
 */
export async function probeCommandCode(options: {
  /** The effective API base from the live config (defaults to the official host). */
  apiBase: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
  now?: () => number
}): Promise<CommandCodeProbeResult> {
  const now = options.now ?? Date.now
  let url: string
  try {
    // The monitor probes the host root, not the configured path: a base of
    // `https://host/v1` still answers on `/` for the official deployment.
    url = new URL('/', options.apiBase).toString()
  } catch {
    return { outcome: 'unreachable', status: 0, latencyMs: 0, checkedAt: now() }
  }

  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, options.timeoutMs ?? PROBE_TIMEOUT_MS)

  const started = Date.now()
  try {
    const response = await (options.fetchImpl ?? fetch)(url, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: { accept: '*/*' },
    })
    const latencyMs = Math.max(0, Date.now() - started)
    // The body is irrelevant and may be large on a custom base; release it
    // instead of leaving the socket to the GC.
    try {
      await response.body?.cancel()
    } catch {
      // A body that cannot be cancelled is not a probe failure.
    }
    return {
      outcome: probeOutcomeForStatus(response.status),
      status: response.status,
      latencyMs,
      checkedAt: now(),
    }
  } catch {
    return {
      outcome: timedOut ? 'timeout' : 'unreachable',
      status: 0,
      latencyMs: 0,
      checkedAt: now(),
    }
  } finally {
    clearTimeout(timer)
  }
}
