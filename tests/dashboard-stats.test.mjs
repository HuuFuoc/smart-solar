// Phép tính của các trang Tổng quan (Admin, Manager, Sales, Technician, Customer): chia tháng / ngày theo giờ Việt Nam, kỳ của xu
// hướng tài chính, cộng tiền không trùng, phễu kinh doanh, thống kê công nợ, nhóm trạng thái dự án. Chạy: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  addDays,
  collectedInPeriod,
  countByMonth,
  daysTouched,
  earliest,
  foldTail,
  installmentSplit,
  isLiveContract,
  monthsEndingAt,
  presetOf,
  presetRange,
  trendPeriods,
  vnDayOf,
  vnMonthOf,
  weekOf,
} from '../src/features/dashboard/dashboardStats.ts'
import { countProjectGroups, projectGroupOf } from '../src/features/dashboard/projectGroups.ts'
import { financeKpis, installmentsByStatus, openCasesRanked } from '../src/features/admin-dashboard/financeMapping.ts'
import { collectionStats, contractsByMonth, myLiveContracts, salesFunnel } from '../src/features/sales-dashboard/salesStats.ts'

const bucket = (key, count = 0, amount = 0) => ({ key, count, amount })

function financeView(over = {}) {
  return {
    from: '2026-11-01',
    to: '2026-11-30',
    zoneId: null,
    generatedAt: '2026-11-19T10:00:00Z',
    paymentPlanContracts: bucket('PAYMENT_PLAN', 3, 300_000_000),
    legacyContracts: bucket('LEGACY_FULL_PAYMENT', 1, 50_000_000),
    depositsPaid: bucket('DEPOSIT_PAID', 2, 60_000_000),
    depositsDue: bucket('DEPOSIT_DUE', 1, 30_000_000),
    balancesPending: bucket('BALANCE_PENDING', 1, 70_000_000),
    balancesDue: bucket('BALANCE_DUE', 0, 0),
    balancesOverdue: bucket('BALANCE_OVERDUE', 1, 70_000_000),
    balancesPaid: bucket('BALANCE_PAID', 0, 0),
    balancesPaidLate: 0,
    outstanding: bucket('OUTSTANDING', 3, 170_000_000),
    outstandingDueNow: bucket('OUTSTANDING_DUE_NOW', 2, 100_000_000),
    awaitingAcceptance: bucket('AWAITING_ACCEPTANCE'),
    acceptedUnpaid: bucket('ACCEPTED_UNPAID', 1, 70_000_000),
    fullyPaid: bucket('FULLY_PAID'),
    contractsByStage: [],
    openCollectionCasesByStatus: [bucket('CONTACTED', 1, 10), bucket('SALES_CONTACT_REQUIRED', 2, 90), bucket('X', 0, 0)],
    negotiations: bucket('NEGOTIATIONS'),
    escalations: bucket('ESCALATIONS'),
    depositsCollected: bucket('DEPOSITS_COLLECTED', 2, 60_000_000),
    balancesCollected: bucket('BALANCES_COLLECTED', 1, 7_000_000),
    installmentsCollectedByMethod: [bucket('ONLINE', 2, 60_000_000), bucket('CASH', 1, 7_000_000)],
    legacyContractPaymentsCollected: bucket('LEGACY_CONTRACT_PAYMENTS_COLLECTED', 1, 50_000_000),
    unapplied: bucket('UNAPPLIED', 1, 1_000_000),
    refunded: bucket('REFUNDED'),
    ...over,
  }
}

