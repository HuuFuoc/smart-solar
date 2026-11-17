// Luật dùng chung mọi cổng: chatbot (ChatController, ChatService) và tra địa chỉ cũ (AdministrativeUnitQueries) của backend
// `main` (7c79fa8). Kết quả tra cứu là response THẬT của image c43e1cada345 (tests/fixtures/administrative-units.json).
// Chạy: npm test
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import {
  activeBlock,
  chatBlockOf,
  chatLimitState,
  chatMessageProblem,
  inProgressRetryDelay,
  isLimitWarning,
  isSessionId,
  mergeExchange,
  messageMaxAfter,
  newClientMessageId,
  nextAttempt,
  sortSessions,
} from '../src/features/chat/chatRules.ts'
import {
  legacyGroups,
  legacyQueryProblem,
  legacySearchKey,
  verifiedChoice,
} from '../src/features/pre-surveys/legacyLookup.ts'

const fixture = JSON.parse(readFileSync(new URL('./fixtures/administrative-units.json', import.meta.url), 'utf8'))
const S1 = '11111111-1111-4111-8111-111111111111'
const S2 = '22222222-2222-4222-8222-222222222222'

const message = (id, role, createdAt, extra = {}) => ({
  messageId: id,
  role,
  content: id,
  status: 'COMPLETED',
  createdAt,
  citations: [],
  ...extra,
})

describe('chat: câu hỏi trước khi gửi', () => {
  test('đúng: câu bình thường, 999 và đúng 1000 ký tự (không tính khoảng trắng hai đầu) thì gửi được', () => {
    assert.equal(chatMessageProblem('Tấm pin bảo hành bao lâu?'), null)
    assert.equal(chatMessageProblem('a'.repeat(999)), null)
    assert.equal(chatMessageProblem(`  ${'a'.repeat(1000)}  `), null)
  })
  test('quy tắc: rỗng / chỉ khoảng trắng / 1001 ký tự thì không gửi; ngưỡng thấp hơn do backend báo thì theo ngưỡng đó', () => {
    assert.equal(chatMessageProblem(''), 'Nhập câu hỏi.')
    assert.equal(chatMessageProblem(' \n\t '), 'Nhập câu hỏi.')
    assert.match(chatMessageProblem('a'.repeat(1001)), /1\.001 ký tự, tối đa 1\.000/)
    assert.match(chatMessageProblem('dòng 1\nđường dẫn ☀️ '.repeat(30), 500), /tối đa 500/)
  })
  test('ngưỡng ký tự: chỉ hạ theo details.maxCharacters của RAG_MESSAGE_TOO_LONG, số lạ thì giữ', () => {
    const tooLong = (maxCharacters) => ({ code: 'RAG_MESSAGE_TOO_LONG', details: { maxCharacters } })
    assert.equal(messageMaxAfter(tooLong(500), 1000), 500)
    assert.equal(messageMaxAfter(tooLong(2000), 1000), 1000)
    for (const bad of ['500', -1, 0, Number.NaN, Number.POSITIVE_INFINITY, null])
      assert.equal(messageMaxAfter(tooLong(bad), 1000), 1000)
    assert.equal(messageMaxAfter({ code: 'RAG_QUOTA_EXCEEDED', details: { maxCharacters: 10 } }, 1000), 1000)
    assert.equal(messageMaxAfter(new Error('mạng'), 1000), 1000)
  })
  test('quyền: mã phiên trên địa chỉ phải là GUID, mã lạ không được gửi lên', () => {
    assert.equal(isSessionId(S1), true)
    for (const bad of ['', 'abc', '1; drop', `${S1}x`, null, undefined]) assert.equal(isSessionId(bad), false)
  })
})

