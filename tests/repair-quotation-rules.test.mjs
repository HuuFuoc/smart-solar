import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  canQuoteRepair,
  quotableItems,
  repairQuoteBody,
  repairQuoteErrors,
} from '../src/features/after-sales/technicianVisitRules.ts'

const item = (itemId, coverage, status = 'OPEN') => ({ itemId, coverage, status })

test('chỉ hạng mục khách trả và chưa được duyệt làm mới vào báo giá', () => {
  const items = [
    item('a', 'CHARGEABLE'),
    item('b', 'DISASTER_PROTECTION', 'QUOTED'),
    item('c', 'INSTALLATION_WARRANTY'),
    item('d', 'CHARGEABLE', 'AUTHORIZED'),
    item('e', 'PENDING'),
  ]
  assert.deepEqual(
    quotableItems(items).map((i) => i.itemId),
    ['a', 'b'],
  )
  assert.equal(canQuoteRepair({ requestKind: 'FAULT', status: 'REPORTED', items }), true)
  assert.equal(canQuoteRepair({ requestKind: 'MAINTENANCE', status: 'REPORTED', items }), false)
  assert.equal(canQuoteRepair({ requestKind: 'FAULT', status: 'DECLINED', items }), false)
  assert.equal(canQuoteRepair({ requestKind: 'ONE_TIME_MAINTENANCE', status: 'REPORTED', items: [items[2]] }), false)
})

test('lỗi báo giá theo hạng mục', () => {
  const p = (productId, quantity = 1) => ({ productId, quantity })
  assert.deepEqual(repairQuoteErrors([{ itemId: 'a', description: '', components: [p('x', 2)] }], ''), {})
  assert.ok(repairQuoteErrors([{ itemId: 'a', description: '', components: [] }], '').a)
  assert.ok(repairQuoteErrors([{ itemId: 'a', description: '', components: [p('x'), p('x')] }], '').a)
  assert.ok(repairQuoteErrors([{ itemId: 'a', description: '', components: [p('x', 0)] }], '').a)
  assert.ok(repairQuoteErrors([{ itemId: 'a', description: '', components: [p('x', 10_001)] }], '').a)
  const many = Array.from({ length: 21 }, (_, i) => p(`p${i}`))
  assert.ok(repairQuoteErrors([{ itemId: 'a', description: '', components: many }], '').a)
  assert.ok(repairQuoteErrors([{ itemId: 'a', description: 'x'.repeat(301), components: [p('x')] }], '').a)
  assert.ok(repairQuoteErrors([], 'x'.repeat(1001)).note)
})

test('body không có số tiền, mô tả trống gửi null', () => {
  const body = repairQuoteBody([{ itemId: 'a', description: '  ', components: [{ productId: 'x', quantity: 2 }] }], ' ')
  assert.deepEqual(body, {
    lines: [{ itemId: 'a', description: null, components: [{ productId: 'x', quantity: 2 }] }],
    repairWarrantyMonths: null,
    note: null,
  })
})
