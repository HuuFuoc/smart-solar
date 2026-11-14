// Luật cổng khách hàng: ký và thanh toán hợp đồng, lượt bảo trì, đổi giờ, xin xét lại, báo lỗi từ bảo trì, điểm quay về PayOS.
// Bám ContractHandlers, PaymentService, ServiceCustomerHandlers của backend `main` (7c79fa8). Chạy: npm test
import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'
import {
  activeDisasterTerm,
  BOOKING_LEAD_DAYS,
  bookingDays,
  canReportFaultFromMaintenance,
  canRequestReconsideration,
  canReschedule,
  entitlementDeadline,
  entitlementOf,
  faultDescriptionError,
  incidentTimeError,
  isBookable,
  maintenanceFinding,
  preferredStartProblem,
  reconsiderationNoteError,
  rescheduleTooLate,
} from '../src/features/after-sales/customerServiceRules.ts'
import {
  attemptsNeedingStaff,
  canCancelPayment,
  canCreatePayment,
  canPay,
  canSubmitSigned,
  formatCountdown,
  isCombinedCheckout,
  isCustomerTodo,
  lastRejection,
  latestPerContract,
  newerVersion,
  REUPLOAD_ERROR_CODES,
  RESIGN_ERROR_CODES,
  secondsLeft,
  shouldPollPayment,
  signedDocumentBody,
  signingSnapshot,
  snapshotStillCurrent,
} from '../src/features/contracts/customerContractRules.ts'
import { PAYOS_RETURN_PARAM, rememberCheckout, returnPathFor } from '../src/features/payments/payosReturn.ts'

const OFFICIAL = 'a'.repeat(64)

function contract(extra = {}) {
  return {
    contractId: 'c-1',
    contractNumber: 'HD-1',
    version: 1,
    previousContractId: null,
    quotationId: 'q-1',
    quotationVersion: 1,
    surveyRequestId: 'sr-1',
    status: 'AWAITING_SIGNATURE',
    currency: 'VND',
    totalAmount: 32_400_000,
    canonicalHash: 'b'.repeat(64),
    officialDocument: { fileId: 'f-1', sha256: OFFICIAL, confirmedAt: '2026-11-01T02:00:00Z' },
    signedDocument: null,
    rejectionReason: null,
    publishedAt: '2026-11-01T02:00:00Z',
    signedAt: null,
    paidAt: null,
    revision: 4,
    submissions: [],
    events: null,
    warrantyMonths: 12,
    ...extra,
  }
}

function attempt(extra = {}) {
  return {
    paymentAttemptId: 'pa-1',
    contractId: 'c-1',
    orderCode: 1234,
    amount: 32_400_000,
    currency: 'VND',
    status: 'PENDING',
    checkoutUrl: 'https://pay.payos.vn/x',
    qrCode: 'qr',
    expiresAt: '2026-11-03T03:15:00Z',
    paidAt: null,
    providerReference: null,
    failureReason: null,
    createdAt: '2026-11-03T03:00:00Z',
    ...extra,
  }
}

const paymentView = (extra = {}) => ({
  contractId: 'c-1',
  contractStatus: 'SIGNED',
  amount: 32_400_000,
  currency: 'VND',
  current: null,
  attempts: [],
  history: null,
  ...extra,
})

