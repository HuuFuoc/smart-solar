// Backend giả cho phần dùng chung mọi cổng: chatbot (tag Chat) và danh mục hành chính (provinces, legacy-lookup), cộng đăng
// nhập / đăng xuất để đổi tài khoản. Gắn SAU installCustomerMockApi: route của Playwright chạy ngược thứ tự đăng ký, đường
// dẫn khác đi tiếp xuống mock của cổng khách (route.fallback). Chỉ dùng trong test.
// Bám ChatController + ChatService và AdministrativeUnitQueries của backend `main` (7c79fa8); mã lỗi → HTTP status theo
// OperationResultControllerBase.StatusFor; giới hạn số lần trả 429 AUTH_TOO_MANY_REQUESTS kèm Retry-After như RateLimitingExtensions.
// Kết quả tra địa chỉ cũ là response thật của image c43e1cada345 (fixtures/administrative-units.json)
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { token } from './mock-customer-api.mjs'

export const UNITS = JSON.parse(readFileSync(new URL('./fixtures/administrative-units.json', import.meta.url), 'utf8'))

/** Câu `notice` cố định của ChatService */
export const NOTICE =
  'Câu trả lời được tạo tự động từ tài liệu đã công bố và có thể chưa đầy đủ; không thay thế tư vấn kỹ thuật hoặc điều khoản hợp đồng.'
/** ChatService.InsufficientAnswer */
export const INSUFFICIENT =
  'Xin lỗi, tôi chưa có đủ tài liệu đã được duyệt để trả lời chính xác câu hỏi này. Vui lòng liên hệ bộ phận tư vấn của SmartSolar.'

const DAY = 86_400_000
const ok = (data, status = 200) => ({ status, body: { isSuccess: true, traceId: 't', data } })

function statusFor(code) {
  if (code.endsWith('NOT_FOUND')) return 404
  if (code.includes('VALIDATION') || code === 'RAG_MESSAGE_TOO_LONG') return 400
  if (['FEATURE_PENDING_MIGRATION', 'SCHEMA_NOT_READY', 'RAG_SERVICE_UNAVAILABLE'].includes(code)) return 503
  if (['RAG_QUOTA_EXCEEDED', 'RAG_TOO_MANY_CONCURRENT_REQUESTS', 'AUTH_TOO_MANY_REQUESTS'].includes(code)) return 429
  return 409
}
export const fail = (code, message = code, details = null, headers = undefined) => ({
  status: statusFor(code),
  headers,
  body: { isSuccess: false, traceId: 't', data: null, error: { code, message, details } },
})
/** 429 của bộ giới hạn số lần (10 câu / phút) */
export const rateLimited = (seconds) =>
  fail('AUTH_TOO_MANY_REQUESTS', 'Too many requests. Please try again later.', null, {
    'Retry-After': String(seconds),
  })

export const CITATION = {
  rank: 1,
  documentId: 'doc-warranty',
  documentTitle: 'Chính sách bảo hành Smart Solar',
  versionId: 'ver-2',
  versionNumber: 2,
  chunkId: 'c-17',
  page: 4,
  section: 'Tấm pin',
  score: 0.82,
  snippet: 'Tấm pin được bảo hành sản phẩm 12 năm và hiệu suất 25 năm kể từ ngày bàn giao.',
}

/** Có chữ "bảo hành" thì trả lời theo tài liệu, còn lại không có tài liệu hỗ trợ */
function defaultReply(question) {
  return /bảo hành/i.test(question)
    ? { grounded: true, content: 'Tấm pin được bảo hành sản phẩm 12 năm, hiệu suất 25 năm [1].', citations: [CITATION] }
    : { grounded: false, content: INSUFFICIENT, citations: [] }
}

export function createSharedState(extra = {}) {
  return {
    requests: [],
    /** Người đang đăng nhập theo /auth/login gần nhất; refresh token cấp lại cho người này */
    currentUser: { sub: 'cust-1', role: 'CUSTOMER' },
    accounts: {
      'a@test.vn': { sub: 'cust-1', role: 'CUSTOMER' },
      'b@test.vn': { sub: 'cust-2', role: 'CUSTOMER' },
    },
    chat: {
      /** null | 'FEATURE_PENDING_MIGRATION' | 'SCHEMA_NOT_READY': mọi endpoint chat trả 503 */
      unavailable: null,
      /** Response dựng sẵn cho các lần POST tới (lỗi), lấy lần lượt */
      failNext: [],
      delayMs: 0,
      reply: defaultReply,
      sessions: [],
    },
    units: {
      provincesFail: null,
      /** Lỗi dựng sẵn cho các lần tra địa chỉ cũ tới */
      legacyFailNext: [],
      /** Trả chậm theo từ khoá đã bỏ dấu, để kiểm response cũ về sau */
      legacyDelay: {},
    },
    ...extra,
  }
}

