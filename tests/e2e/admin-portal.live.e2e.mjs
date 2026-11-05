// E2E cổng quản trị với BACKEND THẬT (Vite dev, proxy /api tới API_PROXY_TARGET, mặc định http://localhost:8080).
// Chỉ đọc dữ liệu và chỉ gửi những lệnh ghi mà backend sẽ từ chối (mã khu trùng, phường của khu khác, link http...),
// nên không đổi dữ liệu của DB dùng chung. Bỏ qua khi chưa khai tài khoản:
//   E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... node --test tests/e2e/admin-portal.live.e2e.mjs
// Cả bộ chạy trong MỘT phiên trình duyệt: backend thu hồi mọi phiên khi một refresh token bị dùng lại
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD
const skip = !email || !password ? 'chưa khai E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD' : false

let server
let browser
let page
let baseUrl
/** Mọi response /api/* của phiên: { method, path, query, status } */
const responses = []
const consoleErrors = []

const last = (method, path) => responses.filter((r) => r.method === method && r.path === path).at(-1)
const since = (index, method, path) =>
  responses.slice(index).filter((r) => r.method === method && r.path.startsWith(path))
/** Chuyển trang bằng menu như người dùng (không tải lại cả trang, layout không gọi lại API) */
async function go(label) {
  // Nhãn "Điều hướng chính" đặt trên <aside> của rail, không phải <nav>
  await page
    .getByLabel('Điều hướng chính')
    .getByRole('link', { name: new RegExp(`^${label}`) })
    .click()
}

async function until(check, label) {
  for (let i = 0; i < 150; i++) {
    if (check()) return
    await new Promise((r) => setTimeout(r, 100))
  }
  assert.fail(`hết giờ chờ: ${label}`)
}

