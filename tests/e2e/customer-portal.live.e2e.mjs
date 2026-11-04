// Cổng khách hàng với BACKEND THẬT. Hai phần:
// 1. Dò route (không cần tài khoản): 11 endpoint của cổng khách phải trả 401 khi không có token (route có, cần đăng nhập),
//    khác 404 của route không tồn tại. Bỏ qua khi không gọi được API_BASE (mặc định http://localhost:8080).
// 2. Đọc dữ liệu thật qua giao diện (Vite dev, proxy /api), không gửi lệnh ghi nào lên DB dùng chung. Bỏ qua khi chưa khai:
//    E2E_CUSTOMER_EMAIL=... E2E_CUSTOMER_PASSWORD=... node --test tests/e2e/customer-portal.live.e2e.mjs
// Ký, thanh toán PayOS, đặt lịch, xin xét lại, sửa phường xã là lệnh ghi: chạy tay theo docs/api/customer-portal-verification.md
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const apiBase = (process.env.API_BASE ?? 'http://localhost:8080').replace(/\/$/, '')
const email = process.env.E2E_CUSTOMER_EMAIL
const password = process.env.E2E_CUSTOMER_PASSWORD
const ID = '00000000-0000-0000-0000-000000000001'

async function reachable() {
  try {
    const res = await fetch(`${apiBase}/swagger/v1/swagger.json`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

const ENDPOINTS = [
  ['GET', `/customers/me/contracts/${ID}`],
  ['POST', `/customers/me/contracts/${ID}/signed-document`],
  ['POST', `/customers/me/contracts/${ID}/payments`],
  ['GET', `/customers/me/contracts/${ID}/payments`],
  ['POST', `/customers/me/contracts/${ID}/payments/cancel`],
  ['POST', `/customers/me/after-sales/maintenance/${ID}/book`],
  ['POST', `/customers/me/after-sales/requests/${ID}/reschedule`],
  ['POST', `/customers/me/after-sales/requests/${ID}/reconsideration`],
  ['POST', `/customers/me/after-sales/requests/${ID}/report-fault`],
  ['GET', '/customers/me/after-sales/notifications'],
  ['PUT', `/customers/me/sites/${ID}/administrative-location`],
]

describe('backend thật: 11 route của cổng khách tồn tại và cần đăng nhập', async () => {
  const skip = (await reachable()) ? false : `không gọi được ${apiBase}`
  for (const [method, path] of ENDPOINTS)
    test(`${method} ${path}`, { skip }, async () => {
      const res = await fetch(`${apiBase}/api${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'GET' ? undefined : '{}',
      })
      assert.equal(res.status, 401, `${method} ${path} trả ${res.status}`)
    })
  test('đối chứng: route không có trả 404', { skip }, async () => {
    const res = await fetch(`${apiBase}/api/customers/me/khong-co-route`)
    assert.equal(res.status, 404)
  })
})

describe(
  'cổng khách với backend thật (chỉ đọc)',
  { skip: !email || !password ? 'chưa khai E2E_CUSTOMER_EMAIL / E2E_CUSTOMER_PASSWORD' : false },
  () => {
    let server
    let browser
    let page
    let baseUrl
    const responses = []
    const last = (method, path) => responses.filter((r) => r.method === method && r.path === path).at(-1)
    async function until(check, label) {
      for (let i = 0; i < 150; i++) {
        if (check()) return
        await new Promise((r) => setTimeout(r, 100))
      }
      assert.fail(`hết giờ chờ: ${label}`)
    }

    before(async () => {
      server = await createServer({ server: { port: 3186, strictPort: false }, logLevel: 'error' })
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
          status: res.status(),
        })
      })
    })

    after(async () => {
      await browser?.close()
      await server?.close()
    })

    test('đăng nhập bằng form, vào cổng khách hàng', async () => {
      await page.goto(`${baseUrl}/login`, { timeout: 120_000 })
      await page.locator('#login-email').fill(email)
      await page.locator('#login-password').fill(password)
      await page.locator('button[type=submit]').click()
      await page.waitForURL(/\/customer\//)
    })

    test('danh sách và chi tiết hợp đồng, trạng thái thanh toán: đọc thật, lỗi không thành danh sách rỗng', async () => {
      await page.goto(`${baseUrl}/customer/contracts`)
      await page.getByRole('heading', { name: 'Hợp đồng', exact: true }).waitFor()
      await until(() => last('GET', '/customers/me/contracts'), 'GET contracts')
      const list = last('GET', '/customers/me/contracts')
      if (list.status !== 200) {
        await page
          .getByText(/Không tải được|chưa sẵn sàng|Không tìm thấy/)
          .first()
          .waitFor()
        return
      }
      const open = page.getByRole('link', { name: 'Xem hợp đồng' }).first()
      if ((await open.count()) === 0) return
      await open.click()
      await page.waitForURL(/\/customer\/contracts\//)
      const id = page.url().split('/').pop()
      await until(() => last('GET', `/customers/me/contracts/${id}`), 'GET contract')
      assert.equal(last('GET', `/customers/me/contracts/${id}`).status, 200)
    })

    test('thông báo trong ứng dụng: đọc thật', async () => {
      await page.goto(`${baseUrl}/customer/notifications`)
      await page.getByRole('heading', { name: 'Thông báo' }).waitFor()
      await until(() => last('GET', '/customers/me/after-sales/notifications'), 'GET notifications')
      assert.ok([200, 503].includes(last('GET', '/customers/me/after-sales/notifications').status))
    })
  },
)
