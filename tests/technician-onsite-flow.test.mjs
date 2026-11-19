// Luồng kỹ thuật viên tại công trình: chốt báo giá → ghi quyết định của khách → (backend 7d27054) hợp đồng 30/70 lập ngay khi khách
// đồng ý, thu từng khoản qua hợp đồng, khách nghiệm thu; thanh toán 100% báo giá cũ chỉ còn xem / huỷ; hậu mãi tại công trình. Mỗi
// luật: đường chính, luật nghiệp vụ, trường hợp sai
import { describe, test } from 'node:test'
import { ENDPOINTS } from '../src/services/api/endpoints.ts'
import { ApiError, isEndpointRetired } from '../src/services/api/errors.ts'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  canCancelPayment,
  canReconfirmAgreement,
  canRecordAgreed,
  canRecordWithdrawal,
  canStartPayment,
  hasPaymentPlanBackend,
  decisionNoteError,
  declineNote,
  isSwitchMethodError,
  isVerifiedPaid,
  quotationPaymentPollMs,
} from '../src/features/quotations/quotationRules.ts'
import { hasPaymentStage, isAwaitingPayment, isPrepaidContract } from '../src/features/contracts/contractRules.ts'
import { canPay, isCustomerTodo, isPrepaid, paidMoment } from '../src/features/contracts/customerContractRules.ts'
import { isDecidedOnSite } from '../src/features/after-sales/customerServiceRules.ts'
import {
  canConfirmCompletionOnSite,
  confirmedOnSite,
  onSiteNoteError,
  serviceQuotationPollMs,
  serviceQuoteStage,
  visitQuotationIds,
} from '../src/features/after-sales/technicianVisitRules.ts'
import {
  awaitsCustomerAcceptance,
  customerAcceptanceBlockers,
} from '../src/features/installation-projects/acceptanceRules.ts'

const quote = (status, extra = {}) => ({
  status,
  isExpired: false,
  surveyChanged: false,
  canAccept: status === 'ISSUED',
  ...extra,
})

describe('Ghi quyết định của khách tại công trình', () => {
  test('khách đồng ý: chỉ bản đã chốt, còn hạn, biên bản chưa đổi', () => {
    assert.equal(canRecordAgreed(quote('ISSUED')), true)
    assert.equal(canRecordAgreed(quote('ISSUED', { canAccept: false, isExpired: true })), false)
    assert.equal(canRecordAgreed(quote('ISSUED', { canAccept: false, surveyChanged: true })), false)
    for (const status of ['DRAFT', 'ACCEPTED', 'REVISION_REQUESTED', 'REJECTED', 'SUPERSEDED'])
      assert.equal(canRecordAgreed(quote(status)), false, status)
  })

  test('khách đổi ý chỉ khi chưa mở thanh toán; đã mở QR / tiền mặt hoặc đã trả thì không', () => {
    assert.equal(canRecordWithdrawal(quote('ISSUED')), true)
    assert.equal(canRecordWithdrawal(quote('ACCEPTED'), 'AWAITING_PAYMENT'), true)
    assert.equal(canRecordWithdrawal(quote('ACCEPTED'), 'NOT_PAYABLE'), true)
    for (const state of ['ONLINE_IN_PROGRESS', 'AWAITING_CASH_CONFIRMATION', 'PAID', 'REVIEW_REQUIRED'])
      assert.equal(canRecordWithdrawal(quote('ACCEPTED'), state), false, state)
    assert.equal(canRecordWithdrawal(quote('REJECTED')), false)
  })

  test('ghi chú bắt buộc khi không đồng ý / muốn sửa, tối đa 1000 ký tự', () => {
    assert.equal(decisionNoteError('AGREED', ''), null)
    assert.ok(decisionNoteError('DECLINED', '   '))
    assert.ok(decisionNoteError('REVISION_NEEDED', ''))
    assert.equal(decisionNoteError('DECLINED', 'Khách thấy đắt'), null)
    assert.ok(decisionNoteError('AGREED', 'x'.repeat(1001)))
  })

  test('ghi chú không đồng ý hiện không kèm tiền tố của backend', () => {
    assert.equal(declineNote('DECLINED_ON_SITE: khách thấy đắt'), 'khách thấy đắt')
    assert.equal(declineNote('Khách từ chối trong ứng dụng'), 'Khách từ chối trong ứng dụng')
    assert.equal(declineNote(null), null)
  })
})

