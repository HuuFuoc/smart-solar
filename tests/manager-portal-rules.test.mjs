// Luật của cổng quản lý (dùng chung với quản trị) cho 10 endpoint ManagerAfterSales: hỗ trợ gói thiên tai, đóng vì trùng,
// dừng việc, không thực hiện được, sửa thiết bị, xét huỷ gói, hàng việc kinh doanh, hoàn tiền. Bám ServiceManagerHandlers,
// SalesTaskHandlers, RefundHandlers, ServicePackageHandlers của backend `main` (7c79fa8). Chạy: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  assetCorrectionBody,
  assetCorrectionErrors,
  assetDraftOf,
  assignTaskErrors,
  canAssignTask,
  canDecideClaim,
  canDecidePackageCancellation,
  canDecideRefund,
  canMarkNotFulfilled,
  canStopWork,
  changedAssetFields,
  claimReasonError,
  disasterCoverageAllowed,
  duplicateBlocker,
  duplicateCandidates,
  duplicateErrors,
  isReassignment,
  packageCancellationBody,
  packageCancellationErrors,
  matchesTaskFilter,
  packageRefundError,
  paidAmount,
  parseVnd,
  reasonError,
  refundDecisionBody,
  refundDecisionErrors,
  refundReasonText,
  stopBody,
  stopErrors,
  taskStatusParam,
  workStarted,
} from '../src/features/after-sales/managerAfterSalesRules.ts'

const claim = (status) => ({ claim: { status } })
const quotation = (status, customerAmount = 1_000_000) => ({ status, customerAmount })
const request = (over = {}) => ({
  requestId: 'r1',
  projectId: 'p1',
  kind: 'FAULT',
  status: 'SUBMITTED',
  visits: [],
  quotations: [],
  possibleDuplicates: [],
  claim: null,
  ...over,
})

describe('tiền VND', () => {
  test('nhận số liền và số ngăn hàng nghìn', () => {
    assert.equal(parseVnd('1500000'), 1_500_000)
    assert.equal(parseVnd('1.500.000'), 1_500_000)
    assert.equal(parseVnd(' 2 000 '), 2000)
    assert.equal(parseVnd('0'), 0)
  })
  test('từ chối số lẻ, số âm, chữ', () => {
    assert.equal(parseVnd('1,5'), null)
    assert.equal(parseVnd('-1000'), null)
    assert.equal(parseVnd('12.5'), null)
    assert.equal(parseVnd('abc'), null)
    assert.equal(parseVnd(''), null)
  })
})

describe('hỗ trợ của gói thiên tai (claim-decision)', () => {
  test('chỉ quyết định khi chờ lần đầu hoặc khách xin xét lại', () => {
    assert.equal(canDecideClaim(claim('SUBMITTED')), true)
    assert.equal(canDecideClaim(claim('RECONSIDERATION_REQUESTED')), true)
  })
  test('chuyển không hợp lệ: đã duyệt, đã từ chối, không đủ điều kiện, không có claim', () => {
    for (const s of ['APPROVED', 'REJECTED', 'NOT_ELIGIBLE']) assert.equal(canDecideClaim(claim(s)), false, s)
    assert.equal(canDecideClaim({ claim: null }), false)
  })
  test('từ chối bắt buộc lý do, duyệt thì không; lý do tối đa 1000 ký tự', () => {
    assert.equal(claimReasonError(false, '  '), 'Ghi lý do từ chối để khách biết.')
    assert.equal(claimReasonError(true, ''), undefined)
    assert.equal(claimReasonError(false, 'Ảnh không cho thấy hư hại do bão'), undefined)
    assert.match(claimReasonError(true, 'x'.repeat(1001)), /1000/)
  })
  test('hạng mục chỉ chọn "gói thiên tai" sau khi hỗ trợ được duyệt', () => {
    assert.equal(disasterCoverageAllowed(claim('APPROVED')), true)
    assert.equal(disasterCoverageAllowed(claim('SUBMITTED')), false)
    assert.equal(disasterCoverageAllowed({ claim: null }), false)
  })
})

