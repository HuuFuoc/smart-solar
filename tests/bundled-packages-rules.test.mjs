// Gói dịch vụ đi kèm báo giá lắp đặt, tính theo tấm pin (backend `main` 763cb0b, guides/per-panel-packages/FE_HANDOFF.md §1):
// tổng của báo giá đọc đúng số backend trả (totalAmount giữ nghĩa chi phí lắp đặt, grandTotal là số trình bày cho khách), chỉ giỏ
// nháp của kỹ thuật viên sửa được gói, chọn gói cần số tấm pin nguyên dương, lỗi chặn khi chốt kể từng gói. Chạy: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  BUNDLED_KINDS,
  currentRevisionOf,
  customerTotal,
  hasServicePackages,
  isSelectablePackage,
  issuePackageProblems,
  packageEditing,
  packageOfKind,
  packagesInKindOrder,
  panelQuantityProblem,
  pickAction,
  quotationAmounts,
  supportsServicePackages,
  validPanelQuantity,
} from '../src/features/quotations/bundledPackageRules.ts'

const panelLine = (quantity, over = {}) => ({
  lineId: `panel-${quantity}`,
  productId: 'p-panel',
  description: 'SOLAR_PANEL',
  quantity,
  ...over,
})
const inverterLine = { lineId: 'inv', productId: 'p-inv', description: 'INVERTER', quantity: 1 }

const disaster = {
  packageId: 'pkg-disaster',
  kind: 'DISASTER_PROTECTION',
  packageName: 'Bảo vệ thiên tai theo tấm',
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
}
const maintenance = {
  ...disaster,
  packageId: 'pkg-maint',
  kind: 'MAINTENANCE',
  packageName: 'Bảo trì theo tấm',
  unitPrice: 300_000,
  totalAmount: 3_000_000,
  visitMonths: [6, 12],
  coveredDisasterTypes: [],
}

/** Đúng ví dụ bắt buộc của backend: lắp đặt 50.000.000 + 10 tấm × 700.000 = 57.000.000 */
const quotation = (over = {}) => ({
  quotationId: 'q1',
  status: 'DRAFT',
  origin: 'TECHNICIAN',
  revision: 7,
  lines: [panelLine(10), inverterLine],
  totalAmount: 50_000_000,
  installationTotal: 50_000_000,
  panelQuantity: 10,
  servicePackages: [disaster],
  maintenancePackagesTotal: 0,
  disasterPackagesTotal: 7_000_000,
  servicePackagesTotal: 7_000_000,
  grandTotal: 57_000_000,
  ...over,
})

/** Máy chủ cũ (trước 763cb0b): không có trường gói nào */
const legacyQuotation = (over = {}) => {
  const q = quotation(over)
  for (const key of [
    'installationTotal',
    'panelQuantity',
    'servicePackages',
    'maintenancePackagesTotal',
    'disasterPackagesTotal',
    'servicePackagesTotal',
    'grandTotal',
  ])
    delete q[key]
  return q
}

describe('Tổng của báo giá (số backend trả, không tự cộng)', () => {
  test('Ví dụ bắt buộc: totalAmount giữ 50.000.000, tổng giá trị báo giá là grandTotal 57.000.000', () => {
    const q = quotation()
    const a = quotationAmounts(q)
    assert.equal(q.totalAmount, 50_000_000)
    assert.equal(a.installation, 50_000_000)
    assert.equal(a.disaster, 7_000_000)
    assert.equal(a.maintenance, 0)
    assert.equal(a.packages, 7_000_000)
    assert.equal(a.grand, 57_000_000)
    assert.equal(customerTotal(q), 57_000_000)
  })

  test('Gói không bị cộng thuế báo giá lần nữa: tổng = lắp đặt (đã gồm thuế) + gói, đúng số backend', () => {
    const q = quotation({ taxRatePercent: 8, taxAmount: 3_703_704 })
    // FE không nhân thuế vào gói: grandTotal là số backend, chênh với lắp đặt đúng bằng tổng gói
    assert.equal(quotationAmounts(q).grand - quotationAmounts(q).installation, q.servicePackagesTotal)
  })

  test('Cả hai loại: 50.000.000 + 3.000.000 + 7.000.000 = 60.000.000 theo số backend, mỗi loại tính một lần', () => {
    const q = quotation({
      servicePackages: [disaster, maintenance],
      maintenancePackagesTotal: 3_000_000,
      servicePackagesTotal: 10_000_000,
      grandTotal: 60_000_000,
    })
    const a = quotationAmounts(q)
    assert.deepEqual([a.maintenance, a.disaster, a.packages, a.grand], [3_000_000, 7_000_000, 10_000_000, 60_000_000])
  })

  test('Máy chủ cũ không có trường gói: báo giá không có gói, tổng cho khách là totalAmount', () => {
    const q = legacyQuotation()
    assert.equal(supportsServicePackages(q), false)
    assert.equal(hasServicePackages(q), false)
    assert.equal(customerTotal(q), 50_000_000)
    assert.deepEqual(quotationAmounts(q), {
      installation: 50_000_000,
      maintenance: 0,
      disaster: 0,
      packages: 0,
      grand: 50_000_000,
    })
  })

  test('Mảng gói rỗng: máy chủ mới nhưng chưa chọn gói, không có khối tổng gói', () => {
    const q = quotation({
      servicePackages: [],
      disasterPackagesTotal: 0,
      servicePackagesTotal: 0,
      grandTotal: 50_000_000,
    })
    assert.equal(supportsServicePackages(q), true)
    assert.equal(hasServicePackages(q), false)
    assert.equal(customerTotal(q), 50_000_000)
  })
})

