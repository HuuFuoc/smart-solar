// E2E đổi giờ khảo sát của kinh doanh trên giao diện thật (Vite dev + Chromium), backend là bản giả trong mock-ops-api.mjs
// (page.route). Test với API giả: chứng minh hộp đổi giờ gửi đúng request, KHÔNG chứng minh backend thật chạy.
// Hộp này dùng chung với quản lý / quản trị (RescheduleForm), chỉ khác API gọi.
// Chạy: node --test tests/e2e/survey-reschedule.e2e.mjs
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { createOpsState, installOpsMockApi, SR } from './mock-ops-api.mjs'

let server
let browser
let baseUrl

/** Ngày theo giờ Việt Nam, cách hôm nay `days` ngày (âm là đã qua) */
const vnDay = (days) => new Date(Date.now() + 7 * 3600_000 + days * 86_400_000).toISOString().slice(0, 10)

/** Yêu cầu đã hẹn, kỹ thuật viên đã nhận lịch 09:00 - 10:30 của ngày cách hôm nay `days` ngày */
function withAppointment(days) {
  const state = createOpsState()
  state.survey = {
    ...state.survey,
    status: 'SCHEDULED',
    appointment: {
      appointmentId: 'appt-1',
      startsAt: `${vnDay(days)}T09:00:00+07:00`,
      endsAt: `${vnDay(days)}T10:30:00+07:00`,
      status: 'ACCEPTED',
      capacityHolderUserId: 'tech-1',
      capacityHolderName: 'Kỹ thuật viên A',
      assignedTechnicianUserId: 'tech-1',
      assignedTechnicianName: 'Kỹ thuật viên A',
      assignmentSource: 'SELF_ACCEPTED',
      assignmentReason: null,
      customerNote: null,
      bookedAt: '2026-11-01T02:00:00Z',
      acceptanceDeadlineAt: null,
      escalatedAt: null,
      acceptedAt: '2026-11-01T03:00:00Z',
      assignedAt: null,
      completedAt: null,
      operationalZoneId: 'zone-1',
      revision: 2,
    },
  }
  return state
}

before(async () => {
  // Không theo dõi file: phiên khác sửa code trong lúc chạy thì trang không bị nạp lại giữa chừng
  server = await createServer({
    server: { host: '127.0.0.1', port: 3175, strictPort: false, hmr: false, watch: null },
    logLevel: 'error',
  })
  await server.listen()
  baseUrl = server.resolvedUrls.local[0].replace(/\/$/, '')
  browser = await chromium.launch({ channel: 'chromium' })
  // Lần mở đầu Vite biên dịch mọi module: làm nóng trước khi chạy test
  const warm = await open(withAppointment(3), `/ops/surveys/${SR}`)
  await warm.getByRole('heading', { name: 'Nhà phố Bến Thành' }).waitFor({ timeout: 120_000 })
  await warm.context().close()
})

after(async () => {
  await browser?.close()
  await server?.close()
})

/** Trang đã đăng nhập (refresh token giả trong localStorage, /auth/refresh trả JWT theo vai trò của state) */
async function open(state, path) {
  const context = await browser.newContext({ locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' })
  await context.addInitScript(() => {
    localStorage.setItem('smart-solar.refresh-token', 'refresh-1')
    localStorage.setItem('smart-solar.refresh-store', 'local')
  })
  const page = await context.newPage()
  page.setDefaultTimeout(15_000)
  await installOpsMockApi(page, state)
  await page.goto(`${baseUrl}${path}`)
  return page
}

const reschedules = (state) =>
  state.requests.filter((r) => r.method === 'PUT' && r.path === `/survey-requests/${SR}/reschedule`)

describe('đổi giờ khảo sát (kinh doanh)', () => {
  test('lịch sắp tới: chưa đổi giờ thì khoá nút; đổi giờ gửi giờ mới +07:00, lý do bỏ trống là null', async () => {
    const state = withAppointment(3)
    const page = await open(state, `/ops/surveys/${SR}`)
    await page.getByRole('button', { name: 'Đổi giờ', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Đổi giờ khảo sát' })
    await dialog.getByText('Giờ mới giống giờ hiện tại.').waitFor()
    assert.ok(await dialog.getByRole('button', { name: 'Đổi lịch' }).isDisabled())

    await dialog.getByLabel('Giờ bắt đầu').selectOption('10:30')
    await dialog.getByRole('button', { name: 'Đổi lịch' }).click()
    await page.getByText(/Đã đổi lịch sang/).waitFor()
    const sent = reschedules(state)
    assert.equal(sent.length, 1)
    assert.deepEqual(sent[0].body, { startsAt: `${vnDay(3)}T10:30:00+07:00`, reason: null })
    await page.context().close()
  })

  test('lịch đã qua giờ: thiếu lý do thì không gửi; có lý do thì gửi kèm lý do, mở sẵn hôm nay', async () => {
    const state = withAppointment(-1)
    const page = await open(state, `/ops/surveys/${SR}`)
    await page.getByRole('button', { name: 'Đổi giờ', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Đổi giờ khảo sát' })
    await dialog.getByText(/Lịch đã qua giờ mà chưa khảo sát/).waitFor()

    await dialog.getByRole('button', { name: 'Đổi lịch' }).click()
    await dialog.getByText('Lịch đã qua giờ: ghi lý do đổi giờ.').waitFor()
    assert.equal(reschedules(state).length, 0)

    await dialog.getByLabel(/Lý do đổi giờ/).fill('Khách hẹn lại qua điện thoại')
    await dialog.getByRole('button', { name: 'Đổi lịch' }).click()
    await page.getByText(/Đã đổi lịch sang/).waitFor()
    const sent = reschedules(state)
    assert.equal(sent.length, 1)
    assert.deepEqual(sent[0].body, { startsAt: `${vnDay(0)}T09:00:00+07:00`, reason: 'Khách hẹn lại qua điện thoại' })
    await page.context().close()
  })
})
