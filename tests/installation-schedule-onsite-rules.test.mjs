import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  availabilityRangeErrors,
  canPlanForContract,
  isSchedulableContract,
  plannedWaitReason,
  slotToForm,
  vnDateTime,
} from '../src/features/installation-schedules/scheduleRules.ts'

test('khoảng ngày xem khung trống: tối đa 31 ngày, số ngày thi công 1–60', () => {
  assert.deepEqual(availabilityRangeErrors('2026-12-01', '2026-12-31', 1), {})
  assert.ok(availabilityRangeErrors('2026-12-01', '2027-01-01', 1).range)
  assert.ok(availabilityRangeErrors('2026-12-05', '2026-12-01', 1).range)
  assert.ok(availabilityRangeErrors('', '2026-12-01', 1).range)
  assert.ok(availabilityRangeErrors('2026-12-01', '2026-12-02', 0).duration)
  assert.ok(availabilityRangeErrors('2026-12-01', '2026-12-02', 61).duration)
  assert.ok(availabilityRangeErrors('2026-12-01', '2026-12-02', 1.5).duration)
})

test('khung trống chọn được đổ vào ô ngày giờ theo giờ Việt Nam, bất kể múi giờ của chuỗi', () => {
  assert.deepEqual(slotToForm({ startsAt: '2026-11-25T08:00:00+07:00', endsAt: '2026-11-26T17:00:00+07:00' }), {
    date: '2026-11-25',
    startTime: '08:00',
    endDate: '2026-11-26',
    endTime: '17:00',
  })
  // 23:30 UTC là 06:30 sáng hôm sau ở Việt Nam
  assert.deepEqual(vnDateTime('2026-11-24T23:30:00Z'), { date: '2026-11-25', time: '06:30' })
})

test('hẹn ngày: hợp đồng cũ khi đã ký / đã trả; hợp đồng trả trước ở mọi trạng thái còn hiệu lực', () => {
  assert.equal(canPlanForContract('SIGNED'), true)
  assert.equal(canPlanForContract('PAID'), true)
  assert.equal(canPlanForContract('DRAFT'), false)
  assert.equal(canPlanForContract('AWAITING_SIGNATURE'), false)
  for (const status of ['DRAFT', 'ISSUED', 'AWAITING_SIGNATURE', 'UNDER_REVIEW', 'SIGNATURE_REJECTED'])
    assert.equal(canPlanForContract(status, true), true, status)
  assert.equal(canPlanForContract('SUPERSEDED', true), false)
  assert.equal(canPlanForContract('DISCARDED', true), false)
})

test('lịch dự kiến không bao giờ là đã xác nhận: chờ ký (đã trả) khác chờ thanh toán (hợp đồng cũ)', () => {
  const s = (status, extra = {}) => ({ status, awaitingPayment: false, awaitingContractSignature: false, ...extra })
  assert.equal(plannedWaitReason(s('PLANNED', { awaitingContractSignature: true })), 'signature')
  assert.equal(plannedWaitReason(s('PLANNED', { awaitingPayment: true })), 'payment')
  assert.equal(plannedWaitReason(s('PLANNED')), 'confirming')
  assert.equal(plannedWaitReason(s('CONFIRMED', { awaitingPayment: true })), null)
  assert.equal(plannedWaitReason(s('RESCHEDULE_REQUIRED')), null)
})

test('hợp đồng 30/70 hẹn ngày được từ khi nhận 30% (chưa cần ký giấy, không cần trả đủ); bản nháp, đã huỷ thì không', () => {
  const plan = { plan: 'DEPOSIT_30_BALANCE_70' }
  assert.equal(isSchedulableContract({ status: 'DRAFT', paymentPlan: plan }), false)
  assert.equal(isSchedulableContract({ status: 'DISCARDED', paymentPlan: plan }), false)
  assert.equal(isSchedulableContract({ status: 'AWAITING_SIGNATURE', paymentPlan: plan }), true)
  assert.equal(isSchedulableContract({ status: 'SIGNED', paymentPlan: plan }), true)
  assert.equal(isSchedulableContract({ status: 'PAID', paymentPlan: plan }), true)
  // Không dùng cờ trả trước của luồng cũ cho hợp đồng 30/70: DRAFT có paymentCompleted vẫn chưa hẹn được
  assert.equal(isSchedulableContract({ status: 'DRAFT', paymentCompleted: true, paymentPlan: plan }), false)
})

test('hợp đồng cũ giữ luật cũ: đã ký / đã trả, hoặc trả trước ở trạng thái còn hiệu lực', () => {
  assert.equal(isSchedulableContract({ status: 'SIGNED', paymentPlan: null }), true)
  assert.equal(isSchedulableContract({ status: 'AWAITING_SIGNATURE', paymentPlan: null }), false)
  assert.equal(isSchedulableContract({ status: 'AWAITING_SIGNATURE', paymentCompleted: true, paymentPlan: null }), true)
  assert.equal(isSchedulableContract({ status: 'SUPERSEDED', paymentCompleted: true, paymentPlan: null }), false)
})
