// Luồng kỹ thuật viên tại công trình (backend 462733c): chốt báo giá → ghi quyết định của khách → thanh toán QR / tiền mặt →
// hợp đồng lập sau thanh toán → nghiệm thu nội bộ; hậu mãi tại công trình. Mỗi luật: đường chính, luật nghiệp vụ, trường hợp sai
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  canCancelPayment,
  canRecordAgreed,
  canRecordWithdrawal,
  canStartPayment,
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
  acceptanceNoteError,
  awaitsInternalAcceptance,
  internalAcceptanceBlockers,
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

describe('Nghiệm thu nội bộ', () => {
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

  test('nghiệm thu được khi có báo cáo đang chờ, checklist bắt buộc đã xong, thiết bị khớp hoặc đã duyệt', () => {
    assert.equal(awaitsInternalAcceptance(project()), true)
    assert.deepEqual(internalAcceptanceBlockers(project()), [])
    assert.deepEqual(internalAcceptanceBlockers(project({ equipment: { status: 'SUBSTITUTION_APPROVED' } })), [])
  })

  test('checklist bắt buộc chưa xong hoặc thiết bị khác hợp đồng chưa duyệt thì chặn', () => {
    assert.equal(
      internalAcceptanceBlockers(project({ checklist: [{ isRequired: true, status: 'PENDING' }] })).length,
      1,
    )
    assert.equal(
      internalAcceptanceBlockers(project({ equipment: { status: 'SUBSTITUTION_APPROVAL_REQUIRED' } })).length,
      1,
    )
  })

  test('không có lượt chờ hoặc dự án ở trạng thái khác thì không nghiệm thu; ghi chú bắt buộc ≤ 500', () => {
    assert.equal(awaitsInternalAcceptance(project({ acceptances: [{ round: 1, decision: 'ACCEPTED' }] })), false)
    assert.equal(awaitsInternalAcceptance(project({ status: 'IN_PROGRESS' })), false)
    assert.ok(acceptanceNoteError(' '))
    assert.ok(acceptanceNoteError('x'.repeat(501)))
    assert.equal(acceptanceNoteError('Đã bàn giao với khách'), null)
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
    ['khách nghiệm thu lắp đặt', /\/customers\/me\/installation-projects\/\$\{[^}]+\}\/acceptance/],
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
