// Luật chọn thiết bị đã lắp từ danh mục sản phẩm (src/features/installations/assetForm.ts),
// bám InstallationHandlers.RegisterAssetsAsync & AssetMatchesProduct của backend. Chạy: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  assetCount,
  changeAssetType,
  filterProductsForAssetType,
  formatProductOptionLabel,
  hasErrors,
  missingAssetsText,
  missingAssetTypes,
  missingFromDetails,
  newAssetRow,
  rowUnits,
  selectAssetProduct,
  serverRowErrors,
  toAssetRequests,
  validateAssetRows,
} from '../src/features/installations/assetForm.ts'

const panelA = {
  id: 'p-panel-a',
  sku: 'SP-JA-550',
  productType: 'SOLAR_PANEL',
  name: 'Tấm pin JA Solar 550W',
  brand: 'JA Solar',
  model: 'JAM72S30-550/MR',
  ratedPowerW: 550,
  warrantyMonth: 144,
  status: 'ACTIVE',
}

const panelB = {
  id: 'p-panel-b',
  sku: 'SP-AE-550',
  productType: 'solAr_paNel'.toUpperCase(),
  name: 'Tấm pin AE Solar 550W',
  brand: 'AE Solar',
  model: null,
  ratedPowerW: 550,
  warrantyMonth: null,
  status: 'ACTIVE',
}

const inactivePanel = {
  id: 'p-panel-off',
  productType: 'SOLAR_PANEL',
  name: 'Tấm pin ngừng bán',
  brand: 'Old',
  model: 'X1',
  status: 'INACTIVE',
}

const inverter = {
  id: 'p-inv-1',
  sku: 'INV-GW-5K',
  productType: 'INVERTER',
  name: 'Inverter Growatt 5kW',
  brand: 'Growatt',
  model: 'MIN 5000TL-X',
  ratedPowerW: 5000,
  warrantyMonth: 60,
  status: 'ACTIVE',
}

const laborService = {
  id: 'p-svc-1',
  productType: 'INSTALLATION_LABOR',
  name: 'Nhân công lắp đặt',
  brand: 'Smart Solar',
  model: 'LABOR',
  status: 'ACTIVE',
}

const catalog = [panelA, panelB, inactivePanel, inverter, laborService]

describe('lọc sản phẩm theo loại thiết bị đã lắp', () => {
  test('PANEL chỉ lấy SOLAR_PANEL đang bán và đưa sản phẩm theo hợp đồng lên đầu', () => {
    const differences = [
      {
        productId: panelB.id,
        productType: 'SOLAR_PANEL',
        name: panelB.name,
        contractedQuantity: 8,
        installedQuantity: 0,
      },
    ]
    const list = filterProductsForAssetType(catalog, 'PANEL', differences)
    assert.deepEqual(
      list.map((p) => p.id),
      [panelB.id, panelA.id],
    )
    assert.match(formatProductOptionLabel(panelB, differences[0]), /^Theo hợp đồng: /)
    assert.doesNotMatch(formatProductOptionLabel(panelB, differences[0]), /·/)
  })

  test('INVERTER chỉ lấy INVERTER đang bán; OTHER bỏ qua dịch vụ (INSTALLATION_LABOR...)', () => {
    assert.deepEqual(
      filterProductsForAssetType(catalog, 'INVERTER').map((p) => p.id),
      [inverter.id],
    )
    assert.deepEqual(
      filterProductsForAssetType(catalog, 'OTHER').map((p) => p.id),
      [inverter.id, panelB.id, panelA.id],
    )
  })
})

describe('chọn sản phẩm, nhân dòng và đổi loại thiết bị', () => {
  test('chọn tấm pin tự điền hãng, model (lấy name nếu thiếu model) và bảo hành; dòng mới luôn trống', () => {
    let row = newAssetRow()
    row = selectAssetProduct(row, panelA.id, catalog)
    assert.equal(row.productId, panelA.id)
    assert.equal(row.manufacturer, 'JA Solar')
    assert.equal(row.model, 'JAM72S30-550/MR')
    assert.equal(row.warrantyMonths, '144')

    const next = newAssetRow()
    assert.notEqual(next.key, row.key)
    assert.equal(next.assetType, 'PANEL')
    assert.equal(next.productId, null)
    assert.equal(next.quantity, '')
    assert.equal('serials' in next, false, 'không còn ô serial')
    assert.equal('positionCode' in next, false, 'không còn ô vị trí')

    const noModelRow = selectAssetProduct(newAssetRow(), panelB.id, catalog)
    assert.equal(noModelRow.model, panelB.name)
    assert.equal(noModelRow.warrantyMonths, '')
  })

  test('đổi từ PANEL sang INVERTER xoá chọn tấm pin cũ nhưng giữ số lượng đã gõ', () => {
    let row = { ...selectAssetProduct(newAssetRow(), panelA.id, catalog), quantity: '12' }
    row = changeAssetType(row, 'INVERTER', catalog)
    assert.equal(row.assetType, 'INVERTER')
    assert.equal(row.productId, null)
    assert.equal(row.manufacturer, '')
    assert.equal(row.warrantyMonths, '')
    assert.equal(row.quantity, '12')
  })

  test('chọn giá trị không có trong danh mục hoặc sai loại thì bỏ chọn sản phẩm', () => {
    const row = selectAssetProduct(newAssetRow(), panelA.id, catalog)
    assert.equal(selectAssetProduct(row, '', catalog).productId, null)
    assert.equal(selectAssetProduct(row, inverter.id, catalog).productId, null, 'dòng tấm pin không nhận inverter')
  })
})

