// Luật hợp đồng lắp đặt phía nhân viên (quản lý / quản trị ghi, kinh doanh chỉ đọc), xác nhận tiền mặt, việc nhắc khách của
// kinh doanh, giỏ báo giá của kỹ thuật viên. Bám ContractHandlers, PaymentService.ConfirmCashAsync, SalesTaskHandlers,
// QuotationTechnicianCart của backend `main` (ad10455). Chạy: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  acceptedQuotation,
  amendBlocker,
  bindingContract,
  canAmend,
  awaitingCashConfirmation,
  canAttachOfficialDocument,
  canConfirmCash,
  canCreateContract,
  canDiscard,
  canEditDraft,
  canPublish,
  canReview,
  canSeePayments,
  canWriteContract,
  cashConfirmBody,
  cashConfirmErrors,
  currentContract,
  extractId,
  hasPaymentStage,
  isAwaitingPayment,
  issueBlockers,
  officialDocumentBody,
  paymentsNeedingAttention,
  pendingSubmission,
  rejectionReasonError,
  shortHash,
  submissionMatchesOfficial,
  termsError,
  warrantyMonthsToSend,
} from '../src/features/contracts/contractRules.ts'
import {
  canRecordFollowUp,
  canStartTask,
  closesTask,
  followUpBody,
  followUpErrors,
  isFollowUpTask,
  taskNoteText,
} from '../src/features/after-sales/salesTaskRules.ts'
import {
  addedQuantity,
  canCreateCart,
  canRejectQuotation,
  canReviseCart,
  cartIssueBlockers,
  cartQuantityError,
  isStaleQuotationError,
  isTechnicianDraft,
  missingCartTypes,
  priceProblemLineIds,
  workingQuotation,
} from '../src/features/quotations/quotationRules.ts'

const quotation = (status, extra = {}) => ({ quotationId: 'q-1', status, documentFileId: null, ...extra })

const contract = (status, extra = {}) => ({
  contractId: `c-${status}`,
  contractNumber: 'HD-20261103-ABCDEF',
  version: 1,
  previousContractId: null,
  quotationId: 'q-1',
  status,
  warrantyMonths: 12,
  terms: 'Thanh toán 100% sau khi ký.',
  canonicalHash: status === 'DRAFT' ? null : 'ab'.repeat(32),
  officialDocument: null,
  submissions: [],
  revision: 3,
  signedAt: null,
  ...extra,
})

const options = [
  { optionId: 'o12', kind: 'INSTALLATION', months: 12, isDefault: true, isActive: true },
  { optionId: 'o24', kind: 'INSTALLATION', months: 24, isDefault: false, isActive: true },
  { optionId: 'o36', kind: 'INSTALLATION', months: 36, isDefault: false, isActive: false },
  { optionId: 'r6', kind: 'REPAIR', months: 6, isDefault: true, isActive: true },
]

describe('lập hợp đồng từ báo giá', () => {
  test('báo giá ACCEPTED, chưa có hợp đồng: lập được', () => {
    const q = quotation('ACCEPTED')
    assert.equal(acceptedQuotation([quotation('SUPERSEDED', { quotationId: 'q-0' }), q]), q)
    assert.equal(canCreateContract(q, []), true)
  })

  test('báo giá chưa đồng ý hoặc đã có hợp đồng còn hiệu lực: không lập', () => {
    assert.equal(canCreateContract(quotation('ISSUED'), []), false)
    assert.equal(canCreateContract(null, []), false)
    assert.equal(canCreateContract(quotation('ACCEPTED'), [contract('DRAFT')]), false)
    assert.equal(canCreateContract(quotation('ACCEPTED'), [contract('PAID')]), false)
    // Bản nháp đã huỷ (backend 31/10) cũng chặn lập lại
    assert.equal(canCreateContract(quotation('ACCEPTED'), [contract('DISCARDED')]), false)
    // Hợp đồng của báo giá khác không tính
    assert.equal(canCreateContract(quotation('ACCEPTED'), [contract('DRAFT', { quotationId: 'q-9' })]), true)
  })
})

