// Luật phiếu thu tiền mặt của kỹ thuật viên (backend 147c66e + f176ef9): bảng trạng thái trên khối thanh toán, ẩn huỷ / xác nhận
// trực tiếp khi phiếu đang chờ, khách không bao giờ thấy phiếu thu, kiểm ảnh và form trước khi tải, cách xử lý từng mã lỗi khi
// gửi / xét duyệt, nhịp hỏi lại, báo đổi trạng thái một lần, đường dẫn API khớp backend. Chạy: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  acceptedReceipt,
  canReview,
  canSubmitReceipt,
  cashReceiptUnderReview,
  collectedAtValue,
  currentReceipt,
  EVIDENCE_MAX_BYTES,
  evidenceKind,
  evidenceProblem,
  newArrivals,
  pollWithBackoff,
  readQueueFilter,
  reasonError,
  receiptContextLabel,
  receiptFormErrors,
  receiptHistory,
  receiptKey,
  receiptPanelFor,
  receiptPollMs,
  receiptsSupported,
  receiptStatusMeta,
  receiptTransition,
  retryDelayMs,
  retryReceiptRead,
  reviewFailure,
  reviewNoteError,
  submitFailure,
  technicianReceiptStep,
} from '../src/features/cash-receipts/cashReceiptRules.ts'
import { ENDPOINTS } from '../src/services/api/endpoints.ts'

const attempt = (over = {}) => ({
  paymentAttemptId: 'att-1',
  method: 'CASH',
  status: 'PENDING',
  amount: 5_550_000,
  createdAt: '2026-11-27T02:30:00Z',
  ...over,
})
const receipt = (over = {}) => ({
  cashReceiptId: 'rc-1',
  paymentAttemptId: 'att-1',
  contractId: 'c-1',
  contractInstallmentId: 'i-1',
  amount: 5_550_000,
  receiptNumber: 'PT-000123',
  collectedByUserId: 'tech-1',
  collectedAt: '2026-11-27T02:40:00Z',
  evidenceFileId: 'f-1',
  note: null,
  status: 'SUBMITTED',
  submittedAt: '2026-11-27T02:41:00Z',
  reviewedByUserId: null,
  reviewedAt: null,
  reviewReason: null,
  revision: 1,
  ...over,
})
/** Khoản đang chờ tiền mặt trên máy chủ đã có phiếu thu */
const view = (over = {}) => ({
  paymentState: 'AWAITING_CASH_CONFIRMATION',
  current: attempt(),
  currentCashReceipt: null,
  cashReceipts: [],
  ...over,
})
const err = (status, code = null, extra = {}) => ({ status, code, fieldErrors: {}, retryAfter: null, ...extra })