describe('ngày giờ Việt Nam', () => {
  test('17:30 UTC đã là ngày hôm sau ở Việt Nam', () => {
    assert.equal(vnDayOf('2026-11-30T17:30:00Z'), '2026-12-01')
    assert.equal(vnMonthOf('2026-11-30T17:30:00Z'), '2026-12')
    assert.equal(vnDayOf('2026-11-30T16:59:59Z'), '2026-11-30')
    assert.equal(vnDayOf(null), '')
    assert.equal(vnDayOf('không phải ngày'), '')
  })
  test('cộng ngày, tuần Thứ Hai tới Chủ Nhật', () => {
    assert.equal(addDays('2026-12-31', 1), '2027-01-01')
    const week = weekOf('2026-11-19') // Thứ Năm
    assert.equal(week[0], '2026-11-16')
    assert.equal(week[6], '2026-11-22')
    assert.deepEqual(weekOf('2026-11-22'), week) // Chủ Nhật vẫn thuộc tuần đó
  })
  test('việc nhiều ngày chạm vào từng ngày, giờ kết thúc đúng nửa đêm không tính ngày sau', () => {
    const days = ['2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21']
    assert.deepEqual(daysTouched('2026-11-19T08:00:00+07:00', '2026-11-20T17:00:00+07:00', days), ['2026-11-19', '2026-11-20'])
    assert.deepEqual(daysTouched('2026-11-19T08:00:00+07:00', '2026-11-20T00:00:00+07:00', days), ['2026-11-19'])
    assert.deepEqual(daysTouched('2026-11-25T08:00:00+07:00', '2026-11-25T10:00:00+07:00', days), [])
  })
  test('đếm theo tháng chỉ trong các tháng đưa vào', () => {
    const months = monthsEndingAt('2026-11', 3)
    assert.deepEqual(months, ['2026-09', '2026-10', '2026-11'])
    const rows = countByMonth(
      [{ at: '2026-11-02T00:00:00Z' }, { at: '2026-10-31T18:00:00Z' }, { at: '2026-08-01T00:00:00Z' }, { at: null }],
      (x) => x.at,
      months,
    )
    assert.deepEqual(rows, [
      { month: '2026-09', count: 0 },
      { month: '2026-10', count: 0 },
      { month: '2026-11', count: 2 },
    ])
  })
})

describe('kỳ của xu hướng tài chính', () => {
  test('kỳ một tháng: 6 tháng dương lịch tới tháng đó, tháng cuối trùng đúng kỳ đang xem', () => {
    const { slices, extended } = trendPeriods('2026-11-01', '2026-11-30', '2026-11-19')
    assert.equal(extended, true)
    assert.equal(slices.length, 6)
    assert.deepEqual(slices[0], { month: '2026-06', from: '2026-06-01', to: '2026-06-30', partial: false })
    assert.deepEqual(slices[5], { month: '2026-11', from: '2026-11-01', to: '2026-11-30', partial: true })
  })
  test('kỳ nhiều tháng: cắt cột đầu / cột cuối theo ngày đã chọn, không vượt 12 tháng', () => {
    const { slices, extended } = trendPeriods('2026-09-15', '2026-11-10', '2026-11-19')
    assert.equal(extended, false)
    assert.deepEqual(
      slices.map((s) => [s.from, s.to]),
      [
        ['2026-09-15', '2026-09-30'],
        ['2026-10-01', '2026-10-31'],
        ['2026-11-01', '2026-11-10'],
      ],
    )
    const long = trendPeriods('2025-11-01', '2026-11-30', '2026-11-19')
    assert.equal(long.slices.length, 12)
    assert.equal(long.truncated, true)
    assert.equal(long.slices[0].month, '2025-12')
  })
  test('nút kỳ nhanh và nhận lại nút đang chọn', () => {
    assert.deepEqual(presetRange('month', '2026-11-19'), { from: '2026-11-01', to: '2026-11-30' })
    assert.deepEqual(presetRange('quarter', '2026-01-05'), { from: '2025-11-01', to: '2026-01-31' })
    assert.deepEqual(presetRange('year', '2026-11-19'), { from: '2026-01-01', to: '2026-11-30' })
    assert.equal(presetOf('2026-06-01', '2026-11-30', '2026-11-19'), 'half')
    assert.equal(presetOf('2026-11-02', '2026-11-30', '2026-11-19'), 'custom')
  })
})

