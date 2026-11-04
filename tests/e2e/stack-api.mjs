// Helper cho E2E với BACKEND THẬT trên stack kiểm thử riêng (xem docs/api/SmartSolar_Post_Audit_Remediation.md):
// API ASP.NET, Postgres, MinIO, Mailpit, RAG, PayOS GIẢ LẬP. Không dùng cho môi trường dùng chung.
// Cấu hình qua biến môi trường (không commit mật khẩu):
//   AUDIT_STACK_API=http://127.0.0.1:8090        gốc API (đi thẳng, không qua proxy) – dùng cho bước tiền đề ngoài 76 endpoint
//   AUDIT_MAILPIT=http://127.0.0.1:58025          API của Mailpit
//   AUDIT_ACCOUNTS_FILE=<đường dẫn .env.accounts> hoặc E2E_<ROLE>_EMAIL / E2E_<ROLE>_PASSWORD
import { createHash } from 'node:crypto'
import fs from 'node:fs'

export const STACK_API = (process.env.AUDIT_STACK_API ?? '').replace(/\/$/, '')
export const MAILPIT = (process.env.AUDIT_MAILPIT ?? 'http://127.0.0.1:58025').replace(/\/$/, '')

function loadAccounts() {
  const file = process.env.AUDIT_ACCOUNTS_FILE
  const fromFile = file && fs.existsSync(file)
    ? Object.fromEntries(fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((l) => l.split(/=(.*)/s).slice(0, 2)))
    : {}
  return { ...fromFile, ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('E2E_'))) }
}
const ACCOUNTS = loadAccounts()
export const account = (role) => ({ email: ACCOUNTS[`E2E_${role}_EMAIL`], password: ACCOUNTS[`E2E_${role}_PASSWORD`] })

/** Bỏ qua cả bộ test khi chưa có stack hoặc chưa đủ tài khoản */
export async function stackSkipReason(roles) {
  if (!STACK_API) return 'chưa khai AUDIT_STACK_API'
  const missing = roles.filter((r) => !account(r).email || !account(r).password)
  if (missing.length) return `thiếu tài khoản: ${missing.join(', ')}`
  try {
    const res = await fetch(`${STACK_API}/swagger/v1/swagger.json`, { signal: AbortSignal.timeout(3000) })
    return res.ok ? false : `API trả ${res.status}`
  } catch {
    return `không gọi được ${STACK_API}`
  }
}

const tokens = new Map()
async function token(role) {
  if (tokens.has(role)) return tokens.get(role)
  const { email, password } = account(role)
  const res = await fetch(`${STACK_API}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`đăng nhập ${role}: ${res.status} ${json?.error?.code}`)
  tokens.set(role, json.data.accessToken)
  userIds.set(role, json.data.userId)
  return json.data.accessToken
}

const userIds = new Map()
/** Mã tài khoản của vai trò (lấy từ lần đăng nhập API) */
export async function userId(role) {
  if (!userIds.has(role)) await token(role)
  return userIds.get(role)
}

/** Gọi API thật với vai trò `role`; trả { status, data, error, traceId } (không ném khi lỗi nghiệp vụ) */
export async function call(role, method, path, body) {
  const headers = { 'content-type': 'application/json' }
  if (role) headers.authorization = `Bearer ${await token(role)}`
  const res = await fetch(`${STACK_API}/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  if (res.status === 401 && role && tokens.has(role)) {
    tokens.delete(role)
    return call(role, method, path, body)
  }
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {}
  return { status: res.status, data: json?.data, error: json?.error, traceId: json?.traceId, raw: json ? null : text, headers: res.headers }
}

/** Như `call` nhưng ném lỗi khi không 2xx (dùng cho bước tiền đề) */
export async function must(role, method, path, body) {
  const r = await call(role, method, path, body)
  if (r.status >= 300) throw new Error(`${method} ${path} (${role}) → ${r.status} ${r.error?.code ?? ''} ${r.error?.message ?? r.raw ?? ''}`)
  return r.data
}

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

/** Tải tệp đúng luồng của FE: xin link PUT → PUT thẳng lên kho → đăng ký (backend đọc lại, xác minh) → fileId đã VERIFIED */
export async function uploadFile(role, purpose, fileName, contentType, bytes) {
  const link = await must(role, 'POST', '/files/presigned-upload', { purpose, fileName, contentType, sizeBytes: bytes.length })
  const put = await fetch(link.url ?? link.uploadUrl, { method: 'PUT', headers: link.headers ?? { 'content-type': contentType }, body: bytes })
  if (!put.ok) throw new Error(`PUT kho tệp ${put.status}`)
  let file = await must(role, 'POST', '/files', {
    purpose,
    bucket: link.bucket,
    objectKey: link.objectKey,
    fileName,
    contentType,
    sizeBytes: bytes.length,
    checksumSha256: sha256(bytes),
  })
  for (let i = 0; i < 5 && file.status === 'PENDING_VERIFICATION'; i++) {
    await new Promise((r) => setTimeout(r, 1500))
    file = await must(role, 'POST', `/files/${file.fileId}/verify`)
  }
  if (file.status !== 'VERIFIED') throw new Error(`tệp ${fileName}: ${file.status} ${file.rejectionReason ?? ''}`)
  return file.fileId
}

/** PDF tối thiểu hợp lệ (đủ để backend nhận đúng loại theo byte đầu) */
export function tinyPdf(text) {
  const body = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length ${text.length + 30}>>stream\nBT /F1 12 Tf 10 100 Td (${text}) Tj ET\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n`
  return Buffer.from(body, 'latin1')
}

/** PNG 1×1 hợp lệ */
export const tinyPng = () =>
  Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

/** Token trong link của thư mới nhất gửi tới `to` */
export async function mailToken(to, pathPart) {
  for (let i = 0; i < 40; i++) {
    const list = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`)).json()
    for (const m of list.messages ?? []) {
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${m.ID}`)).json()
      const found = `${msg.Text ?? ''}${msg.HTML ?? ''}`.match(new RegExp(`${pathPart}\\?token=([^"&\\s<]+)`))
      if (found) return decodeURIComponent(found[1])
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`không thấy thư ${pathPart} gửi tới ${to}`)
}

// ---------------------------------------------------------------- bằng chứng request

const BASELINE = JSON.parse(fs.readFileSync(new URL('./stack-baseline.json', import.meta.url), 'utf8'))
const normalize = (p) => p.toLowerCase().replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '{}')
const BASELINE_INDEX = new Map(BASELINE.map(([id, , m, p]) => [`${m} ${p.toLowerCase().replace(/\{[^}]+\}/g, '{}')}`, id]))
/** ID baseline (A01…G05) của một request, hoặc null nếu không thuộc 76 */
export const baselineId = (method, pathname) => BASELINE_INDEX.get(`${method} ${normalize(pathname)}`) ?? null

/**
 * Ghi mọi response /api/ của một trang (qua proxy Vite tới backend thật): method, đường dẫn đã thay id, status, traceId của backend,
 * mã lỗi. Không ghi token, body request hay URL ký sẵn
 */
export function recordApi(page, log, label) {
  page.on('response', async (res) => {
    const url = new URL(res.url())
    if (!url.pathname.startsWith('/api/')) return
    let body = null
    try {
      body = await res.json()
    } catch {}
    const method = res.request().method()
    log.push({
      at: new Date().toISOString(),
      actor: label,
      id: baselineId(method, url.pathname),
      method,
      path: url.pathname.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '{id}'),
      status: res.status(),
      traceId: body?.traceId ?? null,
      code: body?.error?.code ?? null,
    })
  })
}
