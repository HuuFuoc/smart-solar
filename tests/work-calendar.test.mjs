// Phép tính ngày của lịch làm việc: lưới tháng bắt đầu Thứ Hai, việc nhiều ngày, đếm theo khoảng. Chạy: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  addMonths,
  dayMinutes,
  entriesByDay,
  monthEnd,
  monthGrid,
  monthStart,
  startingBetween,
  weekDays,
  weekStart,
} from '../src/features/scheduling/workCalendar.ts'

const item = (id, startsAt, endsAt) => ({ id, kind: 'survey', title: id, startsAt, endsAt, to: '/x', done: false })

describe('Lưới tháng', () => {
  test('tháng 11/2026 bắt đầu từ Thứ Hai 26/10 và kết thúc Chủ Nhật 6/12', () => {
    const grid = monthGrid('2026-11-16')
    assert.equal(grid[0], '2026-10-26')
    assert.equal(grid.at(-1), '2026-12-06')
    assert.equal(grid.length % 7, 0)
  })

  test('đầu và cuối tháng, cộng trừ tháng qua năm', () => {
    assert.equal(monthStart('2026-11-16'), '2026-11-01')
    assert.equal(monthEnd('2026-11-16'), '2026-11-30')
    assert.equal(monthEnd('2026-12-05'), '2026-12-31')
    assert.equal(monthEnd('2028-02-10'), '2028-02-29')
    assert.equal(addMonths('2026-12-15', 1), '2027-01-01')
    assert.equal(addMonths('2026-01-15', -1), '2025-12-01')
  })

  test('tuần bắt đầu Thứ Hai, Chủ Nhật thuộc tuần trước', () => {
    assert.equal(weekStart('2026-11-15'), '2026-11-09')
    assert.equal(weekStart('2026-11-16'), '2026-11-16')
    assert.deepEqual(weekDays('2026-11-18'), [
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
    ])
  })
})

describe('Việc theo ngày', () => {
  test('trong ngày giờ sớm trước, theo giờ Việt Nam', () => {
    const map = entriesByDay([
      item('chiều', '2026-11-16T14:00:00+07:00', '2026-11-16T15:30:00+07:00'),
      item('sáng', '2026-11-16T08:30:00+07:00', '2026-11-16T10:00:00+07:00'),
    ])
    assert.deepEqual(
      map.get('2026-11-16').map((e) => e.item.id),
      ['sáng', 'chiều'],
    )
  })

  test('việc qua đêm hiện ở cả hai ngày, ngày sau đánh dấu tiếp tục', () => {
    const map = entriesByDay([item('lắp đặt', '2026-10-22T16:00:00+07:00', '2026-10-23T17:00:00+07:00')])
    assert.equal(map.get('2026-10-22')[0].continued, false)
    assert.equal(map.get('2026-10-23')[0].continued, true)
    assert.equal(map.has('2026-10-24'), false)
  })

  test('đếm việc theo ngày bắt đầu trong khoảng', () => {
    const items = [
      item('a', '2026-10-31T23:30:00+07:00', '2026-11-01T01:00:00+07:00'),
      item('b', '2026-11-30T08:00:00+07:00', '2026-11-30T09:00:00+07:00'),
      item('c', '2026-12-01T08:00:00+07:00', '2026-12-01T09:00:00+07:00'),
    ]
    assert.deepEqual(
      startingBetween(items, '2026-11-01', '2026-11-30').map((i) => i.id),
      ['b'],
    )
  })
})

describe('Tổng giờ làm trong ngày', () => {
  test('cộng các việc trong ngày, không tính chồng giờ hai lần', () => {
    const minutes = dayMinutes(
      [
        { startsAt: '2026-11-17T08:30:00+07:00', endsAt: '2026-11-17T10:30:00+07:00' },
        { startsAt: '2026-11-17T14:00:00+07:00', endsAt: '2026-11-17T17:00:00+07:00' },
        { startsAt: '2026-11-17T09:00:00+07:00', endsAt: '2026-11-17T10:00:00+07:00' },
      ],
      '2026-11-17',
    )
    assert.equal(minutes, 300)
  })

  test('việc qua đêm chỉ tính phần nằm trong ngày', () => {
    const spanning = [{ startsAt: '2026-10-22T16:00:00+07:00', endsAt: '2026-10-23T17:00:00+07:00' }]
    assert.equal(dayMinutes(spanning, '2026-10-22'), 8 * 60)
    assert.equal(dayMinutes(spanning, '2026-10-23'), 17 * 60)
    assert.equal(dayMinutes(spanning, '2026-10-24'), 0)
  })
})
