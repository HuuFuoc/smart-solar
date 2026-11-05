// E2E cổng kỹ thuật viên với BACKEND THẬT (Vite dev, proxy /api tới API_PROXY_TARGET, mặc định http://localhost:8080).
// Chỉ đọc dữ liệu và chỉ bấm các lệnh bị chặn ngay ở giao diện, nên không đổi dữ liệu của DB dùng chung (không nhận lịch,
// không gửi bổ sung biên bản, không sửa luôn / kết thúc buổi chờ). Bỏ qua khi chưa khai tài khoản:
//   E2E_TECH_EMAIL=... E2E_TECH_PASSWORD=... node --test tests/e2e/tech-portal.live.e2e.mjs
// Cả bộ chạy trong MỘT phiên trình duyệt: backend thu hồi mọi phiên khi một refresh token bị dùng lại
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const email = process.env.E2E_TECH_EMAIL
const password = process.env.E2E_TECH_PASSWORD
const skip = !email || !password ? 'chưa khai E2E_TECH_EMAIL / E2E_TECH_PASSWORD' : false

let server
let browser
let page
let baseUrl
/** Mọi response /api/* của phiên: { method, path, status } */
const responses = []
const consoleErrors = []

const last = (method, re) => responses.filter((r) => r.method === method && re.test(r.path)).at(-1)
const writes = () => responses.filter((r) => r.method !== 'GET' && !r.path.startsWith('/auth/'))
async function until(check, label) {
  for (let i = 0; i < 150; i++) {
    if (check()) return
    await new Promise((r) => setTimeout(r, 100))
  }
  assert.fail(`hết giờ chờ: ${label}`)
}

describe('cổng kỹ thuật viên với backend thật', { skip }, () => {
  before(async () => {
    server = await createServer({
      server: { host: '127.0.0.1', port: 3196, strictPort: false, hmr: false, watch: null },
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
      responses.push({ method: res.request().method(), path: url.pathname.replace(/^\/api/, ''), status: res.status() })
    })
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
    page.on('pageerror', (e) => consoleErrors.push(e.message))
  })

  after(async () => {
    await browser?.close()
    await server?.close()
  })

  test('đăng nhập bằng form, vào cổng kỹ thuật viên', async () => {
    await page.goto(`${baseUrl}/login`, { timeout: 120_000, waitUntil: 'domcontentloaded' })
    await page.locator('#login-email').fill(email)
    await page.locator('#login-password').fill(password)
    await page.locator('button[type=submit]').click()
    await page.waitForURL(/\/tech\//)
  })

  test('lịch chờ nhận: mở chi tiết thật (GET open-appointments/{id}), không bấm Nhận việc', async () => {
    await page.goto(`${baseUrl}/tech/jobs`, { waitUntil: 'domcontentloaded' })
    await until(() => last('GET', /^\/technicians\/me\/open-appointments$/), 'GET danh sách chờ nhận')
    assert.equal(last('GET', /^\/technicians\/me\/open-appointments$/).status, 200)
    await page.getByRole('tab', { name: /^Chờ nhận/ }).click()
    const link = page.locator('main a[href*="/tech/jobs/open/"]').first()
    if ((await link.count()) === 0) return
    await link.click()
    await until(() => last('GET', /^\/technicians\/me\/open-appointments\/[^/]+$/), 'GET chi tiết')
    const status = last('GET', /^\/technicians\/me\/open-appointments\/[^/]+$/).status
    // 404 khi lịch vừa có người nhận: giao diện phải nói "không còn chờ nhận", không hiện nút Nhận việc
    if (status === 404) await page.getByText('Lịch này không còn chờ nhận').waitFor()
    else assert.equal(status, 200)
  })

  test('biên bản đã hoàn thành: mở form bổ sung, lý do trống bị chặn ở máy, không gửi', async () => {
    await page.goto(`${baseUrl}/tech/jobs`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('tab', { name: /^Đã qua/ }).click()
    const link = page.getByRole('link', { name: 'Xem chi tiết' }).first()
    if ((await link.count()) === 0) return
    await link.click()
    await until(() => last('GET', /^\/technicians\/me\/appointments\/[^/]+\/onsite-survey$/), 'GET biên bản')
    const amend = page.getByRole('button', { name: 'Bổ sung biên bản' })
    if ((await amend.count()) === 0) return
    await amend.click()
    await page.getByRole('button', { name: 'Gửi bổ sung' }).click()
    await page.getByText('Ghi lý do bổ sung.').waitFor()
    await page.getByRole('button', { name: 'Huỷ' }).click()
  })

  test('buổi hẹn sau bán: đọc thật; buổi đang chờ tại công trình thì số phút sai bị chặn ở máy, không gửi', async () => {
    await page.goto(`${baseUrl}/tech/after-sales`, { waitUntil: 'domcontentloaded' })
    await until(() => last('GET', /^\/technicians\/me\/after-sales\/visits$/), 'GET buổi hẹn')
    const list = last('GET', /^\/technicians\/me\/after-sales\/visits$/).status
    // InstallationWorkflow tắt thì 503 FEATURE_PENDING_MIGRATION: không coi là danh sách rỗng
    assert.ok([200, 503].includes(list), `GET visits trả ${list}`)
    if (list !== 200) return
    const link = page.locator('main a[href*="/tech/after-sales/"]').first()
    if ((await link.count()) === 0) return
    await link.click()
    await until(() => last('GET', /^\/technicians\/me\/after-sales\/visits\/[^/]+$/), 'GET chi tiết')
    assert.equal(last('GET', /^\/technicians\/me\/after-sales\/visits\/[^/]+$/).status, 200)
    const proceed = page.getByRole('button', { name: 'Sửa luôn' })
    if ((await proceed.count()) === 0) return
    await page.locator('#repair-minutes').fill('0')
    await proceed.click()
    await page.getByText('Nhập số phút nguyên từ 1 đến 480.').waitFor()
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
