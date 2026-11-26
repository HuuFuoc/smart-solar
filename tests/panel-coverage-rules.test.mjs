// Gói mua riêng theo tấm pin, gia hạn và báo lỗi thiên tai theo tấm (backend `main` 763cb0b, FE_HANDOFF.md §3, BUSINESS_RULES §6–7):
// số tấm còn mua được là của backend, lựa chọn không vượt quá và không trùng dòng, `quantity` = tổng `units`, không gộp với hợp
// đồng, gói theo hệ thống không mang trường của gói theo tấm, báo lỗi thiên tai theo tấm phải chỉ ra tấm bị hư hại. Chạy: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  hasSelectionErrors,
  isPerPanelPackage,
  isRenewable,
  kindCapacity,
  legacyPurchaseBody,
  mayRenew,
  panelAvailable,
  panelPurchaseBody,
  perPanelPackagesOfKind,
  purchaseBlock,
  renewalBody,
  selectionErrors,
  selectionUnits,
  targetAssets,
} from '../src/features/after-sales/panelCoverageRules.ts'
import {
  activeDisasterTerms,
  disasterTypesOf,
  needsDamagedPanel,
  termCoveringPanel,
} from '../src/features/after-sales/customerServiceRules.ts'

const panel = (assetId, over = {}) => ({
  assetId,
  manufacturer: 'JA Solar',
  model: 'JAM72',
  serialNumber: `SN-${assetId}`,
  isLot: false,
  quantity: 1,
  positionCode: null,
  coverage: [
    { kind: 'DISASTER_PROTECTION', heldUnits: 0, availableUnits: 1 },
    { kind: 'MAINTENANCE', heldUnits: 0, availableUnits: 0 },
  ],
  ...over,
})

const lot = panel('L', {
  serialNumber: null,
  isLot: true,
  quantity: 10,
  coverage: [
    { kind: 'DISASTER_PROTECTION', heldUnits: 4, availableUnits: 6 },
    { kind: 'MAINTENANCE', heldUnits: 0, availableUnits: 0 },
  ],
})

/** Công trình đã trả đủ, đã bàn giao: 3 tấm có serial (C đã có gói thiên tai) và một lô 10 tấm (4 tấm đã có gói) */
const view = (over = {}) => ({
  contractId: 'k1',
  projectId: 'p1',
  contractFullyPaid: true,
  handedOver: true,
  canPurchase: true,
  reason: null,
  panels: [
    panel('A'),
    panel('B'),
    panel('C', {
      coverage: [
        { kind: 'DISASTER_PROTECTION', heldUnits: 1, availableUnits: 0 },
        { kind: 'MAINTENANCE', heldUnits: 0, availableUnits: 0 },
      ],
    }),
    lot,
  ],
  kinds: [
    {
      kind: 'DISASTER_PROTECTION',
      activePanelUnits: 13,
      heldUnits: 5,
      availableUnits: 8,
      blocker: null,
      renewableSubscriptionIds: ['s-renew'],
    },
    {
      kind: 'MAINTENANCE',
      activePanelUnits: 13,
      heldUnits: 0,
      availableUnits: 0,
      blocker: 'An installation-wide MAINTENANCE term (Bảo trì) is in force.',
      renewableSubscriptionIds: [],
    },
  ],
  perPanelPackages: [
    { packageId: 'pd', kind: 'DISASTER_PROTECTION', isActive: true, pricingUnit: 'PER_PANEL' },
    { packageId: 'pm', kind: 'MAINTENANCE', isActive: true, pricingUnit: 'PER_PANEL' },
  ],
  ...over,
})

const KIND = 'DISASTER_PROTECTION'