describe('thời hạn bảo hành và điều khoản', () => {
  test('chọn mặc định gửi null; chọn tuỳ chọn INSTALLATION đang bật gửi số tháng', () => {
    assert.equal(warrantyMonthsToSend('', options), null)
    assert.equal(warrantyMonthsToSend('24', options), 24)
  })

  test('tuỳ chọn đã tắt hoặc của loại REPAIR là không hợp lệ', () => {
    assert.equal(warrantyMonthsToSend('36', options), 'invalid')
    assert.equal(warrantyMonthsToSend('6', options), 'invalid')
  })

  test('điều khoản tối đa 8000 ký tự', () => {
    assert.equal(termsError('Điều 1'), null)
    assert.match(termsError('x'.repeat(8001)), /8000/)
  })
})

describe('máy trạng thái hợp đồng', () => {
  test('bản nháp: sửa được; thiếu điều khoản hoặc thời hạn bảo hành thì chưa phát hành được', () => {
    assert.equal(canEditDraft(contract('DRAFT')), true)
    assert.deepEqual(issueBlockers(contract('DRAFT')), [])
    assert.equal(issueBlockers(contract('DRAFT', { warrantyMonths: null })).length, 1)
    assert.deepEqual(issueBlockers(contract('DRAFT', { terms: '  ' })), ['Chưa ghi điều khoản hợp đồng.'])
    assert.equal(issueBlockers(contract('DRAFT', { terms: null, warrantyMonths: null })).length, 2)
    assert.equal(canEditDraft(contract('ISSUED')), false)
  })

  test('gắn PDF chỉ khi đã phát hành; gửi ký cần PDF', () => {
    assert.equal(canAttachOfficialDocument(contract('ISSUED')), true)
    assert.equal(canAttachOfficialDocument(contract('DRAFT')), false)
    assert.equal(canAttachOfficialDocument(contract('AWAITING_SIGNATURE')), false)
    assert.equal(canPublish(contract('ISSUED')), false)
    assert.equal(
      canPublish(contract('ISSUED', { officialDocument: { fileId: 'f', sha256: 'aa', confirmedAt: 'x' } })),
      true,
    )
    // Chuyển không hợp lệ: gửi ký từ bản nháp
    assert.equal(
      canPublish(contract('DRAFT', { officialDocument: { fileId: 'f', sha256: 'aa', confirmedAt: 'x' } })),
      false,
    )
  })

  test('body gắn PDF dùng đúng revision và mã nội dung của phiên bản đang xem, không tự tính', () => {
    const c = contract('ISSUED', { revision: 7, canonicalHash: 'ff'.repeat(32) })
    assert.deepEqual(officialDocumentBody(c, 'file-1'), {
      revision: 7,
      fileId: 'file-1',
      canonicalHash: 'ff'.repeat(32),
    })
    assert.equal(officialDocumentBody(contract('DRAFT'), 'file-1'), null)
    assert.equal(shortHash('abcdef0123456789abcd'), 'abcd ef01 2345…')
  })

  test('duyệt bản ký: quản lý, quản trị được; kinh doanh chỉ xem; chỉ khi đang chờ duyệt và có lần gửi chờ', () => {
    const pending = { submissionId: 's1', fileId: 'f2', officialDocumentSha256: 'AA', outcome: 'PENDING' }
    const underReview = contract('UNDER_REVIEW', { submissions: [pending] })
    assert.equal(pendingSubmission(underReview), pending)
    assert.equal(canReview(underReview, 'manager'), true)
    assert.equal(canReview(underReview, 'admin'), true)
    assert.equal(canReview(underReview, 'sales'), false, 'kinh doanh bị 403 ở POST .../review')
    assert.equal(canReview(contract('AWAITING_SIGNATURE', { submissions: [pending] }), 'manager'), false)
    assert.equal(canReview(contract('UNDER_REVIEW', { submissions: [] }), 'manager'), false)
  })

  test('mọi lệnh ghi hợp đồng và đọc thanh toán là của quản lý / quản trị', () => {
    assert.equal(canWriteContract('manager'), true)
    assert.equal(canWriteContract('admin'), true)
    assert.equal(canWriteContract('sales'), false)
    assert.equal(canSeePayments('sales'), false, 'kinh doanh bị 403 ở GET /contracts/{id}/payments')
  })

  test('bản ký khớp PDF chính thức theo SHA-256, không phân biệt hoa thường', () => {
    const c = contract('UNDER_REVIEW', { officialDocument: { fileId: 'f', sha256: 'aa11', confirmedAt: 'x' } })
    assert.equal(submissionMatchesOfficial({ officialDocumentSha256: 'AA11' }, c), true)
    assert.equal(submissionMatchesOfficial({ officialDocumentSha256: 'bb22' }, c), false)
    assert.equal(submissionMatchesOfficial({ officialDocumentSha256: 'aa11' }, contract('UNDER_REVIEW')), false)
  })

  test('lý do từ chối bắt buộc, tối đa 2000 ký tự', () => {
    assert.match(rejectionReasonError('  '), /lý do/)
    assert.match(rejectionReasonError('x'.repeat(2001)), /2000/)
    assert.equal(rejectionReasonError('Chữ ký mờ'), null)
  })
})