describe('Thanh toán tại công trình', () => {
  test('mở thanh toán khi đã đồng ý và chưa có gì đang mở; huỷ khi QR / tiền mặt còn chờ', () => {
    assert.equal(canStartPayment('AWAITING_PAYMENT'), true)
    for (const s of ['NOT_PAYABLE', 'ONLINE_IN_PROGRESS', 'AWAITING_CASH_CONFIRMATION', 'PAID', 'REVIEW_REQUIRED'])
      assert.equal(canStartPayment(s), false, s)
    assert.equal(canCancelPayment('ONLINE_IN_PROGRESS'), true)
    assert.equal(canCancelPayment('AWAITING_CASH_CONFIRMATION'), true)
    assert.equal(canCancelPayment('PAID'), false)
  })

  // Backend 30/70 (770379b trở đi) luôn trả `contractId` của báo giá, kể cả null; backend cũ không có trường này
  test('nhận ra máy chủ chưa cập nhật bản 30/70 để báo, không quay lại thu 100% báo giá', () => {
    assert.equal(hasPaymentPlanBackend({ status: 'ACCEPTED' }), false)
    assert.equal(hasPaymentPlanBackend({ status: 'ACCEPTED', contractId: null }), true)
    assert.equal(hasPaymentPlanBackend({ status: 'ACCEPTED', contractId: 'c1' }), true)
  })

  test('chỉ báo đã trả khi backend báo PAID kèm hợp đồng; QR đã quét hay tiền về chưa áp được thì chưa', () => {
    assert.equal(isVerifiedPaid({ paymentState: 'PAID', contractId: 'c-1' }), true)
    assert.equal(isVerifiedPaid({ paymentState: 'PAID', contractId: null }), false)
    assert.equal(isVerifiedPaid({ paymentState: 'ONLINE_IN_PROGRESS', contractId: null }), false)
    assert.equal(isVerifiedPaid({ paymentState: 'REVIEW_REQUIRED', contractId: null }), false)
    assert.equal(isVerifiedPaid(undefined), false)
  })

  test('hỏi lại 5 giây khi QR mở, 1 phút khi chờ tiền mặt, thôi hỏi khi xong (backend cho 30 lần / phút)', () => {
    assert.equal(quotationPaymentPollMs('ONLINE_IN_PROGRESS'), 5_000)
    assert.equal(quotationPaymentPollMs('AWAITING_CASH_CONFIRMATION'), 60_000)
    assert.equal(quotationPaymentPollMs('PAID'), false)
    assert.equal(quotationPaymentPollMs('AWAITING_PAYMENT'), false)
    assert.ok(60_000 / 5_000 <= 30)
  })

  test('đổi cách trả khi lần khác đang mở: phải huỷ trước (trùng thanh toán bị backend chặn)', () => {
    assert.equal(isSwitchMethodError('PAYMENT_CASH_SELECTED'), true)
    assert.equal(isSwitchMethodError('PAYMENT_CHECKOUT_IN_PROGRESS'), true)
    assert.equal(isSwitchMethodError('PAYMENT_ALREADY_PAID'), false)
  })
})

const contract = (status, extra = {}) => ({
  status,
  signedAt: null,
  paidAt: null,
  paymentCompleted: false,
  paymentAttemptId: null,
  paymentConfirmedAt: null,
  ...extra,
})
const prepaid = (status) =>
  contract(status, { paymentCompleted: true, paymentAttemptId: 'pa-1', paymentConfirmedAt: '2026-11-18T03:00:00Z' })

