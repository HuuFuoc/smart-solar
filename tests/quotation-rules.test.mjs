// Luật báo giá lắp đặt: duyệt giá, vấn đề giá của bản nháp tự lập, biên bản khảo sát đổi, lập bản sửa. Bám QuotationHandlers
// và QuotationPricingApproval của backend `main` (66cb7af). Chạy: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  approvalBlocksIssue,
  approvalReasonError,
  blockingPricingIssues,
  bomMismatchesOf,
  canDecidePricingApproval,
  canRequestPricingApproval,
  canReviseQuotation,
  pricingApprovalStatus,
  reviewNoteError,
  reviewNoteRequired,
  surveyChangedDraft,
  totalReduction,
} from '../src/features/quotations/quotationRules.ts'

const draft = (status) => ({ status: 'DRAFT', pricingApproval: status ? { status, adjustments: [] } : null })

describe('duyệt giá', () => {
  test('thiếu pricingApproval (backend cũ, khách xem) là không cần duyệt', () => {
    assert.equal(pricingApprovalStatus({}), 'NOT_REQUIRED')
    assert.equal(approvalBlocksIssue(draft(null)), false)
  })
  test('chỉ không cần duyệt hoặc đã duyệt mới gửi khách được', () => {
    assert.equal(approvalBlocksIssue(draft('NOT_REQUIRED')), false)
    assert.equal(approvalBlocksIssue(draft('APPROVED')), false)
    assert.equal(approvalBlocksIssue(draft('REQUIRED')), true)
    assert.equal(approvalBlocksIssue(draft('PENDING')), true)
    assert.equal(approvalBlocksIssue(draft('REJECTED')), true)
  })
  test('bản đã gửi không còn chặn theo duyệt giá', () => {
    assert.equal(approvalBlocksIssue({ status: 'ISSUED', pricingApproval: { status: 'REQUIRED' } }), false)
  })
  test('xin duyệt khi chưa xin hoặc bị từ chối; đang chờ / đã duyệt thì không', () => {
    assert.equal(canRequestPricingApproval(draft('REQUIRED')), true)
    assert.equal(canRequestPricingApproval(draft('REJECTED')), true)
    assert.equal(canRequestPricingApproval(draft('PENDING')), false)
    assert.equal(canRequestPricingApproval(draft('APPROVED')), false)
    assert.equal(canRequestPricingApproval(draft('NOT_REQUIRED')), false)
  })
  test('quản lý chỉ quyết định bản nháp đang chờ', () => {
    assert.equal(canDecidePricingApproval(draft('PENDING')), true)
    assert.equal(canDecidePricingApproval(draft('REQUIRED')), false)
    assert.equal(canDecidePricingApproval({ status: 'ISSUED', pricingApproval: { status: 'PENDING' } }), false)
  })
  test('lý do bắt buộc, tối đa 1000 ký tự', () => {
    assert.ok(approvalReasonError('   '))
    assert.ok(approvalReasonError('x'.repeat(1001)))
    assert.equal(approvalReasonError('  Khách lấy số lượng lớn  '), undefined)
  })
  test('tổng giảm: giá 0 không có số tiền thì bỏ qua, thiếu số khác thì không tính', () => {
    assert.equal(totalReduction([]), null)
    assert.equal(
      totalReduction([
        { kind: 'DISCOUNT', amount: 500_000 },
        { kind: 'REDUCED_UNIT_PRICE', amount: 1_200_000 },
        { kind: 'ZERO_PRICE', amount: null },
      ]),
      1_700_000,
    )
    assert.equal(totalReduction([{ kind: 'REDUCED_UNIT_PRICE', amount: null }]), null)
  })
})

describe('bản nháp hệ thống tự lập', () => {
  const review = (codes, noteRequired = false) => ({
    pricingReview: { outstanding: codes.map((code) => ({ code, message: null })), noteRequired },
  })
  test('thiếu giá, thiếu tấm pin / inverter / nhân công, tổng sai phải sửa', () => {
    const q = review(['PRICE_MISSING', 'MISSING_INVERTER', 'CONDITIONS_REQUIRE_REVIEW'], true)
    assert.deepEqual(
      blockingPricingIssues(q).map((i) => i.code),
      ['PRICE_MISSING', 'MISSING_INVERTER'],
    )
  })
  test('mã lạ coi là phải sửa (backend chỉ cho bỏ qua 4 mã)', () => {
    assert.equal(blockingPricingIssues(review(['SOMETHING_NEW'])).length, 1)
  })
  test('còn điểm chấp nhận được thì gửi phải kèm ghi chú', () => {
    assert.equal(reviewNoteRequired(review(['PRODUCT_UNAVAILABLE'], true)), true)
    assert.equal(reviewNoteRequired({ pricingReview: null }), false)
    assert.ok(reviewNoteError('  ', true))
    assert.equal(reviewNoteError('', false), undefined)
    assert.ok(reviewNoteError('x'.repeat(1001), false))
  })
})

describe('biên bản khảo sát đổi, bản sửa', () => {
  test('chỉ bản nháp có surveyChanged bị chặn gửi', () => {
    assert.equal(surveyChangedDraft({ status: 'DRAFT', surveyChanged: true }), true)
    assert.equal(surveyChangedDraft({ status: 'DRAFT', surveyChanged: false }), false)
    assert.equal(surveyChangedDraft({ status: 'ISSUED', surveyChanged: true }), false)
  })
  test('lập bản sửa từ bản đã gửi, bị yêu cầu sửa, bị từ chối; bản đã đồng ý chỉ khi biên bản đổi', () => {
    for (const status of ['ISSUED', 'REVISION_REQUESTED', 'REJECTED'])
      assert.equal(canReviseQuotation({ status, surveyChanged: false }), true)
    assert.equal(canReviseQuotation({ status: 'ACCEPTED', surveyChanged: false }), false)
    assert.equal(canReviseQuotation({ status: 'ACCEPTED', surveyChanged: true }), true)
    assert.equal(canReviseQuotation({ status: 'DRAFT', surveyChanged: false }), false)
    assert.equal(canReviseQuotation({ status: 'CANCELLED', surveyChanged: false }), false)
  })
  test('đọc chi tiết lỗi QUOTATION_BOM_MISMATCH, bỏ dạng lạ', () => {
    const details = {
      mismatches: [
        { productId: 'p1', sku: 'PV-1', surveyQuantity: 10, quotedQuantity: 12 },
        { productId: 'p2', sku: null },
      ],
    }
    assert.deepEqual(bomMismatchesOf(details), [
      { productId: 'p1', sku: 'PV-1', surveyQuantity: 10, quotedQuantity: 12 },
    ])
    assert.deepEqual(bomMismatchesOf(null), [])
    assert.deepEqual(bomMismatchesOf({ mismatches: 'x' }), [])
  })
})