describe('Số tấm pin theo backend', () => {
  test('panelQuantity nguyên dương thì dùng được, 0 / lẻ / null thì không', () => {
    assert.equal(validPanelQuantity({ panelQuantity: 10 }), 10)
    assert.equal(validPanelQuantity({ panelQuantity: 0 }), null)
    assert.equal(validPanelQuantity({ panelQuantity: 2.5 }), null)
    assert.equal(validPanelQuantity({ panelQuantity: null }), null)
    assert.equal(validPanelQuantity({}), null)
  })

  test('Lý do để giải thích: không có dòng tấm pin, hay tổng tấm pin lẻ (2,5 + 7 = 9,5)', () => {
    assert.equal(panelQuantityProblem({ panelQuantity: null, lines: [inverterLine] }), 'none')
    assert.equal(
      panelQuantityProblem({ panelQuantity: null, lines: [panelLine(2.5), panelLine(7, { lineId: 'b' })] }),
      'fractional',
    )
    assert.equal(panelQuantityProblem({ panelQuantity: 10, lines: [panelLine(10)] }), null)
  })

  test('Nhiều dòng tấm pin lẻ cộng lại nguyên (2,5 + 7,5) thì không báo lẻ', () => {
    assert.equal(
      panelQuantityProblem({ panelQuantity: null, lines: [panelLine(2.5), panelLine(7.5, { lineId: 'b' })] }),
      'none',
    )
  })

  test('Số tấm pin của gói luôn là số backend trả theo dòng hiện tại, không dùng số cũ', () => {
    // Sau khi giảm dòng tấm pin 10 → 8, backend trả quantity / totalAmount mới; FE đọc thẳng
    const after = quotation({
      lines: [panelLine(8)],
      panelQuantity: 8,
      servicePackages: [{ ...disaster, quantity: 8, totalAmount: 5_600_000 }],
      servicePackagesTotal: 5_600_000,
      disasterPackagesTotal: 5_600_000,
      grandTotal: 55_600_000,
    })
    assert.equal(packageOfKind(after, 'DISASTER_PROTECTION').quantity, 8)
    assert.equal(customerTotal(after), 55_600_000)
  })
})