describe('Hợp đồng lập sau thanh toán', () => {
  test('trạng thái hợp đồng tách khỏi thanh toán: bản nháp đã trả vẫn là trả trước', () => {
    assert.equal(isPrepaidContract(prepaid('DRAFT')), true)
    assert.equal(isPrepaidContract(contract('PAID', { paymentCompleted: true })), false, 'hợp đồng cũ đã trả')
    assert.equal(isPrepaidContract(contract('SIGNED')), false)
  })

  test('khối thanh toán của nhân viên hiện cho hợp đồng trả trước từ lúc nháp; không chờ thu lần hai', () => {
    assert.equal(hasPaymentStage(prepaid('DRAFT')), true)
    assert.equal(hasPaymentStage(contract('DRAFT')), false)
    assert.equal(isAwaitingPayment(contract('SIGNED')), true)
    assert.equal(isAwaitingPayment({ ...prepaid('SIGNED') }), false)
  })

  test('khách: hợp đồng trả trước không phải việc của khách, không có nút trả tiền', () => {
    assert.equal(isPrepaid(prepaid('AWAITING_SIGNATURE')), true)
    assert.equal(isCustomerTodo(prepaid('AWAITING_SIGNATURE')), false)
    assert.equal(isCustomerTodo(contract('AWAITING_SIGNATURE')), true, 'hợp đồng cũ vẫn chờ khách ký')
    assert.equal(canPay(contract('SIGNED')), true)
    assert.equal(canPay({ ...prepaid('SIGNED') }), false, 'đã trả trước thì không thu lại')
    assert.equal(paidMoment(prepaid('DRAFT')), '2026-11-18T03:00:00Z')
    assert.equal(paidMoment(contract('PAID', { paidAt: '2026-11-01T00:00:00Z' })), '2026-11-01T00:00:00Z')
  })
})

// Backend 7d27054: khách nghiệm thu, quản lý chỉ trả về làm lại và phải xong các điều kiện dưới thì khách mới nghiệm thu được
describe('Điều kiện để khách nghiệm thu', () => {
  const project = (extra = {}) => ({
    status: 'PENDING_CUSTOMER_ACCEPTANCE',
    acceptances: [{ round: 1, decision: 'PENDING' }],
    checklist: [
      { isRequired: true, status: 'SATISFIED' },
      { isRequired: true, status: 'NOT_APPLICABLE' },
      { isRequired: false, status: 'PENDING' },
    ],
    equipment: { status: 'MATCHES' },
    ...extra,
  })

  test('khách nghiệm thu được khi có báo cáo đang chờ, checklist bắt buộc đã xong, thiết bị khớp hoặc đã duyệt', () => {
    assert.equal(awaitsCustomerAcceptance(project()), true)
    assert.deepEqual(customerAcceptanceBlockers(project()), [])
    assert.deepEqual(customerAcceptanceBlockers(project({ equipment: { status: 'SUBSTITUTION_APPROVED' } })), [])
  })

  test('checklist bắt buộc chưa xong hoặc thiết bị khác hợp đồng chưa duyệt thì chặn', () => {
    assert.equal(
      customerAcceptanceBlockers(project({ checklist: [{ isRequired: true, status: 'PENDING' }] })).length,
      1,
    )
    assert.equal(
      customerAcceptanceBlockers(project({ equipment: { status: 'SUBSTITUTION_APPROVAL_REQUIRED' } })).length,
      1,
    )
  })

  test('không có lượt chờ hoặc dự án ở trạng thái khác thì không chờ khách nghiệm thu', () => {
    assert.equal(awaitsCustomerAcceptance(project({ acceptances: [{ round: 1, decision: 'ACCEPTED' }] })), false)
    assert.equal(awaitsCustomerAcceptance(project({ status: 'IN_PROGRESS' })), false)
  })
})

