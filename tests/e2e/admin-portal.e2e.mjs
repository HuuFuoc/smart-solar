// E2E cổng quản trị trên giao diện thật (Vite dev + Chromium), backend là bản giả trong mock-api.mjs (page.route).
// Đây là test với API giả: chứng minh luồng giao diện và request gửi đi đúng hợp đồng, KHÔNG chứng minh backend thật chạy.
// Chạy: node --test tests/e2e/admin-portal.e2e.mjs
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { createState, installMockApi } from './mock-api.mjs'

let server
let browser
let baseUrl

before(async () => {
  // Không theo dõi file: phiên khác sửa code trong lúc chạy thì trang không bị nạp lại giữa chừng
  server = await createServer({
    server: { host: '127.0.0.1', port: 3155, strictPort: false, hmr: false, watch: null },
    logLevel: 'error',
  })
  await server.listen()
  baseUrl = server.resolvedUrls.local[0].replace(/\/$/, '')
  // Bản Chromium đầy đủ (headless mới), không cần tải thêm chromium-headless-shell
  browser = await chromium.launch({ channel: 'chromium' })
  // Lần mở đầu tiên Vite biên dịch mọi module (chậm hơn thời gian chờ của từng bước): làm nóng trước khi chạy test
  const warm = await openAdmin(createState(), '/admin/zones')
  await warm.getByRole('heading', { name: 'Khu vực phục vụ' }).waitFor({ timeout: 120_000 })
  await warm.context().close()
})

after(async () => {
  await browser?.close()
  await server?.close()
})