describe('báo cáo tài chính', () => {
  test('tiền đã thu = khoản 30% + khoản 70% + hợp đồng cũ; không cộng cách trả, không cộng tiền chưa áp', () => {
    const v = financeView()
    assert.deepEqual(collectedInPeriod(v), { amount: 117_000_000, count: 4 })
    const k = financeKpis(v)
    assert.equal(k.collected.amount, 117_000_000)
    assert.deepEqual(k.contractValue, { count: 4, amount: 350_000_000 })
    assert.equal(k.unapplied.amount, 1_000_000)
  })
  test('khoản 30% đã trả không làm hợp đồng thành đã trả đủ', () => {
    const k = financeKpis(financeView())
    assert.equal(k.fullyPaid.count, 0)
  })
  test('các khoản theo trạng thái lấy đúng nhóm rời nhau của backend, số dư chưa trả khớp ô còn phải thu', () => {
    const v = financeView()
    const [deposit, balance] = installmentsByStatus(v)
    assert.deepEqual(deposit.amount, { paid: 60_000_000, due: 30_000_000, overdue: 0, pending: 0 })
    assert.deepEqual(balance.amount, { paid: 0, due: 0, overdue: 70_000_000, pending: 70_000_000 })
    const unpaid = [deposit, balance].reduce((s, g) => s + g.amount.due + g.amount.overdue + g.amount.pending, 0)
    assert.equal(unpaid, v.outstanding.amount)
  })
  test('hồ sơ công nợ: bỏ nhóm rỗng, xếp theo số tiền', () => {
    assert.deepEqual(
      openCasesRanked(financeView()).map((b) => b.key),
      ['SALES_CONTACT_REQUIRED', 'CONTACTED'],
    )
  })
})

describe('khách hàng: tiền theo khoản', () => {
  test('đã trả dùng số đã xác minh, khoản huỷ không tính, quá hạn tách riêng', () => {
    const split = installmentSplit([
      { kind: 'DEPOSIT', amount: 30, status: 'PAID', paidAmount: 30, overdue: false },
      { kind: 'BALANCE', amount: 70, status: 'DUE', paidAmount: null, overdue: true },
      { kind: 'BALANCE', amount: 70, status: 'CANCELLED', paidAmount: null, overdue: false },
    ])
    assert.deepEqual(split, { paid: 30, due: 0, overdue: 70, notYetDue: 0 })
    assert.deepEqual(
      installmentSplit([{ kind: 'BALANCE', amount: 70, status: 'PENDING', paidAmount: null, overdue: false }]),
      { paid: 0, due: 0, overdue: 0, notYetDue: 70 },
    )
  })
  test('hạn sớm nhất bỏ giá trị rỗng', () => {
    assert.equal(earliest([null, '2026-12-01T00:00:00Z', '2026-11-25T00:00:00Z', 'x']), '2026-11-25T00:00:00Z')
    assert.equal(earliest([null, undefined]), null)
  })
})