describe('đóng vì trùng (duplicate)', () => {
  const all = [
    { requestId: 'r1', projectId: 'p1', createdAt: '2026-11-01T08:00:00+07:00' },
    { requestId: 'r2', projectId: 'p1', createdAt: '2026-10-01T08:00:00+07:00' },
    { requestId: 'r3', projectId: 'p1', createdAt: '2026-10-20T08:00:00+07:00' },
    { requestId: 'r4', projectId: 'p2', createdAt: '2026-10-02T08:00:00+07:00' },
  ]
  test('yêu cầu gốc: cùng công trình, khác chính nó, yêu cầu được cảnh báo lên đầu rồi cũ trước', () => {
    const r = request({ possibleDuplicates: [{ requestId: 'r3' }] })
    assert.deepEqual(
      duplicateCandidates(r, all).map((c) => c.requestId),
      ['r3', 'r2'],
    )
  })
  test('chặn khi đã đóng hoặc đã có báo giá đã thanh toán', () => {
    assert.equal(duplicateBlocker(request()), null)
    assert.equal(duplicateBlocker(request({ status: 'CLOSED_DUPLICATE' })), 'Yêu cầu đã đóng.')
    assert.match(duplicateBlocker(request({ quotations: [quotation('PAID')] })), /thanh toán/)
    assert.equal(duplicateBlocker(request({ quotations: [quotation('ISSUED')] })), null)
  })
  test('phải chọn yêu cầu gốc; ghi chú tối đa 500', () => {
    assert.deepEqual(duplicateErrors('', ''), { original: 'Chọn yêu cầu gốc.' })
    assert.deepEqual(duplicateErrors('r2', ''), {})
    assert.match(duplicateErrors('r2', 'x'.repeat(501)).reason, /500/)
  })
})

describe('dừng việc đã bắt đầu (stop)', () => {
  test('chỉ việc đã bắt đầu: buổi hẹn đang làm hoặc trạng thái sau khi làm', () => {
    assert.equal(canStopWork(request({ status: 'SCHEDULED', visits: [{ status: 'IN_PROGRESS' }] })), true)
    for (const s of ['IN_PROGRESS', 'PENDING_CUSTOMER_ACCEPTANCE', 'DISPUTED', 'REWORK_REQUIRED'])
      assert.equal(canStopWork(request({ status: s })), true, s)
  })
  test('chuyển không hợp lệ: việc chưa làm hoặc đã đóng thì không dừng', () => {
    for (const s of ['SUBMITTED', 'SCHEDULED', 'AWAITING_DECISION', 'AWAITING_CUSTOMER', 'READY_FOR_WORK'])
      assert.equal(canStopWork(request({ status: s, visits: [{ status: 'SCHEDULED' }] })), false, s)
    assert.equal(canStopWork(request({ status: 'CANCELLED', visits: [{ status: 'IN_PROGRESS' }] })), false)
    assert.equal(workStarted(request({ status: 'AWAITING_DECISION', visits: [{ status: 'REPORTED' }] })), false)
  })
  test('số hoàn nguyên, không vượt số khách đã trả; lý do bắt buộc', () => {
    const r = request({ quotations: [quotation('PAID', 800_000), quotation('PAID', 200_000), quotation('ISSUED')] })
    const paid = paidAmount(r)
    assert.equal(paid, 1_000_000)
    assert.deepEqual(stopErrors({ reason: 'Khách đổi ý', refund: '1.000.000' }, paid, '1.000.000 ₫'), {})
    assert.deepEqual(stopErrors({ reason: '', refund: '' }, paid, '1.000.000 ₫'), {
      reason: 'Ghi lý do dừng việc.',
      refund: 'Nhập số tiền (0 nếu không hoàn).',
    })
    assert.match(stopErrors({ reason: 'x', refund: '1000001' }, paid, '1.000.000 ₫').refund, /Không vượt/)
    assert.match(stopErrors({ reason: 'x', refund: '1,5' }, paid, '1.000.000 ₫').refund, /nguyên/)
    assert.deepEqual(stopBody({ reason: ' Hỏng thêm ', refund: '500.000' }), {
      reason: 'Hỏng thêm',
      refundAmount: 500_000,
    })
  })
})

