import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomId } from '../src/client/random-id.ts'
import { AccountEnrollmentController, type EnrollmentRemote } from '../src/client/enrollment.ts'

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

/**
 * 换掉 `crypto.randomUUID` 后运行，结束按原属性描述符还原。传 `undefined` 即复现
 * `http://<ip>:3080` 的局域网访问：该 API 只属于安全上下文，那里不存在。
 */
function withRandomUuid<T>(implementation: (() => string) | undefined, run: () => T): T {
  const source = globalThis.crypto
  const original = Object.getOwnPropertyDescriptor(source, 'randomUUID')
  Object.defineProperty(source, 'randomUUID', { value: implementation, configurable: true, writable: true })
  try { return run() } finally {
    if (original) Object.defineProperty(source, 'randomUUID', original)
    else delete (source as { randomUUID?: unknown }).randomUUID
  }
}

test('安全上下文直接用平台的 randomUUID，不再自行拼装', () => {
  // 未命中快速路径时会返回一个形态不同的 v4，这个哨兵值因此能分辨走了哪条分支。
  assert.equal(withRandomUuid(() => 'stub-page-id', randomId), 'stub-page-id')
})

test('没有 crypto.randomUUID（非安全上下文）时仍生成互不相同的 v4 UUID', () => {
  const ids = withRandomUuid(undefined, () => Array.from({ length: 100 }, () => randomId()))
  assert.equal(new Set(ids).size, 100, '退回 getRandomValues 后仍是随机值')
  for (const id of ids) assert.match(id, V4)
})

test('非安全上下文下仍能构造页面控制器，并把同一页面身份带给宿主', async () => {
  const pages: string[] = []
  const unused = async (): Promise<never> => { throw new Error('未使用') }
  const remote: EnrollmentRemote = {
    enrollmentBegin: unused, enrollmentStatus: unused, enrollmentCancel: unused,
    enrollmentName: unused, enrollmentRetry: unused,
    enrollmentPending: async ({ pageId }) => { pages.push(pageId); return { ok: true, value: [] } },
    enrollmentWatch: () => { throw new Error('未使用') },
  }
  // 设置页在 `useState(createEnrollment)` 的惰性初始化里构造控制器：构造抛错即整块空白（issue #102）。
  const controller = withRandomUuid(undefined, () => new AccountEnrollmentController(() => remote, () => {}))
  await controller.refresh()
  controller.dispose()
  assert.equal(pages.length, 1)
  assert.match(pages[0]!, V4)
})
