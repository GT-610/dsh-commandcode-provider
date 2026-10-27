import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomId } from '../src/client/random-id.ts'
import { AccountEnrollmentController, type EnrollmentRemote } from '../src/client/enrollment.ts'

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

/** 复现 `http://<ip>:3080` 的局域网访问：`crypto.randomUUID` 只属于安全上下文，那里不存在。 */
function withoutRandomUuid<T>(run: () => T): T {
  const source = globalThis.crypto
  Object.defineProperty(source, 'randomUUID', { value: undefined, configurable: true, writable: true })
  try { return run() } finally { delete (source as { randomUUID?: unknown }).randomUUID }
}

test('页面身份是 v4 UUID，且每次不同', () => {
  const ids = Array.from({ length: 100 }, () => randomId())
  assert.equal(new Set(ids).size, 100)
  for (const id of ids) assert.match(id, V4)
})

test('没有 crypto.randomUUID（非安全上下文）时仍生成形态相同的 v4 UUID', () => {
  const ids = withoutRandomUuid(() => Array.from({ length: 100 }, () => randomId()))
  assert.equal(new Set(ids).size, 100, '退回 getRandomValues 后仍是随机值')
  for (const id of ids) assert.match(id, V4)
})

test('非安全上下文下仍能构造页面控制器，并把同一页面身份带给宿主', async () => {
  const pages: string[] = []
  const remote: EnrollmentRemote = {
    enrollmentBegin: async () => { throw new Error('未使用') },
    enrollmentStatus: async () => { throw new Error('未使用') },
    enrollmentCancel: async () => { throw new Error('未使用') },
    enrollmentName: async () => { throw new Error('未使用') },
    enrollmentRetry: async () => { throw new Error('未使用') },
    enrollmentPending: async ({ pageId }) => { pages.push(pageId); return { ok: true, value: [] } },
    enrollmentWatch: () => { throw new Error('未使用') },
  }
  // 设置页在 `useState(createEnrollment)` 的惰性初始化里构造控制器：构造抛错即整块空白（issue #102）。
  const controller = withoutRandomUuid(() => new AccountEnrollmentController(() => remote, () => {}))
  await controller.refresh()
  controller.dispose()
  assert.equal(pages.length, 1)
  assert.match(pages[0]!, V4)
})
