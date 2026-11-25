// Phía nhân viên của gói tính theo tấm pin (backend `main` 763cb0b, FE_HANDOFF.md §4–5): đơn vị tính giá chỉ chọn lúc tạo gói, tiền đã
// thu theo thành phần đọc nguyên số backend (không cộng trùng), câu lỗi tiếng Việt cho mã mới, và quyền theo vai trò: trang gói đi
// kèm chỉ ở cổng quản lý / quản trị, lệnh sửa gói của báo giá chỉ ở giỏ kỹ thuật viên. Chạy: npm test
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, sep } from 'node:path'
import { describe, test } from 'node:test'
import {
  PER_INSTALLATION_LEGACY,
  PER_PANEL,
  priceSuffix,
  pricingUnitOf,
  createdWithUnit,
  withPricingUnit,
} from '../src/features/after-sales/packagePricing.ts'
import { collectedComponents } from '../src/features/admin-dashboard/financeMapping.ts'
import { messageForCode, toApiError } from '../src/services/api/errors.ts'
import { planPermissions } from '../src/features/payment-plan/paymentPlanRules.ts'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const read = (p) => readFileSync(join(ROOT, p), 'utf8')

describe('Đơn vị tính giá của gói (quản trị)', () => {
  test('Tạo gói gửi pricingUnit đã chọn; sửa gói không gửi (không đổi được sau khi tạo)', () => {
    const body = { name: 'Gói', price: 700_000, revision: 0 }
    assert.deepEqual(withPricingUnit(body, PER_PANEL, 'create'), { ...body, pricingUnit: 'PER_PANEL' })
    assert.deepEqual(withPricingUnit(body, PER_INSTALLATION_LEGACY, 'create'), {
      ...body,
      pricingUnit: 'PER_INSTALLATION_LEGACY',
    })
    assert.equal('pricingUnit' in withPricingUnit(body, PER_PANEL, 'update'), false)
  })

  test('Gói của máy chủ cũ là gói theo hệ thống; không tự đổi sang theo tấm pin', () => {
    assert.equal(pricingUnitOf({}), 'PER_INSTALLATION_LEGACY')
    assert.equal(pricingUnitOf({ pricingUnit: 'PER_PANEL' }), 'PER_PANEL')
  })

  test('Nhãn giá theo đơn vị', () => {
    assert.equal(priceSuffix('PER_PANEL'), '/tấm pin')
    assert.equal(priceSuffix('PER_INSTALLATION_LEGACY'), '/hệ thống')
    assert.equal(priceSuffix(undefined), '/hệ thống')
  })

  test('Gói vừa tạo phải đúng đơn vị đã chọn; máy chủ cũ bỏ qua trường (gói thành theo hệ thống) thì báo, không coi là xong', () => {
    assert.equal(createdWithUnit({ pricingUnit: 'PER_PANEL' }, 'PER_PANEL'), true)
    assert.equal(createdWithUnit({}, 'PER_PANEL'), false)
    assert.equal(createdWithUnit({}, 'PER_INSTALLATION_LEGACY'), true)
    assert.equal(createdWithUnit({ pricingUnit: 'PER_INSTALLATION_LEGACY' }, 'PER_PANEL'), false)
  })
})