describe('Sửa gói đi kèm chỉ trên giỏ nháp của kỹ thuật viên', () => {
  test('Giỏ nháp có 10 tấm pin: sửa được, chọn được', () => {
    assert.deepEqual(packageEditing(quotation()), {
      editable: true,
      canSelect: true,
      problem: null,
      serverMissing: false,
    })
  })

  test('Báo giá đã chốt / đã đồng ý / đã đóng chỉ xem (chuyển trạng thái không hợp lệ bị chặn ở FE, backend 409 QUOTATION_NOT_DRAFT)', () => {
    for (const status of ['ISSUED', 'ACCEPTED', 'REVISION_REQUESTED', 'REJECTED', 'CANCELLED', 'SUPERSEDED'])
      assert.equal(packageEditing(quotation({ status })).editable, false, status)
  })

  test('Bản nháp cũ của kinh doanh không sửa gói được', () => {
    assert.equal(packageEditing(quotation({ origin: 'SALES' })).editable, false)
  })

  test('Máy chủ cũ (không có mảng gói): giỏ nháp vẫn có khối gói nhưng không chọn được, ghi rõ máy chủ chưa có chức năng', () => {
    const e = packageEditing(legacyQuotation())
    assert.equal(e.editable, false)
    assert.equal(e.canSelect, false)
    assert.equal(e.serverMissing, true)
  })

  test('Báo giá đã chốt hoặc của kinh doanh trên máy chủ cũ: không báo thiếu chức năng (không phải giỏ nháp kỹ thuật viên)', () => {
    assert.equal(packageEditing(legacyQuotation({ status: 'ISSUED' })).serverMissing, false)
    assert.equal(packageEditing(legacyQuotation({ origin: 'SALES' })).serverMissing, false)
  })

  test('Không có tấm pin hợp lệ: vẫn sửa được (bỏ gói) nhưng không chọn / đổi được', () => {
    const q = quotation({ panelQuantity: null, lines: [inverterLine] })
    assert.deepEqual(packageEditing(q), { editable: true, canSelect: false, problem: 'none', serverMissing: false })
    const fractional = quotation({ panelQuantity: null, lines: [panelLine(9.5)] })
    assert.deepEqual(packageEditing(fractional), {
      editable: true,
      canSelect: false,
      problem: 'fractional',
      serverMissing: false,
    })
  })
})

describe('Hộp chọn gói', () => {
  const pkg = (over = {}) => ({ kind: 'MAINTENANCE', isActive: true, pricingUnit: 'PER_PANEL', ...over })

  test('Chỉ gói đang bán, theo tấm pin, đúng loại', () => {
    assert.equal(isSelectablePackage(pkg(), 'MAINTENANCE'), true)
    assert.equal(isSelectablePackage(pkg({ isActive: false }), 'MAINTENANCE'), false, 'gói ngừng bán')
    assert.equal(
      isSelectablePackage(pkg({ pricingUnit: 'PER_INSTALLATION_LEGACY' }), 'MAINTENANCE'),
      false,
      'gói theo hệ thống',
    )
    assert.equal(isSelectablePackage(pkg({ pricingUnit: undefined }), 'MAINTENANCE'), false, 'máy chủ cũ')
    assert.equal(isSelectablePackage(pkg(), 'DISASTER_PROTECTION'), false, 'sai loại')
  })

  test('Mỗi loại một gói: chưa có là chọn, đã có gói khác là đổi, đang gắn thì không chọn lại', () => {
    assert.equal(pickAction(null, 'a'), 'select')
    assert.equal(pickAction({ packageId: 'a' }, 'a'), 'current')
    assert.equal(pickAction({ packageId: 'a' }, 'b'), 'replace')
  })

  test('Hai loại, bảo trì trước thiên tai', () => {
    assert.deepEqual(BUNDLED_KINDS, ['MAINTENANCE', 'DISASTER_PROTECTION'])
    assert.deepEqual(
      packagesInKindOrder([disaster, maintenance]).map((p) => p.kind),
      ['MAINTENANCE', 'DISASTER_PROTECTION'],
    )
  })
})

describe('Lỗi của backend', () => {
  test('Chốt báo giá bị chặn: đọc từng gói trong details.packages', () => {
    const details = {
      packages: [
        {
          kind: 'MAINTENANCE',
          packageId: 'pkg-maint',
          code: 'QUOTATION_SERVICE_PACKAGE_INACTIVE',
          problem: 'not sold',
        },
        {
          kind: 'DISASTER_PROTECTION',
          packageId: 'pkg-disaster',
          code: 'QUOTATION_SERVICE_PACKAGE_INCOMPATIBLE',
          problem: 'unit',
        },
        'rác',
      ],
    }
    assert.deepEqual(
      issuePackageProblems(details).map((p) => [p.kind, p.code]),
      [
        ['MAINTENANCE', 'QUOTATION_SERVICE_PACKAGE_INACTIVE'],
        ['DISASTER_PROTECTION', 'QUOTATION_SERVICE_PACKAGE_INCOMPATIBLE'],
      ],
    )
    assert.deepEqual(issuePackageProblems(null), [])
    assert.deepEqual(issuePackageProblems({ items: [] }), [])
  })

  test('409 QUOTATION_STALE_REVISION: đọc details.currentRevision nếu có', () => {
    assert.equal(currentRevisionOf({ currentRevision: 8 }), 8)
    assert.equal(currentRevisionOf({ currentRevision: '8' }), null)
    assert.equal(currentRevisionOf(undefined), null)
  })
})