describe('không thực hiện được (not-fulfilled)', () => {
  test('bảo trì lẻ còn mở, chưa làm', () => {
    assert.equal(canMarkNotFulfilled(request({ kind: 'ONE_TIME_MAINTENANCE', status: 'READY_FOR_WORK' })), true)
    assert.equal(
      canMarkNotFulfilled(
        request({ kind: 'ONE_TIME_MAINTENANCE', status: 'SCHEDULED', visits: [{ status: 'CANCELLED' }] }),
      ),
      true,
    )
  })
  test('chuyển không hợp lệ: báo lỗi, bảo trì theo gói, đã đóng, đã làm', () => {
    assert.equal(canMarkNotFulfilled(request({ kind: 'FAULT' })), false)
    assert.equal(canMarkNotFulfilled(request({ kind: 'MAINTENANCE' })), false)
    assert.equal(canMarkNotFulfilled(request({ kind: 'ONE_TIME_MAINTENANCE', status: 'CANCELLED' })), false)
    for (const v of ['IN_PROGRESS', 'REPORTED'])
      assert.equal(
        canMarkNotFulfilled(request({ kind: 'ONE_TIME_MAINTENANCE', status: 'SCHEDULED', visits: [{ status: v }] })),
        false,
        v,
      )
  })
  test('lý do bắt buộc', () => {
    assert.equal(reasonError(' ', 1000), 'Ghi lý do.')
    assert.equal(reasonError('Không có kỹ thuật viên', 1000), undefined)
    assert.match(reasonError('x'.repeat(1001), 1000), /1000/)
  })
})

describe('sửa thông tin thiết bị (PUT assets)', () => {
  const asset = { manufacturer: 'Huawei', model: 'SUN2000', serialNumber: 'HW-1', positionCode: 'A1' }
  test('chỉ gửi ô đã đổi, ô khác để null; xoá vị trí gửi chuỗi rỗng', () => {
    const draft = { ...assetDraftOf(asset), serialNumber: ' HW-2 ', positionCode: '', reason: 'Ghi nhầm serial' }
    assert.deepEqual(changedAssetFields(asset, draft), ['serialNumber', 'positionCode'])
    assert.deepEqual(assetCorrectionErrors(asset, draft), {})
    assert.deepEqual(assetCorrectionBody(asset, draft), {
      manufacturer: null,
      model: null,
      serialNumber: 'HW-2',
      positionCode: '',
      specifications: null,
      reason: 'Ghi nhầm serial',
    })
  })
  test('thiếu lý do bị chặn; không sửa ô nào bị chặn', () => {
    const errors = assetCorrectionErrors(asset, assetDraftOf(asset))
    assert.equal(errors.reason, 'Ghi lý do.')
    assert.equal(errors.form, 'Chưa sửa ô nào.')
  })
  test('hãng, model, serial không để trống (backend giữ giá trị cũ); quá độ dài bị chặn', () => {
    const errors = assetCorrectionErrors(asset, {
      ...assetDraftOf(asset),
      manufacturer: ' ',
      positionCode: 'x'.repeat(51),
      reason: 'r',
    })
    assert.equal(errors.manufacturer, 'Không để trống ô này.')
    assert.match(errors.positionCode, /50/)
  })
  test('thông số không đọc được từ chi tiết công trình: bỏ trống là giữ nguyên', () => {
    const draft = { ...assetDraftOf(asset), model: 'SUN2000-5KTL', reason: 'Sai model' }
    assert.equal(assetCorrectionBody(asset, draft).specifications, null)
  })
})

