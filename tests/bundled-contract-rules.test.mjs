// Hợp đồng có gói đi kèm và thanh toán 30/70 (backend `main` 763cb0b, guides/per-panel-packages/FE_HANDOFF.md §2, BUSINESS_RULES §4):
// tổng hợp đồng = lắp đặt + gói và là số chia 30/70; số phải trả của mỗi đợt là `amount` của đợt, không có khoản thu riêng cho gói;
// phần chia chỉ để đọc; trạng thái gói trong hợp đồng không phải hiệu lực; hợp đồng cũ không đổi. Chạy: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  bundledReasonText,
  commitmentPhase,
  contractPackageBreakdown,
  installmentAllocations,
  isCoverageActive,
  packagesTotalOfKind,
  provisionedSubscription,
} from '../src/features/payment-plan/bundledContractRules.ts'
import { balanceDueHours, contractPrintHtml } from '../src/features/contracts/contractPrint.ts'
import { isVerifiedInstallmentPaid, moneySplit } from '../src/features/payment-plan/paymentPlanRules.ts'

const commitment = (over = {}) => ({
  commitmentId: 'c-disaster',
  kind: 'DISASTER_PROTECTION',
  packageId: 'pkg-disaster',
  packageName: 'Bảo vệ thiên tai theo tấm',
  description: null,
  imageUrl: null,
  pricingUnit: 'PER_PANEL',
  unitPrice: 700_000,
  quantity: 10,
  totalAmount: 7_000_000,
  durationMonths: 12,
  visitMonths: [],
  coveredDisasterTypes: ['STORM'],
  coveragePercent: 70,
  perIncidentLimit: 20_000_000,
  termLimit: 50_000_000,
  catalogRevision: 3,
  snapshotAt: '2026-11-25T00:00:00Z',
  depositAllocation: 2_100_000,
  balanceAllocation: 4_900_000,
  status: 'COMMITTED',
  statusReason: null,
  subscriptionId: null,
  statusChangedAt: null,
  ...over,
})

/** Ví dụ bắt buộc: 50.000.000 + 7.000.000 = 57.000.000 → đợt 1 17.100.000, đợt 2 39.900.000 */
const installments = [
  {
    installmentId: 'i1',
    sequence: 1,
    kind: 'DEPOSIT',
    percent: 30,
    amount: 17_100_000,
    status: 'DUE',
    dueAt: null,
    allocation: {
      sequence: 1,
      amount: 17_100_000,
      installation: 15_000_000,
      maintenancePackages: 0,
      disasterPackages: 2_100_000,
    },
  },
  {
    installmentId: 'i2',
    sequence: 2,
    kind: 'BALANCE',
    percent: 70,
    amount: 39_900_000,
    status: 'PENDING',
    dueAt: null,
    allocation: {
      sequence: 2,
      amount: 39_900_000,
      installation: 35_000_000,
      maintenancePackages: 0,
      disasterPackages: 4_900_000,
    },
  },
]

const contract = (over = {}) => ({
  contractId: 'k1',
  contractNumber: 'HD-1',
  version: 1,
  previousContractId: null,
  quotationVersion: 2,
  status: 'DRAFT',
  currency: 'VND',
  totalAmount: 57_000_000,
  installationTotal: 50_000_000,
  servicePackagesTotal: 7_000_000,
  servicePackages: [commitment()],
  pricingSnapshot: {
    quoteNumber: 'QT-1',
    quotationVersion: 2,
    lines: [{ lineNumber: 1, name: 'Tấm pin', unit: 'tấm', quantity: 10, unitPrice: 4_000_000, lineTotal: 40_000_000 }],
    equipmentSubtotal: 46_296_296,
    subtotal: 46_296_296,
    taxRatePercent: 8,
    taxAmount: 3_703_704,
    totalAmount: 50_000_000,
    installationTotal: 50_000_000,
    panelQuantity: 10,
    servicePackagesTotal: 7_000_000,
    grandTotal: 57_000_000,
    packageTaxTreatment: 'CATALOG_FINAL_PRICE_NO_QUOTATION_TAX',
  },
  customerSnapshot: { customerName: 'Khách A' },
  terms: '',
  canonicalHash: 'abc',
  warrantyMonths: 24,
  paymentPlan: { total: 57_000_000, paid: 0, outstanding: 57_000_000, installments },
  ...over,
})