describe('Chọn tấm pin theo số tấm còn mua được của backend', () => {
  test('Hai tấm có serial còn trống: hợp lệ, quantity = 2, mỗi tấm một dòng', () => {
    const selection = { A: 1, B: 1 }
    assert.equal(hasSelectionErrors(selectionErrors(view(), KIND, selection)), false)
    const body = panelPurchaseBody({
      contractId: 'k1',
      kind: KIND,
      packageId: 'pd',
      selection,
      paymentMethod: 'ONLINE',
    })
    assert.deepEqual(body, {
      contractId: 'k1',
      maintenancePackageId: null,
      disasterPackageId: 'pd',
      includeContract: false,
      paymentMethod: 'ONLINE',
      quantity: 2,
      targetAssets: [
        { assetId: 'A', units: 1 },
        { assetId: 'B', units: 1 },
      ],
    })
  })

  test('Lô: chọn số tấm nguyên tới số còn mua được (6 của 10)', () => {
    assert.equal(hasSelectionErrors(selectionErrors(view(), KIND, { L: 6 })), false)
    assert.equal(panelAvailable(lot, KIND), 6)
    assert.equal(
      panelPurchaseBody({ contractId: 'k1', kind: KIND, packageId: 'pd', selection: { L: 3 }, paymentMethod: 'CASH' })
        .quantity,
      3,
    )
  })

  test('Vượt số còn mua được của lô thì báo lỗi đúng dòng', () => {
    const e = selectionErrors(view(), KIND, { L: 7 })
    assert.match(e.rows.L, /tối đa 6 tấm/)
  })

  test('Tấm đã có gói (còn 0) không chọn được', () => {
    const e = selectionErrors(view(), KIND, { C: 1 })
    assert.ok(e.rows.C)
  })

  test('Số tấm lẻ, âm hoặc không phải số thì báo lỗi; dòng 0 tấm là không chọn', () => {
    assert.ok(selectionErrors(view(), KIND, { L: 1.5 }).rows.L)
    assert.ok(selectionErrors(view(), KIND, { L: -2 }).rows.L)
    assert.ok(selectionErrors(view(), KIND, { L: Number.NaN }).rows.L)
    assert.deepEqual(selectionErrors(view(), KIND, { A: 1, B: 0 }).rows, {})
  })

  test('Tài sản không thuộc công trình (hoặc vừa bị thay) thì báo lỗi', () => {
    assert.ok(selectionErrors(view(), KIND, { X: 1 }).rows.X)
  })

  test('Chưa chọn tấm nào thì không gửi được', () => {
    assert.match(selectionErrors(view(), KIND, {}).total, /ít nhất một tấm/)
    assert.match(selectionErrors(view(), KIND, { A: 0 }).total, /ít nhất một tấm/)
  })

  test('Tổng vượt số còn mua được của loại gói thì chặn (lấy số của backend, không tự tính)', () => {
    const small = view({ kinds: view().kinds.map((k) => (k.kind === KIND ? { ...k, availableUnits: 1 } : k)) })
    assert.match(selectionErrors(small, KIND, { A: 1, B: 1 }).total, /chỉ còn mua được 1 tấm/)
  })

  test('Không trùng dòng: mỗi tài sản một khoá, dòng 0 tấm bị bỏ khỏi body', () => {
    const t = targetAssets({ A: 1, B: 0, L: 2 })
    assert.deepEqual(t, [
      { assetId: 'A', units: 1 },
      { assetId: 'L', units: 2 },
    ])
    assert.equal(new Set(t.map((x) => x.assetId)).size, t.length)
    assert.equal(selectionUnits({ A: 1, B: 0, L: 2 }), 3)
  })
})

describe('Khi nào chưa mua được (theo cờ backend)', () => {
  test('Hợp đồng chưa trả đủ', () => {
    assert.equal(
      purchaseBlock(view({ contractFullyPaid: false, canPurchase: false, panels: [], kinds: [] }), KIND),
      'not-paid',
    )
  })

  test('Chưa bàn giao', () => {
    assert.equal(
      purchaseBlock(view({ handedOver: false, canPurchase: false, panels: [], kinds: [] }), KIND),
      'not-handed-over',
    )
  })

  test('Công trình đã huỷ', () => {
    assert.equal(
      purchaseBlock(view({ reason: 'The installation was cancelled.', panels: [], kinds: [] }), KIND),
      'cancelled',
    )
  })

  test('Chưa có tấm pin đang hoạt động', () => {
    assert.equal(
      purchaseBlock(view({ panels: [], reason: 'No active installed panel is registered.' }), KIND),
      'no-panels',
    )
  })

  test('Loại gói bị chặn (gói cả công trình đang hiệu lực / gói đi kèm chờ đối soát)', () => {
    assert.equal(purchaseBlock(view(), 'MAINTENANCE'), 'kind-blocked')
    assert.equal(kindCapacity(view(), 'MAINTENANCE').availableUnits, 0)
  })

  test('Hết tấm còn mua được', () => {
    const full = view({ kinds: view().kinds.map((k) => (k.kind === KIND ? { ...k, availableUnits: 0 } : k)) })
    assert.equal(purchaseBlock(full, KIND), 'sold-out')
  })

  test('Mua được', () => {
    assert.equal(purchaseBlock(view(), KIND), null)
  })
})

describe('Gói theo hệ thống và gói theo tấm pin không trộn lẫn', () => {
  test('Gói theo hệ thống không mang quantity / targetAssets / renewsSubscriptionId', () => {
    const body = legacyPurchaseBody({
      contractId: 'k1',
      kind: 'MAINTENANCE',
      packageId: 'legacy',
      includeContract: true,
      paymentMethod: 'ONLINE',
    })
    assert.deepEqual(Object.keys(body).sort(), [
      'contractId',
      'disasterPackageId',
      'includeContract',
      'maintenancePackageId',
      'paymentMethod',
    ])
    assert.equal(body.maintenancePackageId, 'legacy')
    assert.equal(body.disasterPackageId, null)
  })

  test('Gói theo tấm pin luôn includeContract false (không gộp với hợp đồng, trả 100% trước)', () => {
    const body = panelPurchaseBody({
      contractId: 'k1',
      kind: KIND,
      packageId: 'pd',
      selection: { A: 1 },
      paymentMethod: 'ONLINE',
    })
    assert.equal(body.includeContract, false)
  })

  test('Phân luồng theo đơn vị tính: chỉ PER_PANEL vào hộp chọn tấm pin; máy chủ cũ là gói theo hệ thống', () => {
    assert.equal(isPerPanelPackage({ pricingUnit: 'PER_PANEL' }), true)
    assert.equal(isPerPanelPackage({ pricingUnit: 'PER_INSTALLATION_LEGACY' }), false)
    assert.equal(isPerPanelPackage({}), false)
  })

  test('Gói đang bán theo tấm pin của một loại', () => {
    assert.deepEqual(
      perPanelPackagesOfKind(view(), KIND).map((p) => p.packageId),
      ['pd'],
    )
  })
})