describe('Ký hợp đồng', () => {
  test('gửi bản ký được khi chờ ký hoặc bản trước bị từ chối, có SHA-256 của PDF chính thức', () => {
    assert.equal(canSubmitSigned(contract()), true)
    assert.equal(canSubmitSigned(contract({ status: 'SIGNATURE_REJECTED' })), true)
  })

  test('chuyển trạng thái không hợp lệ: không gửi bản ký khi đang duyệt, đã ký, đã trả tiền, đã bị thay', () => {
    for (const status of ['UNDER_REVIEW', 'SIGNED', 'PAID', 'SUPERSEDED', 'ISSUED', 'DRAFT'])
      assert.equal(canSubmitSigned(contract({ status })), false, status)
    assert.equal(canSubmitSigned(contract({ officialDocument: null })), false)
    assert.equal(
      canSubmitSigned(contract({ officialDocument: { fileId: 'f', sha256: null, confirmedAt: null } })),
      false,
    )
    assert.equal(signingSnapshot(contract({ status: 'UNDER_REVIEW' })), null)
  })

  test('gửi đúng SHA-256 đã chụp lúc mở hộp thoại, không lấy mã của bản tải lại', () => {
    const snapshot = signingSnapshot(contract())
    const reloaded = contract({ officialDocument: { fileId: 'f-2', sha256: 'c'.repeat(64), confirmedAt: null } })
    assert.deepEqual(signedDocumentBody(snapshot, 'file-9'), { fileId: 'file-9', officialDocumentSha256: OFFICIAL })
    assert.equal(snapshotStillCurrent(snapshot, contract()), true)
    assert.equal(
      snapshotStillCurrent(
        snapshot,
        contract({ officialDocument: { ...contract().officialDocument, sha256: OFFICIAL.toUpperCase() } }),
      ),
      true,
    )
    assert.equal(snapshotStillCurrent(snapshot, reloaded), false)
    assert.equal(snapshotStillCurrent(snapshot, contract({ contractId: 'c-2' })), false)
    assert.equal(snapshotStillCurrent(snapshot, contract({ status: 'SUPERSEDED' })), false)
  })

  test('lỗi lệch phiên bản / tệp đổi bắt ký lại; lỗi tệp bản ký bắt tải lại', () => {
    for (const code of ['CONTRACT_WRONG_DOCUMENT_VERSION', 'FILE_CONTENT_CHANGED', 'CONTRACT_INVALID_STATE'])
      assert.ok(RESIGN_ERROR_CODES.includes(code), code)
    for (const code of ['FILE_ALREADY_LINKED', 'FILE_NOT_OWNED', 'FILE_CONTENT_CHANGED'])
      assert.ok(REUPLOAD_ERROR_CODES.includes(code), code)
    assert.equal(RESIGN_ERROR_CODES.includes('PAYMENT_PROVIDER_ERROR'), false)
  })

  test('lý do từ chối gần nhất để khách ký lại', () => {
    const c = contract({
      status: 'SIGNATURE_REJECTED',
      submissions: [
        { submissionId: 's1', outcome: 'REJECTED', rejectionReason: 'Thiếu chữ ký trang 2' },
        { submissionId: 's2', outcome: 'REJECTED', rejectionReason: 'Mờ' },
      ],
    })
    assert.equal(lastRejection(c).rejectionReason, 'Mờ')
    assert.equal(lastRejection(contract()), null)
  })
})

