// Luật gói thanh toán 30/70: phân nhánh hợp đồng cũ, hạn 72 giờ và quá hạn, trạng thái thanh toán một khoản, hợp đồng giấy nhiều
// trang, khách nghiệm thu, thu hồi công nợ, khoảng ngày của báo cáo tài chính. Bám backend `main` 7d27054. Chạy: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  acceptanceErrors,
  agreementWithdrawal,
  customerPlanTodo,
  packagePurchaseMode,
  technicianAssignment,
  assignToPages,
  canCancelInstallment,
  canCustomerDecide,
  canEscalate,
  canFinalizeSignature,
  canOpenInstallment,
  canReplacePage,
  canRequestLegalReview,
  canResolve,
  canStartSignature,
  collectionActivityErrors,
  collectionReasonError,
  currentPages,
  financePeriodError,
  installmentWaitReason,
  isOverdueAt,
  isPaymentPlanContract,
  isVerifiedInstallmentPaid,
  legacyActionsAllowed,
  monthOf,
  moneySplit,
  pageCountError,
  pendingAcceptance,
  planPermissions,
  signedOnError,
} from '../src/features/payment-plan/paymentPlanRules.ts'
import { readContractSnapshot } from '../src/features/payment-plan/contractSnapshot.ts'

const deposit = (over = {}) => ({
  sequence: 1,
  kind: 'DEPOSIT',
  amount: 5_550_000,
  status: 'DUE',
  dueAt: null,
  ...over,
})
const balance = (over = {}) => ({
  sequence: 2,
  kind: 'BALANCE',
  amount: 12_950_000,
  status: 'PENDING',
  dueAt: null,
  ...over,
})
const plan = (over = {}) => ({
  depositPaid: false,
  outstanding: 18_500_000,
  installments: [deposit(), balance()],
  signature: null,
  ...over,
})

describe('Phân nhánh hợp đồng 30/70 và hợp đồng cũ', () => {
  test('paymentPlan khác null là 30/70; null hoặc thiếu là hợp đồng cũ', () => {
    assert.equal(isPaymentPlanContract({ paymentPlan: plan() }), true)
    assert.equal(isPaymentPlanContract({ paymentPlan: null }), false)
    assert.equal(isPaymentPlanContract({}), false)
  })

  test('lệnh của luồng cũ chỉ cho hợp đồng cũ', () => {
    assert.equal(legacyActionsAllowed({ paymentPlan: null }), true)
    assert.equal(legacyActionsAllowed({ paymentPlan: plan() }), false)
  })
})

describe('Hạn 72 giờ và quá hạn', () => {
  // Khách nghiệm thu 19/11 23:30 giờ Việt Nam → hạn 22/11 23:30 giờ Việt Nam = 22/11 16:30 UTC (ví dụ của backend)
  const dueAt = '2026-11-22T16:30:00Z'
  const due = Date.parse(dueAt)

  test('đúng dueAt chưa quá hạn, dueAt + 1 giây là quá hạn', () => {
    assert.equal(isOverdueAt(balance({ status: 'DUE', dueAt }), due), false)
    assert.equal(isOverdueAt(balance({ status: 'DUE', dueAt }), due + 1000), true)
    assert.equal(isOverdueAt(balance({ status: 'DUE', dueAt }), due - 1000), false)
  })

  test('hạn 72 giờ sau lúc nghiệm thu tính đúng theo giờ Việt Nam', () => {
    const accepted = Date.parse('2026-11-19T23:30:00+07:00')
    assert.equal(accepted + 72 * 3600_000, due)
  })

  test('khoản chưa DUE hoặc đã trả không bao giờ quá hạn', () => {
    assert.equal(isOverdueAt(balance({ status: 'PENDING', dueAt }), due + 86_400_000), false)
    assert.equal(isOverdueAt(balance({ status: 'PAID', dueAt }), due + 86_400_000), false)
    assert.equal(isOverdueAt(balance({ status: 'DUE', dueAt: null }), due), false)
  })

  test('tách còn lại / phải trả ngay / quá hạn', () => {
    const beforeAcceptance = moneySplit(
      plan({ installments: [deposit({ status: 'PAID' }), balance()], outstanding: 12_950_000 }),
      due,
    )
    assert.deepEqual(beforeAcceptance, { outstanding: 12_950_000, dueNow: 0, overdue: 0 })
    const accepted = plan({
      installments: [deposit({ status: 'PAID' }), balance({ status: 'DUE', dueAt })],
      outstanding: 12_950_000,
    })
    assert.deepEqual(moneySplit(accepted, due), { outstanding: 12_950_000, dueNow: 12_950_000, overdue: 0 })
    assert.deepEqual(moneySplit(accepted, due + 1000), {
      outstanding: 12_950_000,
      dueNow: 12_950_000,
      overdue: 12_950_000,
    })
  })
})

