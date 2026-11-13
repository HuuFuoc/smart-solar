// Luật chọn thiết bị đã lắp từ danh mục sản phẩm (src/features/installations/assetForm.ts),
// bám InstallationHandlers.RegisterAssetsAsync & AssetMatchesProduct của backend. Chạy: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  MANUAL_PRODUCT_VALUE,
  assetCount,
  changeAssetType,
  filterProductsForAssetType,
  formatProductOptionLabel,
  hasErrors,
  newAssetRow,
  parseSerials,
  selectAssetProduct,
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
    assert.match(formatProductOptionLabel(panelB, differences[0]), /^\[Hợp đồng\] /)
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
    assert.equal(next.manufacturer, '')
    assert.equal(next.model, '')
    assert.equal(next.warrantyMonths, '')
    assert.equal(next.serials, '')
    assert.equal(next.positionCode, '')

    const noModelRow = selectAssetProduct(newAssetRow(), panelB.id, catalog)
    assert.equal(noModelRow.model, panelB.name)
    assert.equal(noModelRow.warrantyMonths, '')
  })

  test('đổi từ PANEL sang INVERTER xoá chọn tấm pin cũ nhưng giữ số serial đã gõ', () => {
    let row = selectAssetProduct(newAssetRow(), panelA.id, catalog)
    row.serials = 'SN-999'
    row = changeAssetType(row, 'INVERTER', catalog)
    assert.equal(row.assetType, 'INVERTER')
    assert.equal(row.productId, null)
    assert.equal(row.manufacturer, '')
    assert.equal(row.model, '')
    assert.equal(row.warrantyMonths, '')
    assert.equal(row.serials, 'SN-999')
  })

  test('loại BATTERY hỗ trợ nhập ngoài danh mục và xoá gắn danh mục khi đổi về nhập tay', () => {
    let row = changeAssetType(newAssetRow(), 'BATTERY', catalog)
    row.manufacturer = 'BYD'
    row.model = 'LVS 4.0'
    assert.equal(selectAssetProduct(row, MANUAL_PRODUCT_VALUE, catalog), row)

    row = selectAssetProduct(row, panelA.id, catalog)
    assert.equal(row.productId, panelA.id)
    row = selectAssetProduct(row, MANUAL_PRODUCT_VALUE, catalog)
    assert.equal(row.productId, null)
    assert.equal(row.manufacturer, '')
    assert.equal(row.warrantyMonths, '')
  })
})

describe('kiểm tra dữ liệu và đóng gói request đăng ký thiết bị', () => {
  test('PANEL và INVERTER bắt buộc chọn sản phẩm trong danh mục', () => {
    const row = { ...newAssetRow(), serials: 'SN-1' }
    const inv = { ...changeAssetType(newAssetRow(), 'INVERTER', catalog), serials: 'SN-2' }
    const errors = validateAssetRows([row, inv], [])
    assert.equal(hasErrors(errors), true)
    assert.match(errors[0].productId, /tấm pin/)
    assert.match(errors[1].productId, /inverter/)
  })

  test('chặn trùng serial cùng hãng (không phân biệt hoa thường) và bảo hành ở dòng ngoài danh mục', () => {
    const r1 = { ...selectAssetProduct(newAssetRow(), panelA.id, catalog), serials: 'sn-001' }
    const r2 = { ...selectAssetProduct(newAssetRow(), panelA.id, catalog), serials: 'SN-001' }
    const saved = [
      {
        assetId: 'a1',
        assetType: 'PANEL',
        productId: panelA.id,
        manufacturer: 'JA SOLAR',
        model: 'X',
        serialNumber: 'SN-OLD',
        positionCode: null,
        warrantyMonths: 144,
      },
    ]
    const r3 = { ...selectAssetProduct(newAssetRow(), panelA.id, catalog), serials: 'sn-old' }
    const manual = {
      ...changeAssetType(newAssetRow(), 'OTHER', catalog),
      manufacturer: 'ABC',
      model: 'M1',
      serials: 'SN-M',
      warrantyMonths: '12',
    }

    const errors = validateAssetRows([r1, r2, r3, manual], saved)
    assert.equal(errors[0].serials, undefined)
    assert.match(errors[1].serials, /dòng 1: SN-001/)
    assert.match(errors[2].serials, /Đã ghi cho công trình: sn-old/)
    assert.match(errors[3].warrantyMonths, /ngoài danh mục/)
  })

  test('toAssetRequests gửi kèm productId và warrantyMonths đúng chuẩn backend', () => {
    const panelRow = {
      ...selectAssetProduct(newAssetRow(), panelA.id, catalog),
      serials: ' SN-01 ',
      positionCode: ' R1-C1 ',
    }
    const manualRow = {
      ...changeAssetType(newAssetRow(), 'METER', catalog),
      manufacturer: ' Schneider ',
      model: ' iEM3155 ',
      serials: ' M-01 ',
      warrantyMonths: '24',
    }
    assert.deepEqual(toAssetRequests([panelRow, manualRow]), [
      {
        assetType: 'PANEL',
        productId: panelA.id,
        manufacturer: 'JA Solar',
        model: 'JAM72S30-550/MR',
        serialNumber: 'SN-01',
        positionCode: 'R1-C1',
        warrantyMonths: 144,
      },
      {
        assetType: 'METER',
        productId: null,
        manufacturer: 'Schneider',
        model: 'iEM3155',
        serialNumber: 'M-01',
        positionCode: null,
        warrantyMonths: null,
      },
    ])
  })
})