describe('bảng trạng thái của kỹ thuật viên', () => {
  test('AWAITING_CASH_CONFIRMATION, chưa có phiếu: chụp phiếu thu', () => {
    assert.equal(technicianReceiptStep(view()), 'capture')
    assert.equal(canSubmitReceipt(view()), true)
  })

  test('SUBMITTED: chờ quản lý, không gửi thêm, ẩn bỏ chọn tiền mặt / xác nhận trực tiếp', () => {
    const v = view({ currentCashReceipt: receipt(), cashReceipts: [receipt()] })
    assert.equal(technicianReceiptStep(v), 'submitted')
    assert.equal(canSubmitReceipt(v), false)
    assert.equal(cashReceiptUnderReview(v), true)
  })

  test('REJECTED: hiện lý do, gửi lại được, bỏ chọn tiền mặt lại được', () => {
    const r = receipt({ status: 'REJECTED', reviewReason: 'Ảnh mờ', revision: 2 })
    const v = view({ currentCashReceipt: r, cashReceipts: [r] })
    assert.equal(technicianReceiptStep(v), 'rejected')
    assert.equal(canSubmitReceipt(v), true)
    assert.equal(cashReceiptUnderReview(v), false)
  })

  test('PAID + ACCEPTED: quản lý đã xác nhận phiếu thu', () => {
    const r = receipt({ status: 'ACCEPTED', revision: 2 })
    const v = view({
      paymentState: 'PAID',
      current: attempt({ status: 'PAID' }),
      currentCashReceipt: r,
      cashReceipts: [r],
    })
    assert.equal(technicianReceiptStep(v), 'accepted')
    assert.equal(acceptedReceipt(v)?.receiptNumber, 'PT-000123')
    assert.equal(canSubmitReceipt(v), false)
  })

  test('WITHDRAWN chỉ là lịch sử: coi như chưa có phiếu, không có nút rút', () => {
    const r = receipt({ status: 'WITHDRAWN' })
    const v = view({ currentCashReceipt: r, cashReceipts: [r] })
    assert.equal(technicianReceiptStep(v), 'capture')
    assert.equal(receiptStatusMeta('WITHDRAWN').tone, 'neutral')
  })

  test('màu trạng thái: chờ vàng, xác nhận xanh, bổ sung đỏ, đã đóng xám; nhãn luôn có chữ', () => {
    assert.deepEqual(
      ['SUBMITTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'].map((s) => receiptStatusMeta(s).tone),
      ['warn', 'ok', 'danger', 'neutral'],
    )
    for (const s of ['SUBMITTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN']) assert.ok(receiptStatusMeta(s).label.length > 0)
    assert.equal(receiptStatusMeta('LẠ').label, 'LẠ')
  })

  test('máy chủ cũ (không có cashReceipts): giữ luồng cũ, không nút chụp', () => {
    const old = { paymentState: 'AWAITING_CASH_CONFIRMATION', current: attempt() }
    assert.equal(receiptsSupported(old), false)
    assert.equal(technicianReceiptStep(old), 'unsupported')
    assert.equal(canSubmitReceipt(old), false)
    assert.equal(cashReceiptUnderReview(old), false)
  })

  test('phiếu của lần thanh toán khác (lần cũ đã huỷ) không tính là phiếu hiện tại', () => {
    const v = view({ currentCashReceipt: receipt({ paymentAttemptId: 'att-old' }) })
    assert.equal(currentReceipt(v), null)
    assert.equal(technicianReceiptStep(v), 'capture')
  })

  test('chuyển trạng thái không hợp lệ: không gửi phiếu khi chưa chọn tiền mặt, đang QR, chưa tới lúc trả, đã trả', () => {
    for (const paymentState of ['AWAITING_PAYMENT', 'ONLINE_IN_PROGRESS', 'NOT_PAYABLE'])
      assert.equal(canSubmitReceipt(view({ paymentState })), false, paymentState)
    assert.equal(canSubmitReceipt(view({ paymentState: 'PAID', current: attempt({ status: 'PAID' }) })), false)
    assert.equal(canSubmitReceipt(view({ current: null })), false)
    assert.equal(canSubmitReceipt(null), false)
  })

  test('PAID bằng PayOS hay quản lý xác nhận trực tiếp: không có phiếu thu được xác nhận', () => {
    const v = view({ paymentState: 'PAID', current: attempt({ status: 'PAID', method: 'ONLINE' }) })
    assert.equal(acceptedReceipt(v), null)
    assert.equal(technicianReceiptStep(v), 'none')
  })

  test('ACCEPTED mà khoản chưa PAID không bao giờ hiện là đã trả', () => {
    const r = receipt({ status: 'ACCEPTED' })
    assert.equal(acceptedReceipt(view({ currentCashReceipt: r })), null)
  })

  test('lịch sử mới nhất trước', () => {
    const older = receipt({ cashReceiptId: 'a', submittedAt: '2026-11-27T02:00:00Z', status: 'REJECTED' })
    const newer = receipt({ cashReceiptId: 'b', submittedAt: '2026-11-27T03:00:00Z' })
    assert.deepEqual(
      receiptHistory({ cashReceipts: [older, newer] }).map((r) => r.cashReceiptId),
      ['b', 'a'],
    )
    assert.deepEqual(receiptHistory({ cashReceipts: null }), [])
  })
})

