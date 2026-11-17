// Luật của luồng thương mại rút gọn (backend `main` ad10455): đặt khảo sát trực tiếp (DirectSurveyBookingHandler), thanh toán
// PayOS / tiền mặt phía khách (PaymentService), lịch thi công kỹ thuật viên hẹn với khách (InstallationScheduleHandlers), trợ lý
// cấu hình (SolarAdvisorRequest.Problem). Chạy: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { directBookingBody, directBookingErrors, isPhone } from '../src/features/scheduling/directBooking.ts'
import {
  awaitingCash,
  canCancelPayment,
  canCreatePayment,
  canSelectCash,
  isCashAttempt,
  paymentPollMs,
  secondsLeft,
} from '../src/features/contracts/customerContractRules.ts'
import {
  canCancelSchedule,
  canPlanForContract,
  canRequestChange,
  canRetryConfirm,
  changeNoteError,
  isLiveSchedule,
  isStaleScheduleError,
  liveSchedule,
  projectLocksSchedule,
  scheduleBody,
  scheduleFormErrors,
  vnIso,
} from '../src/features/installation-schedules/scheduleRules.ts'
import { advisorBody, advisorFormErrors, hasAdvisorInput, EMPTY_ADVISOR } from '../src/features/chat/advisorRules.ts'

describe('đặt khảo sát trực tiếp', () => {
  test('số điện thoại như backend: 8–15 chữ số, cho phép +, dấu cách, chấm, gạch', () => {
    for (const phone of ['0900000000', '+84 90 123 4567', '028.3822.1234', '090-123-4567'])
      assert.equal(isPhone(phone), true, phone)
    for (const phone of ['12345', 'abc0900000000', '+84 (90) 123', '1234567890123456'])
      assert.equal(isPhone(phone), false, phone)
  })

  test('liên hệ và ghi chú không bắt buộc; quá dài hoặc số sai thì báo', () => {
    assert.deepEqual(directBookingErrors({ contactName: '', contactPhone: '', note: '' }), {})
    const errors = directBookingErrors({ contactName: 'x'.repeat(201), contactPhone: '123', note: 'x'.repeat(1001) })
    assert.deepEqual(Object.keys(errors).sort(), ['contactName', 'contactPhone', 'note'])
  })

  test('body gửi đúng giờ trống backend trả; ô trống thành null (backend dùng tên, số điện thoại của tài khoản)', () => {
    assert.deepEqual(
      directBookingBody('site-1', '2026-11-25T08:00:00+07:00', {
        contactName: ' Chị Lan ',
        contactPhone: '',
        note: ' ',
      }),
      {
        propertySiteId: 'site-1',
        startsAt: '2026-11-25T08:00:00+07:00',
        contactName: 'Chị Lan',
        contactPhone: null,
        note: null,
      },
    )
  })
})