describe('Thanh toán một khoản', () => {
  test('chỉ mở khi backend báo AWAITING_PAYMENT', () => {
    assert.equal(canOpenInstallment({ paymentState: 'AWAITING_PAYMENT' }), true)
    for (const s of ['NOT_PAYABLE', 'ONLINE_IN_PROGRESS', 'AWAITING_CASH_CONFIRMATION', 'PAID']) {
      assert.equal(canOpenInstallment({ paymentState: s }), false, s)
    }
    assert.equal(canOpenInstallment(undefined), false)
  })

  test('huỷ được lần đang mở, không huỷ khi đã trả', () => {
    assert.equal(canCancelInstallment({ paymentState: 'ONLINE_IN_PROGRESS' }), true)
    assert.equal(canCancelInstallment({ paymentState: 'AWAITING_CASH_CONFIRMATION' }), true)
    assert.equal(canCancelInstallment({ paymentState: 'PAID' }), false)
  })

  test('chọn tiền mặt chưa phải đã trả; chỉ PAID của backend mới là đã trả', () => {
    assert.equal(
      isVerifiedInstallmentPaid({ paymentState: 'AWAITING_CASH_CONFIRMATION', installmentStatus: 'DUE' }),
      false,
    )
    assert.equal(isVerifiedInstallmentPaid({ paymentState: 'ONLINE_IN_PROGRESS', installmentStatus: 'DUE' }), false)
    assert.equal(isVerifiedInstallmentPaid({ paymentState: 'PAID', installmentStatus: 'PAID' }), true)
  })

  test('lý do chưa trả được theo PayableProblem của backend', () => {
    assert.equal(installmentWaitReason(balance(), 'SIGNED'), 'balance-after-acceptance')
    assert.equal(installmentWaitReason(deposit(), 'AWAITING_SIGNATURE'), 'deposit-closed')
    assert.equal(installmentWaitReason(balance({ status: 'DUE' }), 'AWAITING_SIGNATURE'), 'balance-needs-signature')
    assert.equal(installmentWaitReason(deposit(), 'DRAFT'), null)
    assert.equal(installmentWaitReason(balance({ status: 'DUE' }), 'SIGNED'), null)
    assert.equal(installmentWaitReason(deposit({ status: 'CANCELLED' }), 'DISCARDED'), 'cancelled')
  })
})