describe('ai thấy phiếu thu', () => {
  const withReceipt = view({ currentCashReceipt: receipt(), cashReceipts: [receipt()] })

  test('khách không bao giờ thấy phiếu thu, ảnh hay lịch sử, kể cả khi dữ liệu có', () => {
    assert.equal(receiptPanelFor('customer', withReceipt), null)
    assert.equal(receiptPanelFor('customer', view()), null)
    assert.equal(receiptPanelFor('customer', { ...withReceipt, cashReceipts: null, currentCashReceipt: null }), null)
  })

  test('kỹ thuật viên của hợp đồng thấy khối chụp / chờ', () => {
    assert.equal(receiptPanelFor('technician', view()), 'technician')
    assert.equal(receiptPanelFor('technician', withReceipt), 'technician')
  })

  test('nhân viên chỉ thấy khi đã có phiếu; chưa có thì giữ câu cũ', () => {
    assert.equal(receiptPanelFor('staff', withReceipt), 'staff')
    assert.equal(receiptPanelFor('staff', view()), null)
  })

  test('không vẽ khi khoản không chờ tiền mặt hoặc máy chủ cũ', () => {
    assert.equal(receiptPanelFor('technician', view({ paymentState: 'ONLINE_IN_PROGRESS' })), null)
    assert.equal(
      receiptPanelFor('technician', { paymentState: 'AWAITING_CASH_CONFIRMATION', current: attempt() }),
      null,
    )
  })
})

describe('ảnh phiếu thu', () => {
  const file = (name, type, size = 812_345) => ({ name, type, size })

  test('nhận JPEG, PNG, WebP, PDF tới đúng 15 MB', () => {
    for (const f of [
      file('phieu-thu.jpg', 'image/jpeg'),
      file('a.png', 'image/png'),
      file('a.webp', 'image/webp'),
      file('a.pdf', 'application/pdf'),
      file('a.jpg', 'image/jpeg', EVIDENCE_MAX_BYTES),
    ])
      assert.equal(evidenceProblem(f), null, f.name)
    assert.equal(evidenceKind(file('a.pdf', 'application/pdf')), 'pdf')
    assert.equal(evidenceKind(file('a.jpg', 'image/jpeg')), 'image')
  })

  test('camera không báo loại: đoán theo đuôi', () => {
    assert.equal(evidenceProblem(file('IMG_0001.JPG', '')), null)
    assert.equal(evidenceProblem(file('scan.pdf', 'application/octet-stream')), null)
  })

  test('từ chối HEIC, GIF, tệp không đuôi không loại, tệp rỗng, quá 15 MB', () => {
    assert.match(evidenceProblem(file('a.heic', 'image/heic')), /JPEG, PNG, WebP/)
    assert.match(evidenceProblem(file('a.gif', 'image/gif')), /JPEG, PNG, WebP/)
    assert.match(evidenceProblem(file('photo', '')), /JPEG, PNG, WebP/)
    assert.match(evidenceProblem(file('a.jpg', 'image/jpeg', 0)), /rỗng/)
    assert.match(evidenceProblem(file('a.jpg', 'image/jpeg', EVIDENCE_MAX_BYTES + 1)), /15 MB/)
  })
})