describe('một dòng nhiều serial (dán cột Excel, máy quét mã vạch)', () => {
  test('tách theo xuống dòng, tab, dấu phẩy, chấm phẩy; bỏ ô trống và khoảng trắng', () => {
    assert.deepEqual(parseSerials(' SN-1\r\nSN-2\n\n\tSN-3 ;SN-4, SN-5\n'), ['SN-1', 'SN-2', 'SN-3', 'SN-4', 'SN-5'])
    assert.deepEqual(parseSerials(' \n \n'), [])
  })

  test('mỗi serial thành một thiết bị, dùng chung sản phẩm và vị trí của dòng', () => {
    const row = {
      ...selectAssetProduct(newAssetRow(), panelA.id, catalog),
      serials: 'SN-01\nSN-02\nSN-03',
      positionCode: 'Mái trước',
    }
    const requests = toAssetRequests([row])
    assert.deepEqual(
      requests.map((r) => r.serialNumber),
      ['SN-01', 'SN-02', 'SN-03'],
    )
    assert.ok(
      requests.every((r) => r.productId === panelA.id && r.positionCode === 'Mái trước' && r.warrantyMonths === 144),
    )
    assert.equal(assetCount([row, { ...newAssetRow(), serials: 'X\nY' }]), 5)
  })

  test('báo serial trùng trong cùng ô, với dòng trên và với thiết bị đã lưu; chỉ liệt kê vài số đầu', () => {
    const saved = [
      {
        assetId: 'a1',
        assetType: 'PANEL',
        productId: panelA.id,
        manufacturer: 'JA Solar',
        model: 'X',
        serialNumber: 'OLD-1',
        positionCode: null,
        warrantyMonths: 144,
      },
    ]
    const first = { ...selectAssetProduct(newAssetRow(), panelA.id, catalog), serials: 'A\nB\nC' }
    const second = {
      ...selectAssetProduct(newAssetRow(), panelA.id, catalog),
      serials: 'D\nd\nold-1\nB\nE\nE\nE\nF\nF\nG\nG\nH\nH',
    }
    const errors = validateAssetRows([first, second], saved)
    assert.equal(errors[0].serials, undefined)
    assert.match(errors[1].serials, /Đã ghi cho công trình: old-1\./)
    assert.match(errors[1].serials, /Nhập trùng: d, E, F và 2 số khác\./)
    assert.match(errors[1].serials, /Trùng với dòng 1: B\./)
  })

  test('serial quá dài báo đúng thứ tự trong ô; ô trống báo thiếu serial', () => {
    const row = { ...selectAssetProduct(newAssetRow(), panelA.id, catalog), serials: `OK\n${'x'.repeat(101)}` }
    const empty = { ...selectAssetProduct(newAssetRow(), panelA.id, catalog), serials: '\n \n' }
    const errors = validateAssetRows([row, empty], [])
    assert.match(errors[0].serials, /Serial thứ 2 dài hơn 100/)
    assert.equal(errors[1].serials, 'Nhập số serial.')
  })
})
