// Phiếu thu tiền mặt kỹ thuật viên gửi cho báo giá hậu mãi và khoản 30/70 (backend 9ae01e7, PR #24). Mỗi luật: đường chính,
// kiểm đầu vào, trường hợp sai / ngoại lệ
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { ENDPOINTS } from '../src/services/api/endpoints.ts'
import { messageForCode } from '../src/services/api/errors.ts'
import {
  cashReceiptBody,
  earlierReceipts,
  isUnderReview,
  receiptContextDetail,
  receiptContextLabel,
  receiptFormErrors,
  receiptStatusMeta,
  receiptStep,
  reviewReasonError,
  unappliedLines,
} from '../src/features/payments/cashReceiptRules.ts'
import { serviceQuotationPollMs, serviceQuoteStage } from '../src/features/after-sales/technicianVisitRules.ts'

const NOW = new Date('2026-11-27T03:30:00Z') // 10:30 giờ Việt Nam
const CHOSEN = '2026-11-27T03:10:40+00:00' // khách chọn tiền mặt lúc 10:10:40

const form = (extra = {}) => ({
  hasPhoto: true,
  receiptNumber: 'PT-000321',
  date: '2026-11-27',
  time: '10:15',
  timeTouched: false,
  keptAt: null,
  note: '',
  ...extra,
})

describe('kỹ thuật viên gửi phiếu thu', () => {
  test('form đủ thì gửi đúng body; chưa sửa giờ thì để backend lấy lúc gửi', () => {
    assert.deepEqual(receiptFormErrors(form(), CHOSEN, NOW), {})
    assert.deepEqual(
      cashReceiptBody(form({ receiptNumber: '  PT-1 ', note: ' Khách trả đủ ' }), 'att', 'file', CHOSEN),
      {
        paymentAttemptId: 'att',
        receiptNumber: 'PT-1',
        evidenceFileId: 'file',
        collectedAt: null,
        note: 'Khách trả đủ',
      },
    )
    assert.equal(
      cashReceiptBody(form({ timeTouched: true }), 'att', 'file', CHOSEN).collectedAt,
      '2026-11-27T10:15:00+07:00',
    )
  })

  test('thiếu ảnh, thiếu số phiếu, quá dài thì báo cạnh ô', () => {
    const e = receiptFormErrors(form({ hasPhoto: false, receiptNumber: '  ', note: 'x'.repeat(501) }), CHOSEN, NOW)
    assert.ok(e.photo)
    assert.ok(e.receiptNumber)
    assert.ok(e.note)
    assert.ok(receiptFormErrors(form({ receiptNumber: 'x'.repeat(101) }), CHOSEN, NOW).receiptNumber)
    assert.equal(receiptFormErrors(form({ receiptNumber: 'x'.repeat(100) }), CHOSEN, NOW).receiptNumber, undefined)
  })

  test('giờ thu: không ở tương lai quá 5 phút, không trước lúc chọn tiền mặt (so theo phút)', () => {
    assert.ok(receiptFormErrors(form({ timeTouched: true, time: '10:40' }), CHOSEN, NOW).collectedAt)
    assert.equal(receiptFormErrors(form({ timeTouched: true, time: '10:34' }), CHOSEN, NOW).collectedAt, undefined)
    assert.ok(receiptFormErrors(form({ timeTouched: true, time: '10:05' }), CHOSEN, NOW).collectedAt)
    assert.equal(receiptFormErrors(form({ timeTouched: true, time: '10:10' }), CHOSEN, NOW).collectedAt, undefined)
    assert.ok(receiptFormErrors(form({ timeTouched: true, date: '' }), CHOSEN, NOW).collectedAt)
    // Cùng phút với lúc chọn tiền mặt: gửi đúng lúc chọn để backend (so tới giây) không từ chối
    assert.equal(cashReceiptBody(form({ timeTouched: true, time: '10:10' }), 'a', 'f', CHOSEN).collectedAt, CHOSEN)
  })

  test('gửi lại sau khi bị yêu cầu bổ sung: giữ giờ thu thật của phiếu cũ, không lấy lúc gửi lại', () => {
    const first = '2026-11-27T03:23:41.512+00:00'
    assert.equal(cashReceiptBody(form({ keptAt: first }), 'a', 'f', CHOSEN).collectedAt, first)
    // Sửa ô giờ thì gửi giờ mới
    assert.equal(
      cashReceiptBody(form({ keptAt: first, timeTouched: true, time: '10:20' }), 'a', 'f', CHOSEN).collectedAt,
      '2026-11-27T10:20:00+07:00',
    )
  })
})