describe('kinh doanh', () => {
  const survey = (id, status) => ({ surveyRequestId: id, status })
  const contract = (surveyRequestId, over = {}) => ({
    contractId: `c-${surveyRequestId}`,
    surveyRequestId,
    status: 'SIGNED',
    stage: 'DRAFT_CREATED',
    paymentPlan: 'DEPOSIT_30_BALANCE_70',
    totalAmount: 100,
    depositPaid: false,
    createdAt: '2026-11-10T03:00:00Z',
    ...over,
  })

  test('chỉ hợp đồng của yêu cầu mình nhận, bỏ bản đã thay / đã huỷ', () => {
    const mine = [survey('a', 'COMPLETED')]
    const all = [contract('a'), contract('a', { contractId: 'old', status: 'SUPERSEDED' }), contract('b')]
    assert.deepEqual(myLiveContracts(all, mine).map((c) => c.contractId), ['c-a'])
    assert.equal(isLiveContract({ status: 'DRAFT', stage: 'DISCARDED' }), false)
  })
  test('phễu: bước sau nằm trong bước trước, yêu cầu có hợp đồng tính là đã khảo sát', () => {
    const mine = [
      survey('a', 'PENDING'),
      survey('b', 'SCHEDULED'),
      survey('c', 'COMPLETED'),
      survey('d', 'PENDING'), // trạng thái chưa cập nhật nhưng đã có hợp đồng
      survey('e', 'CLOSED'),
    ]
    const live = [contract('c', { depositPaid: true }), contract('d')]
    const { stages, closed } = salesFunnel(mine, live)
    assert.deepEqual(
      stages.map((s) => s.value),
      [5, 3, 2, 2, 1],
    )
    for (let i = 1; i < stages.length; i++) assert.ok(stages[i].value <= stages[i - 1].value)
    assert.equal(closed, 1)
  })
  test('hợp đồng theo tháng tách 30/70 và cách cũ theo giờ Việt Nam', () => {
    const rows = contractsByMonth(
      [contract('a'), contract('b', { paymentPlan: null, createdAt: '2026-10-31T18:00:00Z' })],
      ['2026-10', '2026-11'],
    )
    assert.deepEqual(rows, [
      { month: '2026-10', plan: 0, legacy: 0 },
      { month: '2026-11', plan: 1, legacy: 1 },
    ])
  })
  test('công nợ: mở / đóng theo tháng, cần liên hệ, hẹn trả đã quá ngày', () => {
    const cases = [
      { caseId: '1', status: 'SALES_CONTACT_REQUIRED', amountDue: 70, openedAt: '2026-11-02T00:00:00Z', resolvedAt: null, promisedPaymentDate: null },
      { caseId: '2', status: 'AGREEMENT_RECORDED', amountDue: 50, openedAt: '2026-10-02T00:00:00Z', resolvedAt: null, promisedPaymentDate: '2026-11-10' },
      { caseId: '3', status: 'AGREEMENT_RECORDED', amountDue: 50, openedAt: '2026-10-05T00:00:00Z', resolvedAt: null, promisedPaymentDate: '2026-11-25' },
      { caseId: '4', status: 'RESOLVED', amountDue: 20, openedAt: '2026-09-01T00:00:00Z', resolvedAt: '2026-11-01T00:00:00Z', promisedPaymentDate: null },
    ]
    const s = collectionStats(cases, ['2026-10', '2026-11'], '2026-11-19')
    assert.equal(s.open.length, 3)
    assert.deepEqual(s.byStatus.get('AGREEMENT_RECORDED'), { count: 2, amount: 100 })
    assert.deepEqual(s.contactRequired.map((c) => c.caseId), ['1'])
    assert.deepEqual(s.brokenPromises.map((c) => c.caseId), ['2'])
    assert.equal(s.resolved, 1)
    assert.equal(s.resolvedLast30Days, 1)
    assert.deepEqual(s.trend, [
      { month: '2026-10', opened: 2, resolved: 0 },
      { month: '2026-11', opened: 1, resolved: 1 },
    ])
  })
})

describe('nhóm trạng thái dự án và gộp nhóm nhỏ', () => {
  test('dự án huỷ không vào nhóm nào; nhóm giữ thứ tự tiến độ', () => {
    const groups = countProjectGroups([
      { status: 'PENDING_ASSIGNMENT' },
      { status: 'PENDING_TECHNICIAN_ACCEPTANCE' },
      { status: 'REWORK_REQUIRED' },
      { status: 'CANCELLED' },
    ])
    assert.deepEqual(
      groups.map((g) => [g.key, g.value]),
      [
        ['WAITING', 2],
        ['SCHEDULED', 0],
        ['IN_PROGRESS', 0],
        ['ACCEPTANCE', 0],
        ['REWORK', 1],
        ['COMPLETED', 0],
      ],
    )
    assert.equal(projectGroupOf('CANCELLED'), null)
  })
  test('gộp phần nhỏ thành "Khác" giữ tổng', () => {
    const items = [1, 9, 3, 7, 2].map((value, i) => ({ key: `k${i}`, value }))
    const folded = foldTail(items, 3, (value, rest) => ({ key: 'other', value, rest: rest.length }))
    assert.deepEqual(
      folded.map((i) => i.key),
      ['k1', 'k3', 'other'],
    )
    assert.equal(
      folded.reduce((s, i) => s + i.value, 0),
      22,
    )
  })
})
