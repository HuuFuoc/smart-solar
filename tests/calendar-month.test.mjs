import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addMonths, monthCells, monthLabel, monthOf } from '../src/features/scheduling/calendarMonth.ts'

test('lưới tháng bắt đầu từ thứ Hai, ô trống trước ngày 1 và sau ngày cuối', () => {
  // 01/10/2026 là thứ Năm
  const cells = monthCells('2026-10')
  assert.equal(cells.length, 35)
  assert.deepEqual(cells.slice(0, 4), [null, null, null, '2026-10-01'])
  assert.equal(cells[33], '2026-10-31')
  assert.equal(cells[34], null)
})

test('tháng bắt đầu vào Chủ nhật có 6 ô trống đầu', () => {
  // 01/02/2026 là Chủ nhật, tháng 2 có 28 ngày
  const cells = monthCells('2026-02')
  assert.equal(cells.indexOf('2026-02-01'), 6)
  assert.equal(cells.filter(Boolean).length, 28)
  assert.equal(cells.length % 7, 0)
})

test('cộng trừ tháng qua năm', () => {
  assert.equal(addMonths('2026-12', 1), '2027-01')
  assert.equal(addMonths('2026-01', -1), '2025-12')
  assert.equal(addMonths('2026-10', 0), '2026-10')
})

test('tháng của một ngày và tên tháng', () => {
  assert.equal(monthOf('2026-10-27'), '2026-10')
  assert.equal(monthLabel('2026-10'), 'Tháng 10, 2026')
})