describe('kiểm tra dữ liệu và đóng gói request đăng ký thiết bị (chỉ theo số lượng)', () => {
  const panelRow = (over) => ({ ...selectAssetProduct(newAssetRow(), panelA.id, catalog), ...over })

  test('mọi loại thiết bị bắt buộc chọn sản phẩm trong danh mục (backend: lô phải có productId)', () => {
    const errors = validateAssetRows([
      { ...newAssetRow(), quantity: '1' },
      { ...changeAssetType(newAssetRow(), 'INVERTER', catalog), quantity: '1' },
      { ...changeAssetType(newAssetRow(), 'BATTERY', catalog), quantity: '1' },
    ])
    assert.equal(hasErrors(errors), true)
    assert.match(errors[0].productId, /tấm pin/)
    assert.match(errors[1].productId, /inverter/)
    assert.match(errors[2].productId, /sản phẩm trong danh mục/)
  })

  test('mỗi dòng gửi một lô: serial và vị trí luôn null, kèm số lượng và bảo hành theo danh mục', () => {
    const lot = panelRow({ quantity: ' 100 ' })
    const inv = {
      ...selectAssetProduct(changeAssetType(newAssetRow(), 'INVERTER', catalog), inverter.id, catalog),
      quantity: '2',
    }
    const rows = [lot, inv]
    assert.equal(hasErrors(validateAssetRows(rows)), false)
    assert.deepEqual(toAssetRequests(rows), [
      {
        assetType: 'PANEL',
        productId: panelA.id,
        manufacturer: 'JA Solar',
        model: 'JAM72S30-550/MR',
        positionCode: null,
        warrantyMonths: 144,
        serialNumber: null,
        quantity: 100,
      },
      {
        assetType: 'INVERTER',
        productId: inverter.id,
        manufacturer: 'Growatt',
        model: 'MIN 5000TL-X',
        positionCode: null,
        warrantyMonths: 60,
        serialNumber: null,
        quantity: 2,
      },
    ])
    assert.equal(rowUnits(lot), 100)
    assert.equal(assetCount(rows), 102)
  })

  test('số lượng là số nguyên từ 1 đến 10.000', () => {
    for (const quantity of ['', '0', '10001', '1,5', '-3', 'mười'])
      assert.ok(validateAssetRows([panelRow({ quantity })])[0].quantity, quantity)
    for (const quantity of ['1', '10000']) assert.equal(hasErrors(validateAssetRows([panelRow({ quantity })])), false)
  })

  test('sản phẩm danh mục thiếu hãng / model thì bắt ghi bổ sung', () => {
    const row = panelRow({ quantity: '1', manufacturer: ' ', model: '' })
    const errors = validateAssetRows([row])[0]
    assert.ok(errors.manufacturer)
    assert.ok(errors.model)
  })

  test('lỗi theo mục của backend về đúng dòng (mỗi dòng một mục); mục ngoài danh sách thì bỏ qua', () => {
    const rows = [panelRow({ quantity: '1' }), panelRow({ quantity: '20000' })]
    const errors = serverRowErrors({ 'assets[1].quantity': 'x', 'assets[0].productId': 'y' }, rows)
    assert.ok(errors[1].quantity)
    assert.ok(errors[0].productId)
    assert.equal(errors[0].quantity, undefined)
    assert.equal(serverRowErrors({ reason: 'x', 'assets[9].quantity': 'ngoài danh sách' }, rows), null)
  })
})

describe('báo cáo hoàn thành: loại thiết bị còn thiếu', () => {
  const panel = { assetType: 'PANEL' }
  test('cần ít nhất một dòng tấm pin và một dòng inverter khi công trình yêu cầu', () => {
    assert.deepEqual(missingAssetTypes({ assets: [panel], requiresPanelAndInverterAssets: true }), ['INVERTER'])
    assert.deepEqual(missingAssetTypes({ assets: [] }), ['PANEL', 'INVERTER'])
    assert.deepEqual(missingAssetTypes({ assets: [panel, { assetType: 'INVERTER' }] }), [])
    assert.deepEqual(missingAssetTypes({ assets: [], requiresPanelAndInverterAssets: false }), [])
  })
  test('câu báo thiếu ghi đúng loại; đọc `details.missing` của backend, bỏ giá trị lạ', () => {
    assert.equal(missingAssetsText(['INVERTER']), 'Chưa ghi inverter đã lắp.')
    assert.equal(missingAssetsText(['PANEL', 'INVERTER']), 'Chưa ghi tấm pin và inverter đã lắp.')
    assert.equal(missingAssetsText([]), null)
    assert.deepEqual(missingFromDetails({ missing: ['INVERTER', 3] }), ['INVERTER'])
    assert.deepEqual(missingFromDetails(null), [])
    assert.deepEqual(missingFromDetails({ missing: 'INVERTER' }), [])
  })
})
