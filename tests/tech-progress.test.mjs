// Cột "Tình hình" của Việc của tôi: tiến độ khảo sát tách khỏi cách nhận việc. Chạy: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { technicianProgressMeta } from '../src/features/scheduling/schedulingDisplay.ts'

const at = (iso) => new Date(iso).getTime()
const job = (status, over = {}) => ({
  status,
  startsAt: '2026-11-15T08:00:00+07:00',
  endsAt: '2026-11-15T09:30:00+07:00',
  isOverdue: false,
  ...over,
})

describe('Tiến độ khảo sát của kỹ thuật viên', () => {
  test('đã khảo sát / đã huỷ là xám, bất kể giờ', () => {
    assert.deepEqual(technicianProgressMeta(job('COMPLETED'), at('2026-11-01T00:00:00+07:00')), {
      label: 'Đã khảo sát',
      tone: 'neutral',
    })
    assert.equal(technicianProgressMeta(job('CANCELLED')).tone, 'neutral')
  })

  test('quá giờ chưa khảo sát (cờ của backend) là đỏ, kể cả khi trạng thái vẫn là đã nhận', () => {
    const meta = technicianProgressMeta(job('ACCEPTED', { isOverdue: true }), at('2026-11-16T08:00:00+07:00'))
    assert.deepEqual(meta, { label: 'Quá giờ, chưa khảo sát', tone: 'danger' })
  })

  test('chưa tới giờ là sắp tới (xanh lá), trong khung giờ là đang trong giờ hẹn (xanh dương)', () => {
    assert.deepEqual(technicianProgressMeta(job('ASSIGNED'), at('2026-11-15T07:00:00+07:00')), {
      label: 'Sắp tới',
      tone: 'ok',
    })
    assert.deepEqual(technicianProgressMeta(job('ACCEPTED'), at('2026-11-15T08:30:00+07:00')), {
      label: 'Đang trong giờ hẹn',
      tone: 'info',
    })
  })

  test('đã qua giờ mà backend chưa đánh dấu quá hạn thì rơi về nhãn trạng thái lịch, không bịa tiến độ', () => {
    const meta = technicianProgressMeta(job('ACCEPTED'), at('2026-11-15T10:00:00+07:00'))
    assert.equal(meta.label, 'Bạn đã nhận')
  })
})