/** Phiên có sẵn của một người: mỗi câu hỏi một cặp tin nhắn */
export function seedSession(state, owner, title, questions, updatedAt = Date.now() - DAY) {
  const session = { sessionId: randomUUID(), owner, title, createdAt: updatedAt - 60_000, updatedAt, messages: [] }
  for (const q of questions) addExchange(state, session, q, null, updatedAt)
  state.chat.sessions.push(session)
  return session
}

function messageView(m) {
  const { clientMessageId: _id, replyTo: _reply, ...view } = m
  return view
}

function addExchange(state, session, question, clientMessageId, at = Date.now()) {
  const reply = state.chat.reply(question)
  const q = {
    messageId: randomUUID(),
    role: 'USER',
    content: question,
    status: 'COMPLETED',
    createdAt: new Date(at).toISOString(),
    citations: [],
    clientMessageId,
  }
  const a = {
    messageId: randomUUID(),
    role: 'ASSISTANT',
    content: reply.content,
    status: reply.grounded ? 'COMPLETED' : 'INSUFFICIENT_CONTEXT',
    createdAt: new Date(at + 1).toISOString(),
    citations: reply.grounded ? reply.citations : [],
    replyTo: q.messageId,
  }
  session.messages.push(q, a)
  session.updatedAt = at + 1
  return { q, a }
}

const sessionView = (s) => ({
  sessionId: s.sessionId,
  title: s.title,
  createdAt: new Date(s.createdAt).toISOString(),
  updatedAt: new Date(s.updatedAt).toISOString(),
})
const answerView = (session, q, a) => ({
  sessionId: session.sessionId,
  question: messageView(q),
  answer: messageView(a),
  grounded: a.status === 'COMPLETED',
  notice: NOTICE,
})

function userOf(authorization) {
  const jwt = authorization?.replace(/^Bearer /, '')
  if (!jwt) return null
  try {
    return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString())
  } catch {
    return null
  }
}

const fold = (q) =>
  (q ?? '')
    .trim()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')

function tokens(user) {
  const now = Date.now()
  return ok({
    accessToken: token(user.role, user.sub),
    accessTokenExpiresAt: new Date(now + 3_600_000).toISOString(),
    refreshToken: `refresh-${user.sub}`,
    refreshTokenExpiresAt: new Date(now + DAY).toISOString(),
    tokenType: 'Bearer',
    userId: user.sub,
  })
}