describe('bước tiền mặt theo phiếu thu', () => {
  test('chưa gửi thì chụp; đang chờ duyệt thì khoá; bị yêu cầu bổ sung thì gửi lại', () => {
    assert.equal(receiptStep(null), 'capture')
    assert.equal(receiptStep({ status: 'SUBMITTED' }), 'review')
    assert.equal(receiptStep({ status: 'REJECTED' }), 'rejected')
    assert.equal(receiptStep({ status: 'WITHDRAWN' }), 'capture')
    assert.equal(isUnderReview({ status: 'SUBMITTED' }), true)
    assert.equal(isUnderReview({ status: 'REJECTED' }), false)
    const a = { cashReceiptId: 'a' }
    const b = { cashReceiptId: 'b' }
    assert.deepEqual(earlierReceipts([a, b], b), [a])
    assert.deepEqual(earlierReceipts(null, null), [])
  })

  test('tiền đã nhận mà báo giá chưa thành đã trả: không mở thanh toán lại', () => {
    const q = (quotationStatus, current, currentCashReceipt = null) => ({
      quotationStatus,
      nothingToPay: false,
      current,
      currentCashReceipt,
    })
    const paidCash = { status: 'PAID', method: 'CASH' }
    assert.equal(serviceQuoteStage(q('ACCEPTED', paidCash)), 'unapplied')
    assert.equal(serviceQuoteStage(q('EXPIRED', paidCash)), 'unapplied')
    assert.equal(serviceQuoteStage(q('ACCEPTED', { status: 'REVIEW_REQUIRED', method: 'ONLINE' })), 'unapplied')
    assert.equal(serviceQuoteStage(q('PAID', paidCash)), 'authorized')
    assert.equal(serviceQuoteStage(q('ACCEPTED', { status: 'PENDING', method: 'CASH' })), 'cash')
    // Phiếu chờ duyệt hỏi lại 15 giây, chưa có phiếu 1 phút, xong thì thôi
    const cash = { status: 'PENDING', method: 'CASH' }
    assert.equal(serviceQuotationPollMs(q('ACCEPTED', cash, { status: 'SUBMITTED' })), 15_000)
    assert.equal(serviceQuotationPollMs(q('ACCEPTED', cash, { status: 'REJECTED' })), 60_000)
    assert.equal(serviceQuotationPollMs(q('ACCEPTED', paidCash)), false)
  })
})

describe('quản lý duyệt phiếu thu', () => {
  const row = (context, extra = {}) => ({
    context,
    contractNumber: '',
    serviceRequestNumber: null,
    serviceRequestKind: null,
    quotationVersion: null,
    ...extra,
  })

  test('nhãn khoản theo ngữ cảnh, không in chữ rỗng hay undefined', () => {
    assert.equal(receiptContextLabel(row('INSTALLATION_DEPOSIT')), 'Cọc 30%')
    assert.equal(receiptContextLabel(row('INSTALLATION_BALANCE')), 'Thanh toán 70%')
    assert.equal(receiptContextLabel(row('AFTER_SALES_QUOTATION')), 'Hậu mãi')
    assert.equal(receiptContextLabel(row('LA')), 'Khoản khác')
    assert.equal(
      receiptContextDetail(
        row('AFTER_SALES_QUOTATION', {
          serviceRequestNumber: 'AS-1',
          quotationVersion: 2,
          serviceRequestKind: 'FAULT',
        }),
      ),
      'AS-1 bản 2, Báo lỗi',
    )
    assert.equal(receiptContextDetail(row('AFTER_SALES_QUOTATION')), '')
    assert.equal(receiptContextDetail(row('INSTALLATION_DEPOSIT', { contractNumber: 'HD-1' })), 'Hợp đồng HD-1')
    assert.equal(receiptContextDetail(row('INSTALLATION_DEPOSIT')), '')
    assert.doesNotMatch(receiptContextDetail(row('AFTER_SALES_QUOTATION', { quotationVersion: 1 })), /undefined|null/)
  })

  test('trạng thái theo người xem: phiếu chờ duyệt đỏ với quản lý, phiếu bị trả lại đỏ với kỹ thuật viên', () => {
    assert.equal(receiptStatusMeta('SUBMITTED', 'staff').tone, 'danger')
    assert.equal(receiptStatusMeta('REJECTED', 'technician').tone, 'danger')
    assert.equal(receiptStatusMeta('SUBMITTED', 'technician').tone, 'info')
    assert.equal(receiptStatusMeta('LA', 'staff').label, 'LA')
  })

  test('yêu cầu bổ sung bắt buộc lý do ≤ 500 ký tự; dòng chưa áp được tách ra để cảnh báo', () => {
    assert.ok(reviewReasonError('  '))
    assert.ok(reviewReasonError('x'.repeat(501)))
    assert.equal(reviewReasonError('Ảnh mờ'), null)
    const lines = [{ status: 'SETTLED' }, { status: 'REVIEW_REQUIRED' }]
    assert.equal(unappliedLines(lines).length, 1)
    assert.deepEqual(unappliedLines(null), [])
  })

  test('đường dẫn API đúng swagger của backend và mọi mã lỗi phiếu thu có câu tiếng Việt', () => {
    assert.equal(
      ENDPOINTS.technicianAfterSales.quotationCashReceipt('q1'),
      '/technicians/me/after-sales/quotations/q1/payment/cash-receipt',
    )
    assert.equal(
      ENDPOINTS.technicianAfterSales.quotationCashReceiptEvidenceUrl('q1', 'r1'),
      '/technicians/me/after-sales/quotations/q1/payment/cash-receipts/r1/evidence/url',
    )
    assert.equal(ENDPOINTS.managerPayments.acceptCashReceipt('r1'), '/manager/payments/cash-receipts/r1/accept')
    assert.equal(ENDPOINTS.managerPayments.rejectCashReceipt('r1'), '/manager/payments/cash-receipts/r1/reject')
    for (const code of [
      'NOT_FOUND',
      'ALREADY_SUBMITTED',
      'ATTEMPT_MISMATCH',
      'CONTEXT_MISMATCH',
      'DUPLICATE',
      'EVIDENCE_REUSED',
      'UNDER_REVIEW',
      'NOT_REVIEWABLE',
      'STALE',
    ])
      assert.ok(messageForCode(`PAYMENT_CASH_RECEIPT_${code}`), code)
  })
})
