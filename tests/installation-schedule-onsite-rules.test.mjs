import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  availabilityRangeErrors,
  customerOfferChoices,
  offerSlotsProblem,
} from '../src/features/installation-schedules/scheduleRules.ts'

const slot = (d, s = '08:00', e = '17:00') => ({ startsAt: `${d}T${s}:00+07:00`, endsAt: `${d}T${e}:00+07:00` })

test('khoảng ngày xem khung trống: tối đa 31 ngày, số ngày thi công 1–60', () => {
  assert.deepEqual(availabilityRangeErrors('2026-12-01', '2026-12-31', 1), {})
  assert.ok(availabilityRangeErrors('2026-12-01', '2027-01-01', 1).range)
  assert.ok(availabilityRangeErrors('2026-12-05', '2026-12-01', 1).range)
  assert.ok(availabilityRangeErrors('', '2026-12-01', 1).range)
  assert.ok(availabilityRangeErrors('2026-12-01', '2026-12-02', 0).duration)
  assert.ok(availabilityRangeErrors('2026-12-01', '2026-12-02', 61).duration)
  assert.ok(availabilityRangeErrors('2026-12-01', '2026-12-02', 1.5).duration)
})

test('khung gửi khách: 1–5 khung khác nhau', () => {
  assert.equal(offerSlotsProblem([slot('2026-12-01')]), null)
  assert.ok(offerSlotsProblem([]))
  assert.ok(offerSlotsProblem(['01', '02', '03', '04', '05', '06'].map((d) => slot(`2026-12-${d}`))))
  assert.ok(offerSlotsProblem([slot('2026-12-01'), slot('2026-12-01')]))
  assert.ok(offerSlotsProblem([slot('2026-12-01')], 'x'.repeat(501)))
})

test('khách chỉ thấy khung đang mở, sớm nhất trước; khung hết chỗ không chọn được', () => {
  const offers = [
    { ...slot('2026-12-03'), status: 'OPEN', available: false, offerId: 'c' },
    { ...slot('2026-12-01'), status: 'WITHDRAWN', available: false, offerId: 'a' },
    { ...slot('2026-12-02'), status: 'OPEN', available: true, offerId: 'b' },
  ]
  const choices = customerOfferChoices(offers)
  assert.deepEqual(
    choices.map((c) => [c.offer.offerId, c.choosable]),
    [
      ['b', true],
      ['c', false],
    ],
  )
})