describe('Hậu mãi tại công trình', () => {
  test('báo giá kỹ thuật viên lập thì khách không duyệt trong ứng dụng; báo giá của kinh doanh vẫn duyệt', () => {
    assert.equal(isDecidedOnSite({ issuedByRole: 'TECHNICIAN' }), true)
    assert.equal(isDecidedOnSite({ issuedByRole: 'SALES' }), false)
    assert.equal(isDecidedOnSite({}), false)
  })

  test('mã báo giá lấy từ hạng mục của buổi hẹn, không trùng', () => {
    const v = { items: [{ quotationId: 'q1' }, { quotationId: null }, { quotationId: 'q1' }, { quotationId: 'q2' }] }
    assert.deepEqual(visitQuotationIds(v), ['q1', 'q2'])
    assert.deepEqual(visitQuotationIds({ items: [] }), [])
  })

  test('bước của báo giá: quyết định → thanh toán → được làm; không phải trả thì làm ngay, không thanh toán 0 đồng', () => {
    const q = (quotationStatus, extra = {}) => ({ quotationStatus, nothingToPay: false, current: null, ...extra })
    assert.equal(serviceQuoteStage(q('ISSUED')), 'decide')
    assert.equal(serviceQuoteStage(q('ACCEPTED')), 'pay')
    assert.equal(serviceQuoteStage(q('ACCEPTED', { nothingToPay: true })), 'authorized')
    assert.equal(serviceQuoteStage(q('ACCEPTED', { current: { status: 'PENDING', method: 'ONLINE' } })), 'online')
    assert.equal(serviceQuoteStage(q('ACCEPTED', { current: { status: 'PENDING', method: 'CASH' } })), 'cash')
    assert.equal(serviceQuoteStage(q('ACCEPTED', { current: { status: 'CANCELLED', method: 'ONLINE' } })), 'pay')
    assert.equal(serviceQuoteStage(q('PAID')), 'authorized')
    for (const s of ['REJECTED', 'EXPIRED', 'SUPERSEDED', 'CANCELLED'])
      assert.equal(serviceQuoteStage(q(s)), 'closed', s)
    assert.equal(serviceQuoteStage(undefined), null)
  })

  test('hỏi lại thanh toán hậu mãi theo bước; ghi chú bắt buộc đúng chỗ', () => {
    const live = (method) => ({
      quotationStatus: 'ACCEPTED',
      nothingToPay: false,
      current: { status: 'PENDING', method },
    })
    assert.equal(serviceQuotationPollMs(live('ONLINE')), 5_000)
    assert.equal(serviceQuotationPollMs(live('CASH')), 60_000)
    assert.equal(serviceQuotationPollMs({ quotationStatus: 'PAID', nothingToPay: false, current: null }), false)
    assert.ok(onSiteNoteError('', true))
    assert.equal(onSiteNoteError('', false), null)
    assert.ok(onSiteNoteError('x'.repeat(1001), false))
  })

  test('ghi khách xác nhận hoàn thành chỉ sau báo cáo công việc của buổi sửa / bảo trì, không phải buổi kiểm tra', () => {
    assert.equal(canConfirmCompletionOnSite({ purpose: 'REPAIR', status: 'REPORTED' }), true)
    assert.equal(canConfirmCompletionOnSite({ purpose: 'MAINTENANCE', status: 'REPORTED' }), true)
    assert.equal(canConfirmCompletionOnSite({ purpose: 'INSPECTION', status: 'REPORTED' }), false)
    assert.equal(canConfirmCompletionOnSite({ purpose: 'REPAIR', status: 'IN_PROGRESS' }), false)
  })

  test('đã ghi khách xác nhận khi yêu cầu có ảnh xác nhận tại công trình; ảnh khác không tính', () => {
    const photo = (caption) => ({
      evidenceId: 'e',
      visitId: null,
      fileId: 'f',
      caption,
      addedAt: '2026-11-19T09:02:00+07:00',
    })
    assert.equal(confirmedOnSite({ evidence: [photo(null), photo('on-site confirmation')] }), true)
    assert.equal(confirmedOnSite({ evidence: [photo(null), photo('customer')] }), false)
    assert.equal(confirmedOnSite({ evidence: [] }), false)
  })
})