/** Trang đã đăng nhập quản trị (refresh token giả trong localStorage, /auth/refresh trả JWT vai trò ADMIN) */
async function openAdmin(state, path) {
  const context = await browser.newContext({ locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh', acceptDownloads: true })
  await context.addInitScript(() => {
    localStorage.setItem('smart-solar.refresh-token', 'refresh-1')
    localStorage.setItem('smart-solar.refresh-store', 'local')
  })
  const page = await context.newPage()
  page.setDefaultTimeout(15_000)
  await installMockApi(page, state)
  await page.goto(`${baseUrl}${path}`)
  return page
}

const requestsTo = (state, method, path) => state.requests.filter((r) => r.method === method && r.path === path)
const lastTo = (state, method, path) => requestsTo(state, method, path).at(-1)
const waitFor = async (check, label) => {
  for (let i = 0; i < 100; i++) {
    if (check()) return
    await new Promise((r) => setTimeout(r, 100))
  }
  assert.fail(`hết giờ chờ: ${label}`)
}

describe('A. thời hạn bảo hành', () => {
  test('thêm thời hạn lắp đặt mặc định; số tháng sai không gửi; tắt mặc định phải xác nhận', async () => {
    const state = createState()
    const page = await openAdmin(state, '/admin/warranty-options')
    await page.getByText('Chưa có thời hạn bảo hành lắp đặt nào đang dùng').first().waitFor()

    await page.getByRole('button', { name: 'Thêm thời hạn' }).click()
    const dialog = page.getByRole('dialog', { name: 'Thêm thời hạn' })
    await dialog.getByLabel('Số tháng').fill('0')
    await dialog.getByRole('button', { name: 'Lưu' }).click()
    await dialog.getByText('Số tháng nguyên từ 1 đến 240.').waitFor()
    assert.equal(requestsTo(state, 'PUT', '/admin/after-sales/warranty-options').length, 0)

    await dialog.getByLabel('Số tháng').fill('24')
    await dialog.getByLabel('Đặt làm mặc định').check()
    await dialog.getByRole('button', { name: 'Lưu' }).click()
    await waitFor(() => lastTo(state, 'PUT', '/admin/after-sales/warranty-options'), 'PUT thời hạn')
    assert.deepEqual(lastTo(state, 'PUT', '/admin/after-sales/warranty-options').body, {
      kind: 'INSTALLATION',
      months: 24,
      isActive: true,
      isDefault: true,
    })
    await page.getByText('2 năm', { exact: true }).waitFor()
    await page.getByText('Mặc định', { exact: true }).waitFor()
    await waitFor(
      async () => (await page.getByText('Chưa có thời hạn bảo hành lắp đặt nào đang dùng').count()) === 0,
      'hết cảnh báo',
    )

    await page.getByRole('button', { name: 'Tắt 2 năm' }).click()
    const confirm = page.getByRole('dialog', { name: 'Tắt thời hạn mặc định' })
    await confirm.getByText('hợp đồng lập mới phải được kinh doanh chọn thời hạn').waitFor()
    await confirm.getByRole('button', { name: 'Tắt' }).click()
    await waitFor(() => requestsTo(state, 'PUT', '/admin/after-sales/warranty-options').length === 2, 'PUT tắt')
    assert.deepEqual(lastTo(state, 'PUT', '/admin/after-sales/warranty-options').body, {
      kind: 'INSTALLATION',
      months: 24,
      isActive: false,
      isDefault: false,
    })
    await page.getByText('Chưa có thời hạn bảo hành lắp đặt nào đang dùng').first().waitFor()
    await page.context().close()
  })
})

describe('A. ghi nhận hoàn tiền', () => {
  test('ghi nhận khoản đã duyệt kèm giờ Việt Nam; chưa xác nhận thì không gửi; khoản chờ duyệt không ghi nhận được', async () => {
    const state = createState()
    const page = await openAdmin(state, '/admin/refunds')
    await page
      .getByText(/^Gói dịch vụ /)
      .first()
      .waitFor()
    await page.getByRole('button', { name: 'Ghi nhận đã hoàn' }).click()
    const dialog = page.getByRole('dialog', { name: 'Ghi nhận đã hoàn tiền' })
    await dialog.getByLabel('Mã giao dịch').fill('CK123')
    await dialog.getByRole('button', { name: 'Ghi nhận đã hoàn' }).click()
    await dialog.getByText('Đánh dấu xác nhận trước khi ghi nhận.').waitFor()
    assert.equal(requestsTo(state, 'POST', '/admin/after-sales/refunds/rf-approved/record').length, 0)

    await dialog.getByLabel(/Tôi xác nhận đã chuyển/).check()
    await dialog.getByRole('button', { name: 'Ghi nhận đã hoàn' }).click()
    await waitFor(() => lastTo(state, 'POST', '/admin/after-sales/refunds/rf-approved/record'), 'POST record')
    const body = lastTo(state, 'POST', '/admin/after-sales/refunds/rf-approved/record').body
    assert.match(body.refundedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+07:00$/)
    assert.equal(body.reference, 'CK123')
    await page.getByText('Không có khoản nào chờ ghi nhận').waitFor()

    // Chuyển trạng thái không hợp lệ: khoản chưa được quản lý duyệt không có nút ghi nhận
    await page.getByRole('tab', { name: /Chờ quản lý duyệt/ }).click()
    await page.getByText('Huỷ sửa chữa đã trả tiền').waitFor()
    assert.equal(await page.getByRole('button', { name: 'Ghi nhận đã hoàn' }).count(), 0)
    await page.context().close()
  })

  test('khoản vừa đổi trạng thái ở nơi khác: báo lỗi của backend, đóng hộp thoại, không gửi lại', async () => {
    const state = createState()
    state.refunds.push({ ...state.refunds[0], refundId: 'rf-race', subscriptionId: 'sub-race' })
    state.refunds.splice(0, 1)
    const page = await openAdmin(state, '/admin/refunds')
    await page.getByRole('button', { name: 'Ghi nhận đã hoàn' }).click()
    const dialog = page.getByRole('dialog', { name: 'Ghi nhận đã hoàn tiền' })
    await dialog.getByLabel(/Tôi xác nhận đã chuyển/).check()
    state.refunds.find((r) => r.refundId === 'rf-race').status = 'REFUNDED'
    await dialog.getByRole('button', { name: 'Ghi nhận đã hoàn' }).click()
    await page.getByText('Trạng thái đã thay đổi nên không làm được thao tác này').waitFor()
    assert.equal(requestsTo(state, 'POST', '/admin/after-sales/refunds/rf-race/record').length, 1)
    await page.context().close()
  })
})

describe('A. báo cáo sau bán', () => {
  test('lọc khu vực rồi xuất CSV đúng bộ lọc đang hiện; khoảng ngày sai không gọi API', async () => {
    const state = createState()
    const page = await openAdmin(state, '/admin/reports')
    await page.getByText('Tiền hợp đồng lắp đặt').waitFor()
    const first = lastTo(state, 'GET', '/admin/after-sales/dashboard').query
    assert.match(first.From, /^\d{4}-\d{2}-01$/)
    assert.ok(first.CompareFrom < first.From)

    await page.getByLabel('Khu vực').selectOption('zone-1')
    await waitFor(() => lastTo(state, 'GET', '/admin/after-sales/dashboard').query.ZoneId === 'zone-1', 'lọc khu')
    await page.waitForLoadState('networkidle')
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Tải CSV' }).click()
    const download = await downloadPromise
    assert.match(download.suggestedFilename(), /^bao-cao-sau-ban_.*\.csv$/)
    assert.deepEqual(
      lastTo(state, 'GET', '/admin/after-sales/dashboard/export').query,
      lastTo(state, 'GET', '/admin/after-sales/dashboard').query,
    )

    const before = requestsTo(state, 'GET', '/admin/after-sales/dashboard').length
    const to = page.getByLabel('Kỳ xem đến ngày')
    await to.fill('01/01/2020')
    await to.press('Tab')
    await page.getByText('Ngày kết thúc phải từ ngày bắt đầu trở đi.').waitFor()
    await page.waitForTimeout(500)
    assert.equal(requestsTo(state, 'GET', '/admin/after-sales/dashboard').length, before)
    assert.equal(await page.getByRole('button', { name: 'Tải CSV' }).isDisabled(), true)
    await page.context().close()
  })
})

describe('B. khu vực phục vụ', () => {
  test('tạo khu: mã sai không gửi, mã được viết hoa; mở trang khu vừa tạo', async () => {
    const state = createState()
    const page = await openAdmin(state, '/admin/zones')
    await page.getByText(/phường, xã của Thành phố Hồ Chí Minh chưa thuộc khu nào/).waitFor()
    await page.getByRole('button', { name: 'Thêm khu vực' }).click()
    const dialog = page.getByRole('dialog', { name: 'Thêm khu vực' })
    await dialog.getByLabel('Mã khu').fill('-x')
    await dialog.getByLabel('Tên khu').fill('Quận 3 cũ')
    await dialog.getByRole('button', { name: 'Thêm khu' }).click()
    await dialog.getByText(/Mã dài 2–50 ký tự/).waitFor()
    assert.equal(requestsTo(state, 'POST', '/admin/operational-zones').length, 0)

    await dialog.getByLabel('Mã khu').fill('khu-q3')
    await dialog.getByLabel('Quản lý phụ trách').selectOption('m1')
    await dialog.getByRole('button', { name: 'Thêm khu' }).click()
    await page.waitForURL(/\/admin\/zones\/zone-3$/)
    assert.deepEqual(lastTo(state, 'POST', '/admin/operational-zones').body, {
      code: 'KHU-Q3',
      name: 'Quận 3 cũ',
      isActive: true,
      isServiceable: true,
      responsibleManagerUserId: 'm1',
    })
    await page.getByRole('heading', { name: 'Quận 3 cũ' }).waitFor()
    await page.context().close()
  })

  test('đổi tập phường xã: gửi đủ danh sách kèm revision; phường của khu khác bị từ chối; revision cũ thì tải lại', async () => {
    const state = createState()
    const page = await openAdmin(state, '/admin/zones/zone-1')
    await page.getByText('Phường Sài Gòn').waitFor()

    const input = page.getByLabel('Thêm phường, xã')
    await input.fill('ben thanh')
    await page.getByRole('option', { name: 'Phường Bến Thành' }).click()
    await page.getByRole('button', { name: 'Gỡ Phường Sài Gòn' }).click()
    await page.getByText('Chưa lưu: thêm 1, gỡ 1.').waitFor()
    await page.getByRole('button', { name: 'Lưu danh sách' }).click()
    const confirm = page.getByRole('dialog', { name: 'Lưu phường, xã của khu' })
    await confirm.getByText('Thêm 1').waitFor()
    await confirm.getByText('Gỡ 1').waitFor()
    await confirm.getByRole('button', { name: 'Lưu', exact: true }).click()
    await waitFor(() => lastTo(state, 'PUT', '/admin/operational-zones/zone-1/communes'), 'PUT communes')
    assert.deepEqual(lastTo(state, 'PUT', '/admin/operational-zones/zone-1/communes').body, {
      communeCodes: ['26740'],
      reason: null,
      revision: 3,
    })
    await page.getByRole('heading', { name: 'Phường, xã (1)' }).waitFor()

    // Phường đang thuộc khu khác: backend từ chối, giao diện nêu khu đang giữ, không tự chuyển
    await input.fill('thu duc')
    await page.getByRole('option', { name: /Phường Thủ Đức/ }).click()
    await page.getByRole('button', { name: 'Lưu danh sách' }).click()
    await confirm.getByRole('button', { name: 'Lưu', exact: true }).click()
    await page.getByText('Phường Thủ Đức đang thuộc khu Thủ Đức (KHU-THU-DUC)').waitFor()
    assert.deepEqual(state.zoneCommunes['zone-2'], ['26800'])

    // Khu vừa bị sửa ở nơi khác: báo, tải lại, danh sách đang sửa về bản mới
    state.zones[0].revision += 1
    await page.getByRole('button', { name: 'Lưu danh sách' }).click()
    await confirm.getByRole('button', { name: 'Lưu', exact: true }).click()
    await page.getByText('Khu vực vừa được sửa ở nơi khác').waitFor()
    await page.getByRole('heading', { name: 'Phường, xã (1)' }).waitFor()
    assert.equal(requestsTo(state, 'PUT', '/admin/operational-zones/zone-1/communes').length, 3)
    await page.context().close()
  })
})

describe('C. kho tri thức', () => {
  test('chức năng tắt (503): báo chưa sẵn sàng, không coi là danh sách rỗng, không có nút thêm', async () => {
    const state = createState()
    state.knowledgeEnabled = false
    const page = await openAdmin(state, '/admin/knowledge-base')
    await page.getByText('Kho tri thức chưa sẵn sàng.').waitFor()
    assert.equal(await page.getByText('Chưa có tài liệu nào').count(), 0)
    assert.equal(await page.getByRole('button', { name: 'Thêm tài liệu' }).count(), 0)
    await page.context().close()
  })

  test('tải lên rồi đăng ký tài liệu; công bố bản đã nạp kèm revision; bản đang nạp không công bố được; 429 khoá nạp lại', async () => {
    const state = createState()
    const page = await openAdmin(state, '/admin/knowledge-base')
    await page.getByRole('link', { name: 'Chính sách bảo hành' }).click()
    await page.getByRole('heading', { name: 'Chính sách bảo hành' }).waitFor()

    const rows = page.locator('tbody tr')
    const v1 = rows.filter({ hasText: 'Bản 1' })
    const v2 = rows.filter({ hasText: 'Bản 2' })
    assert.equal(await v1.getByRole('button', { name: 'Công bố' }).count(), 0)
    await v2.getByRole('button', { name: 'Công bố' }).click()
    await page.getByRole('dialog', { name: 'Xác nhận' }).getByRole('button', { name: 'Công bố' }).click()
    await waitFor(() => lastTo(state, 'POST', '/admin/knowledge-documents/doc-1/publish'), 'publish')
    assert.deepEqual(lastTo(state, 'POST', '/admin/knowledge-documents/doc-1/publish').body, {
      versionId: 'v-2',
      revision: 2,
    })
    await page.getByText('Chatbot đang dùng').waitFor()

    await v2.getByRole('button', { name: 'Nạp lại' }).click()
    await page
      .getByText(/Thử lại sau 120 giây/)
      .first()
      .waitFor()
    await page.getByText(/Đã chạm giới hạn nạp lại/).waitFor()
    assert.equal(await v2.getByRole('button', { name: 'Nạp lại' }).isDisabled(), true)

    await page.goto(`${baseUrl}/admin/knowledge-base`)
    await page.getByRole('button', { name: 'Thêm tài liệu' }).click()
    const dialog = page.getByRole('dialog', { name: 'Thêm tài liệu' })
    await dialog.locator('input[type=file]').setInputFiles({
      name: 'huong-dan_lap-dat.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n%mock\n'),
    })
    assert.equal(await dialog.getByLabel('Tên tài liệu').inputValue(), 'huong dan lap dat')
    await dialog.getByLabel('Danh mục').selectOption('INSTALLATION_GUIDE')
    await dialog.getByLabel('Thẻ').fill('Lắp đặt, lắp đặt, inverter')
    await dialog.getByRole('button', { name: 'Thêm tài liệu' }).click()
    await page.waitForURL(/\/admin\/knowledge-base\/doc-2$/)
    assert.equal(lastTo(state, 'POST', '/files/presigned-upload').body.purpose, 'KNOWLEDGE_DOCUMENT')
    assert.equal(lastTo(state, 'POST', '/files/presigned-upload').body.contentType, 'application/pdf')
    assert.deepEqual(lastTo(state, 'POST', '/admin/knowledge-documents').body, {
      fileId: 'file-uploaded',
      title: 'huong dan lap dat',
      category: 'INSTALLATION_GUIDE',
      tags: ['lắp đặt', 'inverter'],
    })
    await page.getByText('Đang có lượt nạp chạy nền').waitFor()
    await page.context().close()
  })
})

describe('D. cấu hình RAG', () => {
  test('bản nháp chưa hợp lệ thì không áp dụng; đổi cách cắt đoạn phải xác nhận; áp dụng gửi revision 0; nạp lại theo cấu hình mới', async () => {
    const state = createState()
    const page = await openAdmin(state, '/admin/settings')
    await page.getByRole('button', { name: 'Cấu hình AI / RAG' }).click()
    await page.getByText('Có bản nháp v7').waitFor()

    await page.getByRole('button', { name: 'Áp dụng bản nháp' }).click()
    await page.getByText('Bản nháp v7 chưa hợp lệ').waitFor()
    await page.getByText('chunkOverlap').waitFor()
    assert.equal(requestsTo(state, 'POST', '/admin/rag-configuration/draft/activate').length, 0)

    state.rag.draftInvalid = false
    await page.getByRole('button', { name: 'Áp dụng bản nháp' }).click()
    const confirm = page.getByRole('dialog', { name: 'Áp dụng bản nháp đổi cách cắt đoạn' })
    await confirm.getByText(/3 phiên bản tài liệu/).waitFor()
    await confirm.getByRole('button', { name: 'Áp dụng' }).click()
    await waitFor(() => lastTo(state, 'POST', '/admin/rag-configuration/draft/activate'), 'activate')
    assert.deepEqual(lastTo(state, 'POST', '/admin/rag-configuration/draft/activate').body, { expectedRevision: 0 })
    await page.getByText('Cấu hình v7 đang được dùng').waitFor()
    await page.getByRole('button', { name: 'Nạp lại tài liệu theo cấu hình mới' }).click()
    await page.getByText('Đã xếp lượt nạp lại theo cấu hình v7').waitFor()
    assert.equal(requestsTo(state, 'POST', '/admin/rag-configuration/reindex-stale').length, 1)
    await page.context().close()
  })

  test('khôi phục phiên bản đã thay; phiên bản đang dùng không có nút khôi phục; bỏ bản nháp gửi expectedRevision', async () => {
    const state = createState()
    const page = await openAdmin(state, '/admin/settings')
    await page.getByRole('button', { name: 'Cấu hình AI / RAG' }).click()
    await page.getByRole('button', { name: 'Bỏ bản nháp' }).click()
    await page.getByRole('dialog', { name: 'Bỏ bản nháp' }).getByRole('button', { name: 'Bỏ bản nháp' }).click()
    await waitFor(() => lastTo(state, 'DELETE', '/admin/rag-configuration/draft'), 'delete draft')
    assert.deepEqual(lastTo(state, 'DELETE', '/admin/rag-configuration/draft').query, { expectedRevision: '0' })

    await page.getByRole('button', { name: 'Nhật ký thay đổi' }).click()
    await page.getByRole('button', { name: 'Phiên bản AI / RAG' }).click()
    const v6 = page.locator('tbody tr').filter({ hasText: 'v6' })
    const v5 = page.locator('tbody tr').filter({ hasText: 'v5' })
    await v5.waitFor()
    assert.equal(await v6.getByRole('button', { name: 'Khôi phục' }).count(), 0)
    await v5.getByRole('button', { name: 'Khôi phục' }).click()
    await page
      .getByRole('dialog', { name: 'Khôi phục phiên bản cấu hình' })
      .getByRole('button', { name: 'Khôi phục' })
      .click()
    await waitFor(() => lastTo(state, 'POST', '/admin/rag-configuration/rollback'), 'rollback')
    assert.deepEqual(lastTo(state, 'POST', '/admin/rag-configuration/rollback').body, { version: 5 })
    await page.getByText('Cấu hình v8 đang được dùng').waitFor()
    await page.context().close()
  })
})

describe('E. ảnh sản phẩm', () => {
  test('thêm ảnh bằng link https (http bị chặn), đổi thứ tự gửi đủ ảnh, đặt ảnh chính, xoá có xác nhận', async () => {
    const state = createState()
    const page = await openAdmin(state, '/admin/products')
    await page.getByRole('button', { name: 'Ảnh của Tấm pin Trina 700W' }).click()
    const dialog = page.getByRole('dialog', { name: 'Ảnh của Tấm pin Trina 700W' })
    await dialog.getByText('Ảnh chính', { exact: true }).waitFor()
    assert.ok(lastTo(state, 'GET', '/admin/products/prod-1'))

    await dialog.getByLabel('Link ảnh').fill('http://cdn.example.com/c.jpg')
    await dialog.getByRole('button', { name: 'Thêm ảnh' }).click()
    await dialog.getByText('Chỉ nhận link bắt đầu bằng https://.').waitFor()
    assert.equal(requestsTo(state, 'POST', '/admin/products/prod-1/images').length, 0)

    await dialog.getByLabel('Link ảnh').fill('https://cdn.example.com/c.jpg')
    await dialog.getByLabel('Mô tả ảnh').fill('Mặt sau')
    await dialog.getByRole('button', { name: 'Thêm ảnh' }).click()
    await waitFor(() => lastTo(state, 'POST', '/admin/products/prod-1/images'), 'add image')
    assert.deepEqual(lastTo(state, 'POST', '/admin/products/prod-1/images').body, {
      url: 'https://cdn.example.com/c.jpg',
      altText: 'Mặt sau',
      makePrimary: false,
    })
    await dialog.getByText('#3').waitFor()

    await dialog.getByRole('button', { name: 'Đưa ảnh 3 lên trước' }).click()
    await waitFor(() => lastTo(state, 'PUT', '/admin/products/prod-1/images/order'), 'reorder')
    assert.deepEqual(lastTo(state, 'PUT', '/admin/products/prod-1/images/order').body, {
      imageIds: ['img-a', 'img-3-new', 'img-b'],
    })

    await dialog.getByRole('button', { name: 'Đặt làm ảnh chính' }).first().click()
    await waitFor(() => state.requests.some((r) => r.method === 'PUT' && r.path.endsWith('/primary')), 'primary')

    await dialog.getByRole('button', { name: 'Xoá ảnh 3' }).click()
    await dialog.getByRole('button', { name: 'Xoá ảnh', exact: true }).click()
    await waitFor(
      () => state.requests.some((r) => r.method === 'DELETE' && r.path.startsWith('/admin/products/prod-1/images/')),
      'delete',
    )
    await waitFor(() => state.product.images.length === 2, 'còn 2 ảnh')
    await page.context().close()
  })
})

describe('F. điều phối khảo sát', () => {
  test('phân công thẳng kỹ thuật viên kèm expectedRevision; thiếu lý do không gửi; đổi kinh doanh phụ trách gửi saleUserId', async () => {
    const state = createState()
    const page = await openAdmin(state, '/admin/dispatch/disp-1')
    await page.getByRole('heading', { name: 'Người phụ trách yêu cầu' }).waitFor()

    await page.getByRole('button', { name: 'Phân công kỹ thuật viên' }).click()
    const dialog = page.getByRole('dialog', { name: 'Phân công kỹ thuật viên' })
    await dialog.getByText('Kỹ Thuật Hai').click()
    await dialog.getByRole('button', { name: 'Phân công' }).click()
    await dialog.getByText('Ghi lý do.').waitFor()
    assert.equal(requestsTo(state, 'POST', '/admin/survey-appointments/appt-1/assign-technician').length, 0)
    await dialog.getByLabel('Lý do').fill('Kỹ thuật viên cũ nghỉ ốm')
    await dialog.getByRole('button', { name: 'Phân công' }).click()
    await waitFor(() => lastTo(state, 'POST', '/admin/survey-appointments/appt-1/assign-technician'), 'override')
    assert.deepEqual(lastTo(state, 'POST', '/admin/survey-appointments/appt-1/assign-technician').body, {
      technicianUserId: 't2',
      reason: 'Kỹ thuật viên cũ nghỉ ốm',
      expectedRevision: 4,
    })
    await page.getByText('Đã phân công Kỹ Thuật Hai').waitFor()

    await page.getByRole('button', { name: 'Đổi kinh doanh phụ trách' }).click()
    const sales = page.getByRole('dialog', { name: 'Đổi kinh doanh phụ trách' })
    await sales.getByLabel('Nhân viên kinh doanh').selectOption('s2')
    await sales.getByLabel('Lý do').fill('Cân bằng khối lượng việc')
    await sales.getByRole('button', { name: 'Đổi người phụ trách' }).click()
    await waitFor(() => lastTo(state, 'PUT', '/admin/survey-requests/sr-1/sales-owner'), 'sales owner')
    assert.deepEqual(lastTo(state, 'PUT', '/admin/survey-requests/sr-1/sales-owner').body, {
      saleUserId: 's2',
      reason: 'Cân bằng khối lượng việc',
    })
    await page.context().close()
  })

  test('lịch vừa đổi ở nơi khác (409): báo và để người dùng chọn lại, không tự gửi lại với revision mới', async () => {
    const state = createState()
    const page = await openAdmin(state, '/admin/dispatch/disp-1')
    await page.getByRole('button', { name: 'Phân công kỹ thuật viên' }).click()
    const dialog = page.getByRole('dialog', { name: 'Phân công kỹ thuật viên' })
    await dialog.getByText('Kỹ Thuật Hai').click()
    await dialog.getByLabel('Lý do').fill('Đổi người')
    state.appointmentRevision = 9
    await dialog.getByRole('button', { name: 'Phân công' }).click()
    await dialog.getByText('Lịch hẹn vừa được thay đổi ở nơi khác').waitFor()
    await page.waitForTimeout(500)
    assert.equal(requestsTo(state, 'POST', '/admin/survey-appointments/appt-1/assign-technician').length, 1)
    await page.context().close()
  })
})