describe('form gửi phiếu thu', () => {
  const now = Date.parse('2026-11-27T03:00:00Z') // 10:00 giờ Việt Nam
  const ctx = { now, today: '2026-11-27', cashChosenAt: '2026-11-27T02:30:00Z' }
  const form = (over = {}) => ({
    receiptNumber: 'PT-000123',
    note: '',
    collectedDate: '',
    collectedTime: '',
    hasEvidence: true,
    ...over,
  })

  test('hợp lệ; bỏ trống giờ thu thì không gửi (backend lấy giờ gửi)', () => {
    assert.deepEqual(receiptFormErrors(form(), ctx), {})
    assert.equal(collectedAtValue(form(), ctx.today), null)
  })

  test('giờ thu ghi theo giờ Việt Nam, thiếu ngày là hôm nay', () => {
    assert.equal(collectedAtValue(form({ collectedTime: '09:40' }), ctx.today), '2026-11-27T09:40:00+07:00')
    assert.equal(
      collectedAtValue(form({ collectedDate: '2026-11-26', collectedTime: '17:05' }), ctx.today),
      '2026-11-26T17:05:00+07:00',
    )
    assert.deepEqual(receiptFormErrors(form({ collectedTime: '09:40' }), ctx), {})
  })

  test('số phiếu bắt buộc, bỏ khoảng trắng hai đầu, tối đa 100 ký tự', () => {
    assert.ok(receiptFormErrors(form({ receiptNumber: '   ' }), ctx).receiptNumber)
    assert.ok(receiptFormErrors(form({ receiptNumber: 'x'.repeat(101) }), ctx).receiptNumber)
    assert.equal(receiptFormErrors(form({ receiptNumber: `  ${'x'.repeat(100)}  ` }), ctx).receiptNumber, undefined)
  })

  test('ảnh bắt buộc, ghi chú tối đa 500', () => {
    assert.ok(receiptFormErrors(form({ hasEvidence: false }), ctx).evidence)
    assert.ok(receiptFormErrors(form({ note: 'a'.repeat(501) }), ctx).note)
    assert.equal(receiptFormErrors(form({ note: 'a'.repeat(500) }), ctx).note, undefined)
  })

  test('giờ thu: không quá 5 phút sau giờ hiện tại, không trước lúc chọn tiền mặt, có ngày thì phải có giờ', () => {
    assert.equal(receiptFormErrors(form({ collectedTime: '10:05' }), ctx).collectedAt, undefined)
    assert.ok(receiptFormErrors(form({ collectedTime: '10:10' }), ctx).collectedAt)
    assert.ok(receiptFormErrors(form({ collectedTime: '09:25' }), ctx).collectedAt)
    assert.ok(receiptFormErrors(form({ collectedDate: '2026-11-27' }), ctx).collectedAt)
  })
})