describe('Thanh toán hợp đồng', () => {
  test('chỉ hợp đồng đã duyệt bản ký mới thanh toán được', () => {
    assert.equal(canPay(contract({ status: 'SIGNED' })), true)
    for (const status of ['AWAITING_SIGNATURE', 'UNDER_REVIEW', 'SIGNATURE_REJECTED', 'PAID', 'SUPERSEDED'])
      assert.equal(canPay(contract({ status })), false, status)
  })

  test('tạo link khi chưa có link còn chờ; có link sống thì dùng lại, không tạo thêm', () => {
    assert.equal(canCreatePayment(paymentView()), true)
    assert.equal(canCreatePayment(paymentView({ current: attempt({ status: 'EXPIRED' }) })), true)
    assert.equal(canCreatePayment(paymentView({ current: attempt() })), false)
    assert.equal(canCreatePayment(paymentView({ current: attempt({ status: 'PROCESSING' }) })), false)
    assert.equal(canCreatePayment(paymentView({ contractStatus: 'PAID', current: attempt({ status: 'PAID' }) })), false)
    assert.equal(canCreatePayment(undefined), false, 'chưa tải trạng thái thì chưa tạo')
  })

  test('hỏi lại trạng thái chỉ khi hợp đồng chờ trả tiền và link còn chờ', () => {
    assert.equal(shouldPollPayment(paymentView({ current: attempt() })), true)
    assert.equal(shouldPollPayment(paymentView({ current: attempt({ status: 'PROCESSING' }) })), true)
    for (const status of ['CANCELLED', 'EXPIRED', 'FAILED', 'REVIEW_REQUIRED'])
      assert.equal(shouldPollPayment(paymentView({ current: attempt({ status }) })), false, status)
    assert.equal(
      shouldPollPayment(paymentView({ contractStatus: 'PAID', current: attempt({ status: 'PAID' }) })),
      false,
    )
    assert.equal(shouldPollPayment(paymentView()), false)
  })

  test('link mua gói kèm hợp đồng không huỷ ở trang hợp đồng; link riêng thì huỷ được', () => {
    const view = paymentView({ current: attempt() })
    assert.equal(isCombinedCheckout(attempt(), view), false)
    assert.equal(canCancelPayment(view), true)
    const combined = paymentView({ current: attempt({ amount: 32_400_000 + 1_500_000 }) })
    assert.equal(isCombinedCheckout(combined.current, combined), true)
    assert.equal(canCancelPayment(combined), false)
    assert.equal(canCancelPayment(paymentView({ current: attempt({ status: 'EXPIRED' }) })), false)
  })

  test('đếm ngược theo giờ máy chỉ để hiện, không âm', () => {
    const at = Date.parse('2026-11-03T03:15:00Z')
    assert.equal(secondsLeft('2026-11-03T03:15:00Z', at - 65_000), 65)
    assert.equal(secondsLeft('2026-11-03T03:15:00Z', at + 5_000), 0)
    assert.equal(formatCountdown(65), '1:05')
    assert.equal(formatCountdown(3_725), '1:02:05')
  })

  test('khoản tiền cần nhân viên xử lý tay', () => {
    const list = [attempt(), attempt({ status: 'REVIEW_REQUIRED' }), attempt({ status: 'REFUND_REQUIRED' })]
    assert.deepEqual(
      attemptsNeedingStaff(list).map((a) => a.status),
      ['REVIEW_REQUIRED', 'REFUND_REQUIRED'],
    )
  })
})

describe('Danh sách hợp đồng', () => {
  test('mỗi số hợp đồng một dòng là phiên bản mới nhất, việc của khách lên đầu', () => {
    const list = [
      contract({ contractId: 'a1', contractNumber: 'HD-A', version: 1, status: 'SUPERSEDED' }),
      contract({ contractId: 'a2', contractNumber: 'HD-A', version: 2, status: 'UNDER_REVIEW' }),
      contract({ contractId: 'b1', contractNumber: 'HD-B', version: 1, status: 'SIGNED' }),
      contract({ contractId: 'c1', contractNumber: 'HD-C', version: 1, status: 'PAID' }),
    ]
    assert.deepEqual(
      latestPerContract(list).map((c) => c.contractId),
      ['b1', 'a2', 'c1'],
    )
    assert.equal(newerVersion(list[0], list).contractId, 'a2')
    assert.equal(newerVersion(list[1], list), null)
    assert.equal(isCustomerTodo(contract({ status: 'SIGNED' })), true)
    assert.equal(isCustomerTodo(contract({ status: 'UNDER_REVIEW' })), false)
  })
})

describe('Điểm quay về PayOS', () => {
  let store
  beforeEach(() => {
    store = new Map()
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
    }
  })
  afterEach(() => {
    delete globalThis.localStorage
  })

  test('quay về đúng trang đã mở link, kèm tham số báo vừa quay về', () => {
    rememberCheckout(1234, '/customer/contracts/c-1')
    assert.equal(returnPathFor('1234', 'return'), `/customer/contracts/c-1?${PAYOS_RETURN_PARAM}=return`)
    rememberCheckout(55, '/customer/packages?thanh-toan=pa-9')
    assert.equal(returnPathFor('55', 'cancel'), '/customer/packages?thanh-toan=pa-9&payos=cancel')
  })

  test('mã đơn lạ hoặc thiếu thì không đoán trang', () => {
    rememberCheckout(1234, '/customer/contracts/c-1')
    assert.equal(returnPathFor('999', 'return'), null)
    assert.equal(returnPathFor(null, 'return'), null)
  })

  test('không chuyển tới địa chỉ ngoài trang và bỏ mục quá một ngày', () => {
    store.set('payos-return', JSON.stringify({ 1: { path: 'https://evil.test', at: Date.now() } }))
    assert.equal(returnPathFor('1', 'return'), null)
    store.set('payos-return', JSON.stringify({ 2: { path: '/customer/contracts/c', at: Date.now() - 25 * 3600_000 } }))
    assert.equal(returnPathFor('2', 'return'), null)
  })
})