describe('Hợp đồng giấy nhiều trang', () => {
  const uploading = { status: 'UPLOADING', expectedPageCount: 3, uploadedPageCount: 2, missingPages: [2] }

  test('chỉ bắt đầu khi đã nhận 30% và hợp đồng chờ ký', () => {
    assert.equal(canStartSignature({ status: 'DRAFT', paymentPlan: plan() }), false)
    assert.equal(canStartSignature({ status: 'AWAITING_SIGNATURE', paymentPlan: plan({ depositPaid: true }) }), true)
    assert.equal(
      canStartSignature({
        status: 'AWAITING_SIGNATURE',
        paymentPlan: plan({ depositPaid: true, signature: { status: 'FINALIZED' } }),
      }),
      false,
    )
    assert.equal(canStartSignature({ status: 'AWAITING_SIGNATURE', paymentPlan: null }), false)
  })

  test('thiếu trang thì không chốt được; đủ trang mới chốt', () => {
    assert.equal(canFinalizeSignature(uploading), false)
    assert.equal(canFinalizeSignature({ ...uploading, uploadedPageCount: 3, missingPages: [] }), true)
    assert.equal(
      canFinalizeSignature({ ...uploading, status: 'FINALIZED', uploadedPageCount: 3, missingPages: [] }),
      false,
    )
  })

  test('thay trang trước khi chốt, đã chốt là khoá', () => {
    assert.equal(canReplacePage(uploading), true)
    assert.equal(canReplacePage({ status: 'FINALIZED' }), false)
    assert.equal(canReplacePage({ status: 'SUPERSEDED' }), false)
  })

  test('số trang 1–50, ngày ký không sau hôm nay', () => {
    assert.equal(pageCountError('0'), 'Số trang từ 1 tới 50.')
    assert.equal(pageCountError('51'), 'Số trang từ 1 tới 50.')
    assert.equal(pageCountError('2.5'), 'Số trang từ 1 tới 50.')
    assert.equal(pageCountError(''), 'Ghi số trang của hợp đồng giấy.')
    assert.equal(pageCountError('12'), null)
    assert.equal(signedOnError('', '2026-11-19'), null)
    assert.equal(signedOnError('2026-11-20', '2026-11-19'), 'Ngày ký không sau hôm nay.')
    assert.equal(signedOnError('2026-11-19', '2026-11-19'), null)
  })

  test('xếp tệp vào trang thiếu, thừa thì bỏ lại', () => {
    const { assigned, extra } = assignToPages(['a', 'b', 'c'], { expected: 3, filled: [1] })
    assert.deepEqual(
      assigned.map((x) => [x.item, x.pageNumber]),
      [
        ['a', 2],
        ['b', 3],
      ],
    )
    assert.deepEqual(extra, ['c'])
  })

  test('thay một trang: tệp đầu vào đúng trang đó dù đã có tệp', () => {
    const { assigned } = assignToPages(['x'], { expected: 3, filled: [1, 2, 3], startPage: 2 })
    assert.deepEqual(
      assigned.map((x) => [x.item, x.pageNumber]),
      [['x', 2]],
    )
  })

  test('trang hiện hành bỏ trang đã bị thay', () => {
    const pages = [
      { pageNumber: 2, replacedAt: null, fileId: 'b' },
      { pageNumber: 1, replacedAt: '2026-11-19T01:00:00Z', fileId: 'old' },
      { pageNumber: 1, replacedAt: null, fileId: 'new' },
    ]
    assert.deepEqual(
      currentPages(pages).map((p) => p.fileId),
      ['new', 'b'],
    )
  })
})

describe('Khách nghiệm thu', () => {
  const pendingProject = {
    status: 'PENDING_CUSTOMER_ACCEPTANCE',
    acceptances: [
      { round: 1, decision: 'REWORK_REQUESTED' },
      { round: 2, decision: 'PENDING' },
    ],
  }

  test('chỉ quyết định được báo cáo đang chờ', () => {
    assert.equal(canCustomerDecide(pendingProject), true)
    assert.equal(pendingAcceptance(pendingProject).round, 2)
    assert.equal(canCustomerDecide({ ...pendingProject, status: 'REWORK_REQUIRED' }), false)
    assert.equal(canCustomerDecide({ status: 'PENDING_CUSTOMER_ACCEPTANCE', acceptances: [] }), false)
    assert.equal(canCustomerDecide({ status: 'COMPLETED', acceptances: [{ decision: 'ACCEPTED' }] }), false)
  })

  test('yêu cầu làm lại / không nghiệm thu bắt buộc lý do', () => {
    assert.ok(acceptanceErrors('REQUEST_REWORK', '  ', 0).reason)
    assert.ok(acceptanceErrors('REJECT', '', 0).reason)
    assert.deepEqual(acceptanceErrors('ACCEPT', '', 0), {})
    assert.deepEqual(acceptanceErrors('REQUEST_REWORK', 'Tấm pin số 3 lệch', 2), {})
  })

  test('tối đa 10 ảnh, ảnh chỉ kèm khi yêu cầu làm lại', () => {
    assert.ok(acceptanceErrors('REQUEST_REWORK', 'x', 11).evidence)
    assert.ok(acceptanceErrors('ACCEPT', '', 1).evidence)
    assert.ok(acceptanceErrors('REJECT', 'x'.repeat(2001), 0).reason)
  })
})