/** Hợp đồng không có gói: backend trả hai tổng null (và không có allocation) */
const legacyContract = () =>
  contract({
    totalAmount: 50_000_000,
    installationTotal: null,
    servicePackagesTotal: null,
    servicePackages: [],
    paymentPlan: {
      total: 50_000_000,
      paid: 0,
      outstanding: 50_000_000,
      installments: installments.map((i, n) => ({
        ...i,
        allocation: null,
        amount: n === 0 ? 15_000_000 : 35_000_000,
      })),
    },
  })

describe('Tổng hợp đồng', () => {
  test('Hợp đồng có gói: totalAmount là tổng giá trị 57.000.000 = lắp đặt 50.000.000 + gói 7.000.000', () => {
    const b = contractPackageBreakdown(contract())
    assert.equal(b.total, 57_000_000)
    assert.equal(b.installation, 50_000_000)
    assert.equal(b.packages, 7_000_000)
    assert.equal(b.installation + b.packages, b.total)
    assert.equal(packagesTotalOfKind(b.items, 'DISASTER_PROTECTION'), 7_000_000)
  })

  test('Hợp đồng cũ (hai tổng null) và máy chủ cũ (không có trường): không vẽ khối gói, không hiện số rỗng', () => {
    assert.equal(contractPackageBreakdown(legacyContract()), null)
    const old = contract()
    delete old.installationTotal
    delete old.servicePackagesTotal
    delete old.servicePackages
    assert.equal(contractPackageBreakdown(old), null)
  })

  test('Gói theo thứ tự loại (bảo trì trước)', () => {
    const b = contractPackageBreakdown(
      contract({ servicePackages: [commitment(), commitment({ commitmentId: 'c-m', kind: 'MAINTENANCE' })] }),
    )
    assert.deepEqual(
      b.items.map((p) => p.kind),
      ['MAINTENANCE', 'DISASTER_PROTECTION'],
    )
  })
})

describe('30/70 trên tổng giá trị, không có khoản thu riêng cho gói', () => {
  test('Đợt 1 trả 17.100.000, đợt 2 trả 39.900.000 (số của đợt, đã gồm gói)', () => {
    const rows = installmentAllocations(contract().paymentPlan)
    assert.deepEqual(
      rows.map((r) => [r.sequence, r.percent, r.amount]),
      [
        [1, 30, 17_100_000],
        [2, 70, 39_900_000],
      ],
    )
  })

  test('Phần chia: 15.000.000 + 2.100.000 và 35.000.000 + 4.900.000, mỗi đợt cộng đúng bằng số phải trả', () => {
    for (const r of installmentAllocations(contract().paymentPlan)) {
      assert.equal(r.installation + r.maintenance + r.disaster, r.amount)
    }
    const [first, second] = installmentAllocations(contract().paymentPlan)
    assert.deepEqual([first.installation, first.disaster], [15_000_000, 2_100_000])
    assert.deepEqual([second.installation, second.disaster], [35_000_000, 4_900_000])
  })

  test('Hai đợt cộng lại đúng tổng hợp đồng, không có đợt nào thu 100% gói (bác bỏ "30% + 70% lắp đặt + 100% gói")', () => {
    const c = contract()
    const rows = installmentAllocations(c.paymentPlan)
    assert.equal(rows.length, 2)
    assert.equal(
      rows.reduce((s, r) => s + r.amount, 0),
      c.totalAmount,
    )
    // Gói được chia 30/70 như lắp đặt, không dồn hết vào đợt 2
    assert.ok(rows[0].disaster > 0 && rows[1].disaster > 0)
    assert.notEqual(rows[1].amount, 35_000_000 + 7_000_000)
  })

  test('Phần chia không cộng dồn hai lần: tổng phần gói của hai đợt bằng đúng tổng gói', () => {
    const rows = installmentAllocations(contract().paymentPlan)
    assert.equal(
      rows.reduce((s, r) => s + r.disaster + r.maintenance, 0),
      7_000_000,
    )
    assert.equal(
      rows.reduce((s, r) => s + r.installation, 0),
      50_000_000,
    )
  })

  test('Còn phải trả theo kế hoạch vẫn là tổng hợp đồng (số của backend)', () => {
    assert.equal(moneySplit(contract().paymentPlan, Date.now()).outstanding, 57_000_000)
  })

  test('Hợp đồng cũ không có phần chia: thanh toán 30/70 như trước', () => {
    assert.equal(installmentAllocations(legacyContract().paymentPlan), null)
  })

  test('Đã trả chỉ khi backend báo PAID, không vì có phần chia', () => {
    assert.equal(isVerifiedInstallmentPaid({ paymentState: 'ONLINE_IN_PROGRESS', installmentStatus: 'DUE' }), false)
  })
})