describe('Gia hạn kỳ theo tấm pin', () => {
  const sub = (over = {}) => ({
    subscriptionId: 's-renew',
    coverageScope: 'PANEL',
    status: 'ACTIVE',
    endsAt: '2099-01-01T00:00:00+07:00',
    ...over,
  })

  test('Body gia hạn: kỳ cần gia hạn, không gửi tấm pin (backend lấy tấm của kỳ cũ), không gộp hợp đồng', () => {
    const body = renewalBody({
      contractId: 'k1',
      kind: KIND,
      packageId: 'pd',
      renewsSubscriptionId: 's-renew',
      paymentMethod: 'ONLINE',
    })
    assert.deepEqual(body, {
      contractId: 'k1',
      maintenancePackageId: null,
      disasterPackageId: 'pd',
      includeContract: false,
      paymentMethod: 'ONLINE',
      renewsSubscriptionId: 's-renew',
    })
    assert.equal('targetAssets' in body, false)
  })

  test('Nút gia hạn chỉ cho kỳ PANEL đang giữ quyền lợi và còn ngày kết thúc phía trước', () => {
    assert.equal(mayRenew(sub()), true)
    assert.equal(mayRenew(sub({ status: 'PAID' })), true)
    assert.equal(mayRenew(sub({ coverageScope: 'INSTALLATION' })), false, 'kỳ cả công trình')
    assert.equal(mayRenew(sub({ coverageScope: undefined })), false, 'máy chủ cũ')
    assert.equal(mayRenew(sub({ status: 'EXPIRED' })), false)
    assert.equal(mayRenew(sub({ endsAt: null })), false, 'chưa bắt đầu kỳ')
    assert.equal(mayRenew(sub({ endsAt: '2001-01-01T00:00:00+07:00' })), false, 'đã hết')
  })

  test('Gia hạn được hay không theo renewableSubscriptionIds của backend', () => {
    assert.equal(isRenewable(view(), KIND, 's-renew'), true)
    assert.equal(isRenewable(view(), KIND, 's-other'), false)
    assert.equal(isRenewable(view(), 'MAINTENANCE', 's-renew'), false)
  })
})

describe('Báo lỗi do thiên tai theo tấm pin', () => {
  const term = (over = {}) => ({
    subscriptionId: 'd1',
    kind: 'DISASTER_PROTECTION',
    status: 'ACTIVE',
    coverageScope: 'PANEL',
    coveredDisasterTypes: ['STORM'],
    coverageStartsAt: '2026-12-01T00:00:00+07:00',
    coveredPanels: [{ allocationId: 'a1', assetId: 'A', unitCount: 1 }],
    ...over,
  })

  test('Chỉ có kỳ theo tấm pin: phải chọn tấm bị hư hại', () => {
    assert.equal(needsDamagedPanel([term()]), true)
  })

  test('Có kỳ cả công trình (gói cũ) thì không cần, như trước', () => {
    assert.equal(needsDamagedPanel([term({ coverageScope: 'INSTALLATION' })]), false)
    assert.equal(needsDamagedPanel([term({ coverageScope: undefined })]), false, 'máy chủ cũ')
    assert.equal(needsDamagedPanel([term(), term({ subscriptionId: 'w', coverageScope: 'INSTALLATION' })]), false)
    assert.equal(needsDamagedPanel([]), false)
  })

  test('Tấm đã chọn thuộc kỳ nào (chỉ để báo trước, backend vẫn xét)', () => {
    assert.equal(termCoveringPanel([term()], 'A').subscriptionId, 'd1')
    assert.equal(termCoveringPanel([term()], 'B'), null)
  })

  test('Loại thiên tai gộp từ mọi kỳ đang hiệu lực, chỉ kỳ thiên tai ACTIVE', () => {
    const terms = activeDisasterTerms([
      term(),
      term({ subscriptionId: 'd2', coveredDisasterTypes: ['FLOOD', 'STORM'] }),
      term({ subscriptionId: 'd3', status: 'PAID', coveredDisasterTypes: ['LIGHTNING'] }),
      { subscriptionId: 'm1', kind: 'MAINTENANCE', status: 'ACTIVE', coveredDisasterTypes: [] },
    ])
    assert.deepEqual(
      terms.map((t) => t.subscriptionId),
      ['d1', 'd2'],
    )
    assert.deepEqual(disasterTypesOf(terms), ['STORM', 'FLOOD'])
  })
})