describe('hàng việc kinh doanh (GET tasks, POST assign)', () => {
  const open = { status: 'OPEN', assignedSalesUserId: null, taskType: 'REPAIR_QUOTATION' }
  const held = { status: 'IN_PROGRESS', assignedSalesUserId: 's1', taskType: 'MAINTENANCE_FOLLOW_UP' }
  test('giao việc chưa ai nhận không cần lý do', () => {
    assert.equal(canAssignTask(open), true)
    assert.equal(isReassignment(open), false)
    assert.deepEqual(assignTaskErrors(open, 's2', ''), {})
  })
  test('giao lại bắt buộc lý do và phải là người khác', () => {
    assert.equal(isReassignment(held), true)
    assert.deepEqual(assignTaskErrors(held, 's2', ''), { reason: 'Giao lại việc đã có người giữ phải ghi lý do.' })
    assert.equal(assignTaskErrors(held, 's1', 'Nghỉ phép').salesUserId, 'Người này đang giữ việc. Chọn người khác.')
    assert.deepEqual(assignTaskErrors(held, 's2', 'Nghỉ phép'), {})
    assert.equal(assignTaskErrors(open, '', '').salesUserId, 'Chọn nhân viên kinh doanh.')
  })
  test('chuyển không hợp lệ: việc đã xong / đã huỷ không giao được', () => {
    assert.equal(canAssignTask({ status: 'DONE' }), false)
    assert.equal(canAssignTask({ status: 'CANCELLED' }), false)
  })
  test('bộ lọc: trạng thái gửi lên backend, loại và người giữ lọc ở máy', () => {
    assert.equal(taskStatusParam('open'), undefined)
    assert.equal(taskStatusParam('all'), undefined)
    assert.equal(taskStatusParam('CLAIMED'), 'CLAIMED')
    const f = (o) => ({ status: 'all', type: '', assignee: '', ...o })
    assert.equal(matchesTaskFilter(open, f({ assignee: 'none' })), true)
    assert.equal(matchesTaskFilter(held, f({ assignee: 'none' })), false)
    assert.equal(matchesTaskFilter(held, f({ assignee: 'some' })), true)
    assert.equal(matchesTaskFilter(held, f({ assignee: 's1' })), true)
    assert.equal(matchesTaskFilter(held, f({ type: 'REPAIR_QUOTATION' })), false)
    assert.equal(matchesTaskFilter({ ...held, status: 'DONE' }, f({ status: 'open' })), false)
  })
})

describe('hoàn tiền (GET refunds, POST decision)', () => {
  const refund = { status: 'PENDING_APPROVAL', originalAmount: 1_500_000 }
  test('duyệt một phần hoặc toàn bộ, không vượt số gốc', () => {
    assert.equal(canDecideRefund(refund), true)
    assert.deepEqual(refundDecisionErrors(refund, { approve: true, amount: '1.500.000', note: '' }, '1.500.000 ₫'), {})
    assert.deepEqual(refundDecisionBody({ approve: true, amount: '1.000.000', note: ' Trừ phí ' }), {
      approve: true,
      approvedAmount: 1_000_000,
      note: 'Trừ phí',
    })
    assert.match(
      refundDecisionErrors(refund, { approve: true, amount: '1500001', note: '' }, '1.500.000 ₫').amount,
      /Không vượt/,
    )
  })
  test('từ chối không gửi số tiền', () => {
    assert.deepEqual(refundDecisionErrors(refund, { approve: false, amount: 'abc', note: '' }, ''), {})
    assert.deepEqual(refundDecisionBody({ approve: false, amount: '1', note: '' }), {
      approve: false,
      approvedAmount: null,
      note: null,
    })
  })
  test('chuyển không hợp lệ: khoản đã duyệt / đã hoàn / không hoàn không xét lại', () => {
    for (const s of ['APPROVED', 'REFUNDED', 'REJECTED']) assert.equal(canDecideRefund({ status: s }), false, s)
  })
  test('dịch lý do backend tự ghi, giữ lý do người gõ', () => {
    assert.equal(
      refundReasonText('Package cancelled before activation: Chuyển nhà'),
      'Khách huỷ gói trước khi bắt đầu kỳ: Chuyển nhà',
    )
    assert.equal(
      refundReasonText('Payment received but not applied: The payment was made after the checkout expired.'),
      'Đã nhận tiền nhưng không áp dụng được: khách trả sau khi link thanh toán hết hạn.',
    )
    assert.equal(refundReasonText('Installation cancelled before handover'), 'Công trình bị huỷ trước khi bàn giao.')
    assert.equal(refundReasonText('Work stopped: Mưa lớn'), 'Dừng việc: Mưa lớn')
    assert.equal(refundReasonText('Khác'), 'Khác')
  })
})