describe('chat: clientMessageId chống lặp', () => {
  test('mã mới mỗi lần, dài 36 (≤ 64); trình duyệt không có randomUUID vẫn ra UUID v4', () => {
    const id = newClientMessageId()
    assert.equal(id.length, 36)
    assert.notEqual(newClientMessageId(), id)
    const fake = { getRandomValues: (a) => a.fill(0xab) }
    assert.match(newClientMessageId(fake), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
  test('gửi lại đúng câu trong đúng phiên sau lỗi thì dùng lại mã; đổi câu hoặc đổi phiên thì mã mới', () => {
    let n = 0
    const make = () => `id-${++n}`
    const first = nextAttempt('  Hỏi A  ', S1, null, make)
    assert.deepEqual(first.body, { message: 'Hỏi A', sessionId: S1, clientMessageId: 'id-1' })
    assert.equal(nextAttempt('Hỏi A', S1, first.attempt, make).body.clientMessageId, 'id-1')
    assert.equal(nextAttempt('Hỏi B', S1, first.attempt, make).body.clientMessageId, 'id-2')
    assert.equal(nextAttempt('Hỏi A', S2, first.attempt, make).body.clientMessageId, 'id-3')
  })
  test('cuộc trò chuyện mới gửi sessionId null (backend tự mở phiên)', () => {
    assert.equal(nextAttempt('Xin chào', null, null).body.sessionId, null)
  })
  test('AI_REQUEST_IN_PROGRESS: tự gửi lại sau retryAfterSeconds (1–30 giây), tối đa 3 lần; lỗi khác không tự gửi', () => {
    const inProgress = (details) => ({ code: 'AI_REQUEST_IN_PROGRESS', details })
    assert.equal(inProgressRetryDelay(inProgress({ retryAfterSeconds: 3 }), 0), 3)
    assert.equal(inProgressRetryDelay(inProgress({ retryAfterSeconds: 0.2 }), 0), 1)
    assert.equal(inProgressRetryDelay(inProgress({ retryAfterSeconds: 600 }), 2), 30)
    assert.equal(inProgressRetryDelay(inProgress(undefined), 1), 2)
    assert.equal(inProgressRetryDelay(inProgress({ retryAfterSeconds: 3 }), 3), null)
    assert.equal(inProgressRetryDelay({ code: 'RAG_QUOTA_EXCEEDED', details: { retryAfterSeconds: 3 } }, 0), null)
  })
})

describe('chat: giới hạn backend báo khi gửi', () => {
  const NOW = Date.parse('2026-11-17T10:00:00Z')
  test('đúng: mỗi mã về đúng loại, giờ hỏi lại lấy từ details.retryAfterSeconds (giới hạn mỗi phút lấy Retry-After)', () => {
    assert.deepEqual(chatBlockOf({ code: 'AUTH_TOO_MANY_REQUESTS', retryAfter: 12, details: null }, NOW), {
      kind: 'cooldown',
      until: NOW + 12_000,
    })
    assert.deepEqual(chatBlockOf({ code: 'RAG_QUOTA_EXCEEDED', details: { retryAfterSeconds: 3600 } }, NOW), {
      kind: 'quota-exceeded',
      until: NOW + 3_600_000,
    })
    assert.equal(chatBlockOf({ code: 'AI_USER_QUOTA_EXCEEDED', details: {} }, NOW).kind, 'quota-exceeded')
    assert.equal(chatBlockOf({ code: 'RAG_TOO_MANY_CONCURRENT_REQUESTS', details: {} }, NOW).kind, 'cooldown')
    assert.equal(
      chatBlockOf({ code: 'AI_GLOBAL_CONCURRENCY_LIMIT', details: { retryAfterSeconds: 5 } }, NOW).kind,
      'global-busy',
    )
    assert.deepEqual(chatBlockOf({ code: 'AI_BUDGET_EXCEEDED', details: {} }, NOW), {
      kind: 'budget-exceeded',
      until: null,
    })
    assert.deepEqual(chatBlockOf({ code: 'AI_GENERATION_DISABLED', details: { retryAfterSeconds: 9 } }, NOW), {
      kind: 'generation-disabled',
      until: null,
    })
  })
  test('ngoại lệ: lỗi không phải giới hạn và số giây lạ (âm, chuỗi, vô hạn) không thành giờ hỏi lại', () => {
    assert.equal(chatBlockOf({ code: 'RAG_TIMEOUT' }, NOW), null)
    assert.equal(chatBlockOf(new Error('mạng'), NOW), null)
    assert.equal(chatBlockOf(null, NOW), null)
    for (const bad of [-5, '30', Number.POSITIVE_INFINITY])
      assert.equal(chatBlockOf({ code: 'RAG_QUOTA_EXCEEDED', details: { retryAfterSeconds: bad } }, NOW).until, null)
  })
  test('lưu qua tải trang: chỉ giữ hết lượt / hết hạn mức / tạm ngưng còn hiệu lực; dạng lạ thì bỏ', () => {
    assert.deepEqual(activeBlock({ kind: 'quota-exceeded', until: NOW + 1 }, NOW), {
      kind: 'quota-exceeded',
      until: NOW + 1,
    })
    assert.deepEqual(activeBlock({ kind: 'generation-disabled', until: null }, NOW), {
      kind: 'generation-disabled',
      until: null,
    })
    assert.equal(activeBlock({ kind: 'quota-exceeded', until: NOW }, NOW), null)
    assert.equal(activeBlock({ kind: 'cooldown', until: NOW + 5000 }, NOW), null)
    for (const bad of [null, 'x', { kind: 'hack', until: null }, { kind: 'budget-exceeded', until: '1' }])
      assert.equal(activeBlock(bad, NOW), null)
  })
  test('dấu "!": tạm ngưng > hết hạn mức / lượt > đang chờ > quá / sắp chạm số ký tự > bình thường', () => {
    const state = (block, text = '', waitSeconds = 0) => chatLimitState({ text, max: 1000, block, waitSeconds }).kind
    const long = 'a'.repeat(1001)
    assert.equal(state({ kind: 'generation-disabled', until: null }, long, 30), 'generation-disabled')
    assert.equal(state({ kind: 'budget-exceeded', until: null }, long, 30), 'budget-exceeded')
    assert.equal(state({ kind: 'quota-exceeded', until: NOW }, long), 'quota-exceeded')
    assert.equal(state({ kind: 'global-busy', until: null }, long), 'global-busy')
    assert.equal(state({ kind: 'cooldown', until: NOW }, long, 8), 'cooldown')
    assert.equal(state({ kind: 'cooldown', until: NOW }, long, 0), 'over-character-limit')
    assert.equal(state(null, 'a'.repeat(900)), 'near-character-limit')
    assert.equal(state(null, 'a'.repeat(899)), 'normal')
    assert.equal(isLimitWarning(chatLimitState({ text: 'a', max: 1000, block: null, waitSeconds: 0 })), false)
    assert.equal(isLimitWarning(chatLimitState({ text: long, max: 1000, block: null, waitSeconds: 0 })), true)
  })
})

describe('chat: lịch sử', () => {
  const detail = {
    session: {
      sessionId: S1,
      title: 'Hỏi A',
      createdAt: '2026-11-03T01:00:00+00:00',
      updatedAt: '2026-11-03T01:00:01+00:00',
    },
    messages: [message('q1', 'USER', '2026-11-03T01:00:00Z'), message('a1', 'ASSISTANT', '2026-11-03T01:00:01Z')],
  }
  const answer = {
    sessionId: S1,
    question: message('q2', 'USER', '2026-11-03T08:05:00+07:00'),
    answer: message('a2', 'ASSISTANT', '2026-11-03T08:05:02+07:00', { status: 'INSUFFICIENT_CONTEXT' }),
    grounded: false,
    notice: 'n',
  }
  test('đúng: ghép câu hỏi + câu trả lời backend vừa trả vào cuối, cập nhật giờ (so theo thời điểm, không so chuỗi)', () => {
    const merged = mergeExchange(detail, answer)
    assert.deepEqual(
      merged.messages.map((m) => m.messageId),
      ['q1', 'a1', 'q2', 'a2'],
    )
    assert.equal(merged.session.updatedAt, '2026-11-03T08:05:02+07:00')
  })
  test('gửi lại trả về đúng tin cũ thì không nhân đôi; câu trả lời của phiên khác không lọt vào', () => {
    const merged = mergeExchange(detail, answer)
    assert.equal(mergeExchange(merged, answer), merged)
    assert.equal(mergeExchange(detail, { ...answer, sessionId: S2 }), detail)
  })
  test('danh sách phiên: mới cập nhật lên đầu, không đổi mảng gốc', () => {
    const list = [
      { sessionId: S1, title: 'cũ', createdAt: '', updatedAt: '2026-11-01T00:00:00Z' },
      { sessionId: S2, title: 'mới', createdAt: '', updatedAt: '2026-11-03T00:00:00Z' },
    ]
    assert.deepEqual(
      sortSessions(list).map((s) => s.title),
      ['mới', 'cũ'],
    )
    assert.equal(list[0].title, 'cũ')
  })
})

describe('tra địa chỉ cũ: từ khoá', () => {
  test('chuẩn hoá như backend: bỏ dấu, đ → d, chữ thường, gộp khoảng trắng', () => {
    assert.equal(legacySearchKey('  Gò   Vấp '), 'go vap')
    assert.equal(legacySearchKey('Phường Đa Kao'), 'phuong da kao')
  })
  test('quy tắc: dưới 2 ký tự (sau khi bỏ khoảng trắng) hoặc quá 100 ký tự thì không gọi API', () => {
    assert.match(legacyQueryProblem('a'), /ít nhất 2/)
    assert.match(legacyQueryProblem('  đ  '), /ít nhất 2/)
    assert.match(legacyQueryProblem('x'.repeat(101)), /Tối đa 100/)
    assert.equal(legacyQueryProblem('q9'), null)
    assert.equal(legacyQueryProblem('760'), null)
  })
})

describe('tra địa chỉ cũ: kết quả thật của backend', () => {
  test('mã đổ vào form là mã phường MỚI: "Phường 9, Quận 10" → Phường Vườn Lài 27190, không phải mã cũ 27181', () => {
    const groups = legacyGroups(fixture.legacy['phuong 9'], '79')
    const q10 = groups.find((g) => g.title === 'Phường 9, Quận 10')
    assert.deepEqual(
      q10.choices.map((c) => [c.code, c.name]),
      [['27190', 'Phường Vườn Lài']],
    )
    // Quận 3: mã cũ trùng số với mã mới, vẫn lấy theo candidate.code
    assert.equal(groups.find((g) => g.title === 'Phường 9, Quận 3').choices[0].code, '27142')
    assert.equal(fixture.legacy['phuong 9'].requiresConfirmation, true)
  })
  test('tra theo quận cũ: gộp phường mới lặp lại, giữ danh sách phường cũ', () => {
    const [district] = legacyGroups(fixture.legacy['go vap'], '79')
    assert.equal(district.title, 'Quận Gò Vấp')
    const raw = fixture.legacy['go vap'].matches[0].candidates
    assert.ok(raw.length > district.choices.length, 'backend trả mỗi phường cũ một dòng')
    const codes = district.choices.map((c) => c.code)
    assert.equal(new Set(codes).size, codes.length)
    const anHoiTay = district.choices.find((c) => c.code === '26882')
    assert.deepEqual(anHoiTay.fromLegacy, ['Phường 12', 'Phường 14'])
  })
  test('địa bàn bị chia (PARTIAL) ở tỉnh cũ khác được đánh dấu; truncated của backend giữ nguyên', () => {
    const groups = legacyGroups(fixture.legacy['hiep thanh'], '79')
    const tdm = groups.find((g) => g.province === 'Tỉnh Bình Dương')
    assert.ok(tdm.choices.length >= 2)
    assert.ok(tdm.choices.every((c) => c.partial))
    assert.equal(groups.find((g) => g.province === null).choices[0].partial, false)
    assert.equal(fixture.legacy.phuong.truncated, true)
    assert.equal(fixture.legacy.phuong.matches.length, 50)
  })
  test('lỗi: chỉ đổ vào form khi mã mới có trong danh mục phường, xã đang hiệu lực', () => {
    assert.deepEqual(verifiedChoice({ code: '27190' }, fixture.communes), {
      ward: 'Phường Vườn Lài',
      communeCode: '27190',
    })
    assert.equal(verifiedChoice({ code: '27181' }, fixture.communes), null, 'mã cũ không phải mã phường mới')
    assert.equal(verifiedChoice({ code: '27190' }, undefined), null, 'danh mục chưa tải / lỗi')
  })
})