describe('Thu hồi công nợ', () => {
  test('thoả thuận phải có ngày hẹn; ngày hẹn không đổi hạn', () => {
    const base = { kind: 'AGREEMENT', summary: 'Khách hẹn chuyển khoản', promisedPaymentDate: '', evidenceCount: 0 }
    assert.ok(collectionActivityErrors(base, '2026-11-25').promisedPaymentDate)
    assert.deepEqual(collectionActivityErrors({ ...base, promisedPaymentDate: '2026-11-28' }, '2026-11-25'), {})
    assert.ok(
      collectionActivityErrors({ ...base, promisedPaymentDate: '2026-11-20' }, '2026-11-25').promisedPaymentDate,
    )
  })

  test('nội dung bắt buộc, tối đa 10 tệp', () => {
    assert.ok(
      collectionActivityErrors(
        { kind: 'CONTACT', summary: '', promisedPaymentDate: '', evidenceCount: 0 },
        '2026-11-25',
      ).summary,
    )
    assert.ok(
      collectionActivityErrors({ kind: 'NOTE', summary: 'x', promisedPaymentDate: '', evidenceCount: 11 }, '2026-11-25')
        .evidence,
    )
    assert.equal(collectionReasonError(''), 'Ghi lý do.')
    assert.equal(collectionReasonError('Khách không nghe máy 3 lần'), null)
  })

  test('kinh doanh chuyển quản lý được; xem xét pháp lý / đóng hồ sơ chỉ quản lý, quản trị', () => {
    const open = { status: 'CONTACTED' }
    assert.equal(canEscalate(open), true)
    assert.equal(canEscalate({ status: 'ESCALATED_TO_MANAGER' }), false)
    assert.equal(canRequestLegalReview(open, 'sales'), false)
    assert.equal(canRequestLegalReview(open, 'manager'), true)
    assert.equal(canResolve(open, 'sales'), false)
    assert.equal(canResolve(open, 'admin'), true)
    assert.equal(canResolve({ status: 'RESOLVED' }, 'admin'), false)
  })
})

describe('Báo cáo tài chính', () => {
  test('mặc định tháng này, tối đa 366 ngày', () => {
    assert.deepEqual(monthOf('2026-11-19'), { from: '2026-11-01', to: '2026-11-30' })
    assert.deepEqual(monthOf('2028-02-10'), { from: '2028-02-01', to: '2028-02-29' })
    assert.equal(financePeriodError('2026-01-01', '2027-01-02'), null)
    assert.ok(financePeriodError('2026-01-01', '2027-01-03'))
    assert.ok(financePeriodError('2026-11-20', '2026-11-19'))
    assert.ok(financePeriodError('', '2026-11-19'))
  })
})

describe('Quyền theo vai trò trên hợp đồng 30/70', () => {
  test('kỹ thuật viên mở thanh toán và tải trang ký, nhưng không xác nhận tiền mặt và không nghiệm thu', () => {
    const t = planPermissions('technician')
    assert.equal(t.installmentActor, 'technician')
    assert.equal(t.canOpenPayment, true)
    assert.equal(t.signatureWriter, 'technician')
    assert.equal(t.canPlanSchedule, true)
    assert.equal(t.canConfirmCash, false)
    assert.equal(t.canAccept, false)
  })

  test('kinh doanh chỉ đọc hợp đồng; ghi công nợ được nhưng không quyết định pháp lý / đóng hồ sơ', () => {
    const s = planPermissions('sales')
    assert.equal(s.installmentActor, 'staff')
    assert.equal(s.canOpenPayment, false)
    assert.equal(s.canConfirmCash, false)
    assert.equal(s.signatureWriter, null)
    assert.equal(s.canRecordCollection, true)
    assert.equal(s.canDecideCollection, false)
  })

  test('quản lý, quản trị xác nhận tiền mặt và hỗ trợ trang ký, không tự nghiệm thu thay khách', () => {
    for (const role of ['manager', 'admin']) {
      const m = planPermissions(role)
      assert.equal(m.canConfirmCash, true, role)
      assert.equal(m.signatureWriter, 'support', role)
      assert.equal(m.canOpenPayment, false, role)
      assert.equal(m.canAccept, false, role)
      assert.equal(m.canDecideCollection, true, role)
    }
  })

  test('khách trả trong ứng dụng và nghiệm thu, không tải trang ký, không xác nhận tiền', () => {
    const c = planPermissions('customer')
    assert.equal(c.installmentActor, 'customer')
    assert.equal(c.canOpenPayment, true)
    assert.equal(c.canAccept, true)
    assert.equal(c.signatureWriter, null)
    assert.equal(c.canConfirmCash, false)
  })
})

