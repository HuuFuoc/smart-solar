// Luật gói dịch vụ đi kèm báo giá lắp đặt (docs/BUNDLED_SERVICE_PACKAGES_FE_BE_GAP.md): chọn gói (một gói mỗi loại, chỉ gói đang
// bán, chỉ khi báo giá còn nháp), lịch trả 30/70 + 100% gói, trạng thái gói suy từ backend. Backend `main` 09e0876 chưa có API
// nên chỉ kiểm phần luật của giao diện; mã TC theo bảng kiểm thử của yêu cầu. Chạy: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  bundledByKind,
  bundledPaymentPlan,
  bundledSubscriptionStage,
  bundledTotals,
  canEditBundledPackages,
  installmentSplitPreview,
  missingBundledKinds,
  packageChoice,
} from '../src/features/quotations/bundledPackageRules.ts'

const maintenance = (over = {}) => ({
  packageId: 'm-1',
  kind: 'MAINTENANCE',
  name: 'Bảo trì cơ bản',
  price: 2_000_000,
  durationMonths: 12,
  visitMonths: [6, 12],
  coveredDisasterTypes: [],
  coveragePercent: null,
  perIncidentLimit: null,
  termLimit: null,
  isActive: true,
  ...over,
})

const disaster = (over = {}) => ({
  packageId: 'd-1',
  kind: 'DISASTER_PROTECTION',
  name: 'Bảo vệ bão lũ',
  price: 3_000_000,
  durationMonths: 12,
  visitMonths: [],
  coveredDisasterTypes: ['STORM', 'FLOOD'],
  coveragePercent: 70,
  perIncidentLimit: 10_000_000,
  termLimit: 30_000_000,
  isActive: true,
  ...over,
})

const draft = { status: 'DRAFT', origin: 'TECHNICIAN' }

describe('Sửa gói đi kèm theo trạng thái báo giá', () => {
  test('TC-01 / TC-18: giỏ nháp của kỹ thuật viên (cả bản sửa) thì sửa được gói', () => {
    assert.equal(canEditBundledPackages(draft), true)
  })

  test('TC-09: báo giá đã chốt, khách đã đồng ý, đã thay thế thì không sửa được', () => {
    for (const status of ['ISSUED', 'ACCEPTED', 'REJECTED', 'REVISION_REQUESTED', 'SUPERSEDED', 'CANCELLED'])
      assert.equal(canEditBundledPackages({ status, origin: 'TECHNICIAN' }), false, status)
  })

  test('bản nháp cũ của kinh doanh / tự động thì kỹ thuật viên không sửa được (backend trả 404)', () => {
    assert.equal(canEditBundledPackages({ status: 'DRAFT', origin: 'SALES' }), false)
    assert.equal(canEditBundledPackages({ status: 'DRAFT', origin: 'AUTOMATIC' }), false)
  })
})

describe('Chọn gói trong hộp thoại', () => {
  test('TC-02 / TC-03: báo giá chưa có gói thì chọn gói bảo trì, gói thiên tai là thêm', () => {
    assert.deepEqual(packageChoice([], maintenance(), true), { action: 'add' })
    assert.deepEqual(packageChoice([], disaster(), true), { action: 'add' })
  })

  test('TC-04: đã có gói bảo trì vẫn thêm được gói thiên tai, đủ hai loại thì hết loại để thêm', () => {
    assert.deepEqual(packageChoice([maintenance()], disaster(), true), { action: 'add' })
    assert.deepEqual(missingBundledKinds([]), ['MAINTENANCE', 'DISASTER_PROTECTION'])
    assert.deepEqual(missingBundledKinds([maintenance()]), ['DISASTER_PROTECTION'])
    assert.deepEqual(missingBundledKinds([maintenance(), disaster()]), [])
  })

  test('TC-05: chọn lại đúng gói đang chọn thì chặn (không trùng)', () => {
    assert.deepEqual(packageChoice([maintenance()], maintenance(), true), { action: 'none', reason: 'selected' })
  })

  test('TC-07: chọn gói khác cùng loại là đổi gói đang chọn, không thêm gói thứ hai', () => {
    const current = maintenance()
    const choice = packageChoice(
      [current, disaster()],
      maintenance({ packageId: 'm-2', name: 'Bảo trì nâng cao' }),
      true,
    )
    assert.equal(choice.action, 'replace')
    assert.equal(choice.replaces, current)
  })

  test('TC-08: gói ngừng bán thì không chọn được; gói đã chọn mà sau đó ngừng bán vẫn giữ là đã chọn', () => {
    assert.deepEqual(packageChoice([], disaster({ isActive: false }), true), { action: 'none', reason: 'inactive' })
    assert.deepEqual(packageChoice([disaster()], disaster({ isActive: false }), true), {
      action: 'none',
      reason: 'selected',
    })
  })

  test('TC-09: báo giá không còn sửa được thì mọi gói đều khoá, kể cả gói đang bán', () => {
    assert.deepEqual(packageChoice([], maintenance(), false), { action: 'none', reason: 'locked' })
    assert.deepEqual(packageChoice([maintenance()], maintenance({ packageId: 'm-2' }), false), {
      action: 'none',
      reason: 'locked',
    })
  })

  test('loại gói lạ thì không chọn được', () => {
    assert.deepEqual(packageChoice([], maintenance({ kind: 'EXTENDED_WARRANTY' }), true), {
      action: 'none',
      reason: 'unknown-kind',
    })
  })
})