describe('xét huỷ gói đã trả tiền (subscriptions/cancellation-decision)', () => {
  test('chỉ gói khách đã xin huỷ', () => {
    assert.equal(canDecidePackageCancellation({ status: 'CANCELLATION_REQUESTED' }), true)
    for (const s of ['PAID', 'ACTIVE', 'AWAITING_PAYMENT', 'CANCELLED'])
      assert.equal(canDecidePackageCancellation({ status: s }), false, s)
  })
  test('số hoàn nguyên, từ 0 tới giá gói', () => {
    assert.equal(packageRefundError(990_000, '990.000', '990.000 ₫'), undefined)
    assert.equal(packageRefundError(990_000, '0', '990.000 ₫'), undefined)
    assert.match(packageRefundError(990_000, '990001', '990.000 ₫'), /Không vượt/)
    assert.match(packageRefundError(990_000, '', '990.000 ₫'), /Nhập số tiền/)
  })
  test('duyệt: lỗi ở ô số tiền; từ chối: không kiểm số tiền, chỉ giới hạn ghi chú 500 ký tự', () => {
    const approve = (amount) => ({ approve: true, amount, note: '' })
    assert.deepEqual(packageCancellationErrors(2_000_000, approve('1.500.000'), '2.000.000 ₫'), {})
    assert.match(packageCancellationErrors(2_000_000, approve('2.500.000'), '2.000.000 ₫').amount, /Không vượt quá 2.000.000/)
    assert.match(packageCancellationErrors(2_000_000, approve('1,5'), '2.000.000 ₫').amount, /số nguyên/)
    const reject = (note) => ({ approve: false, amount: '9.999.999', note })
    assert.deepEqual(packageCancellationErrors(2_000_000, reject(''), '2.000.000 ₫'), {})
    assert.deepEqual(packageCancellationErrors(2_000_000, reject('x'.repeat(500)), '2.000.000 ₫'), {})
    assert.match(packageCancellationErrors(2_000_000, reject('x'.repeat(501)), '2.000.000 ₫').note, /Tối đa 500/)
  })
  test('body: duyệt gửi số tiền, không gửi ghi chú; từ chối không gửi số tiền, ghi chú trống thành null', () => {
    assert.deepEqual(packageCancellationBody({ approve: true, amount: '1.500.000', note: 'bỏ qua' }), {
      approve: true,
      refundAmount: 1_500_000,
      note: null,
    })
    assert.deepEqual(packageCancellationBody({ approve: false, amount: '1.500.000', note: '  ' }), {
      approve: false,
      refundAmount: null,
      note: null,
    })
    assert.deepEqual(packageCancellationBody({ approve: false, amount: '', note: ' Gói vẫn dùng được ' }), {
      approve: false,
      refundAmount: null,
      note: 'Gói vẫn dùng được',
    })
  })
})
