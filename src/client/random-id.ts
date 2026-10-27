/**
 * 页面身份（issue #102）。`crypto.randomUUID` 是安全上下文专属：局域网里用
 * `http://<ip>:3080` 打开设置页时它是 `undefined`，而这里在控制器构造期就调用，
 * 异常会落到设置页插槽的错误边界上，整块内容变成空白。`crypto.getRandomValues`
 * 在非安全上下文同样可用，因此只在 `randomUUID` 不可用时按 RFC 4122 自行拼一个 v4。
 */
export function randomId(): string {
  const source = globalThis.crypto
  if (typeof source?.randomUUID === 'function') return source.randomUUID()
  const bytes = source.getRandomValues(new Uint8Array(16))
  // 版本位固定 4（v4 UUID），变体位固定 `10`，与 `randomUUID` 的输出同形。
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