describe('Tiền đã thu theo thành phần (quản trị)', () => {
  const bucket = (key, amount, count = 1) => ({ key, amount, count })

  test('Máy chủ chưa trả mục này: không vẽ, báo cáo cũ giữ nguyên', () => {
    assert.equal(collectedComponents({}), null)
    assert.equal(collectedComponents({ collectedByComponent: null }), null)
  })

  test('Ví dụ 57.000.000: lắp đặt 50.000.000 + gói thiên tai đi kèm 7.000.000 = khoản 30% + 70% đã thu, không cộng thêm', () => {
    const v = {
      collectedByComponent: [
        bucket('INSTALLATION', 50_000_000, 2),
        bucket('BUNDLED_DISASTER_PROTECTION_PACKAGES', 7_000_000, 2),
        bucket('BUNDLED_MAINTENANCE_PACKAGES', 0, 0),
        bucket('RETAIL_MAINTENANCE_PACKAGES', 600_000, 1),
        bucket('RETAIL_DISASTER_PROTECTION_PACKAGES', 0, 0),
      ],
    }
    const c = collectedComponents(v)
    const depositsAndBalances = 17_100_000 + 39_900_000
    assert.equal(c.installments, depositsAndBalances)
    assert.equal(c.retail, 600_000)
    // Mỗi đồng một lần: tổng các dòng = tiền khoản đã thu + gói mua riêng
    assert.equal(
      c.rows.reduce((s, r) => s + r.amount, 0),
      depositsAndBalances + 600_000,
    )
    assert.deepEqual(
      c.rows.map((r) => r.key),
      [
        'INSTALLATION',
        'BUNDLED_MAINTENANCE_PACKAGES',
        'BUNDLED_DISASTER_PROTECTION_PACKAGES',
        'RETAIL_MAINTENANCE_PACKAGES',
        'RETAIL_DISASTER_PROTECTION_PACKAGES',
      ],
    )
    assert.equal(c.rows[0].label, 'Doanh thu lắp đặt')
    assert.equal(c.rows.find((r) => r.key === 'RETAIL_MAINTENANCE_PACKAGES').label, 'Gói bảo trì mua riêng')
  })

  test('Thiếu nhóm thì là 0; nhóm lạ vẫn hiện bằng mã ở cuối', () => {
    const c = collectedComponents({ collectedByComponent: [bucket('INSTALLATION', 1), bucket('NEW_COMPONENT', 5)] })
    assert.equal(c.rows.length, 6)
    assert.equal(c.rows.at(-1).label, 'NEW_COMPONENT')
    assert.equal(c.rows.find((r) => r.key === 'RETAIL_DISASTER_PROTECTION_PACKAGES').amount, 0)
  })
})

describe('Câu lỗi tiếng Việt cho mã của backend', () => {
  const CODES = [
    'AFTER_SALES_VALIDATION_FAILED',
    'VALIDATION_FAILED',
    'QUOTATION_NOT_FOUND',
    'QUOTATION_SERVICE_PACKAGE_NOT_FOUND',
    'QUOTATION_NOT_DRAFT',
    'QUOTATION_STALE_REVISION',
    'QUOTATION_SERVICE_PACKAGE_INACTIVE',
    'QUOTATION_SERVICE_PACKAGE_INCOMPATIBLE',
    'QUOTATION_NO_ELIGIBLE_PANELS',
    'QUOTATION_INVALID_PANEL_QUANTITY',
    'QUOTATION_TOTAL_OUT_OF_RANGE',
    'AFTER_SALES_PROJECT_NOT_FOUND',
    'SERVICE_PANEL_SELECTION_VALIDATION_FAILED',
    'SERVICE_PACKAGE_PRICING_UNIT_VALIDATION_FAILED',
    'SERVICE_SUBSCRIPTION_OVERLAP',
    'AFTER_SALES_NOT_HANDED_OVER',
    'AFTER_SALES_INVALID_STATE',
    'BUNDLED_PACKAGE_NOT_FOUND',
  ]

  test('Mọi mã trong bảng lỗi của tài liệu đều có câu tiếng Việt', () => {
    for (const code of CODES) {
      const text = messageForCode(code)
      assert.ok(text, code)
      assert.doesNotMatch(text, /[A-Z_]{6,}/, `${code} không hiện mã kỹ thuật`)
    }
  })

  test('409 lệch revision giữ details.currentRevision để tải lại, câu hiện là câu tiếng Việt', () => {
    const e = toApiError(409, {
      isSuccess: false,
      traceId: 't',
      error: {
        code: 'QUOTATION_STALE_REVISION',
        message: 'The quotation was changed meanwhile.',
        details: { currentRevision: 8 },
      },
    })
    assert.equal(e.code, 'QUOTATION_STALE_REVISION')
    assert.deepEqual(e.details, { currentRevision: 8 })
    assert.equal(e.message, messageForCode('QUOTATION_STALE_REVISION'))
  })

  test('Lỗi chốt báo giá giữ details.packages để kể từng gói', () => {
    const packages = [{ kind: 'MAINTENANCE', packageId: 'p', code: 'QUOTATION_SERVICE_PACKAGE_INACTIVE', problem: 'x' }]
    const e = toApiError(409, {
      error: { code: 'QUOTATION_SERVICE_PACKAGE_INACTIVE', message: 'm', details: { packages } },
    })
    assert.deepEqual(e.details.packages, packages)
  })
})