// ---------- Sau bán ----------

const NOW = Date.parse('2026-11-03T03:00:00Z') // 10:00 giờ Việt Nam

function subscription(extra = {}) {
  return {
    subscriptionId: 'sub-1',
    contractId: 'c-1',
    projectId: 'p-1',
    kind: 'MAINTENANCE',
    status: 'ACTIVE',
    packageName: 'Bảo trì 2 lần',
    endsAt: '2027-06-01T00:00:00+07:00',
    entitlements: [entitlement()],
    ...extra,
  }
}

function entitlement(extra = {}) {
  return {
    entitlementId: 'ent-1',
    planMonth: 6,
    periodStartsAt: '2026-10-01T00:00:00+07:00',
    periodEndsAt: '2026-11-01T00:00:00+07:00',
    status: 'AVAILABLE',
    currentRequestId: null,
    extendedUntil: null,
    consumedAt: null,
    ...extra,
  }
}

function request(extra = {}) {
  return {
    requestId: 'r-1',
    kind: 'MAINTENANCE',
    status: 'SUBMITTED',
    cancellationRequestedAt: null,
    maintenanceEntitlementId: 'ent-1',
    visits: [],
    claim: null,
    ...extra,
  }
}

const visit = (extra = {}) => ({
  visitId: 'v-1',
  purpose: 'MAINTENANCE',
  status: 'SCHEDULED',
  startsAt: '2026-11-10T08:00:00+07:00',
  endsAt: '2026-11-10T10:00:00+07:00',
  reportedAt: null,
  findingNote: null,
  ...extra,
})

const limits = (extra = {}) => ({
  now: NOW,
  leadDays: BOOKING_LEAD_DAYS,
  periodStartsAt: '2026-10-01T00:00:00+07:00',
  latestAt: '2027-06-01T00:00:00+07:00',
  ...extra,
})