describe('lỗi khi gửi phiếu thu', () => {
  test('VALIDATION_FAILED: hiện cạnh đúng ô', () => {
    const f = submitFailure(
      err(400, 'VALIDATION_FAILED', {
        fieldErrors: { receiptNumber: 'required', evidenceFileId: 'photo', collectedAt: 'future', note: 'long' },
      }),
    )
    assert.equal(f.action, 'fields')
    assert.deepEqual(Object.keys(f.fields).sort(), ['collectedAt', 'evidence', 'note', 'receiptNumber'])
  })

  test('VALIDATION_FAILED chỉ vì paymentAttemptId: lần thanh toán trên màn đã cũ, tải lại', () => {
    assert.equal(
      submitFailure(err(400, 'VALIDATION_FAILED', { fieldErrors: { paymentAttemptId: 'x' } })).action,
      'reload-retry',
    )
  })

  test('số phiếu trùng của lần thanh toán khác: lỗi ở ô số phiếu', () => {
    const f = submitFailure(err(409, 'PAYMENT_CASH_RECEIPT_DUPLICATE'))
    assert.equal(f.action, 'fields')
    assert.ok(f.fields.receiptNumber)
  })

  test('ảnh của người khác / đã dùng cho lần thanh toán khác: bỏ ảnh, chụp ảnh khác', () => {
    assert.equal(submitFailure(err(403, 'FILE_NOT_OWNED')).action, 'replace-evidence')
    assert.equal(submitFailure(err(409, 'PAYMENT_CASH_RECEIPT_EVIDENCE_REUSED')).action, 'replace-evidence')
  })

  test('tệp mất / chưa xác minh / sai mục đích: tải lại đúng ảnh đã chọn', () => {
    for (const code of ['FILE_NOT_FOUND', 'FILE_NOT_VERIFIED', 'FILE_WRONG_PURPOSE', 'FILE_OBJECT_MISSING'])
      assert.equal(submitFailure(err(409, code)).action, 'reupload', code)
  })

  test('lần trả tiền mặt đã đổi: tải lại, bỏ mã cũ', () => {
    assert.equal(submitFailure(err(409, 'PAYMENT_CASH_RECEIPT_ATTEMPT_MISMATCH')).action, 'reload-retry')
  })

  test('đã có phiếu chờ, đã trả, bỏ chọn tiền mặt: tải lại và đóng', () => {
    for (const code of [
      'PAYMENT_CASH_RECEIPT_ALREADY_SUBMITTED',
      'PAYMENT_CASH_NOT_SELECTED',
      'PAYMENT_ALREADY_PAID',
      'CONTRACT_INSTALLMENT_ALREADY_PAID',
      'PAYMENT_CASH_RECEIPT_CONTEXT_MISMATCH',
    ])
      assert.equal(submitFailure(err(409, code)).action, 'reload-close', code)
  })

  test('số tiền đổi: chặn, báo hỗ trợ', () => {
    assert.equal(submitFailure(err(409, 'PAYMENT_CASH_AMOUNT_MISMATCH')).action, 'support')
  })

  test('mất mạng / lỗi hệ thống: chưa rõ đã gửi được chưa, tải lại trước khi gửi lại', () => {
    for (const status of [0, 500, 502, 504])
      assert.equal(submitFailure(err(status)).action, 'ambiguous', String(status))
  })

  test('429 đếm ngược theo Retry-After; hệ thống chưa chạy migration; 403; 404', () => {
    assert.deepEqual(submitFailure(err(429, null, { retryAfter: 12 })), { action: 'rate-limited', seconds: 12 })
    assert.deepEqual(submitFailure(err(429)), { action: 'rate-limited', seconds: 60 })
    assert.equal(submitFailure(err(503, 'SCHEMA_NOT_READY')).action, 'unavailable')
    assert.equal(submitFailure(err(403, 'FORBIDDEN')).action, 'forbidden')
    assert.equal(submitFailure(err(404, 'CONTRACT_NOT_FOUND')).action, 'gone')
    assert.equal(submitFailure(err(400, 'SOMETHING_NEW')).action, 'message')
  })
})