describe('Trạng thái gói trong hợp đồng không phải hiệu lực', () => {
  const sub = (over = {}) => ({
    subscriptionId: 's1',
    status: 'ACTIVE',
    contractServicePackageId: 'c-disaster',
    ...over,
  })

  test('Bốn trạng thái của backend', () => {
    assert.equal(commitmentPhase('COMMITTED'), 'committed')
    assert.equal(commitmentPhase('PROVISIONED'), 'provisioned')
    assert.equal(commitmentPhase('RECONCILIATION_REQUIRED'), 'reconciliation')
    assert.equal(commitmentPhase('DISCARDED'), 'discarded')
    assert.equal(commitmentPhase('LẠ'), 'unknown')
  })

  test('COMMITTED không bao giờ là đang bảo vệ, kể cả khi hợp đồng đã trả đủ', () => {
    assert.equal(isCoverageActive(commitment({ status: 'COMMITTED' }), sub()), false)
  })

  test('PROVISIONED chỉ đang bảo vệ khi kỳ gói đã tạo ACTIVE; kỳ PAID (chờ bắt đầu) thì chưa', () => {
    const c = commitment({ status: 'PROVISIONED', subscriptionId: 's1' })
    assert.equal(isCoverageActive(c, sub()), true)
    assert.equal(isCoverageActive(c, sub({ status: 'PAID' })), false)
    assert.equal(isCoverageActive(c, null), false)
  })

  test('Chờ đối soát và đã huỷ: không cấp quyền lợi', () => {
    assert.equal(
      isCoverageActive(commitment({ status: 'RECONCILIATION_REQUIRED', subscriptionId: 's1' }), sub()),
      false,
    )
    assert.equal(isCoverageActive(commitment({ status: 'DISCARDED' }), sub()), false)
  })

  test('Tìm kỳ gói đã tạo theo contractServicePackageId, rồi theo subscriptionId', () => {
    const c = commitment({ status: 'PROVISIONED', subscriptionId: 's2' })
    assert.equal(provisionedSubscription(c, [sub({ subscriptionId: 's9' })]).subscriptionId, 's9')
    assert.equal(
      provisionedSubscription(c, [sub({ subscriptionId: 's2', contractServicePackageId: null })]).subscriptionId,
      's2',
    )
    assert.equal(provisionedSubscription(c, undefined), null)
  })

  test('Lý do chờ đối soát của backend thành câu tiếng Việt kèm đúng số tấm', () => {
    const text = bundledReasonText(
      'Contracted 10 panel unit(s) but 9 active panel unit(s) are registered on the installation; correct the installed equipment record',
    )
    assert.match(text, /10 tấm pin/)
    assert.match(text, /9 tấm pin/)
    assert.match(
      bundledReasonText('The installation is not handed over yet; coverage is provisioned after the handover.'),
      /bàn giao/,
    )
    assert.equal(bundledReasonText('something new'), null)
    assert.equal(bundledReasonText(null), null)
  })
})