describe('Đặt lượt bảo trì của gói', () => {
  test('lượt còn đặt được của gói đang hiệu lực', () => {
    assert.equal(isBookable(entitlement(), subscription()), true)
    assert.equal(isBookable(entitlement({ status: 'NOT_COMPLETED' }), subscription()), true)
  })

  test('chuyển không hợp lệ: lượt đã đặt / đã dùng / hết hạn, gói chưa hiệu lực thì không đặt', () => {
    for (const status of ['BOOKED', 'CONSUMED', 'EXPIRED', 'EXPIRED_UNFULFILLED'])
      assert.equal(isBookable(entitlement({ status }), subscription()), false, status)
    for (const status of ['PAID', 'EXPIRED', 'CANCELLED'])
      assert.equal(isBookable(entitlement(), subscription({ status })), false, status)
    assert.equal(isBookable(entitlement(), subscription({ projectId: null })), false)
  })

  test('lịch mở từ ngày thứ 8 theo giờ Việt Nam, không trước kỳ, tới trước hạn của lượt', () => {
    assert.deepEqual(bookingDays(limits()), { minDay: '2026-11-11', maxDay: '2027-05-31' })
    assert.equal(bookingDays(limits({ periodStartsAt: '2026-12-01T00:00:00+07:00' })).minDay, '2026-12-01')
    // Đầu kỳ không đúng 0 giờ thì từ ngày sau, để giờ nào trong ngày cũng không trước kỳ
    assert.equal(bookingDays(limits({ periodStartsAt: '2026-12-01T09:30:00+07:00' })).minDay, '2026-12-02')
    assert.equal(
      entitlementDeadline(entitlement({ extendedUntil: '2027-07-01T00:00:00+07:00' }), subscription()),
      '2027-07-01T00:00:00+07:00',
    )
  })

  test('giờ hẹn phải cách bây giờ đủ 7 × 24 giờ, trong kỳ và trước hạn (như backend)', () => {
    assert.match(preferredStartProblem('2026-11-10T09:59:00+07:00', limits()), /ít nhất 7 ngày/)
    assert.equal(preferredStartProblem('2026-11-10T10:00:00+07:00', limits()), null)
    assert.match(
      preferredStartProblem('2026-12-01T08:00:00+07:00', limits({ periodStartsAt: '2026-12-02T00:00:00+07:00' })),
      /đặt được từ/,
    )
    assert.match(preferredStartProblem('2027-06-01T00:00:00+07:00', limits()), /hạn của lượt/)
    assert.match(preferredStartProblem('không phải giờ', limits()), /Chọn ngày/)
  })

  test('tìm lượt của gói gắn với yêu cầu bảo trì', () => {
    const found = entitlementOf(request(), [subscription({ subscriptionId: 'x', entitlements: [] }), subscription()])
    assert.equal(found.subscription.subscriptionId, 'sub-1')
    assert.equal(entitlementOf(request({ maintenanceEntitlementId: null }), [subscription()]), null)
  })
})

describe('Đổi giờ bảo trì', () => {
  test('đổi được yêu cầu bảo trì chưa bắt đầu làm', () => {
    for (const status of ['SUBMITTED', 'SCHEDULED', 'READY_FOR_WORK'])
      assert.equal(canReschedule(request({ status })), true)
    assert.equal(canReschedule(request({ kind: 'ONE_TIME_MAINTENANCE', status: 'READY_FOR_WORK' })), true)
  })

  test('chuyển không hợp lệ: báo lỗi, đã bắt đầu, đã xong, đang chờ duyệt huỷ thì không đổi giờ', () => {
    assert.equal(canReschedule(request({ kind: 'FAULT' })), false)
    for (const status of ['IN_PROGRESS', 'PENDING_CUSTOMER_ACCEPTANCE', 'COMPLETED', 'CANCELLED'])
      assert.equal(canReschedule(request({ status })), false, status)
    assert.equal(canReschedule(request({ cancellationRequestedAt: '2026-11-02T00:00:00Z' })), false)
  })

  test('chỉ đổi tới trước giờ hẹn 24 giờ', () => {
    const at = (hours) =>
      request({ status: 'SCHEDULED', visits: [visit({ startsAt: new Date(NOW + hours * 3600_000).toISOString() })] })
    assert.equal(rescheduleTooLate(at(23), NOW), true)
    assert.equal(rescheduleTooLate(at(25), NOW), false)
    assert.equal(rescheduleTooLate(request(), NOW), false, 'chưa có buổi hẹn thì đổi lúc nào cũng được')
  })
})

describe('Xin xét lại hỗ trợ thiên tai', () => {
  const claim = (extra = {}) => ({ claimId: 'cl-1', status: 'REJECTED', canRequestReconsideration: true, ...extra })

  test('chỉ khi backend cho phép (bị từ chối, chưa xin lần nào)', () => {
    assert.equal(canRequestReconsideration(request({ kind: 'FAULT', claim: claim() })), true)
  })

  test('lần hai bị chặn; yêu cầu không có hỗ trợ thiên tai thì không có nút', () => {
    assert.equal(
      canRequestReconsideration(
        request({
          kind: 'FAULT',
          claim: claim({ status: 'RECONSIDERATION_REQUESTED', canRequestReconsideration: false }),
        }),
      ),
      false,
    )
    assert.equal(canRequestReconsideration(request({ kind: 'FAULT', claim: null })), false)
    assert.equal(
      canRequestReconsideration(request({ claim: claim({ status: 'APPROVED', canRequestReconsideration: false }) })),
      false,
    )
  })

  test('bắt buộc ghi thông tin bổ sung, tối đa 1000 ký tự', () => {
    assert.ok(reconsiderationNoteError('  '))
    assert.ok(reconsiderationNoteError('x'.repeat(1001)))
    assert.equal(reconsiderationNoteError('Ảnh mái sau bão'), null)
  })
})