describe('phụ lục và phiên bản', () => {
  test('lập phụ lục từ bản đã phát hành chưa thanh toán', () => {
    const signed = contract('SIGNED')
    assert.equal(canAmend(signed, [signed]), true)
    assert.equal(amendBlocker(signed, [signed]), null)
  })

  test('đã thanh toán, đang là nháp, đã bị thay, hoặc đang có phụ lục nháp: không lập', () => {
    const paid = contract('PAID')
    assert.equal(canAmend(paid, [paid]), false)
    assert.match(amendBlocker(paid, [paid]), /đã thanh toán/)
    assert.equal(canAmend(contract('DRAFT'), []), false)
    assert.equal(canAmend(contract('SUPERSEDED'), []), false)
    const issued = contract('AWAITING_SIGNATURE')
    const draft = contract('DRAFT', { contractId: 'c-v2', version: 2, previousContractId: issued.contractId })
    assert.equal(canAmend(issued, [issued, draft]), false)
    assert.match(amendBlocker(issued, [issued, draft]), /phiên bản 2/)
  })

  test('phiên bản đang làm là bản còn hiệu lực mới nhất; bản ràng buộc là bản đã phát hành', () => {
    const v1 = contract('SUPERSEDED', { contractId: 'v1', version: 1 })
    const v2 = contract('AWAITING_SIGNATURE', { contractId: 'v2', version: 2 })
    const v3 = contract('DRAFT', { contractId: 'v3', version: 3 })
    assert.equal(currentContract([v1, v2, v3]).contractId, 'v3')
    assert.equal(bindingContract([v1, v2, v3]).contractId, 'v2')
    assert.equal(currentContract([v1]), null)
  })
})

describe('thanh toán phía nhân viên', () => {
  test('chỉ hợp đồng đã ký mới có bước thanh toán; đã ký thì hỏi lại định kỳ', () => {
    assert.equal(hasPaymentStage(contract('SIGNED')), true)
    assert.equal(hasPaymentStage(contract('PAID')), true)
    assert.equal(hasPaymentStage(contract('UNDER_REVIEW')), false)
    assert.equal(hasPaymentStage(contract('SUPERSEDED', { signedAt: '2026-11-01T02:00:00Z' })), true)
    assert.equal(isAwaitingPayment(contract('SIGNED')), true)
    assert.equal(isAwaitingPayment(contract('PAID')), false)
  })

  test('lần thanh toán lệch tiền hoặc trả hai lần cần xử lý tay', () => {
    const attempts = [
      { status: 'PAID' },
      { status: 'REVIEW_REQUIRED' },
      { status: 'REFUND_REQUIRED' },
      { status: 'EXPIRED' },
    ]
    assert.deepEqual(
      paymentsNeedingAttention(attempts).map((a) => a.status),
      ['REVIEW_REQUIRED', 'REFUND_REQUIRED'],
    )
  })
})

