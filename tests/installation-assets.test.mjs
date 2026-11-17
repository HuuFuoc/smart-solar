// Luật chọn thiết bị đã lắp từ danh mục sản phẩm (src/features/installations/assetForm.ts),
// bám InstallationHandlers.RegisterAssetsAsync & AssetMatchesProduct của backend. Chạy: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  MANUAL_PRODUCT_VALUE,
  assetCount,
  changeAssetType,
  entryCount,
  filterProductsForAssetType,
  formatProductOptionLabel,
  hasErrors,
  missingAssetsText,
  missingAssetTypes,
  missingFromDetails,
  newAssetRow,
  parseSerials,
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

  test('serial quá dài báo đúng thứ tự trong ô; ô serial trống thì phải có số lượng', () => {
    const row = { ...selectAssetProduct(newAssetRow(), panelA.id, catalog), serials: `OK\n${'x'.repeat(101)}` }
    const empty = { ...selectAssetProduct(newAssetRow(), panelA.id, catalog), serials: '\n \n' }
    const errors = validateAssetRows([row, empty], [])
    assert.match(errors[0].serials, /Serial thứ 2 dài hơn 100/)
    assert.equal(errors[1].serials, undefined)
    assert.match(errors[1].quantity, /Nhập số lượng đã lắp/)
  })
})

describe('ghi theo số lượng (lô) hoặc theo serial', () => {
  const panelRow = (over) => ({ ...selectAssetProduct(newAssetRow(), panelA.id, catalog), ...over })

  test('một lô 100 tấm pin là một mục không có serial; inverter có serial không gửi số lượng', () => {
    const lot = panelRow({ quantity: ' 100 ', positionCode: 'Mái A' })
    const inv = { ...selectAssetProduct(changeAssetType(newAssetRow(), 'INVERTER', catalog), inverter.id, catalog) }
    const rows = [lot, { ...inv, serials: 'HW-001' }]
    assert.equal(hasErrors(validateAssetRows(rows, [])), false)
    const requests = toAssetRequests(rows)
    assert.deepEqual(requests[0], {
      assetType: 'PANEL',
      productId: panelA.id,
      manufacturer: 'JA Solar',
      model: 'JAM72S30-550/MR',
      positionCode: 'Mái A',
      warrantyMonths: 144,
      serialNumber: null,
      quantity: 100,
    })
    assert.equal(requests[1].serialNumber, 'HW-001')
    assert.equal('quantity' in requests[1], false)
    assert.equal(rowUnits(lot), 100)
    assert.equal(assetCount(rows), 101)
    assert.equal(entryCount(rows), 2)
  })

  test('có serial mà số lượng khác số serial thì chặn; số lượng trùng số serial thì nhận', () => {
    const wrong = panelRow({ serials: 'SN-1', quantity: '100' })
    assert.match(validateAssetRows([wrong], [])[0].quantity, /Đã nhập 1 số serial thì số lượng là 1/)
    assert.equal(hasErrors(validateAssetRows([panelRow({ serials: 'SN-1\nSN-2', quantity: '2' })], [])), false)
  })

  test('số lượng của lô là số nguyên từ 1 đến 10.000', () => {
    for (const quantity of ['', '0', '10001', '1,5', '-3', 'mười'])
      assert.ok(validateAssetRows([panelRow({ quantity })], [])[0].quantity, quantity)
    for (const quantity of ['1', '10000'])
      assert.equal(hasErrors(validateAssetRows([panelRow({ quantity })], [])), false)
  })

  test('thiết bị ngoài danh mục phải ghi serial; số lượng gõ dở từ trước không bị báo lỗi', () => {
    const manual = { ...changeAssetType(newAssetRow(), 'OTHER', catalog), manufacturer: 'ABC', model: 'M1' }
    assert.match(validateAssetRows([{ ...manual, quantity: '5' }], [])[0].serials, /ngoài danh mục phải ghi số serial/)
    assert.equal(hasErrors(validateAssetRows([{ ...manual, quantity: '5', serials: 'SN-M' }], [])), false)
  })

  test('lỗi theo mục của backend về đúng dòng: mục của lô đứng sau các serial của dòng trước', () => {
    const rows = [panelRow({ serials: 'A\nB' }), panelRow({ quantity: '20000' })]
    const errors = serverRowErrors({ 'assets[2].quantity': 'x', 'assets[0].productId': 'y' }, rows)
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