describe('xét duyệt của quản lý / quản trị', () => {
  const row = (over = {}) => ({ receipt: receipt(), paymentStatus: 'PENDING', ...over })

  test('chỉ xét được phiếu đang chờ của lần thanh toán chưa trả', () => {
    assert.equal(canReview(row()), true)
    assert.equal(canReview(row({ receipt: receipt({ status: 'ACCEPTED' }) })), false)
    assert.equal(canReview(row({ receipt: receipt({ status: 'REJECTED' }) })), false)
    assert.equal(canReview(row({ receipt: receipt({ status: 'WITHDRAWN' }) })), false)
    assert.equal(canReview(row({ paymentStatus: 'PAID' })), false)
    assert.equal(canReview(null), false)
  })

  test('lý do yêu cầu bổ sung bắt buộc, tối đa 500; ghi chú xác nhận tối đa 500', () => {
    assert.ok(reasonError('  '))
    assert.ok(reasonError('a'.repeat(501)))
    assert.equal(reasonError('Ảnh mờ, vui lòng chụp lại số phiếu thu'), null)
    assert.equal(reviewNoteError('Đã đối chiếu'), null)
    assert.ok(reviewNoteError('a'.repeat(501)))
  })

  test('revision cũ (hai người xét cùng lúc): tải lại, xem lại, không ghi đè', () => {
    assert.equal(reviewFailure(err(409, 'PAYMENT_CASH_RECEIPT_STALE')).action, 'stale')
    assert.equal(
      reviewFailure(err(400, 'VALIDATION_FAILED', { fieldErrors: { revision: 'required' } })).action,
      'stale',
    )
  })

  test('đã xét / đã trả / không còn tiền mặt: tải lại', () => {
    for (const code of [
      'PAYMENT_CASH_RECEIPT_NOT_REVIEWABLE',
      'PAYMENT_ALREADY_PAID',
      'CONTRACT_INSTALLMENT_ALREADY_PAID',
      'PAYMENT_CASH_NOT_SELECTED',
      'PAYMENT_CASH_ITEM_NOT_PAYABLE',
    ])
      assert.equal(reviewFailure(err(409, code)).action, 'reload', code)
  })

  test('lý do thiếu: lỗi ở ô lý do', () => {
    const f = reviewFailure(err(400, 'VALIDATION_FAILED', { fieldErrors: { reason: 'required' } }))
    assert.equal(f.action, 'fields')
    assert.equal(f.fields.reason, 'required')
  })

  test('ảnh không còn hợp lệ, số tiền lệch, không có quyền, mất mạng, 429, chưa migration', () => {
    assert.equal(reviewFailure(err(409, 'FILE_NOT_VERIFIED')).action, 'evidence-invalid')
    assert.equal(reviewFailure(err(409, 'PAYMENT_CASH_AMOUNT_MISMATCH')).action, 'support')
    assert.equal(reviewFailure(err(403, 'AUTH_FORBIDDEN')).action, 'forbidden')
    assert.equal(reviewFailure(err(0)).action, 'ambiguous')
    assert.equal(reviewFailure(err(429, null, { retryAfter: 5 })).action, 'rate-limited')
    assert.equal(reviewFailure(err(503, 'SCHEMA_NOT_READY')).action, 'unavailable')
  })
})

describe('đồng bộ trạng thái', () => {
  test('phiếu đang chờ: hỏi lại 15 giây; bị yêu cầu bổ sung: thôi hỏi; còn lại để luật cũ', () => {
    assert.equal(receiptPollMs(view({ currentCashReceipt: receipt() })), 15_000)
    assert.equal(receiptPollMs(view({ currentCashReceipt: receipt({ status: 'REJECTED' }) })), false)
    assert.equal(receiptPollMs(view()), null)
    assert.equal(receiptPollMs(view({ paymentState: 'PAID' })), null)
    assert.equal(receiptPollMs({ paymentState: 'AWAITING_CASH_CONFIRMATION', current: attempt() }), null)
  })

  test('429 giãn nhịp hỏi lại theo Retry-After, ít nhất 60 giây', () => {
    assert.equal(pollWithBackoff(15_000, null), 15_000)
    assert.equal(pollWithBackoff(15_000, err(429)), 60_000)
    assert.equal(pollWithBackoff(15_000, err(429, null, { retryAfter: 120 })), 120_000)
    assert.equal(pollWithBackoff(false, err(429)), false)
    assert.equal(pollWithBackoff(30_000, err(500)), 30_000)
  })

  test('báo một lần khi phiếu đổi từ chờ sang bổ sung / đã xác nhận; lần đọc đầu và lần gửi lại không báo', () => {
    const submitted = receiptKey(receipt())
    assert.equal(receiptTransition(null, receipt({ status: 'REJECTED' })), null)
    assert.equal(receiptTransition(submitted, receipt()), null)
    assert.equal(receiptTransition(submitted, receipt({ status: 'REJECTED' })), 'rejected')
    assert.equal(receiptTransition(submitted, receipt({ status: 'ACCEPTED' })), 'accepted')
    // REJECTED rồi gửi phiếu mới: không phải đổi trạng thái của phiếu đang theo dõi
    assert.equal(
      receiptTransition(receiptKey(receipt({ status: 'REJECTED' })), receipt({ cashReceiptId: 'rc-2' })),
      null,
    )
    assert.equal(receiptTransition(submitted, receipt({ cashReceiptId: 'rc-2', status: 'REJECTED' })), null)
  })

  test('phiếu mới vào hàng chờ trong phiên', () => {
    assert.deepEqual(newArrivals(null, ['a']), [])
    assert.deepEqual(newArrivals(new Set(['a']), ['a', 'b']), ['b'])
  })

  test('thử lại có kiểm soát: 429 / mất mạng / 5xx tối đa 2 lần, 4xx và chưa migration thì không', () => {
    assert.equal(retryReceiptRead(0, err(429)), true)
    assert.equal(retryReceiptRead(2, err(429)), false)
    assert.equal(retryReceiptRead(0, err(0)), true)
    assert.equal(retryReceiptRead(0, err(500)), true)
    assert.equal(retryReceiptRead(0, err(404)), false)
    assert.equal(retryReceiptRead(0, err(403)), false)
    assert.equal(retryReceiptRead(0, err(503, 'SCHEMA_NOT_READY')), false)
    assert.equal(retryDelayMs(0, err(429, null, { retryAfter: 7 })), 7_000)
    assert.equal(retryDelayMs(1, err(500)), 4_000)
    assert.equal(retryDelayMs(10, err(500)), 30_000)
  })
})