describe('việc nhắc khách của kinh doanh', () => {
  const task = (taskType, status) => ({ taskId: 't', taskType, status })
  const valid = {
    contactedAt: '2026-11-03T09:00:00+07:00',
    result: 'Khách hẹn tối nay đặt lịch',
    note: '',
    outcome: '',
  }
  const now = Date.parse('2026-11-03T10:00:00+07:00')

  test('ghi liên hệ hợp lệ: body bỏ trống thành null', () => {
    assert.deepEqual(followUpErrors(valid, now), {})
    assert.deepEqual(followUpBody(valid), {
      contactedAt: '2026-11-03T09:00:00+07:00',
      result: 'Khách hẹn tối nay đặt lịch',
      note: null,
      outcome: null,
    })
    assert.equal(closesTask(''), false)
    assert.equal(closesTask('WILL_BOOK_LATER'), false)
    assert.equal(closesTask('UNREACHABLE'), true)
  })

  test('thiếu kết quả, giờ ở tương lai, ghi chú dài, kết quả cuối lạ: báo lỗi', () => {
    const errors = followUpErrors(
      { contactedAt: '2026-11-03T12:00:00+07:00', result: ' ', note: 'x'.repeat(1001), outcome: 'DONE' },
      now,
    )
    assert.deepEqual(Object.keys(errors).sort(), ['contactedAt', 'note', 'outcome', 'result'])
    assert.ok(followUpErrors({ ...valid, contactedAt: '' }, now).contactedAt)
    assert.ok(followUpErrors({ ...valid, result: 'x'.repeat(301) }, now).result)
  })

  test('bắt đầu chỉ khi đã nhận; ghi liên hệ chỉ cho việc nhắc còn mở', () => {
    assert.equal(canStartTask(task('MAINTENANCE_FOLLOW_UP', 'CLAIMED')), true)
    assert.equal(canStartTask(task('MAINTENANCE_FOLLOW_UP', 'IN_PROGRESS')), false)
    assert.equal(canStartTask(task('REPAIR_QUOTATION', 'OPEN')), false)
    assert.equal(canRecordFollowUp(task('ACCEPTANCE_FOLLOW_UP', 'IN_PROGRESS')), true)
    assert.equal(canRecordFollowUp(task('REPAIR_QUOTATION', 'CLAIMED')), false)
    assert.equal(canRecordFollowUp(task('MAINTENANCE_FOLLOW_UP', 'DONE')), false)
    assert.equal(isFollowUpTask(task('MAINTENANCE_QUOTATION', 'OPEN')), false)
  })

  test('ghi chú hệ thống được dịch, ghi chú của người giữ nguyên', () => {
    assert.equal(
      taskNoteText('No booking yet for plan month 3; contact the customer.'),
      'Khách chưa đặt lịch lượt bảo trì tháng thứ 3 của gói.',
    )
    assert.equal(taskNoteText('Khách bận, gọi lại thứ Hai'), 'Khách bận, gọi lại thứ Hai')
    assert.equal(taskNoteText(null), null)
  })
})

describe('Huỷ bản nháp hợp đồng', () => {
  test('chỉ bản nháp đầu tiên, không phải phụ lục nháp', () => {
    assert.equal(canDiscard({ status: 'DRAFT', previousContractId: null }), true)
    assert.equal(canDiscard({ status: 'DRAFT', previousContractId: 'c-1' }), false)
    assert.equal(canDiscard({ status: 'ISSUED', previousContractId: null }), false)
  })
})

