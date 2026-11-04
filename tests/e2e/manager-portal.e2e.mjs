// E2E cổng quản lý (dùng chung trang với quản trị) trên giao diện thật (Vite dev + Chromium), backend là bản giả trong
// mock-manager-api.mjs (page.route). Đây là test với API giả: chứng minh luồng giao diện và request gửi đi đúng hợp đồng,
// KHÔNG chứng minh backend thật chạy. Chạy: node --test tests/e2e/manager-portal.e2e.mjs
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { createManagerState, handleManager, installManagerMockApi } from './mock-manager-api.mjs'

let server
let browser
let baseUrl

const MANAGER = { role: 'MANAGER', userId: 'm1' }
const ADMIN = { role: 'ADMIN', userId: 'admin-1' }
const SALES = { role: 'SALES', userId: 's1' }

before(async () => {
  // Không theo dõi file: phiên khác sửa code trong lúc chạy thì trang không bị nạp lại giữa chừng
  server = await createServer({ server: { port: 3175, strictPort: false, hmr: false, watch: null }, logLevel: 'error' })
  await server.listen()
  baseUrl = server.resolvedUrls.local[0].replace(/\/$/, '')
  browser = await chromium.launch({ channel: 'chromium' })
  // Lần mở đầu Vite biên dịch mọi module (chậm hơn thời gian chờ của từng bước): làm nóng trước
  const warm = await open(createManagerState(), MANAGER, '/manage/after-sales/r-fault')
  await warm.getByRole('heading', { name: /SR-1001/ }).waitFor({ timeout: 120_000 })
  const warmTasks = await open(createManagerState(), ADMIN, '/admin/sales-tasks')
  await warmTasks.getByRole('heading', { name: 'Việc của kinh doanh' }).waitFor({ timeout: 120_000 })
  await warm.context().close()
  await warmTasks.context().close()
})

after(async () => {
  await browser?.close()
  await server?.close()
})