describe('hàng chờ của quản lý', () => {
  test('nhãn khoản: đợt 1 (30%), đợt 2 (70%), hậu mãi', () => {
    assert.equal(receiptContextLabel({ context: 'INSTALLATION_DEPOSIT', installmentSequence: 1 }), 'Đợt 1 (30%)')
    assert.equal(receiptContextLabel({ context: 'INSTALLATION_BALANCE', installmentSequence: 2 }), 'Đợt 2 (70%)')
    // Bản 147c66e chưa có `context`
    assert.equal(receiptContextLabel({ installmentKind: 'BALANCE', installmentSequence: 2 }), 'Đợt 2 (70%)')
    assert.equal(
      receiptContextLabel({
        context: 'AFTER_SALES_QUOTATION',
        serviceRequestNumber: 'SR-2026-000123',
        quotationVersion: 1,
      }),
      'Hậu mãi SR-2026-000123, báo giá lần 1',
    )
  })

  test('bộ lọc mặc định là chờ xác nhận; giá trị lạ về mặc định', () => {
    assert.equal(readQueueFilter(null), 'SUBMITTED')
    assert.equal(readQueueFilter('ACCEPTED'), 'ACCEPTED')
    assert.equal(readQueueFilter('ALL'), 'ALL')
    assert.equal(readQueueFilter('xyz'), 'SUBMITTED')
  })
})

describe('đường dẫn API khớp backend (PaymentPlanControllers, PaymentControllers)', () => {
  test('kỹ thuật viên', () => {
    assert.equal(
      ENDPOINTS.installments.technicianCashReceipt('c/1', 2),
      '/technician/contracts/c%2F1/installments/2/payment/cash-receipt',
    )
    assert.equal(
      ENDPOINTS.installments.technicianCashReceiptEvidenceUrl('c1', 1, 'r1'),
      '/technician/contracts/c1/installments/1/payment/cash-receipts/r1/evidence/url',
    )
    assert.equal(ENDPOINTS.installments.technician('c1', 1), '/technician/contracts/c1/installments/1/payment')
    assert.equal(ENDPOINTS.files.presignedUpload, '/files/presigned-upload')
  })

  test('quản lý / quản trị', () => {
    const d = ENDPOINTS.managerPayments
    assert.equal(d.cashReceipts, '/manager/payments/cash-receipts')
    assert.equal(d.cashReceipt('r1'), '/manager/payments/cash-receipts/r1')
    assert.equal(d.cashReceiptEvidenceUrl('r1'), '/manager/payments/cash-receipts/r1/evidence/url')
    assert.equal(d.acceptCashReceipt('r1'), '/manager/payments/cash-receipts/r1/accept')
    assert.equal(d.rejectCashReceipt('r1'), '/manager/payments/cash-receipts/r1/reject')
    assert.equal(d.cashConfirm('a1'), '/manager/payments/a1/cash/confirm')
  })
})
