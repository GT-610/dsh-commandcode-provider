/** Package-metadata compatibility contract. */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

interface PackageManifest {
  dsh?: {
    client?: { platform?: string; inject?: string[] }
    compatibility?: { dshReleases?: Record<string, string>; dsh?: string }
  }
  engines?: { node?: string; dsh?: string }
  peerDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean } | undefined>
  devDependencies?: Record<string, string>
}

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as PackageManifest

/** 一个「裸」语义化版本号：不带任何范围操作符（`dshReleases` 的键必须是它）。 */
const BARE_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

/**
 * 支持范围是「同通道区间」而不是裸版本析取（用户 2026-10-24 拍板）：
 * 下界是本通道已验证的最新 RC，上界写成下一个 minor 的 `-0` 预发布号。
 *
 * 为什么上界必须是 `<0.2.2-0`：按 semver 优先级 `0.2.2-rc.1 < 0.2.2`，所以
 * `<0.2.2` 会**放行**下一个 minor 的 RC；`~0.2.1-rc.2` 更糟（等价于
 * `>=0.2.1-rc.2 <0.3.0`）。`-0` 是唯一能精确排除「下一个 minor 的
 * 任何预发布」的写法（node semver 实测，见 docs/agent-reference/engine-compatibility.md）。
 */
const SUPPORTED_RANGE = /^>=(\d+\.\d+\.\d+-rc\.\d+) <(\d+)\.(\d+)\.\d+-0$/

test('every Harness peer and development package shares one supported release range', () => {
  const peers = pkg.peerDependencies ?? {}
  const dev = pkg.devDependencies ?? {}
  const harnessPeers = Object.keys(peers).filter((name) => name.startsWith('@deepseek-ai/dsh-'))

  assert.ok(harnessPeers.length > 0)
  const ranges = new Set(harnessPeers.map((name) => peers[name]))
  assert.equal(ranges.size, 1, 'one range for every Harness package, never a per-package drift')
  const range = [...ranges][0]!
  for (const name of harnessPeers) {
    assert.equal(dev[name], range, `${name} development range`)
  }
  const admitted = SUPPORTED_RANGE.exec(range)
  assert.ok(
    admitted,
    `peer range ${JSON.stringify(range)} must be ">=<newest verified RC> <next minor>-0"`,
  )
  const lower = admitted[1]!
  assert.equal(lower, '0.2.1-rc.2', 'the lower bound is the newest verified RC of this channel')
  // 区间上界必须是下界的下一个 minor：借 major/minor 组回拼，防止写成 0.3 或 0.2.1。
  const nextMinorUpperBound = `${admitted[2]}.${Number(admitted[3]) + 1}`

  // 记录是「实测过哪些版本」，区间是「放行哪些版本」：方向相反但必须相容——
  // 每条记录都要落在区间内，且不得早于已验证下界（rc.1 及更早从未验证过）。
  const channelPrefix = lower.slice(0, lower.indexOf('-'))
  const rank = (version: string): number => {
    const parsed = new RegExp(`^${channelPrefix.replaceAll('.', '\\.')}(?:-rc\\.(\\d+))?$`).exec(version)
    assert.ok(parsed, `${version} must be a bare version in the ${channelPrefix} channel below ${nextMinorUpperBound}`)
    return parsed[1] === undefined ? Number.MAX_SAFE_INTEGER : Number(parsed[1])
  }
  const declared = Object.keys(pkg.dsh?.compatibility?.dshReleases ?? {})
  for (const version of declared) {
    assert.match(version, BARE_VERSION, `${version} must be a bare version`)
    assert.ok(
      rank(version) >= rank(lower),
      `${version} is older than the verified lower bound ${lower}, so the range cannot admit it`,
    )
  }
})

test('per-release DSH compatibility lists only verified releases', () => {
  // DSH STORE only restores a listing from exact per-release records under
  // dsh.compatibility.dshReleases, and a release with no record reads as
  // `unknown`. DSH itself refuses to load a plugin whose declared engine range
  // does not admit the running engine, so every record here must name a bare
  // version the honest peer range also admits — never a range, and never an
  // engine that no `test:engine` run covers.
  const releases = pkg.dsh?.compatibility?.dshReleases ?? {}
  const declared = Object.keys(releases)
  assert.ok(declared.length > 0, 'at least one declared-compatible release')
  for (const version of declared) {
    assert.match(version, BARE_VERSION, `${version} must be a bare version`)
    assert.equal(releases[version], 'compatible')
  }
})