/** Trang đã đăng nhập theo `who` (refresh token giả trong localStorage, /auth/refresh trả JWT đúng vai trò) */
async function open(state, who, path) {
  const context = await browser.newContext({ locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' })
  await context.addInitScript(() => {
    localStorage.setItem('smart-solar.refresh-token', 'refresh-1')
    localStorage.setItem('smart-solar.refresh-store', 'local')
  })
  const page = await context.newPage()
  page.setDefaultTimeout(15_000)
  await installManagerMockApi(page, state, who)
  await page.goto(`${baseUrl}${path}`)
  return page
}

const sent = (state, method, path) => state.requests.filter((r) => r.method === method && r.path === path)
const lastSent = (state, method, path) => sent(state, method, path).at(-1)
const waitFor = async (check, label) => {
  for (let i = 0; i < 100; i++) {
    if (await check()) return
    await new Promise((r) => setTimeout(r, 100))
  }
  assert.fail(`hết giờ chờ: ${label}`)
}
const req = (state, id) => state.serviceRequests.find((r) => r.requestId === id)

describe('A1. hỗ trợ của gói thiên tai', () => {
  test('từ chối thiếu lý do bị chặn; từ chối rồi khách xin xét lại, duyệt lần hai; hạng mục mở "gói thiên tai"', async () => {
    const state = createManagerState()
    const page = await open(state, MANAGER, '/manage/after-sales/r-fault')
    await page.getByText('Xét hỗ trợ của gói thiên tai', { exact: true }).waitFor()
    const coverage = page.locator('#coverage-it-1 option[value="DISASTER_PROTECTION"]')
    assert.equal(await coverage.isDisabled(), true)

    const panel = page.locator('#claim')
    await panel.getByText('70 %').waitFor()
    await panel.getByRole('button', { name: 'Từ chối' }).click()
    await panel.getByText('Ghi lý do từ chối để khách biết.').waitFor()
    assert.equal(sent(state, 'POST', '/manager/after-sales/requests/r-fault/claim-decision').length, 0)

    await page.locator('#claim-reason').fill('Ảnh chưa cho thấy hư hại do bão')
    await panel.getByRole('button', { name: 'Từ chối' }).click()
    await waitFor(() => lastSent(state, 'POST', '/manager/after-sales/requests/r-fault/claim-decision'), 'từ chối')
    assert.deepEqual(lastSent(state, 'POST', '/manager/after-sales/requests/r-fault/claim-decision').body, {
      approve: false,
      reason: 'Ảnh chưa cho thấy hư hại do bão',
    })
    await panel.getByText('Đã từ chối').waitFor()
    await panel.getByText('Khách còn được xin xét lại một lần.').waitFor()
    assert.equal(await panel.getByRole('button', { name: 'Duyệt hỗ trợ' }).count(), 0)

    // Khách xin xét lại ở cổng của mình (luồng của cổng khách hàng), quản lý tải lại trang
    Object.assign(req(state, 'r-fault').claim, {
      status: 'RECONSIDERATION_REQUESTED',
      reconsiderationRequestedAt: '2026-11-02T09:00:00+07:00',
      canRequestReconsideration: false,
    })
    await page.reload()
    await page.getByText('Khách xin xét lại hỗ trợ của gói thiên tai', { exact: true }).waitFor()
    await panel.getByText(/lần xét lại duy nhất/).waitFor()
    await panel.getByRole('button', { name: 'Duyệt hỗ trợ' }).click()
    await waitFor(() => req(state, 'r-fault').claim.status === 'APPROVED', 'duyệt')
    assert.deepEqual(lastSent(state, 'POST', '/manager/after-sales/requests/r-fault/claim-decision').body, {
      approve: true,
      reason: null,
    })
    await panel.getByText('Đã duyệt').waitFor()
    await waitFor(async () => !(await coverage.isDisabled()), 'mở lựa chọn gói thiên tai')
    await page.context().close()
  })

  test('quyết định khi người khác vừa quyết định: báo lỗi của backend (409), tải lại, không tự gửi lại', async () => {
    const state = createManagerState()
    const page = await open(state, ADMIN, '/admin/after-sales/r-fault')
    const panel = page.locator('#claim')
    await panel.getByRole('button', { name: 'Duyệt hỗ trợ' }).waitFor()
    req(state, 'r-fault').claim.status = 'APPROVED'
    await panel.getByRole('button', { name: 'Duyệt hỗ trợ' }).click()
    // Khối tải lại và ẩn form ngay, nên câu lỗi nằm ở toast
    await page.getByText('Hỗ trợ của gói thiên tai đã được quyết định. Đã tải lại để xem kết quả.').waitFor()
    await panel.getByText('Đã duyệt').waitFor()
    assert.equal(await panel.getByRole('button', { name: 'Duyệt hỗ trợ' }).count(), 0)
    assert.equal(sent(state, 'POST', '/manager/after-sales/requests/r-fault/claim-decision').length, 1)
    await page.context().close()
  })
})

describe('A2. đóng vì trùng', () => {
  test('chọn yêu cầu gốc thật cùng công trình, xem lại rồi đóng; hiện CLOSED_DUPLICATE và link gốc', async () => {
    const state = createManagerState()
    const page = await open(state, MANAGER, '/manage/after-sales/r-dup')
    await page.getByText(/còn 2 yêu cầu báo lỗi khác đang mở/).waitFor()
    await page.getByRole('button', { name: 'Đóng vì trùng' }).click()
    const dialog = page.getByRole('dialog', { name: 'Đóng vì trùng' })
    const options = await dialog.locator('#duplicate-original option').allTextContents()
    assert.ok(options.some((o) => o.startsWith('SR-1001')))
    assert.ok(!options.some((o) => o.startsWith('SR-2001')), 'không được chọn yêu cầu của công trình khác')
    assert.ok(!options.some((o) => o.startsWith('SR-1002')), 'không được chọn chính nó')

    await dialog.getByRole('button', { name: 'Đóng vì trùng' }).click()
    await dialog.getByText('Chọn yêu cầu gốc.').waitFor()
    assert.equal(sent(state, 'POST', '/manager/after-sales/requests/r-dup/duplicate').length, 0)

    await dialog.locator('#duplicate-original').selectOption('r-fault')
    await dialog.getByText('Bão làm bung khung, hai tấm pin nứt kính.').waitFor()
    await dialog.getByRole('button', { name: 'Đóng vì trùng' }).click()
    await waitFor(() => lastSent(state, 'POST', '/manager/after-sales/requests/r-dup/duplicate'), 'đóng trùng')
    assert.deepEqual(lastSent(state, 'POST', '/manager/after-sales/requests/r-dup/duplicate').body, {
      originalRequestId: 'r-fault',
      reason: null,
    })
    await page.getByText('Trùng yêu cầu khác').first().waitFor()
    const link = page.getByRole('link', { name: 'SR-1001' })
    await link.waitFor()
    assert.match(await link.getAttribute('href'), /\/manage\/after-sales\/r-fault$/)
    assert.equal(await page.getByRole('button', { name: 'Đóng vì trùng' }).count(), 0)
    await page.context().close()
  })

  test('yêu cầu đã có báo giá đã thanh toán: nút bị khoá kèm lý do', async () => {
    const state = createManagerState()
    const page = await open(state, MANAGER, '/manage/after-sales/r-started')
    await page.getByText('Khách đã thanh toán báo giá của yêu cầu này nên không đóng vì trùng được.').waitFor()
    assert.equal(await page.getByRole('button', { name: 'Đóng vì trùng' }).isDisabled(), true)
    await page.context().close()
  })
})

describe('A3. dừng việc đã bắt đầu', () => {
  test('việc chưa bắt đầu không có nút dừng (chuyển không hợp lệ bị chặn ở giao diện)', async () => {
    const state = createManagerState()
    const page = await open(state, MANAGER, '/manage/after-sales/r-dup')
    await page.getByText('Kết thúc yêu cầu').waitFor()
    assert.equal(await page.getByRole('button', { name: 'Dừng việc' }).count(), 0)
    await page.context().close()
  })

  test('hoàn vượt số đã trả bị chặn; dừng có hoàn tạo khoản "đã duyệt" chờ quản trị, không phải "đã hoàn"', async () => {
    const state = createManagerState()
    const page = await open(state, MANAGER, '/manage/after-sales/r-started')
    await page.getByRole('button', { name: 'Dừng việc' }).click()
    const dialog = page.getByRole('dialog', { name: 'Dừng việc' })
    await dialog.locator('#stop-refund').fill('1.500.000')
    await dialog.getByRole('button', { name: 'Dừng việc' }).click()
    await dialog.getByText(/Không vượt quá/).waitFor()
    await dialog.getByText('Ghi lý do dừng việc.').waitFor()
    assert.equal(sent(state, 'POST', '/manager/after-sales/requests/r-started/stop').length, 0)

    await dialog.locator('#stop-refund').fill('1.200.000')
    await dialog.locator('#stop-reason').fill('Khách đổi ý giữa chừng, không cho thi công tiếp')
    await dialog.getByText(/khoản hoàn 1\.200\.000/).waitFor()
    await dialog.getByRole('button', { name: 'Dừng việc' }).click()
    await waitFor(() => req(state, 'r-started').status === 'CANCELLED', 'dừng việc')
    assert.deepEqual(lastSent(state, 'POST', '/manager/after-sales/requests/r-started/stop').body, {
      reason: 'Khách đổi ý giữa chừng, không cho thi công tiếp',
      refundAmount: 1_200_000,
    })
    await page.getByText('Đã huỷ').first().waitFor()
    const created = state.refunds.find((r) => r.requestId === 'r-started')
    assert.equal(created.status, 'APPROVED')
    assert.equal(created.refundedAt, null)

    await page.goto(`${baseUrl}/manage/refunds?nhom=approved`)
    await page.getByText('Dừng việc: Khách đổi ý giữa chừng, không cho thi công tiếp').waitFor()
    await page.getByText('Đã duyệt, chờ ghi nhận').first().waitFor()
    // Quản lý không ghi nhận đã hoàn (lệnh của quản trị)
    assert.equal(await page.getByRole('button', { name: 'Ghi nhận đã hoàn' }).count(), 0)
    await page.context().close()
  })

  test('yêu cầu vừa đóng ở nơi khác: backend trả 409, giao diện báo lỗi và tải lại', async () => {
    const state = createManagerState()
    const page = await open(state, MANAGER, '/manage/after-sales/r-started')
    await page.getByRole('button', { name: 'Dừng việc' }).click()
    const dialog = page.getByRole('dialog', { name: 'Dừng việc' })
    await dialog.locator('#stop-refund').fill('0')
    await dialog.locator('#stop-reason').fill('Mưa bão kéo dài')
    req(state, 'r-started').status = 'COMPLETED'
    await dialog.getByRole('button', { name: 'Dừng việc' }).click()
    // Yêu cầu đã đóng nên khối "Kết thúc yêu cầu" biến mất: hộp thoại đóng, câu lỗi nằm ở toast
    await page.getByText('Yêu cầu đã đóng. Đã tải lại để xem trạng thái mới.').waitFor()
    await waitFor(async () => (await dialog.count()) === 0, 'đóng hộp thoại')
    await page.getByText('Hoàn thành').first().waitFor()
    assert.equal(sent(state, 'POST', '/manager/after-sales/requests/r-started/stop').length, 1)
    assert.equal(state.refunds.filter((r) => r.requestId === 'r-started').length, 0)
    await page.context().close()
  })
})

describe('A4. không thực hiện được', () => {
  test('chỉ bảo trì lẻ chưa làm; lý do bắt buộc; huỷ và duyệt hoàn 100 % số khách đã trả', async () => {
    const state = createManagerState()
    const fault = await open(state, MANAGER, '/manage/after-sales/r-fault')
    await fault.getByText('Kết thúc yêu cầu').waitFor()
    assert.equal(await fault.getByRole('button', { name: 'Không thực hiện được' }).count(), 0)
    await fault.context().close()

    const page = await open(state, ADMIN, '/admin/after-sales/r-otm')
    await page.getByRole('button', { name: 'Không thực hiện được' }).click()
    const dialog = page.getByRole('dialog', { name: 'Không thực hiện được SR-1004' })
    await dialog.getByText(/100 % số khách đã trả/).waitFor()
    await dialog.getByRole('button', { name: 'Xác nhận không thực hiện được' }).click()
    await dialog.getByText('Ghi lý do.').waitFor()
    assert.equal(sent(state, 'POST', '/manager/after-sales/requests/r-otm/not-fulfilled').length, 0)

    await dialog
      .locator('#reason-dialog-text')
      .fill('Không còn kỹ thuật viên trống trong tháng 11, khách không nhận giờ khác')
    await dialog.getByRole('button', { name: 'Xác nhận không thực hiện được' }).click()
    await waitFor(() => req(state, 'r-otm').status === 'CANCELLED', 'không thực hiện được')
    assert.deepEqual(lastSent(state, 'POST', '/manager/after-sales/requests/r-otm/not-fulfilled').body, {
      reason: 'Không còn kỹ thuật viên trống trong tháng 11, khách không nhận giờ khác',
    })
    const created = state.refunds.find((r) => r.requestId === 'r-otm')
    assert.deepEqual([created.status, created.approvedAmount, created.originalAmount], ['APPROVED', 500_000, 500_000])
    await page.context().close()
  })
})

describe('A5. sửa thông tin thiết bị', () => {
  test('thiếu lý do bị chặn; serial trùng bị backend từ chối; sửa đúng chỉ gửi ô đã đổi rồi tải lại', async () => {
    const state = createManagerState()
    const page = await open(state, MANAGER, '/manage/after-sales/r-fault')
    await page.getByText('Thiết bị của công trình').waitFor()
    await page.getByText('Liên quan yêu cầu này').waitFor()
    await page.getByRole('button', { name: 'Sửa', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Sửa thông tin thiết bị' })
    await dialog.locator('#asset-serialNumber').fill('JK-0002')
    await dialog.getByText('Đang lưu: JK-0001').waitFor()
    await dialog.getByRole('button', { name: 'Lưu thông tin' }).click()
    await dialog.getByText('Ghi lý do.').waitFor()
    assert.equal(sent(state, 'PUT', '/manager/after-sales/assets/a1').length, 0)

    await dialog.locator('#asset-reason').fill('Kỹ thuật viên ghi nhầm serial')
    await dialog.getByRole('button', { name: 'Lưu thông tin' }).click()
    await dialog.getByText('Đã có thiết bị khác cùng hãng và số serial này. Kiểm tra lại số serial.').waitFor()

    await dialog.locator('#asset-serialNumber').fill('JK-0099')
    await dialog.locator('#asset-positionCode').fill('')
    await dialog.getByRole('button', { name: 'Lưu thông tin' }).click()
    await waitFor(() => state.assets[0].serialNumber === 'JK-0099', 'sửa thiết bị')
    assert.deepEqual(lastSent(state, 'PUT', '/manager/after-sales/assets/a1').body, {
      manufacturer: null,
      model: null,
      serialNumber: 'JK-0099',
      positionCode: '',
      specifications: null,
      reason: 'Kỹ thuật viên ghi nhầm serial',
    })
    await page.getByText('JK-0099', { exact: true }).first().waitFor()
    assert.equal(state.assets[0].positionCode, null)
    await page.context().close()
  })
})

describe('C. hàng việc của kinh doanh', () => {
  test('quản trị giao việc → kinh doanh bắt đầu, ghi liên hệ → hàng việc thấy "Xong"', async () => {
    const state = createManagerState()
    const admin = await open(state, ADMIN, '/admin/sales-tasks')
    // Việc nhắc nghiệm thu chưa ai nhận
    const row = admin.locator('section li', { hasText: 'Nhắc khách nghiệm thu' })
    await row.waitFor()
    await row.getByRole('button', { name: 'Giao việc' }).click()
    const dialog = admin.getByRole('dialog', { name: 'Giao việc' })
    await dialog.getByRole('button', { name: 'Giao việc' }).click()
    await dialog.getByText('Chọn nhân viên kinh doanh.').waitFor()
    assert.equal(sent(state, 'POST', '/manager/after-sales/tasks/task-follow/assign').length, 0)
    await dialog.locator('#assign-sales').selectOption('s1')
    await dialog.getByRole('button', { name: 'Giao việc' }).click()
    await waitFor(() => lastSent(state, 'POST', '/manager/after-sales/tasks/task-follow/assign'), 'giao việc')
    assert.deepEqual(lastSent(state, 'POST', '/manager/after-sales/tasks/task-follow/assign').body, {
      salesUserId: 's1',
      reason: null,
    })
    await row.getByText('Kinh Doanh Một').waitFor()
    await row.getByText('Đã có người nhận').waitFor()

    const sales = await open(state, SALES, '/ops/after-sales')
    const mine = sales.locator('main li', { hasText: 'Nhắc khách nghiệm thu' })
    await mine.getByRole('button', { name: 'Bắt đầu' }).click()
    await waitFor(() => state.tasks.find((t) => t.taskId === 'task-follow').status === 'IN_PROGRESS', 'bắt đầu')
    await mine.getByRole('button', { name: 'Ghi liên hệ' }).click()
    const follow = sales.getByRole('dialog', { name: 'Ghi liên hệ khách' })
    await follow.getByLabel('Kết quả liên hệ').fill('Khách hẹn nghiệm thu trên app tối nay')
    await follow.getByLabel('Khách đã đặt lịch / đã trả lời').check()
    await follow.getByRole('button', { name: 'Lưu liên hệ' }).click()
    await waitFor(() => state.tasks.find((t) => t.taskId === 'task-follow').status === 'DONE', 'ghi liên hệ')
    await sales.context().close()

    await admin.reload()
    await admin.getByRole('tab', { name: /^Xong/ }).click()
    await waitFor(
      () => sent(state, 'GET', '/manager/after-sales/tasks').some((r) => r.query.status === 'DONE'),
      'lọc DONE',
    )
    await admin.locator('section li', { hasText: 'Nhắc khách nghiệm thu' }).getByText('Xong').waitFor()
    await admin.context().close()
  })

  test('giao lại việc đã có người giữ bắt buộc lý do; việc vừa xong thì backend từ chối (409)', async () => {
    const state = createManagerState()
    const page = await open(state, ADMIN, '/admin/sales-tasks')
    const row = page.locator('section li', { hasText: 'Nhắc khách đặt lịch bảo trì' })
    await row.getByText('Kinh Doanh Hai').waitFor()
    await row.getByRole('button', { name: 'Giao lại' }).click()
    const dialog = page.getByRole('dialog', { name: 'Giao việc' })
    await dialog.locator('#assign-sales').selectOption('s1')
    await dialog.getByRole('button', { name: 'Giao lại' }).click()
    await dialog.getByText('Giao lại việc đã có người giữ phải ghi lý do.').waitFor()
    assert.equal(sent(state, 'POST', '/manager/after-sales/tasks/task-held/assign').length, 0)

    await dialog.locator('#assign-reason').fill('Kinh Doanh Hai nghỉ phép')
    state.tasks.find((t) => t.taskId === 'task-held').status = 'DONE'
    await dialog.getByRole('button', { name: 'Giao lại' }).click()
    await page.getByText('Việc này đã xong hoặc đã huỷ. Đã tải lại danh sách.').waitFor()
    assert.equal(sent(state, 'POST', '/manager/after-sales/tasks/task-held/assign').length, 1)
    await page.context().close()
  })

  test('quản lý giao việc bằng danh sách kinh doanh của API quản lý, không gọi API tài khoản; lọc vẫn đúng', async () => {
    const state = createManagerState()
    const page = await open(state, MANAGER, '/manage/sales-tasks')
    const quotationRows = page.locator('section li', { hasText: 'Báo giá sửa chữa' })
    await quotationRows.first().waitFor()
    assert.equal(await page.getByText(/chỉ tài khoản quản trị đọc được/).count(), 0)
    const row = page.locator('section li', { hasText: 'Nhắc khách nghiệm thu' })
    await row.getByRole('button', { name: 'Giao việc' }).click()
    const dialog = page.getByRole('dialog', { name: 'Giao việc' })
    const options = await dialog.locator('#assign-sales option').allTextContents()
    assert.deepEqual(options.slice(1), ['Kinh Doanh Hai', 'Kinh Doanh Một'])
    await dialog.locator('#assign-sales').selectOption('s1')
    await dialog.getByRole('button', { name: 'Giao việc' }).click()
    await waitFor(() => lastSent(state, 'POST', '/manager/after-sales/tasks/task-follow/assign'), 'giao việc')
    assert.deepEqual(lastSent(state, 'POST', '/manager/after-sales/tasks/task-follow/assign').body, {
      salesUserId: 's1',
      reason: null,
    })
    assert.equal(sent(state, 'GET', '/admin/users').length, 0, 'quản lý không gọi API tài khoản')
    assert.ok(sent(state, 'GET', '/manager/after-sales/sales-assignees').length > 0)

    await page.getByRole('tab', { name: /^Chưa ai nhận/ }).click()
    await waitFor(
      () => sent(state, 'GET', '/manager/after-sales/tasks').some((r) => r.query.status === 'OPEN'),
      'lọc OPEN',
    )
    await page.locator('#task-type').selectOption('REPAIR_QUOTATION')
    await quotationRows.first().waitFor()
    assert.equal(await row.count(), 0, 'việc vừa giao không còn ở nhóm chưa ai nhận')
    await page.context().close()
  })

  test('chức năng tắt (503): hiện "chưa sẵn sàng" kèm migration chờ, không coi là danh sách rỗng', async () => {
    const state = createManagerState()
    state.tasksUnavailable = true
    const page = await open(state, MANAGER, '/manage/sales-tasks')
    await page.getByText('Hàng việc chưa sẵn sàng.').waitFor()
    await page.getByText(/20261030201506_SalesTerminalStates/).waitFor()
    assert.equal(await page.getByText('Không có việc nào khớp bộ lọc').count(), 0)
    await page.context().close()
  })
})

describe('D. hoàn tiền', () => {
  test('quản lý duyệt một phần → quản trị ghi nhận đã trả → quản lý thấy "Đã hoàn"', async () => {
    const state = createManagerState()
    const page = await open(state, MANAGER, '/manage/refunds')
    const row = page.locator('tr', { hasText: 'khách trả sau khi link thanh toán hết hạn' })
    await row.getByRole('button', { name: 'Xét hoàn tiền' }).click()
    const dialog = page.getByRole('dialog', { name: 'Xét hoàn tiền' })
    await dialog.locator('#refund-amount').fill('1.000.000')
    await dialog.getByRole('button', { name: 'Duyệt hoàn tiền' }).click()
    await dialog.getByText(/Không vượt quá/).waitFor()
    assert.equal(sent(state, 'POST', '/manager/after-sales/refunds/rf-pending/decision').length, 0)

    await dialog.locator('#refund-amount').fill('900.000')
    await dialog.locator('#refund-note').fill('Trừ phí cổng thanh toán')
    await dialog.getByRole('button', { name: 'Duyệt hoàn tiền' }).click()
    await waitFor(() => lastSent(state, 'POST', '/manager/after-sales/refunds/rf-pending/decision'), 'duyệt hoàn')
    assert.deepEqual(lastSent(state, 'POST', '/manager/after-sales/refunds/rf-pending/decision').body, {
      approve: true,
      approvedAmount: 900_000,
      note: 'Trừ phí cổng thanh toán',
    })
    const decided = state.refunds.find((r) => r.refundId === 'rf-pending')
    assert.deepEqual([decided.status, decided.refundedAt], ['APPROVED', null])

    const admin = await open(state, ADMIN, '/admin/refunds')
    const adminRow = admin.locator('tr', { hasText: 'khách trả sau khi link thanh toán hết hạn' })
    await adminRow.getByRole('button', { name: 'Ghi nhận đã hoàn' }).click()
    const record = admin.getByRole('dialog', { name: 'Ghi nhận đã hoàn tiền' })
    await record.getByLabel(/Tôi xác nhận đã chuyển/).check()
    await record.getByRole('button', { name: 'Ghi nhận đã hoàn' }).click()
    await waitFor(() => decided.status === 'REFUNDED', 'ghi nhận')
    await admin.context().close()

    await page.goto(`${baseUrl}/manage/refunds?nhom=refunded`)
    await page.locator('tr', { hasText: 'khách trả sau khi link thanh toán hết hạn' }).getByText('Đã hoàn').waitFor()
    await page.context().close()
  })

  test('từ chối không gửi số tiền; khoản vừa được người khác quyết định thì đóng hộp thoại và tải lại', async () => {
    const state = createManagerState()
    const page = await open(state, MANAGER, '/manage/refunds')
    const row = page.locator('tr', { hasText: 'Công trình bị huỷ trước khi bàn giao.' })
    await row.getByRole('button', { name: 'Xét hoàn tiền' }).click()
    const dialog = page.getByRole('dialog', { name: 'Xét hoàn tiền' })
    await dialog.getByLabel('Không hoàn').check()
    assert.equal(await dialog.locator('#refund-amount').count(), 0)
    await dialog.getByRole('button', { name: 'Không hoàn' }).click()
    await waitFor(() => lastSent(state, 'POST', '/manager/after-sales/refunds/rf-pending-2/decision'), 'từ chối hoàn')
    assert.deepEqual(lastSent(state, 'POST', '/manager/after-sales/refunds/rf-pending-2/decision').body, {
      approve: false,
      approvedAmount: null,
      note: null,
    })

    const other = page.locator('tr', { hasText: 'khách trả sau khi link thanh toán hết hạn' })
    await other.getByRole('button', { name: 'Xét hoàn tiền' }).click()
    state.refunds.find((r) => r.refundId === 'rf-pending').status = 'APPROVED'
    await page.getByRole('dialog', { name: 'Xét hoàn tiền' }).getByRole('button', { name: 'Duyệt hoàn tiền' }).click()
    await page.getByText('Khoản này đã được quyết định. Đã tải lại danh sách.').waitFor()
    await waitFor(
      async () => (await page.getByRole('dialog', { name: 'Xét hoàn tiền' }).count()) === 0,
      'đóng hộp thoại',
    )
    await page.context().close()
  })
})

describe('quyền', () => {
  test('quản lý mở trang của quản trị bị chuyển sang 403; menu quản lý có Hoàn tiền và Việc của kinh doanh', async () => {
    const state = createManagerState()
    const page = await open(state, MANAGER, '/admin/sales-tasks')
    await page.waitForURL(/\/403$/)
    await page.goto(`${baseUrl}/manage/refunds`)
    const nav = page.getByLabel('Điều hướng chính')
    await nav.getByRole('link', { name: /^Hoàn tiền/ }).waitFor()
    await nav.getByRole('link', { name: /^Việc của kinh doanh/ }).waitFor()
    await page.context().close()
  })
})

describe('E. huỷ gói đã trả tiền', () => {
  test('hàng chờ → chi tiết → từ chối giữ gói; số vượt giá bị chặn; duyệt một phần tạo khoản hoàn đã duyệt', async () => {
    const state = createManagerState()
    const page = await open(state, MANAGER, '/manage/package-cancellations')
    await page.getByText('2 gói chờ xét huỷ').waitFor()
    await page.locator('tr', { hasText: 'Bảo vệ bão 1 năm' }).getByRole('link', { name: 'Xét huỷ' }).click()
    await page.waitForURL(/\/manage\/package-cancellations\/sub-2$/)
    await page.getByText('Đổi ý', { exact: true }).waitFor()
    await page.getByLabel('Không đồng ý huỷ').check()
    await page.getByRole('button', { name: 'Từ chối huỷ' }).click()
    await waitFor(() => lastSent(state, 'POST', '/manager/after-sales/subscriptions/sub-2/cancellation-decision'), 'từ chối')
    assert.deepEqual(lastSent(state, 'POST', '/manager/after-sales/subscriptions/sub-2/cancellation-decision').body, {
      approve: false,
      refundAmount: null,
      note: null,
    })
    assert.equal(state.subscriptions[1].subscription.status, 'PAID')

    await page.goto(`${baseUrl}/manage/package-cancellations`)
    await page.locator('tr', { hasText: 'Bảo trì 12 tháng' }).getByRole('link', { name: 'Xét huỷ' }).click()
    await page.getByLabel('Đồng ý huỷ gói và hoàn tiền').check()
    await page.locator('#package-refund').fill('2.500.000')
    await page.getByRole('button', { name: 'Duyệt huỷ gói' }).click()
    await page.getByText(/Không vượt quá 2\.000\.000/).first().waitFor()
    assert.equal(sent(state, 'POST', '/manager/after-sales/subscriptions/sub-1/cancellation-decision').length, 0)
    await page.locator('#package-refund').fill('1.500.000')
    await page.getByRole('button', { name: 'Duyệt huỷ gói' }).click()
    await page.getByText('Gói đã huỷ').waitFor()
    assert.deepEqual(lastSent(state, 'POST', '/manager/after-sales/subscriptions/sub-1/cancellation-decision').body, {
      approve: true,
      refundAmount: 1_500_000,
      note: null,
    })
    const created = state.refunds.find((r) => r.subscriptionId === 'sub-1')
    assert.deepEqual([created.status, created.approvedAmount, created.originalAmount], ['APPROVED', 1_500_000, 2_000_000])
    await page.context().close()
  })

  test('gói vừa được người khác quyết định: backend trả 409, báo lỗi và tải lại, không tự gửi lại', async () => {
    const state = createManagerState()
    const page = await open(state, MANAGER, '/manage/package-cancellations/sub-1')
    await page.getByRole('button', { name: 'Duyệt huỷ gói' }).waitFor()
    state.subscriptions[0].subscription.status = 'PAID'
    await page.getByRole('button', { name: 'Duyệt huỷ gói' }).click()
    await waitFor(() => sent(state, 'POST', '/manager/after-sales/subscriptions/sub-1/cancellation-decision').length === 1, 'gửi')
    await page.waitForTimeout(500)
    assert.equal(sent(state, 'POST', '/manager/after-sales/subscriptions/sub-1/cancellation-decision').length, 1)
    assert.equal(state.refunds.filter((r) => r.subscriptionId === 'sub-1').length, 0)
    await page.context().close()
  })

  test('menu quản lý có Huỷ gói; khách không gọi được API quản lý', async () => {
    const state = createManagerState()
    const page = await open(state, MANAGER, '/manage/package-cancellations')
    await page.getByLabel('Điều hướng chính').getByRole('link', { name: /^Huỷ gói/ }).waitFor()
    await page.context().close()
    const r = handleManager(state, { role: 'CUSTOMER', userId: 'cus-1' }, 'GET', 'http://x/api/manager/after-sales/subscriptions')
    assert.equal(r.status, 403)
  })
})