export function handleShared(state, method, url, bodyText, authorization) {
  const u = new URL(url)
  const path = u.pathname.replace(/^\/api/, '')
  const q = Object.fromEntries(u.searchParams)
  const body = bodyText ? JSON.parse(bodyText) : undefined
  const user = userOf(authorization)
  state.requests.push({ method, path, query: q, body, user: user?.sub ?? null })

  // Đăng nhập, làm mới, đăng xuất
  if (method === 'POST' && path === '/auth/login') {
    const account = state.accounts[body?.email]
    if (!account) return fail('AUTH_INVALID_CREDENTIALS')
    state.currentUser = account
    return tokens(account)
  }
  if (method === 'POST' && path === '/auth/refresh') return tokens(state.currentUser)
  if (method === 'POST' && path === '/auth/logout') return ok(null)

  // Danh mục hành chính: công khai
  if (method === 'GET' && path === '/administrative-units/provinces')
    return state.units.provincesFail ?? { ...ok(UNITS.provinces), headers: { 'Cache-Control': 'public,max-age=3600' } }
  if (method === 'GET' && path === '/administrative-units/legacy-lookup') {
    const key = fold(q.q)
    if (key.length < 2)
      return fail('VALIDATION_FAILED', "'q' must contain at least 2 characters.", {
        q: ["'q' must contain at least 2 characters."],
      })
    if (state.units.legacyFailNext.length) return state.units.legacyFailNext.shift()
    const data = UNITS.legacy[key] ?? {
      query: q.q,
      provinceCode: q.provinceCode ?? null,
      matches: [],
      ambiguous: false,
      requiresConfirmation: true,
      truncated: false,
    }
    return { ...ok(data), delay: state.units.legacyDelay[key] ?? 0 }
  }

  // Chatbot: [Authorize] rồi mới tới cờ tính năng
  if (path.startsWith('/chat/')) {
    if (!user) return { status: 401, body: '' }
    if (state.chat.unavailable === 'FEATURE_PENDING_MIGRATION')
      return fail(
        'FEATURE_PENDING_MIGRATION',
        'This feature is not enabled until its database migration has been applied.',
      )
    if (state.chat.unavailable === 'SCHEMA_NOT_READY')
      return fail('SCHEMA_NOT_READY', 'Schema not ready.', {
        pendingMigrations: ['20261030201618_KnowledgeDocumentAudience'],
      })
  }
  if (method === 'GET' && path === '/chat/sessions')
    return ok(
      state.chat.sessions
        .filter((s) => s.owner === user.sub)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(sessionView),
    )
  const hit = path.match(/^\/chat\/sessions\/([^/]+)$/)
  if (hit && method === 'GET') {
    const s = state.chat.sessions.find((x) => x.sessionId === hit[1])
    if (!s || s.owner !== user.sub) return fail('RAG_SESSION_NOT_FOUND', 'Chat session was not found.')
    return ok({ session: sessionView(s), messages: s.messages.map(messageView) })
  }
  if (method === 'POST' && path === '/chat/messages') {
    if (state.chat.failNext.length) return state.chat.failNext.shift()
    const text = (body?.message ?? '').trim()
    if (!text)
      return fail('VALIDATION_FAILED', 'One or more fields are invalid.', { message: ['Message is required.'] })
    if (body.clientMessageId && body.clientMessageId.length > 64)
      return fail('VALIDATION_FAILED', 'One or more fields are invalid.', {
        clientMessageId: ['At most 64 characters.'],
      })
    if (text.length > 8000) return fail('RAG_MESSAGE_TOO_LONG', 'Questions must be 1–8000 characters.')
    let session
    if (body.sessionId) {
      session = state.chat.sessions.find((x) => x.sessionId === body.sessionId)
      if (!session || session.owner !== user.sub) return fail('RAG_SESSION_NOT_FOUND', 'Chat session was not found.')
      // Gửi lại cùng clientMessageId trong cùng phiên: trả lại câu đã lưu
      const existing = body.clientMessageId && session.messages.find((m) => m.clientMessageId === body.clientMessageId)
      if (existing) {
        const reply = session.messages.find((m) => m.replyTo === existing.messageId)
        return ok(answerView(session, existing, reply))
      }
    } else {
      const now = Date.now()
      session = {
        sessionId: randomUUID(),
        owner: user.sub,
        title: text.length <= 80 ? text : `${text.slice(0, 80)}…`,
        createdAt: now,
        updatedAt: now,
        messages: [],
      }
      state.chat.sessions.push(session)
    }
    const { q: question, a: answer } = addExchange(state, session, text, body.clientMessageId ?? null)
    return { ...ok(answerView(session, question, answer)), delay: state.chat.delayMs }
  }
  return null
}

const SHARED = /^\/api\/(chat\/|administrative-units\/(provinces|legacy-lookup)|auth\/(login|logout|refresh))/

/** `target`: page hoặc browser context. Gắn sau installCustomerMockApi */
export async function installSharedMockApi(target, state) {
  await target.route(
    (url) => SHARED.test(url.pathname),
    async (route) => {
      const request = route.request()
      const result = handleShared(
        state,
        request.method(),
        request.url(),
        request.postData(),
        await request.headerValue('authorization'),
      )
      if (!result) return route.fallback()
      if (result.delay) await new Promise((r) => setTimeout(r, result.delay))
      try {
        await route.fulfill({
          status: result.status,
          contentType: 'application/json',
          headers: result.headers,
          body: typeof result.body === 'string' ? result.body : JSON.stringify(result.body),
        })
      } catch {
        // Trang đã huỷ request (đổi từ khoá thì react-query huỷ lời gọi cũ)
      }
    },
  )
}
