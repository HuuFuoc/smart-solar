// E2E cổng quản lý với BACKEND THẬT (Vite dev, proxy /api tới API_PROXY_TARGET, mặc định http://localhost:8080).
// Chỉ đọc dữ liệu và chỉ bấm các lệnh bị chặn ngay ở giao diện, nên không đổi dữ liệu của DB dùng chung. Bỏ qua khi chưa
// khai tài khoản:
//   E2E_MANAGER_EMAIL=... E2E_MANAGER_PASSWORD=... node --test tests/e2e/manager-portal.live.e2e.mjs
// Cả bộ chạy trong MỘT phiên trình duyệt: backend thu hồi mọi phiên khi một refresh token bị dùng lại
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const email = process.env.E2E_MANAGER_EMAIL
const password = process.env.E2E_MANAGER_PASSWORD
const skip = !email || !password ? 'chưa khai E2E_MANAGER_EMAIL / E2E_MANAGER_PASSWORD' : false

let server
let browser
let page
let baseUrl
/** Mọi response /api/* của phiên: { method, path, query, status } */
const responses = []
const consoleErrors = []

const last = (method, path) => responses.filter((r) => r.method === method && r.path === path).at(-1)
const writes = () => responses.filter((r) => r.method !== 'GET' && !r.path.startsWith('/auth/'))
async function go(label) {
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

describe('cổng quản lý với backend thật', { skip }, () => {
  before(async () => {
    server = await createServer({
      server: { host: '127.0.0.1', port: 3185, strictPort: false, hmr: false, watch: null },
      logLevel: 'error',
    })
    await server.listen()
    baseUrl = server.resolvedUrls.local[0].replace(/\/$/, '')
    browser = await chromium.launch({ channel: 'chromium' })
    const context = await browser.newContext({ locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' })
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

  test('đăng nhập bằng form, vào cổng quản lý', async () => {
    await page.goto(`${baseUrl}/login`, { timeout: 120_000 })
    await page.locator('#login-email').fill(email)
    await page.locator('#login-password').fill(password)
    await page.locator('button[type=submit]').click()
    await page.waitForURL(/\/manage\//)
    assert.equal(last('POST', '/auth/login').status, 200)
  })

  test('hàng việc của kinh doanh: GET tasks thật, lọc trạng thái gửi `status` lên backend', async () => {
    await go('Việc của kinh doanh')
    await page.getByRole('heading', { name: 'Việc của kinh doanh' }).waitFor()
    await until(() => last('GET', '/manager/after-sales/tasks'), 'GET tasks')
    const status = last('GET', '/manager/after-sales/tasks').status
    // 503 FEATURE_PENDING_MIGRATION / SCHEMA_NOT_READY thì giao diện phải báo chưa sẵn sàng, không phải danh sách rỗng
    if (status === 503) {
      await page.getByText('Hàng việc chưa sẵn sàng.').waitFor()
      return
    }
    assert.equal(status, 200)
    await page.getByRole('tab', { name: /^Chưa ai nhận/ }).click()
    await until(
      () => responses.some((r) => r.path === '/manager/after-sales/tasks' && r.query.status === 'OPEN'),
      'GET tasks?status=OPEN',
    )
    assert.equal(
      responses.filter((r) => r.path === '/manager/after-sales/tasks' && r.query.status === 'OPEN').at(-1).status,
      200,
    )
  })

  test('chi tiết yêu cầu: đọc thật, các khối quyết định hiện theo trạng thái', async () => {
    await go('Bảo hành, sửa chữa')
    await page.getByRole('heading', { name: 'Bảo hành, sửa chữa' }).waitFor()
    await until(() => last('GET', '/manager/after-sales/requests'), 'GET requests')
    assert.equal(last('GET', '/manager/after-sales/requests').status, 200)
    const tab = page.getByRole('tab', { name: /^Đang làm/ })
    await tab.click()
    const link = page.locator('main ul li a').first()
    if ((await link.count()) === 0) return
    await link.click()
    await page.getByText('Kết thúc yêu cầu').waitFor()
    const detail = responses.filter((r) => /^\/manager\/after-sales\/requests\/[^/]+$/.test(r.path)).at(-1)
    assert.equal(detail.status, 200)
  })

  test('không có lệnh ghi nào được gửi; không lỗi JavaScript', async () => {
    assert.deepEqual(writes(), [])
    // Trình duyệt tự ghi "Failed to load resource" cho mọi response 4xx/5xx; trạng thái HTTP đã kiểm ở từng bước
    assert.deepEqual(
      consoleErrors.filter((m) => !m.startsWith('Failed to load resource')),
      [],
    )
  })
})