describe('xác nhận tiền mặt (ConfirmCashAsync)', () => {
  const awaiting = { paymentState: 'AWAITING_CASH_CONFIRMATION', current: { method: 'CASH', status: 'PENDING' } }
  const valid = {
    amount: 32_400_000,
    receiptReference: ' PT-001 ',
    evidenceFileId: 'file-1',
    note: ' Nhận tại công trình ',
  }

  test('chỉ khi khách đã chọn tiền mặt, và chỉ quản lý / quản trị', () => {
    assert.equal(awaitingCashConfirmation(awaiting), true)
    assert.equal(canConfirmCash(awaiting, 'manager'), true)
    assert.equal(canConfirmCash(awaiting, 'admin'), true)
    assert.equal(canConfirmCash(awaiting, 'sales'), false)
    for (const paymentState of ['AWAITING_PAYMENT', 'ONLINE_IN_PROGRESS', 'PAID', 'NOT_PAYABLE'])
      assert.equal(canConfirmCash({ paymentState, current: null }, 'manager'), false, paymentState)
    assert.equal(canConfirmCash(undefined, 'manager'), false)
  })

  test('form hợp lệ: body cắt khoảng trắng, ghi chú trống thành null', () => {
    assert.deepEqual(cashConfirmErrors(valid, 32_400_000), {})
    assert.deepEqual(cashConfirmBody(valid), {
      amount: 32_400_000,
      receiptReference: 'PT-001',
      evidenceFileId: 'file-1',
      note: 'Nhận tại công trình',
    })
    assert.equal(cashConfirmBody({ ...valid, note: '  ' }).note, null)
  })

  test('số tiền phải đúng tổng hợp đồng; thiếu phiếu thu, thiếu tệp, ghi chú dài: báo lỗi', () => {
    assert.match(cashConfirmErrors({ ...valid, amount: 32_000_000 }, 32_400_000).amount, /đúng bằng tổng/)
    assert.match(cashConfirmErrors({ ...valid, amount: 32_500_000 }, 32_400_000).amount, /đúng bằng tổng/)
    assert.ok(cashConfirmErrors({ ...valid, amount: null }, 32_400_000).amount)
    assert.ok(cashConfirmErrors({ ...valid, amount: 1.5 }, 32_400_000).amount)
    const errors = cashConfirmErrors(
      { amount: 32_400_000, receiptReference: '   ', evidenceFileId: null, note: 'x'.repeat(501) },
      32_400_000,
    )
    assert.deepEqual(Object.keys(errors).sort(), ['evidenceFileId', 'note', 'receiptReference'])
    assert.match(cashConfirmErrors({ ...valid, receiptReference: 'x'.repeat(101) }, 32_400_000).receiptReference, /100/)
  })
})

describe('mở hợp đồng theo mã', () => {
  test('lấy mã cuối cùng, kể cả khi dán cả đường dẫn', () => {
    const id = '5f007a8c-fdc2-4988-99ed-10f6c49175ee'
    assert.equal(extractId(id), id)
    assert.equal(extractId(`https://web/ops/surveys/${id.toUpperCase()}`), id)
    assert.equal(extractId(`/manage/contracts/0130d042-4c8e-40da-a9a6-d11ff5c22dbd/x/${id}`), id)
    assert.equal(extractId('HD-20261103'), null)
  })
})