describe('Báo lỗi từ một lần bảo trì', () => {
  test('có khi kỹ thuật viên đã tới bảo trì (báo cáo hoặc ghi phát hiện)', () => {
    assert.equal(
      canReportFaultFromMaintenance(
        request({ visits: [visit({ status: 'REPORTED', reportedAt: '2026-11-10T03:00:00Z' })] }),
      ),
      true,
    )
    assert.equal(
      canReportFaultFromMaintenance(
        request({ kind: 'ONE_TIME_MAINTENANCE', visits: [visit({ findingNote: 'Inverter nóng' })] }),
      ),
      true,
    )
  })

  test('yêu cầu báo lỗi hoặc chưa có buổi nào làm thì không có', () => {
    assert.equal(canReportFaultFromMaintenance(request({ kind: 'FAULT', visits: [visit({ reportedAt: 'x' })] })), false)
    assert.equal(canReportFaultFromMaintenance(request({ visits: [visit()] })), false)
  })

  test('mô tả bỏ trống được khi kỹ thuật viên đã ghi phát hiện, nếu không thì ít nhất 5 ký tự', () => {
    const r = request({ visits: [visit({ findingNote: 'Cũ' }), visit({ visitId: 'v-2', findingNote: 'Dây DC lỏng' })] })
    assert.equal(maintenanceFinding(r), 'Dây DC lỏng')
    assert.equal(faultDescriptionError('', 'Dây DC lỏng'), null)
    assert.ok(faultDescriptionError('', null))
    assert.ok(faultDescriptionError('abc', null))
    assert.equal(faultDescriptionError('Đèn báo đỏ', null), null)
  })
})

describe('báo lỗi do thiên tai', () => {
  const term = (kind, status) => ({ kind, status })

  test('chỉ hỏi thiên tai khi có kỳ gói bảo vệ thiên tai đang hiệu lực', () => {
    const active = term('DISASTER_PROTECTION', 'ACTIVE')
    assert.equal(
      activeDisasterTerm([term('MAINTENANCE', 'ACTIVE'), term('DISASTER_PROTECTION', 'PAID'), active]),
      active,
    )
    // Kỳ đã hết hoặc đang chờ huỷ: backend không tính là gói bảo vệ lúc gửi
    assert.equal(activeDisasterTerm([term('DISASTER_PROTECTION', 'EXPIRED')]), undefined)
    assert.equal(activeDisasterTerm([term('DISASTER_PROTECTION', 'CANCELLATION_REQUESTED')]), undefined)
    assert.equal(activeDisasterTerm([]), undefined)
  })

  test('lúc xảy ra bắt buộc, không sau lúc gửi và không trước mốc bảo vệ', () => {
    const now = Date.parse('2026-11-14T10:00:00+07:00')
    const coverage = '2026-11-07T09:12:00+07:00'
    assert.ok(incidentTimeError('', coverage, now))
    assert.ok(incidentTimeError('2026-11-14T10:30:00+07:00', coverage, now))
    assert.equal(incidentTimeError('2026-11-14T10:00:00+07:00', coverage, now), null)
    assert.equal(incidentTimeError('2026-11-10T22:00:00+07:00', coverage, now), null)
    // Trong thời gian chờ: backend chắc chắn ghi NOT_ELIGIBLE
    assert.ok(incidentTimeError('2026-11-07T09:00:00+07:00', coverage, now))
    assert.equal(incidentTimeError('2026-11-07T09:30:00+07:00', coverage, now), null)
    assert.equal(incidentTimeError('2026-11-01T09:00:00+07:00', null, now), null)
  })
})