describe('Tổng tiền gói đi kèm', () => {
  test('TC-04 / TC-06: cộng theo loại, mỗi gói một suất; bỏ gói thì tổng giảm đúng phần đó', () => {
    assert.deepEqual(bundledTotals([maintenance(), disaster()]), {
      maintenance: 2_000_000,
      disaster: 3_000_000,
      total: 5_000_000,
    })
    assert.deepEqual(bundledTotals([disaster()]), { maintenance: 0, disaster: 3_000_000, total: 3_000_000 })
    assert.deepEqual(bundledTotals([]), { maintenance: 0, disaster: 0, total: 0 })
  })

  test('TC-10: tổng lấy giá bản chụp đã gắn, không đọc giá danh mục hiện tại', () => {
    const snapshot = maintenance({ price: 2_000_000 })
    const catalogNow = maintenance({ price: 2_500_000 })
    assert.equal(bundledTotals([snapshot]).total, 2_000_000)
    assert.notEqual(bundledTotals([snapshot]).total, catalogNow.price)
  })

  test('dữ liệu lỗi có hai gói cùng loại thì chỉ giữ gói đầu, bảo trì đứng trước', () => {
    const rows = bundledByKind([disaster(), maintenance(), maintenance({ packageId: 'm-2' })])
    assert.deepEqual(
      rows.map((r) => r.packageId),
      ['m-1', 'd-1'],
    )
  })
})

describe('Chia 30/70 như backend (PaymentPlanCalculator.Split)', () => {
  test('cọc làm tròn tới đồng, nửa đồng làm tròn lên; 70% = tổng − cọc nên cộng lại đúng tổng', () => {
    assert.deepEqual(installmentSplitPreview(50_000_000), { deposit: 15_000_000, balance: 35_000_000 })
    assert.deepEqual(installmentSplitPreview(5), { deposit: 2, balance: 3 })
    assert.deepEqual(installmentSplitPreview(1_000_001), { deposit: 300_000, balance: 700_001 })
    const odd = installmentSplitPreview(123_456_789)
    assert.equal(odd.deposit + odd.balance, 123_456_789)
  })

  test('tổng không chia được (dưới 2 đồng, lẻ đồng, không phải số) thì null', () => {
    for (const total of [0, 1, -10, 1.5, Number.NaN, Number.POSITIVE_INFINITY])
      assert.equal(installmentSplitPreview(total), null, String(total))
  })
})

describe('Lịch trả 30/70 + 100% gói', () => {
  const packages = [maintenance(), disaster()]

  test('TC-12 / TC-13: số ví dụ của yêu cầu: khoản 1 chỉ 30% lắp đặt, khoản 2 = 70% lắp đặt + 100% gói', () => {
    const plan = bundledPaymentPlan({ installationTotal: 50_000_000, packages })
    assert.equal(plan.deposit, 15_000_000)
    assert.equal(plan.balance, 35_000_000)
    assert.equal(plan.packages.total, 5_000_000)
    assert.equal(plan.secondPayment, 40_000_000)
    assert.equal(plan.grandTotal, 55_000_000)
    assert.equal(plan.preview, true)
  })

  test('không áp 30/70 lên tiền gói: thêm gói chỉ đổi khoản 2, khoản 1 giữ nguyên', () => {
    const without = bundledPaymentPlan({ installationTotal: 50_000_000, packages: [] })
    const withPackages = bundledPaymentPlan({ installationTotal: 50_000_000, packages })
    assert.equal(withPackages.deposit, without.deposit)
    assert.equal(withPackages.secondPayment - without.secondPayment, 5_000_000)
    assert.equal(without.secondPayment, without.balance)
  })

  test('TC-01 / TC-20: không có gói thì đúng 30/70 của hợp đồng như hiện nay', () => {
    const plan = bundledPaymentPlan({ installationTotal: 50_000_000, packages: [] })
    assert.equal(plan.packages.total, 0)
    assert.equal(plan.deposit + plan.balance, 50_000_000)
    assert.equal(plan.grandTotal, 50_000_000)
  })

  test('có số hai khoản của backend thì dùng nguyên số đó, không chia lại và không còn là tạm tính', () => {
    const plan = bundledPaymentPlan({
      installationTotal: 50_000_000,
      packages,
      installments: { deposit: 15_000_001, balance: 34_999_999 },
    })
    assert.equal(plan.deposit, 15_000_001)
    assert.equal(plan.balance, 34_999_999)
    assert.equal(plan.secondPayment, 34_999_999 + 5_000_000)
    assert.equal(plan.preview, false)
  })

  test('chi phí lắp đặt không chia được thì không đưa ra lịch trả', () => {
    assert.equal(bundledPaymentPlan({ installationTotal: 0, packages }), null)
    assert.equal(bundledPaymentPlan({ installationTotal: 1.5, packages }), null)
  })
})