describe('API đã bỏ (410 ENDPOINT_RETIRED) không còn được giao diện gọi', () => {
  const files = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(ts|tsx)$/.test(entry.name) && !full.includes(`${path.sep}types${path.sep}`)) files.push(full)
    }
  }
  walk(path.resolve('src'))

  const RETIRED = [
    ['báo giá lắp đặt của khách', /['"`]\/customers\/me\/quotations/],
    ['khung thi công đề xuất cho khách', /installation-slot-offers/],
    // Khách nghiệm thu được trả lại ở backend 7d27054; ba đường dưới bị bỏ ở cùng bản
    ['kỹ thuật viên mở thanh toán 100% báo giá', /post<QuotationPaymentView>\(api\.payment\(/],
    ['quản lý nghiệm thu nội bộ', /[`'"]\/installation-projects\/\$\{[^}]+\}\/acceptance/],
    ['khách tự tải bản ký hợp đồng', /\/customers\/me\/contracts\/\$\{[^}]+\}\/signed-document/],
    ['khách đồng ý thay thiết bị', /\/customers\/me\/installation-projects\/\$\{[^}]+\}\/equipment-substitution/],
    ['kinh doanh tự lập / gửi báo giá', /quotations\/generate|pending-review|pricing-approval|confirm-survey-version/],
  ]

  for (const [label, pattern] of RETIRED)
    test(label, () => {
      const hits = files.filter((f) => pattern.test(fs.readFileSync(f, 'utf8')))
      assert.deepEqual(
        hits.map((f) => path.relative(process.cwd(), f)),
        [],
      )
    })
})

describe('Đường 30/70 thay cho đường đã bỏ', () => {
  test('thu 30% / 70% đi qua khoản của hợp đồng, không qua báo giá', () => {
    assert.equal(ENDPOINTS.installments.technician('c 1', 1), '/technician/contracts/c%201/installments/1/payment')
    assert.equal(
      ENDPOINTS.installments.technicianCancel('c1', 1),
      '/technician/contracts/c1/installments/1/payment/cancel',
    )
    assert.equal(ENDPOINTS.installments.customer('c1', 2), '/customers/me/contracts/c1/installments/2/payment')
    assert.equal(ENDPOINTS.installments.staff('c1', 2), '/contracts/c1/installments/2/payment')
  })

  test('trang hợp đồng giấy: kỹ thuật viên và quản lý / quản trị hỗ trợ dùng hai đường riêng', () => {
    assert.equal(ENDPOINTS.signatureSets.technicianStart('c1'), '/technician/contracts/c1/signature-set')
    assert.equal(ENDPOINTS.signatureSets.technicianPage('c1', 3), '/technician/contracts/c1/signature-set/pages/3')
    assert.equal(ENDPOINTS.signatureSets.technicianFinalize('c1'), '/technician/contracts/c1/signature-set/finalize')
    assert.equal(ENDPOINTS.signatureSets.supportFinalize('c1'), '/contracts/c1/signature-set/finalize')
  })

  test('nghiệm thu là của khách; quản lý chỉ còn trả về làm lại', () => {
    assert.equal(ENDPOINTS.customerAcceptance.decide('p1'), '/customers/me/installation-projects/p1/acceptance')
    assert.equal('acceptance' in ENDPOINTS.managerInstallations, false)
  })

  test('410 ENDPOINT_RETIRED là chức năng đã bỏ; 410 FILE_OBJECT_MISSING là tệp mất, không phải chức năng bị bỏ', () => {
    const retired = new ApiError({ status: 410, code: 'ENDPOINT_RETIRED', message: 'x' })
    const missing = new ApiError({ status: 410, code: 'FILE_OBJECT_MISSING', message: 'x' })
    const bare = new ApiError({ status: 410, code: null, message: 'x' })
    assert.equal(isEndpointRetired(retired), true)
    assert.equal(isEndpointRetired(missing), false)
    assert.equal(isEndpointRetired(bare), true)
  })
})

describe('Báo giá khách đồng ý trước bản 30/70', () => {
  const agreed = { status: 'ACCEPTED', contractId: null, isExpired: false, surveyChanged: false }
  test('chưa mở thanh toán, còn hạn, biên bản chưa đổi: ghi đồng ý lại để backend lập hợp đồng 30/70, không cần bản sửa', () => {
    assert.equal(canReconfirmAgreement(agreed, 'AWAITING_PAYMENT'), true)
  })
  test('đang mở / đã có tiền, đã có hợp đồng, hết hạn hoặc biên bản đổi: không', () => {
    assert.equal(canReconfirmAgreement(agreed, 'ONLINE_IN_PROGRESS'), false)
    assert.equal(canReconfirmAgreement(agreed, 'AWAITING_CASH_CONFIRMATION'), false)
    assert.equal(canReconfirmAgreement(agreed, 'PAID'), false)
    assert.equal(canReconfirmAgreement({ ...agreed, contractId: 'c1' }, 'AWAITING_PAYMENT'), false)
    assert.equal(canReconfirmAgreement({ ...agreed, isExpired: true }, 'AWAITING_PAYMENT'), false)
    assert.equal(canReconfirmAgreement({ ...agreed, surveyChanged: true }, 'AWAITING_PAYMENT'), false)
    assert.equal(canReconfirmAgreement({ ...agreed, status: 'ISSUED' }, 'AWAITING_PAYMENT'), false)
  })
})