describe('thanh toán PayOS / tiền mặt phía khách', () => {
  const attempt = (extra = {}) => ({
    method: 'ONLINE',
    status: 'PENDING',
    amount: 32_400_000,
    expiresAt: '2026-11-17T03:15:00Z',
    ...extra,
  })
  const view = (extra = {}) => ({ contractStatus: 'SIGNED', amount: 32_400_000, current: null, attempts: [], ...extra })

  test('chọn cách thanh toán khi chờ thanh toán; hai cách loại trừ nhau', () => {
    assert.equal(canCreatePayment(view({ paymentState: 'AWAITING_PAYMENT' })), true)
    assert.equal(canSelectCash(view({ paymentState: 'AWAITING_PAYMENT' })), true)
    for (const paymentState of ['ONLINE_IN_PROGRESS', 'AWAITING_CASH_CONFIRMATION', 'PAID', 'NOT_PAYABLE']) {
      assert.equal(canCreatePayment(view({ paymentState })), false, paymentState)
      assert.equal(canSelectCash(view({ paymentState })), false, paymentState)
    }
    assert.equal(canCreatePayment(view({ contractStatus: 'UNDER_REVIEW', paymentState: 'NOT_PAYABLE' })), false)
  })

  test('chọn tiền mặt chưa phải đã trả: chờ xác nhận, hỏi lại thưa hơn, bỏ chọn được', () => {
    const cash = view({
      paymentState: 'AWAITING_CASH_CONFIRMATION',
      current: attempt({ method: 'CASH', expiresAt: null }),
    })
    assert.equal(awaitingCash(cash), true)
    assert.equal(isCashAttempt(cash.current), true)
    assert.equal(canCancelPayment(cash), true)
    assert.equal(paymentPollMs(cash), 60_000)
    assert.equal(secondsLeft(null, Date.now()), null, 'tiền mặt không có hạn')
  })

  test('link PayOS còn chờ hỏi lại mỗi 5 giây; đã trả thì thôi hỏi', () => {
    assert.equal(paymentPollMs(view({ paymentState: 'ONLINE_IN_PROGRESS', current: attempt() })), 5_000)
    assert.equal(
      paymentPollMs(view({ contractStatus: 'PAID', paymentState: 'PAID', current: attempt({ status: 'PAID' }) })),
      false,
    )
    assert.equal(paymentPollMs(view({ paymentState: 'AWAITING_PAYMENT' })), false)
  })
})

