// Thứ tự chung của danh sách lịch hẹn / việc: ngày mới nhất lên đầu, trong ngày giờ bắt đầu sớm trước. Chạy: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { byStartsAt, compareSchedule, groupByDay } from '../src/features/scheduling/scheduleOrder.ts'

const job = (id, startsAt) => ({ id, startsAt })

describe('Thứ tự lịch hẹn', () => {
  test('nhóm ngày giảm dần, trong ngày giờ tăng dần, không phụ thuộc thứ tự đầu vào', () => {
    const rows = [
      job('22/10 sáng', '2026-10-22T08:00:00+07:00'),
      job('15/11 chiều', '2026-11-15T14:00:00+07:00'),
      job('24/10', '2026-10-24T09:30:00+07:00'),
      job('15/11 sáng', '2026-11-15T08:00:00+07:00'),
      job('12/11', '2026-11-12T10:00:00+07:00'),
      job('22/10 chiều', '2026-10-22T15:00:00+07:00'),
    ]
    const groups = groupByDay(rows)
    assert.deepEqual(
      groups.map(([day]) => day),
      ['2026-11-15', '2026-11-12', '2026-10-24', '2026-10-22'],
    )
    assert.deepEqual(
      groups[0][1].map((r) => r.id),
      ['15/11 sáng', '15/11 chiều'],
    )
    assert.deepEqual(
      groups[3][1].map((r) => r.id),
      ['22/10 sáng', '22/10 chiều'],
    )
    assert.deepEqual(groupByDay([...rows].reverse()), groups)
  })

  test('ngày tính theo giờ Việt Nam và so thời điểm thật khi lẫn "Z" với "+07:00"', () => {
    // 2026-11-14T18:30Z là 01:30 ngày 15/11 giờ Việt Nam
    const rows = [job('15/11 09:00', '2026-11-15T09:00:00+07:00'), job('15/11 01:30', '2026-11-14T18:30:00Z')]
    const groups = groupByDay(rows)
    assert.equal(groups.length, 1)
    assert.equal(groups[0][0], '2026-11-15')
    assert.deepEqual(
      groups[0][1].map((r) => r.id),
      ['15/11 01:30', '15/11 09:00'],
    )
  })

  test('danh sách không nhóm dùng cùng thứ tự', () => {
    const sorted = [
      job('a', '2026-11-12T10:00:00+07:00'),
      job('b', '2026-11-15T14:00:00+07:00'),
      job('c', '2026-11-15T08:00:00+07:00'),
    ].sort(byStartsAt)
    assert.deepEqual(
      sorted.map((r) => r.id),
      ['c', 'b', 'a'],
    )
  })

  test('thiếu giờ hoặc giờ hỏng thì xuống cuối, hai bên cùng thiếu là bằng nhau', () => {
    assert.ok(compareSchedule(null, '2026-11-15T08:00:00+07:00') > 0)
    assert.ok(compareSchedule('2026-11-15T08:00:00+07:00', undefined) < 0)
    assert.ok(compareSchedule('không phải giờ', '2026-10-01T08:00:00+07:00') > 0)
    assert.equal(compareSchedule(null, undefined), 0)
  })
})