describe('Bản in hợp đồng', () => {
  test('Có gói: in chi phí lắp đặt, từng gói (đơn giá × số tấm) và tổng gói để cộng ra đúng tổng giá trị', () => {
    const html = contractPrintHtml({ contract: contract() })
    assert.match(html, /Tổng chi phí lắp đặt/)
    assert.match(html, /Gói bảo vệ thiên tai "Bảo vệ thiên tai theo tấm": 700\.000 đồng\/tấm pin × 10 tấm/)
    assert.match(html, /Tổng chi phí gói dịch vụ đi kèm/)
    assert.match(html, /57\.000\.000/)
    assert.match(html, /không cộng thêm thuế của báo giá/)
  })

  // Đúng câu PaymentPlanCalculator.Clauses của backend sinh vào điều khoản hợp đồng
  const TERMS = [
    'ĐIỀU KHOẢN THANH TOÁN (2026-11-19)',
    '3. Đợt 2 (70%): 39.900.000 VND, thanh toán trong vòng 72 giờ kể từ thời điểm khách hàng nghiệm thu công trình trên hệ thống.',
  ].join('\n')

  test('Hợp đồng 30/70: Điều 3 ghi hai đợt đúng số và tỷ lệ của backend, không còn "thanh toán một lần"', () => {
    const html = contractPrintHtml({ contract: contract({ terms: TERMS }) })
    assert.match(html, /Đợt 1 \(30%\): <b>17\.100\.000 đồng<\/b>, thanh toán trước khi hai bên ký hợp đồng giấy/)
    assert.match(
      html,
      /Đợt 2 \(70%\): <b>39\.900\.000 đồng<\/b>, thanh toán trong vòng 72 giờ kể từ khi Bên A nghiệm thu/,
    )
    assert.match(html, /gồm chi phí lắp đặt 15\.000\.000 đồng, gói bảo vệ thiên tai 2\.100\.000 đồng/)
    assert.match(html, /không có khoản thu riêng/)
    assert.doesNotMatch(html, /thanh toán một lần/)
    assert.match(html, /đã thanh toán đợt 1 và hai bên đã ký hợp đồng giấy/)
    assert.match(html, /Bên B không nghiệm thu thay Bên A/)
    assert.match(html, /Kỹ thuật viên của Bên B chụp từng trang đã ký/)
  })

  test('Hạn đợt 2 lấy số giờ trong điều khoản đã lưu; không có thì dẫn sang điều khoản, không tự đặt số giờ', () => {
    assert.equal(balanceDueHours(TERMS), 72)
    assert.equal(balanceDueHours('… thanh toán trong vòng 48 giờ kể từ thời điểm khách hàng nghiệm thu …'), 48)
    assert.equal(balanceDueHours(''), null)
    const html = contractPrintHtml({ contract: contract({ terms: '' }) })
    assert.match(html, /trong thời hạn ghi tại điều khoản thanh toán ở Điều 12/)
  })

  test('Hợp đồng cũ trả một lần: Điều 3 giữ nguyên', () => {
    const html = contractPrintHtml({ contract: { ...legacyContract(), paymentPlan: null } })
    assert.match(html, /thanh toán một lần toàn bộ giá trị hợp đồng/)
    assert.doesNotMatch(html, /Đợt 1 \(30%\)/)
  })

  test('Không có gói: bản in như cũ', () => {
    const html = contractPrintHtml({ contract: legacyContract() })
    assert.doesNotMatch(html, /Tổng chi phí gói dịch vụ đi kèm/)
    assert.doesNotMatch(html, /Tổng chi phí lắp đặt/)
  })
})
