// Luật của cổng kinh doanh: hợp đồng lắp đặt, việc nhắc khách, PDF báo giá. Bám ContractHandlers, SalesTaskHandlers,
// QuotationHandlers.AttachDocumentAsync của backend `main` (7c79fa8). Chạy: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  acceptedQuotation,
  amendBlocker,
  bindingContract,
  canAmend,
  canAttachOfficialDocument,
  canCreateContract,
  canDiscard,
  canEditDraft,
  canPublish,
  canReview,
  currentContract,
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
  bomMismatchText,
  canAttachQuotationDocument,
  canConfirmSurveyVersion,
  canRejectQuotation,
  canRequestPricingApproval,
  canReviseQuotation,
  pricingBlockers,
  reviewReasonError,
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

  test('duyệt bản ký: kinh doanh, quản lý được; quản trị không; chỉ khi đang chờ duyệt và có lần gửi chờ', () => {
    const pending = { submissionId: 's1', fileId: 'f2', officialDocumentSha256: 'AA', outcome: 'PENDING' }
    const underReview = contract('UNDER_REVIEW', { submissions: [pending] })
    assert.equal(pendingSubmission(underReview), pending)
    assert.equal(canReview(underReview, 'sales'), true)
    assert.equal(canReview(underReview, 'manager'), true)
    assert.equal(canReview(underReview, 'admin'), false)
    assert.equal(canReview(contract('AWAITING_SIGNATURE', { submissions: [pending] }), 'sales'), false)
    assert.equal(canReview(contract('UNDER_REVIEW', { submissions: [] }), 'sales'), false)
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

describe('PDF báo giá', () => {
  test('bản nháp gắn / thay được; bản đã gửi chỉ gắn khi chưa có tệp; bản khác thì không', () => {
    assert.equal(canAttachQuotationDocument(quotation('DRAFT', { documentFileId: 'f' })), true)
    assert.equal(canAttachQuotationDocument(quotation('ISSUED')), true)
    assert.equal(canAttachQuotationDocument(quotation('ISSUED', { documentFileId: 'f' })), false)
    assert.equal(canAttachQuotationDocument(quotation('ACCEPTED')), false)
  })
})

describe('Báo giá theo backend v2', () => {
  const draft = (extra = {}) =>
    quotation('DRAFT', { surveyChanged: false, pricingReview: null, pricingApproval: null, ...extra })
  const approval = (status) => ({ status, adjustments: [], fingerprint: 'fp', request: null, decision: null })

  test('lập bản sửa: bản đã gửi, khách yêu cầu sửa, khách từ chối, bản đã đồng ý mà biên bản đổi', () => {
    assert.equal(canReviseQuotation(quotation('ISSUED', { surveyChanged: false })), true)
    assert.equal(canReviseQuotation(quotation('REVISION_REQUESTED', { surveyChanged: false })), true)
    assert.equal(canReviseQuotation(quotation('REJECTED', { surveyChanged: false })), true)
    assert.equal(canReviseQuotation(quotation('ACCEPTED', { surveyChanged: false })), false)
    assert.equal(canReviseQuotation(quotation('ACCEPTED', { surveyChanged: true })), true)
    assert.equal(canReviseQuotation(quotation('CANCELLED', { surveyChanged: false })), false)
  })

  test('khách chỉ từ chối được bản đang chờ trả lời', () => {
    assert.equal(canRejectQuotation(quotation('ISSUED')), true)
    assert.equal(canRejectQuotation(quotation('ACCEPTED')), false)
  })

  test('xác nhận theo biên bản mới chỉ với bản nháp lập theo biên bản cũ', () => {
    assert.equal(canConfirmSurveyVersion(draft({ surveyChanged: true })), true)
    assert.equal(canConfirmSurveyVersion(draft()), false)
    assert.equal(canConfirmSurveyVersion(quotation('ISSUED', { surveyChanged: true })), false)
  })

  test('xin duyệt giá khi bộ giá cần duyệt hoặc quản lý đã không duyệt', () => {
    assert.equal(canRequestPricingApproval(draft({ pricingApproval: approval('REQUIRED') })), true)
    assert.equal(canRequestPricingApproval(draft({ pricingApproval: approval('REJECTED') })), true)
    assert.equal(canRequestPricingApproval(draft({ pricingApproval: approval('PENDING') })), false)
    assert.equal(canRequestPricingApproval(draft({ pricingApproval: approval('NOT_REQUIRED') })), false)
  })

  test('lý do chưa gửi khách được: biên bản đổi, vấn đề giá phải sửa, chờ duyệt giá', () => {
    assert.deepEqual(pricingBlockers(draft()), [])
    const outstanding = [{ code: 'PRICE_MISSING' }, { code: 'CONDITIONS_REQUIRE_REVIEW' }]
    const reasons = pricingBlockers(
      draft({
        surveyChanged: true,
        pricingReview: { outstanding, noteRequired: true },
        pricingApproval: approval('PENDING'),
      }),
    )
    assert.equal(reasons.length, 3)
    assert.match(reasons[1], /^Còn 1 vấn đề/)
  })

  test('lý do bắt buộc, tối đa 1000 ký tự', () => {
    assert.equal(reviewReasonError('  '), 'Ghi lý do.')
    assert.equal(reviewReasonError('x'.repeat(1001)), 'Lý do tối đa 1000 ký tự.')
    assert.equal(reviewReasonError('Khách lấy số lượng lớn'), null)
  })

  test('dòng thiết bị lệch biên bản khảo sát được ghi theo mã sản phẩm', () => {
    assert.equal(
      bomMismatchText({ mismatches: [{ sku: 'PV-550', surveyQuantity: 20, quotedQuantity: 18 }] }),
      'PV-550: biên bản 20, báo giá 18',
    )
    assert.equal(bomMismatchText({}), null)
    assert.equal(bomMismatchText(null), null)
  })
})

describe('Huỷ bản nháp hợp đồng', () => {
  test('chỉ bản nháp đầu tiên, không phải phụ lục nháp', () => {
    assert.equal(canDiscard({ status: 'DRAFT', previousContractId: null }), true)
    assert.equal(canDiscard({ status: 'DRAFT', previousContractId: 'c-1' }), false)
    assert.equal(canDiscard({ status: 'ISSUED', previousContractId: null }), false)
  })
})
