/**
 * AccountsCard 首屏读取接线的真实渲染测试（node:test + react-test-renderer）。
 *
 * 为什么需要真的渲染：`refreshUsageAuto()` 存在性测试只能证明注入面提供了入口，
 * 证明不了「账户卡片首屏真的走它」。17b2b5d 修过一次「提交说明说走 auto、实现
 * 却停在显式」的错，且没有任何行为测试能发现回退——把组件改回 `onRefresh()` 时
 * 全量测试仍然全绿。这里用真实 React 树钉住两条线：
 *   1. 首屏 effect 必须调用 `onRefreshAuto()`（可被 5 秒窗口合并）；
 *   2. 刷新按钮必须调用 `onRefresh()`（用户点的，永远重新读取）。
 *
 * 运行环境说明：`section.tsx` 会导入宿主的 UI primitives 与 `*.module.css`，
 * 两者在 node 下都不可直接解析，所以先注册 `_css-module-loader.mjs`（它把 CSS
 * 映射为空模块、把 primitives 换成最小替身），再动态 import 组件——静态 import
 * 会提升到 `register()` 调用之前。
 */

import { register } from 'node:module'

register(new URL('./_css-module-loader.mjs', import.meta.url).href)

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement, type ComponentProps } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'

import type { SettingsCommandCodeKey } from '../src/client/locales.ts'
import type { SettingsPageState, StagedField } from '../src/client/settings.ts'
import type { UsagePageState } from '../src/client/usage.ts'
import type { LoginPageState } from '../src/client/login.ts'
import type { AccountEnrollmentController } from '../src/client/enrollment.ts'

const { AccountsCard } = await import('../src/client/section.tsx')

// React 18 的 act 环境标记：不设置会为 effect 打印 "not wrapped in act" 警告。
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function stagedField(): StagedField {
  return { text: '', clear: false, overridden: false, invalid: false, invalidReason: undefined }
}

/** 完整的 SettingsPageState；本用例只关心读取接线，其余字段取空值。 */
function makeState(overrides: Partial<SettingsPageState> = {}): SettingsPageState {
  return {
    available: true,
    writable: true,
    apiKeyConfigured: false,
    apiKeyKnown: true,
    anyAccountConfigured: false,
    apiKeyWritable: true,
    apiKey: stagedField(),
    apiBase: stagedField(),
    requestTimeoutMs: stagedField(),
    streamIdleTimeoutMs: stagedField(),
    transportMaxRetries: stagedField(),
    offloadSeenImagesForCache: stagedField(),
    filterModelsByPlan: stagedField(),
    webSearch: stagedField(),
    showSidebarQuota: stagedField(),
    zdr: stagedField(),
    sidebarQuota: false,
    activeAccount: '',
    accounts: [],
    accountModels: {},
    accountBusy: false,
    accountFailed: undefined,
    pendingCredentialCleanup: [],
    accountEnrollmentRefs: [],
    visibleModels: [],
    visibleModelsAll: true,
    contextWindow: stagedField(),
    maxOutputTokens: stagedField(),
    contextWindowOverrides: [],
    catalogModels: [],
    catalogFailed: false,
    dirty: false,
    invalid: false,
    saving: false,
    failed: false,
    savedCount: 0,
    saveResult: undefined,
    accountResult: undefined,
    credentialRefreshFailed: false,
    ...overrides,
  }
}

const usageIdle: UsagePageState = { status: 'idle', report: undefined, error: undefined, fetchedAt: undefined }
const loginIdle: LoginPageState = {
  phase: 'idle',
  authUrl: undefined,
  userName: undefined,
  keyName: undefined,
  reason: undefined,
  message: undefined,
}

/** 账户卡会接上的动作面；异步操作一律立即成功。 */
const actions = {
  refreshCredentials: () => {},
  cleanup: async () => true,
  rename: async () => true,
  remove: async () => true,
  setKey: async () => true,
  clearKey: async () => true,
  setActive: async () => true,
  setModels: async () => true,
  beginLogin: () => {},
  cancelLogin: () => {},
}

/** 开通控制器在首屏只被 activate/dispose；给一个不会联网的最小替身。 */
const ENROLLMENT_SNAPSHOT = { active: undefined, pending: [] as const, error: undefined }
const enrollment = {
  store: {
    subscribe: () => () => {},
    // React 要求 getSnapshot 返回稳定引用，否则会反复重渲染。
    getSnapshot: () => ENROLLMENT_SNAPSHOT,
  },
  activate: () => {},
  dispose: () => {},
  refresh: async () => {},
} as unknown as AccountEnrollmentController

type CardProps = ComponentProps<typeof AccountsCard>

function makeProps(calls: string[]): CardProps {
  return {
    t: ((key: string) => key) as unknown as Translate<SettingsCommandCodeKey>,
    state: makeState(),
    usage: usageIdle,
    login: loginIdle,
    disabled: false,
    actions,
    onRefresh: () => { calls.push('explicit') },
    onRefreshAuto: () => { calls.push('auto') },
    createEnrollment: () => enrollment,
    expanded: true,
    onToggle: () => {},
  } as unknown as CardProps
}

/** 递归取出一棵 React children 里的纯文本（图标是元素，不能 JSON 序列化）。 */
function textOf(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (node !== null && typeof node === 'object' && 'props' in node) {
    return textOf((node as { props: { children?: unknown } }).props.children)
  }
  return ''
}

/** 找到标题为「刷新」的按钮（`t` 在这里返回 key 本身）。 */
function refreshButton(root: ReactTestRenderer) {
  const button = root.root.findAllByType('button').find((node) =>
    textOf(node.props.children).includes('usageRefresh'))
  assert.ok(button, '账户卡必须有刷新按钮')
  return button
}

test('账户卡片首屏只调用自动路径，不调用显式路径', () => {
  const calls: string[] = []
  let root!: ReactTestRenderer
  act(() => { root = create(createElement(AccountsCard, makeProps(calls))) })
  assert.deepEqual(calls, ['auto'], '首屏不是用户点的，必须走可合并的 auto 路径')
  act(() => { root.unmount() })
})

test('账户卡片的刷新按钮走显式路径，不调用自动路径', () => {
  const calls: string[] = []
  let root!: ReactTestRenderer
  act(() => { root = create(createElement(AccountsCard, makeProps(calls))) })
  // 首屏那次是 auto；只看按钮点击，先把记录清空。
  calls.length = 0
  act(() => { refreshButton(root).props.onClick({}) })
  assert.deepEqual(calls, ['explicit'], '用户点刷新必须走显式路径，永远重新读取')
  act(() => { root.unmount() })
})