describe('giỏ báo giá của kỹ thuật viên (QuotationTechnicianCart)', () => {
  const q = (status, extra = {}) => ({
    quotationId: `q-${status}-${extra.version ?? 1}`,
    status,
    origin: 'TECHNICIAN',
    version: 1,
    previousQuotationId: null,
    lines: [],
    totalAmount: 0,
    ...extra,
  })

  test('tạo giỏ khi chưa có gì, hoặc chỉ có bản nháp cũ của kinh doanh / bản đã đóng', () => {
    assert.equal(canCreateCart([], 'FEASIBLE'), true)
    assert.equal(canCreateCart([q('DRAFT', { origin: 'SALES' })], 'FEASIBLE'), true, 'backend đóng bản nháp cũ')
    assert.equal(canCreateCart([q('CANCELLED'), q('SUPERSEDED', { version: 2 })], 'FEASIBLE'), true)
  })

  test('không tạo giỏ khi không lắp được, đã có giỏ nháp, hoặc đã có bản gửi khách (phải lập bản sửa)', () => {
    assert.equal(canCreateCart([], 'NOT_FEASIBLE'), false)
    assert.equal(canCreateCart([q('DRAFT')], 'FEASIBLE'), false)
    for (const status of ['ISSUED', 'ACCEPTED', 'REVISION_REQUESTED', 'REJECTED'])
      assert.equal(canCreateCart([q(status)], 'FEASIBLE'), false, status)
  })

  test('bản đang làm: giỏ nháp, rồi bản đang hiệu lực, rồi bản mới nhất', () => {
    const issued = q('ISSUED', { version: 1 })
    const draft = q('DRAFT', { version: 2 })
    assert.equal(workingQuotation([issued, draft]), draft)
    assert.equal(workingQuotation([q('SUPERSEDED', { version: 1 }), issued]), issued)
    assert.equal(workingQuotation([]), null)
    assert.equal(isTechnicianDraft(q('DRAFT', { origin: 'AUTOMATIC' })), false, 'bản nháp cũ không sửa được ở giỏ')
  })

  test('lập bản sửa: từ bản đã gửi / khách yêu cầu sửa / khách từ chối; bản đã đồng ý là cuối cùng', () => {
    for (const status of ['ISSUED', 'REVISION_REQUESTED', 'REJECTED']) {
      const source = q(status)
      assert.equal(canReviseCart(source, [source]), true, status)
    }
    const accepted = q('ACCEPTED')
    assert.equal(canReviseCart(accepted, [accepted]), false)
    const asked = q('REVISION_REQUESTED')
    assert.equal(canReviseCart(asked, [asked, q('DRAFT', { version: 2 })]), false, 'đã có bản nháp')
    const newer = q('ISSUED', { version: 2, previousQuotationId: asked.quotationId })
    assert.equal(canReviseCart(asked, [asked, newer]), false, 'đã có bản mới làm từ bản này')
    assert.equal(canReviseCart(asked, [asked], 'NOT_FEASIBLE'), false)
  })

  test('gửi khách: giỏ nháp có ít nhất một dòng và khảo sát lắp được', () => {
    const draft = q('DRAFT', { lines: [{ description: 'SOLAR_PANEL' }], totalAmount: 10 })
    assert.deepEqual(cartIssueBlockers(draft, 'FEASIBLE'), [])
    assert.deepEqual(cartIssueBlockers(q('DRAFT'), 'FEASIBLE'), ['Thêm ít nhất một sản phẩm.'])
    assert.equal(cartIssueBlockers(draft, 'NOT_FEASIBLE').length, 1)
    // Chuyển không hợp lệ: bản đã gửi không gửi lại được, nên không có lý do chặn nào để hiện (không có nút)
    assert.deepEqual(cartIssueBlockers(q('ISSUED'), 'FEASIBLE'), [])
  })

  test('số lượng: > 0, tối đa 100 000, tới 3 chữ số thập phân; thêm lại sản phẩm thì cộng dồn', () => {
    assert.equal(cartQuantityError(2), null)
    assert.equal(cartQuantityError(2.125), null)
    assert.ok(cartQuantityError(0))
    assert.ok(cartQuantityError(-1))
    assert.ok(cartQuantityError(Number.NaN))
    assert.ok(cartQuantityError(100_001))
    assert.ok(cartQuantityError(1.2345))
    const lines = [{ productId: 'pv', quantity: 10 }]
    assert.equal(addedQuantity(lines, 'pv', 4), 14)
    assert.equal(addedQuantity(lines, 'inv', 1), 1)
  })

  test('nhắc loại hàng còn thiếu (không chặn gửi); dòng không định giá được lấy từ details.items', () => {
    assert.deepEqual(missingCartTypes({ lines: [{ description: 'SOLAR_PANEL' }, { description: 'inverter' }] }), [
      'INSTALLATION_LABOR',
    ])
    assert.deepEqual(priceProblemLineIds({ items: [{ lineId: 'l1' }, { lineId: 2 }, null] }), ['l1'])
    assert.deepEqual(priceProblemLineIds(undefined), [])
    assert.equal(isStaleQuotationError('QUOTATION_STALE_REVISION'), true)
    assert.equal(isStaleQuotationError('QUOTATION_PRICE_MISSING'), false)
  })

  test('khách từ chối được bản đang chờ trả lời', () => {
    assert.equal(canRejectQuotation(q('ISSUED')), true)
    assert.equal(canRejectQuotation(q('ACCEPTED')), false)
  })
})