describe('Trạng thái gói đi kèm theo backend', () => {
  const now = Date.parse('2026-11-24T05:00:00Z')
  const sub = (over = {}) => ({
    kind: 'MAINTENANCE',
    status: 'AWAITING_PAYMENT',
    startsAt: null,
    coverageStartsAt: null,
    ...over,
  })

  test('TC-13 / TC-14: chưa xác nhận tiền là chờ thanh toán; link hết hạn không thành đã trả', () => {
    assert.equal(bundledSubscriptionStage(sub(), now).label, 'Chờ thanh toán')
    assert.equal(bundledSubscriptionStage(sub({ status: 'CHECKOUT_EXPIRED' }), now).label, 'Hết hạn thanh toán')
  })

  test('TC-15: đã trả tiền mà chưa bàn giao (chưa có kỳ) là chờ bàn giao, không bao giờ là đang hiệu lực', () => {
    const s = bundledSubscriptionStage(sub({ status: 'PAID' }), now)
    assert.equal(s.stage, 'AWAITING_HANDOVER')
    assert.equal(s.label, 'Chờ bàn giao')
    assert.notEqual(s.tone, 'ok')
  })

  test('TC-15: đã có kỳ mà backend chưa chuyển ACTIVE thì vẫn là đã thanh toán, kèm ngày bắt đầu', () => {
    const past = bundledSubscriptionStage(sub({ status: 'PAID', startsAt: '2026-11-20T00:00:00Z' }), now)
    assert.equal(past.stage, 'PAID')
    assert.equal(past.startsAt, '2026-11-20T00:00:00Z')
    const future = bundledSubscriptionStage(sub({ status: 'PAID', startsAt: '2027-01-01T00:00:00Z' }), now)
    assert.equal(future.label, 'Đã thanh toán')
  })

  test('TC-16: backend báo ACTIVE thì đang có hiệu lực', () => {
    const s = bundledSubscriptionStage(sub({ status: 'ACTIVE', startsAt: '2026-11-20T00:00:00Z' }), now)
    assert.equal(s.label, 'Đang có hiệu lực')
    assert.equal(s.tone, 'ok')
    assert.equal(s.coverageStartsAt, null)
  })

  test('gói thiên tai đang hiệu lực còn trong thời gian chờ thì báo ngày bắt đầu bảo vệ; qua rồi thì thôi', () => {
    const waiting = sub({ kind: 'DISASTER_PROTECTION', status: 'ACTIVE', coverageStartsAt: '2026-12-05T00:00:00Z' })
    assert.equal(bundledSubscriptionStage(waiting, now).coverageStartsAt, '2026-12-05T00:00:00Z')
    const covered = sub({ kind: 'DISASTER_PROTECTION', status: 'ACTIVE', coverageStartsAt: '2026-11-01T00:00:00Z' })
    assert.equal(bundledSubscriptionStage(covered, now).coverageStartsAt, null)
  })

  test('hết hạn, chờ duyệt huỷ, đã huỷ theo đúng mã backend; mã lạ in nguyên mã, màu xám', () => {
    assert.equal(bundledSubscriptionStage(sub({ status: 'EXPIRED' }), now).label, 'Hết hạn')
    assert.equal(bundledSubscriptionStage(sub({ status: 'CANCELLATION_REQUESTED' }), now).label, 'Chờ duyệt huỷ')
    assert.equal(bundledSubscriptionStage(sub({ status: 'CANCELLED' }), now).label, 'Đã huỷ')
    const unknown = bundledSubscriptionStage(sub({ status: 'SOMETHING_NEW' }), now)
    assert.equal(unknown.stage, 'UNKNOWN')
    assert.equal(unknown.label, 'SOMETHING_NEW')
    assert.equal(unknown.tone, 'neutral')
  })
})