describe('Bản chụp khách và báo giá của hợp đồng', () => {
  const pricing = {
    quoteNumber: 'QT-20261119-ABC',
    quotationVersion: 2,
    currency: 'VND',
    lines: [
      { lineNumber: 2, sku: 'INV-5K', name: 'Inverter 5kW', quantity: 1, unitPrice: 12_000_000, lineTotal: 12_000_000 },
      {
        lineNumber: 1,
        sku: 'PV-550',
        name: 'Tấm pin 550W',
        quantity: 10,
        unit: 'PCS',
        unitPrice: 3_000_000,
        lineTotal: 30_000_000,
      },
    ],
    equipmentSubtotal: 42_000_000,
    taxRatePercent: 8,
    taxAmount: 3_360_000,
    totalAmount: 45_360_000,
  }
  const customer = {
    customerName: 'Nguyễn Văn A',
    customerPhone: '0900000000',
    streetLine: '12 Lê Lợi',
    province: 'TP.HCM',
  }

  test('đọc đúng khách, địa chỉ và các dòng theo số thứ tự; tiền giữ nguyên số backend ghi', () => {
    const s = readContractSnapshot(pricing, customer)
    assert.equal(s.customer.name, 'Nguyễn Văn A')
    assert.equal(s.customer.address, '12 Lê Lợi, TP.HCM')
    assert.deepEqual(
      s.lines.map((l) => l.sku),
      ['PV-550', 'INV-5K'],
    )
    assert.equal(s.lines[0].lineTotal, 30_000_000)
    assert.equal(s.totals.totalAmount, 45_360_000)
    assert.equal(s.quotationVersion, 2)
  })

  test('JSON thiếu hoặc sai kiểu không làm vỡ trang', () => {
    const s = readContractSnapshot(null, 'x')
    assert.deepEqual(s.lines, [])
    assert.equal(s.customer.name, null)
    assert.equal(s.totals.totalAmount, null)
    const bad = readContractSnapshot({ lines: [{ quantity: '3', lineTotal: 'nhiều' }, 5] }, {})
    assert.equal(bad.lines.length, 2)
    assert.equal(bad.lines[0].quantity, null)
    assert.equal(bad.lines[0].lineTotal, null)
    assert.equal(bad.lines[0].name, 'Sản phẩm')
  })
})

describe('Kỹ thuật viên không khảo sát công trình chỉ đọc hợp đồng 30/70', () => {
  test('người đã khảo sát: đường của kỹ thuật viên, thu tiền, tải trang ký, hẹn ngày', () => {
    const t = planPermissions('technician', { assigned: true })
    assert.equal(t.installmentActor, 'technician')
    assert.equal(t.canOpenPayment, true)
    assert.equal(t.signatureWriter, 'technician')
    assert.equal(t.canPlanSchedule, true)
  })

  test('kỹ thuật viên khác: đọc bằng đường của nhân viên, không có nút ghi nào', () => {
    const t = planPermissions('technician', { assigned: false })
    assert.equal(t.installmentActor, 'staff')
    assert.equal(t.canOpenPayment, false)
    assert.equal(t.signatureWriter, null)
    assert.equal(t.canPlanSchedule, false)
    assert.equal(t.canConfirmCash, false)
    assert.equal(t.canAccept, false)
  })

  test('nhận ra người phụ trách theo lần đọc khoản 30%: được là phải, 404 là người khác, lỗi khác thì chỉ đọc', () => {
    assert.equal(technicianAssignment({ isPending: true, isSuccess: false, error: null }), 'pending')
    assert.equal(technicianAssignment({ isPending: false, isSuccess: true, error: null }), 'assigned')
    assert.equal(
      technicianAssignment({ isPending: false, isSuccess: false, error: { status: 404, code: 'CONTRACT_NOT_FOUND' } }),
      'other',
    )
    const network = technicianAssignment({ isPending: false, isSuccess: false, error: { status: 0 } })
    assert.equal(network, 'unknown')
    // "unknown" không phải "assigned": không mở nút ghi khi chưa chắc
    assert.equal(planPermissions('technician', { assigned: network === 'assigned' }).canOpenPayment, false)
  })
})