describe('lịch thi công đã thống nhất với khách', () => {
  const schedule = (status, extra = {}) => ({
    status,
    revision: 4,
    projectStatus: null,
    contractStatus: 'SIGNED',
    ...extra,
  })
  const now = Date.parse('2026-11-17T10:00:00+07:00')
  const form = {
    date: '2026-11-29',
    startTime: '08:00',
    endDate: '2026-11-29',
    endTime: '17:00',
    agreementNote: ' Khách đồng ý qua điện thoại 17/11 ',
    reason: '',
  }

  test('lịch đang hiệu lực: dự kiến, đã xác nhận, phải hẹn lại; lịch sử mới nhất trước', () => {
    assert.equal(isLiveSchedule(schedule('PLANNED')), true)
    assert.equal(isLiveSchedule(schedule('CONFIRMED')), true)
    assert.equal(isLiveSchedule(schedule('RESCHEDULE_REQUIRED')), true)
    assert.equal(isLiveSchedule(schedule('CANCELLED')), false)
    const history = [schedule('PLANNED', { scheduleId: 'b' }), schedule('CANCELLED', { scheduleId: 'a' })]
    assert.equal(liveSchedule(history).scheduleId, 'b')
    assert.equal(liveSchedule([schedule('CANCELLED')]), null)
  })

  test('hẹn ngày chỉ khi hợp đồng đã ký / đã thanh toán; dự án đã thi công thì khoá', () => {
    assert.equal(canPlanForContract('SIGNED'), true)
    assert.equal(canPlanForContract('PAID'), true)
    for (const status of ['DRAFT', 'AWAITING_SIGNATURE', 'UNDER_REVIEW'])
      assert.equal(canPlanForContract(status), false, status)
    assert.equal(projectLocksSchedule('IN_PROGRESS'), true)
    assert.equal(projectLocksSchedule('SCHEDULED'), false)
    assert.equal(projectLocksSchedule(null), false)
  })

  test('huỷ ở đây chỉ lịch dự kiến / phải hẹn lại; lịch đã xác nhận làm trên dự án thi công', () => {
    assert.equal(canCancelSchedule(schedule('PLANNED')), true)
    assert.equal(canCancelSchedule(schedule('RESCHEDULE_REQUIRED')), true)
    assert.equal(canCancelSchedule(schedule('CONFIRMED')), false)
    assert.equal(canCancelSchedule(schedule('CANCELLED')), false)
  })

  test('khách xin đổi ngày khi lịch còn hiệu lực và chưa thi công', () => {
    assert.equal(canRequestChange(schedule('PLANNED')), true)
    assert.equal(canRequestChange(schedule('CONFIRMED', { projectStatus: 'SCHEDULED' })), true)
    assert.equal(canRequestChange(schedule('CONFIRMED', { projectStatus: 'IN_PROGRESS' })), false)
    assert.equal(canRequestChange(schedule('CANCELLED')), false)
    assert.ok(changeNoteError('  '))
    assert.ok(changeNoteError('x'.repeat(501)))
    assert.equal(changeNoteError('Tuần sau tôi bận, xin chuyển sang 5/12'), null)
  })

  test('xác nhận lại chỉ lịch dự kiến của hợp đồng đã thanh toán; PLANNED không bao giờ coi là đã xác nhận', () => {
    assert.equal(canRetryConfirm(schedule('PLANNED', { contractStatus: 'PAID' })), true)
    assert.equal(canRetryConfirm(schedule('PLANNED', { contractStatus: 'SIGNED' })), false)
    assert.equal(canRetryConfirm(schedule('CONFIRMED', { contractStatus: 'PAID' })), false)
  })

  test('form: giờ bắt đầu ở tương lai, trước giờ kết thúc; ghi chú khách đồng ý bắt buộc; đổi lịch bắt buộc lý do', () => {
    assert.deepEqual(scheduleFormErrors(form, false, now), {})
    assert.ok(scheduleFormErrors(form, true, now).reason, 'đổi lịch đang có thì phải ghi lý do')
    assert.ok(scheduleFormErrors({ ...form, date: '2026-11-16', endDate: '2026-11-16' }, false, now).date)
    assert.ok(scheduleFormErrors({ ...form, endTime: '07:00' }, false, now).endDate)
    assert.ok(scheduleFormErrors({ ...form, agreementNote: ' ' }, false, now).agreementNote)
    assert.ok(scheduleFormErrors({ ...form, agreementNote: 'x'.repeat(501) }, false, now).agreementNote)
  })

  test('body: giờ Việt Nam; đổi lịch gửi lý do + revision của lịch đó; ghi lần đầu thì null', () => {
    assert.equal(vnIso('2026-11-29', '08:00'), '2026-11-29T08:00:00+07:00')
    assert.deepEqual(scheduleBody(form, null), {
      startsAt: '2026-11-29T08:00:00+07:00',
      endsAt: '2026-11-29T17:00:00+07:00',
      customerAgreementNote: 'Khách đồng ý qua điện thoại 17/11',
      reason: null,
      expectedRevision: null,
    })
    const change = scheduleBody({ ...form, reason: ' Khách bận ' }, schedule('PLANNED'), 'tech-2')
    assert.equal(change.reason, 'Khách bận')
    assert.equal(change.expectedRevision, 4)
    assert.equal(change.technicianUserId, 'tech-2')
    assert.equal(isStaleScheduleError('INSTALLATION_SCHEDULE_STALE_REVISION'), true)
    assert.equal(isStaleScheduleError('INSTALLATION_SCHEDULE_INVALID'), false)
  })
})

describe('trợ lý cấu hình', () => {
  test('không nhập gì thì không gửi `advisor`', () => {
    assert.equal(hasAdvisorInput(EMPTY_ADVISOR), false)
    assert.equal(advisorBody(EMPTY_ADVISOR), null)
  })

  test('đọc số kiểu Việt Nam; khoảng giá trị như backend', () => {
    const body = advisorBody({ roofArea: '50,5', budget: '50.000.000', monthlyKwh: '600', wantsBattery: false })
    assert.deepEqual(body, { roofAreaM2: 50.5, budgetVnd: 50_000_000, monthlyConsumptionKwh: 600, wantsBattery: null })
    assert.deepEqual(
      advisorFormErrors({ roofArea: '50', budget: '50.000.000', monthlyKwh: '600', wantsBattery: true }),
      {},
    )
    const errors = advisorFormErrors({ roofArea: '0', budget: '500.000', monthlyKwh: 'abc', wantsBattery: false })
    assert.deepEqual(Object.keys(errors).sort(), ['budget', 'monthlyKwh', 'roofArea'])
    assert.equal(advisorBody({ ...EMPTY_ADVISOR, wantsBattery: true }).wantsBattery, true)
  })
})