describe('Quyền theo vai trò', () => {
  test('Trang gói đi kèm hợp đồng chỉ có ở cổng quản lý và quản trị', () => {
    const portals = read('src/config/portals.ts')
    assert.deepEqual(portals.match(/ROUTES\.\w+\.bundledPackages/g), [
      'ROUTES.manage.bundledPackages',
      'ROUTES.admin.bundledPackages',
    ])
    const routes = read('src/routes/protectedRoutes.tsx')
    const managerStart = routes.indexOf("role: 'manager'")
    const adminStart = routes.indexOf("role: 'admin'")
    const managerRoute = routes.indexOf('manage.bundledPackages')
    const adminRoute = routes.indexOf('admin.bundledPackages')
    assert.ok(managerStart > -1 && adminStart > -1)
    // Mỗi đường nằm trong khối cổng của chính nó
    const blockOf = (i) =>
      i > adminStart && adminStart > managerStart ? 'admin' : i > managerStart ? 'manager' : 'other'
    assert.equal(blockOf(managerRoute), 'manager')
    assert.equal(blockOf(adminRoute), 'admin')
  })

  const files = (dir) =>
    readdirSync(join(ROOT, dir)).flatMap((name) => {
      const p = join(dir, name)
      return statSync(join(ROOT, p)).isDirectory() ? files(p) : [p.split(sep).join('/')]
    })
  const sources = files('src').filter((p) => /\.(ts|tsx)$/.test(p))
  const using = (re) => sources.filter((p) => re.test(read(p)))

  test('Đường gói đi kèm và đối soát chỉ gọi từ service của quản lý', () => {
    assert.deepEqual(using(/(managerAfterSales|api)\.(bundledPackages|reconcileBundledPackage)\b/), [
      'src/services/managerAfterSalesService.ts',
    ])
  })

  test('Lệnh chọn / bỏ gói của báo giá chỉ gọi từ service kỹ thuật viên; hook chỉ dùng ở khối giỏ báo giá', () => {
    assert.deepEqual(using(/technicianQuotations\.servicePackage\b|api\.servicePackage\(/), [
      'src/services/technicianQuotationService.ts',
    ])
    assert.deepEqual(
      using(/use(Set|Remove)CartServicePackageMutation\(/).filter((p) => !p.startsWith('src/hooks/')),
      ['src/features/quotations/BundledPackagesSection.tsx', 'src/features/quotations/ServicePackagePicker.tsx'],
    )
  })

  test('Màn của kinh doanh, quản lý và màn trình bày cho khách chỉ xem gói (không truyền editable)', () => {
    for (const p of ['src/features/quotations/QuotationReadPanel.tsx', 'src/features/quotations/OnSiteQuotation.tsx']) {
      const text = read(p)
      assert.match(text, /<BundledPackagesSection quotation=\{q\} \/>/, p)
      assert.doesNotMatch(text, /<BundledPackagesSection[^>]*editable/, p)
    }
  })

  test('Khách không gọi API của kỹ thuật viên hay quản lý cho gói', () => {
    const customer = sources.filter((p) => p.startsWith('src/pages/customer/'))
    for (const p of customer)
      assert.doesNotMatch(read(p), /useTechnicianQuotations|useManagerAfterSales|technicianQuotationService/, p)
  })

  test('Xác nhận tiền mặt vẫn chỉ quản lý / quản trị', () => {
    assert.equal(planPermissions('technician').canConfirmCash, false)
    assert.equal(planPermissions('customer').canConfirmCash, false)
    assert.equal(planPermissions('sales').canConfirmCash, false)
    assert.equal(planPermissions('manager').canConfirmCash, true)
    assert.equal(planPermissions('admin').canConfirmCash, true)
  })
})
