// Bảng vật tư của biên bản khảo sát, bám OnSiteSurveyHandlers (Validate + CheckBillOfMaterialsAgainstCatalogAsync) và
// QuotationAutomaticGeneration của backend `main` (66cb7af). Chạy: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  BOM_ERROR_KEY,
  bomErrorKey,
  bomErrors,
  bomGaps,
  bomRequest,
  isServiceType,
  newBomRow,
  readQuantity,
  rowsFromItems,
} from '../src/features/onsite-survey/billOfMaterials.ts'
import { amendmentDiff, amendmentEntries } from '../src/features/onsite-survey/onSiteSurveyAmendment.ts'

const row = (productId, quantity) => newBomRow(productId, quantity)

describe('bảng vật tư', () => {
  test('số lượng nhận dấu phẩy, gõ sai là NaN', () => {
    assert.equal(readQuantity('1,5'), 1.5)
    assert.equal(readQuantity(' 12 '), 12)
    assert.equal(readQuantity(''), null)
    assert.ok(Number.isNaN(readQuantity('1,2,3')))
    assert.ok(Number.isNaN(readQuantity('-1')))
  })

  test('dịch vụ là ba loại INSTALLATION_LABOR, TRANSPORT, OTHER_SERVICE', () => {
    assert.ok(isServiceType('installation_labor'))
    assert.ok(!isServiceType('SOLAR_PANEL'))
    assert.ok(!isServiceType(null))
  })

  test('chưa từng có bảng và chưa ghi gì thì không gửi', () => {
    assert.equal(bomRequest([], [], '  ', false), null)
  })

  test('đã có bảng mà xoá hết thì gửi bảng rỗng, vì backend giữ bảng cũ khi null', () => {
    assert.deepEqual(bomRequest([], [], '', true), { materials: [], serviceItems: [], installationNotes: null })
  })

  test('gửi mã sản phẩm và số lượng, không có giá', () => {
    assert.deepEqual(bomRequest([row('p1', '20')], [row('s1', '1,5')], ' Lắp ray nhôm ', false), {
      materials: [{ productId: 'p1', quantity: 20 }],
      serviceItems: [{ productId: 's1', quantity: 1.5 }],
      installationNotes: 'Lắp ray nhôm',
    })
  })

  test('dòng chưa chọn sản phẩm, trùng sản phẩm, số lượng ngoài khoảng', () => {
    const errors = bomErrors([row('', '1'), row('p1', '0'), row('p2', '100001')], [row('p1', '1')], '')
    assert.ok(errors[bomErrorKey('materials', 0)])
    assert.ok(errors[bomErrorKey('materials', 1)])
    assert.ok(errors[bomErrorKey('materials', 2)])
    assert.match(errors[bomErrorKey('serviceItems', 0)], /dòng trên/)
  })

  test('đơn vị đếm theo cái phải là số nguyên', () => {
    const errors = bomErrors([row('p1', '1,5'), row('p2', '1,5')], [], '', { p1: 'pcs', p2: 'm' })
    assert.match(errors[bomErrorKey('materials', 0)], /số nguyên/)
    assert.equal(errors[bomErrorKey('materials', 1)], undefined)
  })

  test('tối đa 100 dòng, ghi chú tối đa 2000 ký tự', () => {
    const many = Array.from({ length: 101 }, (_, i) => row(`p${i}`, '1'))
    assert.ok(bomErrors(many, [], '')[BOM_ERROR_KEY])
    assert.ok(bomErrors([], [], 'x'.repeat(2001))[BOM_ERROR_KEY])
  })

  test('khoá lỗi trùng khoá backend để lỗi server rơi đúng dòng', () => {
    assert.equal(bomErrorKey('serviceItems', 2), 'billOfMaterials.serviceItems[2]')
  })

  test('báo giá tự lập cần tấm pin, inverter và nhân công', () => {
    const types = { p: 'SOLAR_PANEL', i: 'INVERTER', l: 'INSTALLATION_LABOR' }
    const typeOf = (id) => types[id]
    assert.deepEqual(bomGaps([row('p', '1')], [], typeOf), ['inverter', 'nhân công lắp đặt'])
    assert.deepEqual(bomGaps([row('p', '1'), row('i', '1')], [row('l', '1')], typeOf), [])
  })

  test('mở lại biên bản giữ đúng số lượng', () => {
    assert.deepEqual(
      rowsFromItems([{ productId: 'p1', quantity: 2.5 }]).map((r) => [r.productId, r.quantity]),
      [['p1', '2,5']],
    )
  })
})

describe('bổ sung bảng vật tư', () => {
  const bom = (quantity) => ({ materials: [{ productId: 'p1', quantity }], serviceItems: [], installationNotes: null })

  test('đổi bảng thì gửi cả bảng', () => {
    const diff = amendmentDiff({ billOfMaterials: bom(3) }, { billOfMaterials: bom(2) })
    assert.deepEqual(diff.changed, ['billOfMaterials'])
    assert.deepEqual(diff.changes.billOfMaterials, bom(3))
  })

  test('không đổi thì không gửi', () => {
    assert.deepEqual(amendmentDiff({ billOfMaterials: bom(2) }, { billOfMaterials: bom(2) }).changed, [])
    assert.deepEqual(amendmentDiff({}, {}).changed, [])
  })

  test('lịch sử ghi số dòng cũ và mới', () => {
    const entries = amendmentEntries({ billOfMaterials: { old: null, new: bom(1) } })
    assert.deepEqual(entries, [{ field: 'billOfMaterials', kind: 'bom', old: 0, new: 1 }])
  })
})