describe('cổng quản trị với backend thật', { skip }, () => {
  before(async () => {
    // Không theo dõi file: phiên khác sửa code trong lúc chạy thì trang không bị nạp lại giữa chừng
    server = await createServer({
      server: { host: '127.0.0.1', port: 3165, strictPort: false, hmr: false, watch: null },
      logLevel: 'error',
    })
    await server.listen()
    baseUrl = server.resolvedUrls.local[0].replace(/\/$/, '')
    browser = await chromium.launch({ channel: 'chromium' })
    const context = await browser.newContext({ locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh', acceptDownloads: true })
    page = await context.newPage()
    page.setDefaultTimeout(30_000)
    page.on('response', (res) => {
      const url = new URL(res.url())
      if (!url.pathname.startsWith('/api/')) return
      responses.push({
        method: res.request().method(),
        path: url.pathname.replace(/^\/api/, ''),
        query: Object.fromEntries(url.searchParams),
        status: res.status(),
      })
    })
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
    page.on('pageerror', (e) => consoleErrors.push(e.message))
  })

  after(async () => {
    await browser?.close()
    await server?.close()
  })

  test('đăng nhập bằng form, vào cổng quản trị', async () => {
    await page.goto(`${baseUrl}/login`, { timeout: 120_000 })
    await page.locator('#login-email').fill(email)
    await page.locator('#login-password').fill(password)
    await page.locator('button[type=submit]').click()
    await page.waitForURL(/\/admin\//)
    assert.equal(last('POST', '/auth/login').status, 200)
  })

  test('thời hạn bảo hành: đọc thật, số tháng sai không gửi', async () => {
    await go('Thời hạn bảo hành')
    await page.getByRole('heading', { name: 'Thời hạn bảo hành' }).waitFor()
    await until(() => last('GET', '/admin/after-sales/warranty-options'), 'GET warranty-options')
    assert.equal(last('GET', '/admin/after-sales/warranty-options').status, 200)
    await page.getByRole('button', { name: 'Thêm thời hạn' }).click()
    const dialog = page.getByRole('dialog', { name: 'Thêm thời hạn' })
    const mark = responses.length
    await dialog.getByLabel('Số tháng').fill('241')
    await dialog.getByRole('button', { name: 'Lưu' }).click()
    await dialog.getByText('Số tháng nguyên từ 1 đến 240.').waitFor()
    assert.equal(since(mark, 'PUT', '/admin/after-sales/warranty-options').length, 0)
    await dialog.getByRole('button', { name: 'Huỷ' }).click()
  })

  test('hoàn tiền: đọc danh sách thật dùng chung với quản lý', async () => {
    await go('Hoàn tiền')
    await page.getByRole('heading', { name: 'Hoàn tiền' }).waitFor()
    await until(() => last('GET', '/manager/after-sales/refunds'), 'GET refunds')
    assert.equal(last('GET', '/manager/after-sales/refunds').status, 200)
  })

  test('báo cáo: số liệu thật, CSV tải về đúng bộ lọc đang hiện', async () => {
    await go('Báo cáo')
    await page.getByText('Tổng thu').first().waitFor()
    await page.waitForLoadState('networkidle')
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Tải CSV' }).click()
    const file = await download
    const csv = await (await file.createReadStream()).toArray()
    assert.match(Buffer.concat(csv).toString('utf8'), /^metric,description,current/)
    assert.equal(last('GET', '/admin/after-sales/dashboard/export').status, 200)
    assert.deepEqual(
      last('GET', '/admin/after-sales/dashboard/export').query,
      last('GET', '/admin/after-sales/dashboard').query,
    )
  })

  test('khu vực: mã trùng bị từ chối (409); thêm phường của khu khác bị từ chối (409), không đổi gì', async () => {
    await go('Khu vực phục vụ')
    await page.getByRole('heading', { name: 'Khu vực phục vụ' }).waitFor()
    await until(() => last('GET', '/admin/operational-zones/coverage'), 'coverage')
    assert.equal(last('GET', '/admin/operational-zones/coverage').status, 200)

    const firstRow = page.locator('tbody tr').first()
    const code = (await firstRow.locator('.font-mono').innerText()).trim()
    await page.getByRole('button', { name: 'Thêm khu vực' }).click()
    const form = page.getByRole('dialog', { name: 'Thêm khu vực' })
    await form.getByLabel('Mã khu').fill(code.toLowerCase())
    await form.getByLabel('Tên khu').fill('Kiểm thử mã trùng')
    await form.getByRole('button', { name: 'Thêm khu' }).click()
    await form.getByText('Đã có khu vực dùng mã này').waitFor()
    assert.equal(last('POST', '/admin/operational-zones').status, 409)
    await form.getByRole('button', { name: 'Huỷ' }).click()

    await firstRow.getByRole('link').click()
    await page.getByRole('heading', { name: /^Phường, xã \(\d+\)$/ }).waitFor()
    const zoneId = page.url().split('/').pop()
    const heading = await page.getByRole('heading', { name: /^Phường, xã/ }).innerText()
    await page.getByLabel('Thêm phường, xã').click()
    const taken = page.getByRole('option', { name: /đang thuộc khu khác/ }).first()
    await taken.click()
    await page.getByRole('button', { name: 'Lưu danh sách' }).click()
    await page
      .getByRole('dialog', { name: 'Lưu phường, xã của khu' })
      .getByRole('button', { name: 'Lưu', exact: true })
      .click()
    // Tìm trong thông báo lỗi: danh sách gợi ý (đang ẩn) cũng có chữ "đang thuộc khu khác"
    await page
      .getByRole('alert')
      .getByText(/đang thuộc khu .+ \([A-Z0-9-]+\)/)
      .first()
      .waitFor()
    assert.equal(last('PUT', `/admin/operational-zones/${zoneId}/communes`).status, 409)
    await page.getByRole('button', { name: 'Bỏ thay đổi' }).click()
    assert.equal(await page.getByRole('heading', { name: /^Phường, xã/ }).innerText(), heading)
  })

  test('kho tri thức và cấu hình chatbot: chức năng đang tắt thì báo chưa sẵn sàng, không coi là rỗng', async () => {
    await go('Kho tri thức AI')
    await until(() => last('GET', '/admin/knowledge-documents'), 'GET knowledge')
    if (last('GET', '/admin/knowledge-documents').status === 503) {
      await page.getByText('Kho tri thức chưa sẵn sàng.').waitFor()
      assert.equal(await page.getByRole('button', { name: 'Thêm tài liệu' }).count(), 0)
    } else {
      assert.equal(last('GET', '/admin/knowledge-documents').status, 200)
    }
    await go('Cài đặt hệ thống')
    await page.getByRole('button', { name: 'Cấu hình AI / RAG' }).click()
    await until(() => last('GET', '/admin/rag-configuration'), 'GET rag')
    if (last('GET', '/admin/rag-configuration').status === 503)
      await page.getByText('Cấu hình chatbot chưa sẵn sàng.').waitFor()
  })

  test('ảnh sản phẩm: đọc chi tiết quản trị thật; link http bị chặn trước khi gửi', async () => {
    await go('Sản phẩm')
    const button = page.getByRole('button', { name: /^Ảnh của / }).first()
    await button.click()
    const dialog = page.getByRole('dialog', { name: /^Ảnh của / })
    await until(
      () => responses.some((r) => r.method === 'GET' && /^\/admin\/products\/[^/]+$/.test(r.path)),
      'GET admin product',
    )
    const detail = responses.filter((r) => r.method === 'GET' && /^\/admin\/products\/[^/]+$/.test(r.path)).at(-1)
    assert.equal(detail.status, 200)
    const mark = responses.length
    await dialog.getByLabel('Link ảnh').fill('http://example.com/anh.jpg')
    await dialog.getByRole('button', { name: 'Thêm ảnh' }).click()
    await dialog.getByText('Chỉ nhận link bắt đầu bằng https://.').waitFor()
    assert.equal(since(mark, 'POST', '/admin/products/').length, 0)
    await dialog.getByRole('button', { name: 'Đóng' }).click()
  })

  test('không có lỗi 5xx ngoài chức năng đang tắt, không có lỗi JavaScript', () => {
    const unexpected = responses.filter(
      (r) => r.status >= 500 && !(r.status === 503 && /^\/admin\/(knowledge-documents|rag-configuration)/.test(r.path)),
    )
    assert.deepEqual(unexpected, [])
    assert.deepEqual(
      consoleErrors.filter((e) => !/status of (401|404|409|503)/.test(e)),
      [],
    )
  })
})
