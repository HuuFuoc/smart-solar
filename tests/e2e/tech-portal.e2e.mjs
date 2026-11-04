// E2E cổng kỹ thuật viên trên giao diện thật (Vite dev + Chromium), backend là bản giả trong mock-tech-api.mjs (page.route).
// Đây là test với API giả: chứng minh luồng giao diện và request gửi đi đúng hợp đồng, KHÔNG chứng minh backend thật chạy.
// Bước của quản lý / kinh doanh / khách (quyết định chi phí, báo giá, thanh toán, xếp buổi sửa) được giả lập trên state.
// Chạy: node --test tests/e2e/tech-portal.e2e.mjs
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import {
  createTechState,
  customerPays,
  installTechMockApi,
  managerDecides,
  managerSchedulesRepair,
  salesQuotes,
} from './mock-tech-api.mjs'

let server
let browser
let baseUrl

const TECH = { role: 'TECHNICIAN', userId: 't1' }
const SALES = { role: 'SALES', userId: 's1' }
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

before(async () => {
  // Không theo dõi file: phiên khác sửa code trong lúc chạy thì trang không bị nạp lại giữa chừng
  server = await createServer({ server: { port: 3195, strictPort: false, hmr: false, watch: null }, logLevel: 'error' })
  await server.listen()
  baseUrl = server.resolvedUrls.local[0].replace(/\/$/, '')
  browser = await chromium.launch({ channel: 'chromium' })
  // Lần mở đầu Vite biên dịch mọi module (chậm hơn thời gian chờ của từng bước): làm nóng trước
  for (const path of ['/tech/jobs/a-done', '/tech/after-sales/v-insp', '/tech/jobs/open/a-open-1']) {
    const warm = await open(createTechState(), TECH, path)
    await warm.locator('main h1').first().waitFor({ timeout: 120_000 })
    await warm.context().close()
  }
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
  await installTechMockApi(page, state, who)
  // Lần đầu Vite còn biên dịch module nên chờ lâu hơn thời gian chờ của từng bước
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
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
const pause = (ms) => new Promise((r) => setTimeout(r, ms))
const visitOf = (state, id) => state.visits.find((v) => v.visitId === id)

describe('A1. lịch chờ nhận: danh sách → chi tiết → nhận việc', () => {
  test('mở chi tiết từ danh sách, nhận bằng revision của lần tải mới nhất rồi sang trang việc', async () => {
    const state = createTechState()
    const page = await open(state, TECH, '/tech/jobs')
    const link = page.getByRole('link', { name: 'Nhà phố Lê Lợi' })
    await link.waitFor()
    // Lịch đổi trên backend sau khi danh sách đã tải (vd. khách đổi ghi chú): chi tiết phải đọc lại
    state.open.find((a) => a.appointmentId === 'a-open-1').revision = 4
    await link.click()
    await page.waitForURL(/\/tech\/jobs\/open\/a-open-1$/)
    await page.getByRole('heading', { name: 'Nhà phố Lê Lợi' }).waitFor()
    await page.getByText('Khu trung tâm').waitFor()
    assert.ok(sent(state, 'GET', '/technicians/me/open-appointments/a-open-1').length >= 1)

    await page.getByRole('button', { name: 'Nhận việc' }).click()
    await page.waitForURL(/\/tech\/jobs\/a-open-1$/)
    assert.deepEqual(lastSent(state, 'POST', '/technicians/me/appointments/a-open-1/accept').body, {
      expectedRevision: 4,
    })
    await page.getByText('Khách Một').waitFor()
    await page.context().close()
  })

  test('người khác nhận trước: báo lỗi 409, không tự gửi lại, trang chuyển sang "không còn chờ nhận"', async () => {
    const state = createTechState()
    const page = await open(state, TECH, '/tech/jobs/open/a-open-2')
    await page.getByRole('button', { name: 'Nhận việc' }).waitFor()
    state.open = state.open.filter((a) => a.appointmentId !== 'a-open-2')
    state.takenByOthers.add('a-open-2')
    await page.getByRole('button', { name: 'Nhận việc' }).click()
    await page.getByText('Lịch này vừa có người nhận trước. Danh sách đã được tải lại.').waitFor()
    await page.getByText('Lịch này không còn chờ nhận').waitFor()
    assert.equal(sent(state, 'POST', '/technicians/me/appointments/a-open-2/accept').length, 1)
    await page.context().close()
  })

  test('revision cũ (lịch vừa đổi): 409, tải lại, người dùng tự bấm lại mới gửi với revision mới', async () => {
    const state = createTechState()
    const page = await open(state, TECH, '/tech/jobs/open/a-open-2')
    const accept = page.getByRole('button', { name: 'Nhận việc' })
    await accept.waitFor()
    state.open.find((a) => a.appointmentId === 'a-open-2').revision = 2
    await accept.click()
    await page.getByText('Lịch hẹn vừa được thay đổi ở nơi khác. Đã tải lại, hãy thử lại.').waitFor()
    await pause(600)
    assert.equal(sent(state, 'POST', '/technicians/me/appointments/a-open-2/accept').length, 1)
    assert.equal(lastSent(state, 'POST', '/technicians/me/appointments/a-open-2/accept').body.expectedRevision, 1)

    await waitFor(async () => await accept.isEnabled(), 'tải lại xong')
    await accept.click()
    await page.waitForURL(/\/tech\/jobs\/a-open-2$/)
    assert.equal(lastSent(state, 'POST', '/technicians/me/appointments/a-open-2/accept').body.expectedRevision, 2)
    await page.context().close()
  })

  test('lịch ngoài khu vực / không còn mở (404) và sai vai trò', async () => {
    const state = createTechState()
    const page = await open(state, TECH, '/tech/jobs/open/khong-co')
    await page.getByText('Lịch này không còn chờ nhận').waitFor()
    assert.equal(sent(state, 'POST', '/technicians/me/appointments/khong-co/accept').length, 0)
    // Lịch đã là của mình thì dẫn sang trang việc
    await page.goto(`${baseUrl}/tech/jobs/open/a-done`, { waitUntil: 'domcontentloaded' })
    await page.getByText('Lịch này đã là việc của bạn').waitFor()
    await page.getByRole('link', { name: 'Xem việc' }).click()
    await page.waitForURL(/\/tech\/jobs\/a-done$/)
    await page.context().close()

    const sales = await open(createTechState(), SALES, '/tech/jobs/open/a-open-1')
    await sales.waitForURL(/\/403$/)
    await sales.context().close()
  })
})

describe('A2. bổ sung biên bản khảo sát đã hoàn thành', () => {
  test('thiếu lý do / không đổi gì bị chặn; gửi ô đã đổi + tệp; bản gốc giữ trong lịch sử, phiên bản mới hiện sau khi tải lại', async () => {
    const state = createTechState()
    const page = await open(state, TECH, '/tech/jobs/a-done')
    await page.getByRole('button', { name: 'Bổ sung biên bản' }).click()
    const send = page.getByRole('button', { name: 'Gửi bổ sung' })

    await send.click()
    await page.getByText('Ghi lý do bổ sung.').waitFor()
    await page.locator('#amendment-reason').fill('Đo lại chiều rộng theo bản vẽ')
    await send.click()
    await page.getByText('Chưa có gì thay đổi. Sửa ít nhất một ô hoặc thêm tệp.').waitFor()

    // Diện tích vượt dài × rộng: biên bản sau khi gộp không hợp lệ
    await page.locator('#os-usableAreaM2').fill('100')
    await send.click()
    await page.getByText(/vẫn phải đủ ô bắt buộc/).waitFor()
    await page.locator('#os-usableAreaM2').fill('60')
    assert.equal(sent(state, 'POST', '/technicians/me/appointments/a-done/onsite-survey/amendments').length, 0)

    await page.locator('#os-roofWidthM').fill('9')
    await page.locator('input[type=file]').setInputFiles({ name: 'ban-ve.png', mimeType: 'image/png', buffer: PNG })
    await page.getByText('ban-ve.png').waitFor()
    await page.getByText(/Đã sửa 1 ô: Chiều rộng mái; thêm 1 tệp/).waitFor()
    await send.click()
    const dialog = page.getByRole('dialog', { name: 'Gửi bổ sung biên bản?' })
    await dialog.getByText('Phiên bản 2 sẽ thay phiên bản 1').waitFor()
    await dialog.getByRole('button', { name: 'Gửi bổ sung' }).click()

    await waitFor(() => lastSent(state, 'POST', '/technicians/me/appointments/a-done/onsite-survey/amendments'), 'gửi')
    assert.equal(lastSent(state, 'POST', '/files/presigned-upload').body.purpose, 'ONSITE_SURVEY_EVIDENCE')
    assert.deepEqual(lastSent(state, 'POST', '/technicians/me/appointments/a-done/onsite-survey/amendments').body, {
      revision: 5,
      reason: 'Đo lại chiều rộng theo bản vẽ',
      changes: { roofWidthM: 9 },
      additionalFileIds: ['file-1'],
    })
    await page.getByText('Các lần bổ sung (1)').waitFor()

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByText('Các lần bổ sung (1)').waitFor()
    await page.getByText('Đang hiện phiên bản 2.', { exact: false }).waitFor()
    await page.getByText('Lý do: Đo lại chiều rộng theo bản vẽ').waitFor()
    await page.getByText('8 m → 9 m').waitFor()
    await page.getByText('Thêm 1 tệp (mục Giấy tờ).').waitFor()
    await page.context().close()
  })

  test('revision cũ: 409, khoá nút gửi tới khi tải bản mới nhất, không tự gửi lại', async () => {
    const state = createTechState()
    const page = await open(state, TECH, '/tech/jobs/a-done')
    await page.getByRole('button', { name: 'Bổ sung biên bản' }).click()
    await page.locator('#amendment-reason').fill('Sửa ghi chú')
    await page.locator('#os-roofWidthM').fill('9')
    // Một lần bổ sung khác được ghi trong lúc đang sửa (máy khác)
    Object.assign(state.surveys['a-done'], { revision: 6, version: 2 })
    state.surveys['a-done'].amendments.push({
      amendmentNumber: 1,
      authorUserId: 't1',
      reason: 'Bổ sung từ máy khác',
      changes: { notes: { old: null, new: 'Có bồn nước' } },
      createdAt: new Date().toISOString(),
    })
    const send = page.getByRole('button', { name: 'Gửi bổ sung' })
    await send.click()
    await page.getByRole('dialog').getByRole('button', { name: 'Gửi bổ sung' }).click()
    await page.getByText('Biên bản vừa thay đổi trên hệ thống').waitFor()
    await waitFor(async () => await send.isDisabled(), 'khoá nút gửi')
    await pause(500)
    assert.equal(sent(state, 'POST', '/technicians/me/appointments/a-done/onsite-survey/amendments').length, 1)

    await page.getByRole('button', { name: 'Tải bản mới nhất' }).click()
    assert.equal(await page.locator('#amendment-reason').inputValue(), 'Sửa ghi chú')
    assert.equal(await page.locator('#os-roofWidthM').inputValue(), '8')
    await page.locator('#os-roofWidthM').fill('9')
    await send.click()
    await page.getByRole('dialog').getByRole('button', { name: 'Gửi bổ sung' }).click()
    await page.getByText('Các lần bổ sung (2)').waitFor()
    assert.equal(
      lastSent(state, 'POST', '/technicians/me/appointments/a-done/onsite-survey/amendments').body.revision,
      6,
    )
    await page.context().close()
  })
})

async function reportWithStay(page) {
  await page.locator('#inspection-report').fill('Quạt tản nhiệt inverter kêu to, nhiệt độ cao')
  await page.locator('#item-description-0').fill('Thay quạt tản nhiệt inverter')
  await page.locator('#item-diagnosis-0').fill('Bạc đạn quạt mòn')
  await page.getByLabel('Ở lại công trình để sửa luôn').check()
  await page.getByRole('button', { name: 'Gửi kết quả kiểm tra' }).click()
  await page.getByText('Chờ tại công trình để sửa luôn').first().waitFor()
}

describe('B. buổi kiểm tra: stayOnSite, sửa luôn, kết thúc buổi chờ, hạng mục phát sinh', () => {
  test('stayOnSite → quản lý / kinh doanh / khách xong điều kiện → READY_FOR_WORK → sửa luôn → phát sinh → báo cáo', async () => {
    const state = createTechState()
    const page = await open(state, TECH, '/tech/after-sales/v-insp')
    await reportWithStay(page)
    const inspection = lastSent(state, 'POST', '/technicians/me/after-sales/visits/v-insp/inspection').body
    assert.equal(inspection.stayOnSite, true)
    assert.equal(inspection.noFaultFound, false)
    assert.equal(await page.getByRole('button', { name: 'Gửi kết quả kiểm tra' }).count(), 0)
    await page.getByText('Còn 1 hạng mục chờ quản lý quyết định chi phí.', { exact: false }).waitFor()

    // Số phút không hợp lệ: chặn ở máy
    const proceed = page.getByRole('button', { name: 'Sửa luôn' })
    await proceed.click()
    await page.getByText('Ước tính số phút cần để sửa.').waitFor()
    await page.getByText('Chọn có đủ linh kiện hay không.').waitFor()
    await page.locator('#repair-minutes').fill('481')
    await page.getByLabel('Có đủ linh kiện').check()
    await proceed.click()
    await page.getByText('Nhập số phút nguyên từ 1 đến 480.').waitFor()
    assert.equal(sent(state, 'POST', '/technicians/me/after-sales/visits/v-insp/continue-repair').length, 0)

    // Chưa được duyệt / chưa trả tiền: backend chặn, FE không tự kết thúc buổi chờ
    await page.locator('#repair-minutes').fill('30')
    await proceed.click()
    await page.getByText('Chưa được phép sửa').waitFor()
    assert.equal(sent(state, 'POST', '/technicians/me/after-sales/visits/v-insp/finish').length, 0)

    // Quản lý: khách trả tiền; kinh doanh báo giá; khách đồng ý và PayOS xác nhận
    managerDecides(state, 'r-1', 'CHARGEABLE')
    salesQuotes(state, 'r-1')
    customerPays(state, 'r-1')
    assert.equal(state.serviceRequests['r-1'].status, 'READY_FOR_WORK')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByText('1 hạng mục đã được phép làm.', { exact: false }).waitFor()
    await page.locator('#repair-minutes').fill('30')
    await page.getByLabel('Có đủ linh kiện').check()
    await page.getByRole('button', { name: 'Sửa luôn' }).click()
    await page.getByRole('heading', { name: 'Báo cáo công việc' }).waitFor()
    assert.deepEqual(lastSent(state, 'POST', '/technicians/me/after-sales/visits/v-insp/continue-repair').body, {
      estimatedMinutes: 30,
      partsAvailable: true,
    })
    assert.equal(visitOf(state, 'v-insp').purpose, 'REPAIR')

    // Hạng mục phát sinh: thiếu tên / chẩn đoán bị chặn; gửi đúng DiagnosedItemRequest
    await page.getByRole('button', { name: 'Báo hạng mục phát sinh' }).click()
    const dialog = page.getByRole('dialog', { name: 'Báo hạng mục phát sinh' })
    await dialog.getByRole('button', { name: 'Gửi hạng mục' }).click()
    await dialog.getByText('Ghi tên hạng mục.').waitFor()
    assert.equal(sent(state, 'POST', '/technicians/me/after-sales/visits/v-insp/supplementary-items').length, 0)
    await dialog.locator('#supplementary-description').fill('Đầu nối MC4 chuỗi 2 bị cháy')
    await dialog.locator('#supplementary-asset').selectOption('as-inv')
    await dialog.locator('#supplementary-diagnosis').fill('Tiếp xúc kém, cháy vỏ')
    await dialog.locator('#supplementary-parts').fill('2 đầu MC4')
    await dialog.getByRole('button', { name: 'Gửi hạng mục' }).click()
    await page.getByText('Phát sinh khi sửa').waitFor()
    assert.deepEqual(lastSent(state, 'POST', '/technicians/me/after-sales/visits/v-insp/supplementary-items').body, {
      assetId: 'as-inv',
      description: 'Đầu nối MC4 chuỗi 2 bị cháy',
      diagnosis: 'Tiếp xúc kém, cháy vỏ',
      requiredParts: '2 đầu MC4',
    })

    // Báo cáo công việc chỉ gồm hạng mục được phép làm, không gồm hạng mục phát sinh đang chờ quyết định
    await page.locator('#work-report').fill('Đã thay quạt tản nhiệt')
    await page.getByRole('button', { name: 'Gửi báo cáo' }).click()
    await waitFor(() => lastSent(state, 'POST', '/technicians/me/after-sales/visits/v-insp/work-report'), 'báo cáo')
    const work = lastSent(state, 'POST', '/technicians/me/after-sales/visits/v-insp/work-report').body
    assert.equal(work.results.length, 1)
    assert.equal(state.serviceRequests['r-1'].status, 'AWAITING_DECISION')
    await page.context().close()
  })

  test('không đủ thời gian rồi thiếu linh kiện → kỹ thuật viên tự chọn kết thúc buổi chờ → quản lý xếp buổi sửa riêng', async () => {
    const state = createTechState()
    const page = await open(state, TECH, '/tech/after-sales/v-insp')
    await reportWithStay(page)
    managerDecides(state, 'r-1', 'INSTALLATION_WARRANTY')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByText('1 hạng mục đã được phép làm.', { exact: false }).waitFor()

    await page.locator('#repair-minutes').fill('200')
    await page.getByText(/chỉ còn khoảng \d+ phút/).waitFor()
    await page.getByLabel('Có đủ linh kiện').check()
    await page.getByRole('button', { name: 'Sửa luôn' }).click()
    await page.getByText('Không đủ thời gian trong buổi này').waitFor()

    await page.locator('#repair-minutes').fill('30')
    await page.getByLabel('Chưa đủ linh kiện').check()
    await page.getByRole('button', { name: 'Sửa luôn' }).click()
    await page.getByText('Thiếu linh kiện', { exact: true }).waitFor()
    await pause(500)
    assert.equal(sent(state, 'POST', '/technicians/me/after-sales/visits/v-insp/continue-repair').length, 2)
    assert.equal(sent(state, 'POST', '/technicians/me/after-sales/visits/v-insp/finish').length, 0)

    await page.getByRole('button', { name: 'Kết thúc buổi chờ' }).click()
    const dialog = page.getByRole('dialog', { name: 'Kết thúc buổi chờ?' })
    await dialog.locator('#finish-note').fill('Thiếu quạt tản nhiệt')
    await dialog.getByRole('button', { name: 'Kết thúc buổi chờ' }).click()
    await page.getByText('Đã gửi báo cáo', { exact: true }).waitFor()
    assert.deepEqual(lastSent(state, 'POST', '/technicians/me/after-sales/visits/v-insp/finish').body, {
      note: 'Thiếu quạt tản nhiệt',
    })
    assert.equal(visitOf(state, 'v-insp').status, 'REPORTED')
    assert.equal(await page.getByRole('button', { name: 'Sửa luôn' }).count(), 0)

    managerSchedulesRepair(state, 'r-1', 't1')
    await page.goto(`${baseUrl}/tech/after-sales`, { waitUntil: 'domcontentloaded' })
    // Buổi sửa mới chờ kỹ thuật viên trả lời, mở sẵn tab "Chờ bạn nhận"
    await page.getByRole('main').getByRole('link', { name: 'Xem và trả lời' }).waitFor()
    await page.context().close()
  })

  test('chuyển trạng thái không hợp lệ: kết thúc khi buổi chờ đã tự đóng, phát sinh khi buổi sửa đã báo cáo', async () => {
    const state = createTechState()
    const page = await open(state, TECH, '/tech/after-sales/v-insp')
    await reportWithStay(page)
    // Hết khung giờ: backend tự kết thúc buổi chờ
    visitOf(state, 'v-insp').status = 'REPORTED'
    await page.getByRole('button', { name: 'Kết thúc buổi chờ' }).click()
    const dialog = page.getByRole('dialog', { name: 'Kết thúc buổi chờ?' })
    await dialog.getByRole('button', { name: 'Kết thúc buổi chờ' }).click()
    await page.getByText('Buổi chờ đã kết thúc (hết khung giờ hoặc đã gửi từ máy khác).', { exact: false }).waitFor()
    await waitFor(async () => (await page.getByRole('button', { name: 'Kết thúc buổi chờ' }).count()) === 0, 'tải lại')
    assert.equal(sent(state, 'POST', '/technicians/me/after-sales/visits/v-insp/finish').length, 1)

    await page.goto(`${baseUrl}/tech/after-sales/v-repair`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Báo hạng mục phát sinh' }).click()
    visitOf(state, 'v-repair').status = 'REPORTED'
    const form = page.getByRole('dialog', { name: 'Báo hạng mục phát sinh' })
    await form.locator('#supplementary-description').fill('Khung nhôm cong')
    await form.locator('#supplementary-diagnosis').fill('Do gió')
    await form.getByRole('button', { name: 'Gửi hạng mục' }).click()
    await page.getByText('Chỉ báo hạng mục phát sinh được khi đang sửa. Trang đã tải lại trạng thái mới.').waitFor()
    await waitFor(
      async () => (await page.getByRole('button', { name: 'Báo hạng mục phát sinh' }).count()) === 0,
      'ẩn nút',
    )
    assert.equal(state.serviceRequests['r-2'].items.filter((i) => i.isSupplementary).length, 0)
    await page.context().close()
  })

  test('không lỗi thì không gửi stayOnSite; buổi của kỹ thuật viên khác (404) và sai vai trò', async () => {
    const state = createTechState()
    const page = await open(state, TECH, '/tech/after-sales/v-insp')
    await page.locator('#inspection-report').fill('Hệ thống chạy bình thường')
    await page.getByLabel('Không phát hiện lỗi').check()
    assert.equal(await page.getByLabel('Ở lại công trình để sửa luôn').count(), 0)
    await page.getByRole('button', { name: 'Gửi kết quả kiểm tra' }).click()
    await waitFor(() => lastSent(state, 'POST', '/technicians/me/after-sales/visits/v-insp/inspection'), 'gửi')
    assert.deepEqual(lastSent(state, 'POST', '/technicians/me/after-sales/visits/v-insp/inspection').body, {
      report: 'Hệ thống chạy bình thường',
      noFaultFound: true,
      items: [],
      stayOnSite: false,
    })

    await page.goto(`${baseUrl}/tech/after-sales/v-other`, { waitUntil: 'domcontentloaded' })
    await page.getByText('Không tìm thấy nội dung này.').waitFor()
    await page.context().close()

    const sales = await open(createTechState(), SALES, '/tech/after-sales/v-insp')
    await sales.waitForURL(/\/403$/)
    await sales.context().close()
  })
})