describe('Khách đổi ý sau khi đã đồng ý báo giá', () => {
  test('bản nháp, chưa mở thanh toán 30%: ghi được', () => {
    assert.equal(agreementWithdrawal({ status: 'DRAFT' }, { paymentState: 'AWAITING_PAYMENT' }), 'allowed')
    // Chưa đọc được hợp đồng / khoản: để backend quyết định
    assert.equal(agreementWithdrawal(undefined, undefined), 'allowed')
  })

  test('đang mở QR hoặc chờ xác nhận tiền mặt: phải huỷ trước (QUOTATION_PAYMENT_STARTED)', () => {
    assert.equal(agreementWithdrawal({ status: 'DRAFT' }, { paymentState: 'ONLINE_IN_PROGRESS' }), 'payment-open')
    assert.equal(
      agreementWithdrawal({ status: 'DRAFT' }, { paymentState: 'AWAITING_CASH_CONFIRMATION' }),
      'payment-open',
    )
  })

  test('đã nhận 30% hoặc hợp đồng đã qua bản nháp: không ghi khách đổi ý được', () => {
    assert.equal(agreementWithdrawal({ status: 'DRAFT' }, { paymentState: 'PAID' }), 'deposit-paid')
    assert.equal(agreementWithdrawal({ status: 'AWAITING_SIGNATURE' }, undefined), 'deposit-paid')
    assert.equal(agreementWithdrawal({ status: 'SIGNED' }, { paymentState: 'NOT_PAYABLE' }), 'deposit-paid')
    assert.equal(agreementWithdrawal({ status: 'DISCARDED' }, { paymentState: 'NOT_PAYABLE' }), 'closed')
  })
})

describe('Việc của khách trên hợp đồng 30/70', () => {
  test('bản nháp là trả 30%; khoản 70% đến hạn / quá hạn là trả 70%; các chặng khác không có việc', () => {
    assert.equal(customerPlanTodo('DRAFT_CREATED'), 'pay-deposit')
    assert.equal(customerPlanTodo('BALANCE_DUE'), 'pay-balance')
    assert.equal(customerPlanTodo('BALANCE_OVERDUE'), 'pay-balance')
    for (const stage of ['DEPOSIT_VERIFIED', 'READY_FOR_INSTALLATION', 'FULLY_PAID', 'DISCARDED', null])
      assert.equal(customerPlanTodo(stage), null, String(stage))
  })
})

describe('Sau bán vẫn trả 100% trước, không gộp khoản của hợp đồng 30/70', () => {
  const plan = { plan: 'DEPOSIT_30_BALANCE_70' }
  test('hợp đồng cũ: đã ký chưa trả thì gộp tiền hợp đồng, đã trả thì mua riêng gói', () => {
    assert.equal(packagePurchaseMode({ status: 'SIGNED', paymentPlan: null }), 'with-contract')
    assert.equal(packagePurchaseMode({ status: 'PAID', paymentPlan: null }), 'packages-only')
    assert.equal(packagePurchaseMode({ status: 'AWAITING_SIGNATURE', paymentPlan: null }), null)
  })

  test('hợp đồng 30/70 đã ký giấy mà chưa trả đủ: chưa mua gói được; trả đủ thì mua riêng gói', () => {
    assert.equal(packagePurchaseMode({ status: 'SIGNED', paymentPlan: plan }), null)
    assert.equal(packagePurchaseMode({ status: 'DRAFT', paymentPlan: plan }), null)
    assert.equal(packagePurchaseMode({ status: 'AWAITING_SIGNATURE', paymentPlan: plan }), null)
    assert.equal(packagePurchaseMode({ status: 'PAID', paymentPlan: plan }), 'packages-only')
  })
})