test('DSH compatibility records every verified release of the admitted channel range', () => {
  // 用户 2026-10-24 拍板：准入由 `engines.dsh` 的区间负责（同 0.2.1 通道的 rc.2 及以上
  // 自动放行），本记录只列**实际跑过完整引擎矩阵**的版本 —— rc.2（npm `latest`）与
  // rc.3（npm `next`）。未来同通道新 RC 无需改声明即可准入，但只有补上记录才算已验证；
  // 这份记录同时是 `test:engine` 与 `test:install` 的矩阵来源，加记录就必须先跑通它们。
  const declared = Object.keys(pkg.dsh?.compatibility?.dshReleases ?? {})
  assert.equal(declared.length, 2, 'keep exactly two verified engine releases')
  assert.deepEqual(
    [...declared].sort(),
    ['0.2.1-rc.2', '0.2.1-rc.3'],
    'the RC channel records the npm-latest engine alongside the newest verified one',
  )
})

test('the manifest declares the same engine range it supports', () => {
  // 三处必须逐字相同。**`engines.dsh` 不是装饰**：自 dsh `0.2.1-alpha.4` 起，
  // 宿主 `evaluatePluginCompatibility` 在包自带 `engines.dsh` 时**只**看它，
  // 完全忽略 `@deepseek-ai/dsh*` peer（`app-boot/src/plugin-compatibility.ts`）；
  // 判定不通过时插件行被禁用、bundle 层被静默跳过、安装被拒绝。
  // `compatibility.dsh` 仍是我们自己的声明面（宿主不读它），由外部目录消费；
  // 三者分开维护必然漂移，故在此钉死相等。
  const supported = pkg.peerDependencies?.['@deepseek-ai/dsh-llm']
  assert.equal(pkg.dsh?.compatibility?.dsh, supported)
  assert.equal(pkg.engines?.dsh, supported)
  assert.equal(pkg.engines?.node, '>=22')
})

test('the Web client remains enabled without dsh-client-runtime', () => {
  assert.equal(pkg.dsh?.client?.platform, 'web')
  assert.equal(pkg.peerDependencies?.['@deepseek-ai/dsh-client-runtime'], undefined)
  assert.equal(pkg.devDependencies?.['@deepseek-ai/dsh-client-runtime'], undefined)
})

test('the client manifest contains only live client graph edges', () => {
  assert.deepEqual(pkg.dsh?.client?.inject, [
    '@deepseek-ai/dsh-client-locale',
    '@deepseek-ai/dsh-client-ui-settings',
    '@deepseek-ai/dsh-api-remotes',
  ])
  assert.equal(pkg.dsh?.client?.inject?.includes('@deepseek-ai/dsh-client-connection'), false)
  assert.equal(pkg.peerDependencies?.['@deepseek-ai/dsh-client-connection'], undefined)
  assert.equal(pkg.devDependencies?.['@deepseek-ai/dsh-client-connection'], undefined)
})

test('only the client-seeded UI peers are optional, and each stays a development package', () => {
  // The Web frontend hands every client bundle a `staticModules` seed table, and
  // lib/client.js requires exactly three of it: react, react/jsx-runtime (both
  // from the `react` package) and @deepseek-ai/dsh-client-ui-primitives. No
  // installed copy is needed at runtime, while a Desktop release — which
  // validates the whole peer closure of every active plugin and ships host
  // packages only — refuses to start unless those three are optional
  // (`desktop profile: … requires missing …`).
  //
  // The set is load-bearing in BOTH directions:
  //   - an optional peer is NEVER installed (npm and pnpm auto-install only
  //     missing non-optional peers), so every name here must also be a
  //     devDependency or the authortime tree silently loses it. `react` is the
  //     live case: tests/client-boot.test.ts imports the React component tree at
  //     runtime and nothing else would pull `react` in.
  //   - a host-required peer marked optional here would stop being installed in a
  //     fresh marketplace generation, and no other check can see that.
  const optional = Object.entries(pkg.peerDependenciesMeta ?? {})
    .filter(([, meta]) => meta?.optional === true)
    .map(([name]) => name)
    .sort()

  assert.deepEqual(optional, [
    '@deepseek-ai/dsh-client-ui-primitives',
    '@deepseek-ai/dsh-client-ui-slots',
    'react',
  ])
  for (const name of optional) {
    assert.ok(
      pkg.peerDependencies?.[name] !== undefined,
      `${name} is marked optional but declares no peer range, which makes that entry inert`,
    )
    assert.ok(
      pkg.devDependencies?.[name] !== undefined,
      `${name} is an optional peer, so no package manager installs it: keep it in devDependencies`,
    )
  }
})
