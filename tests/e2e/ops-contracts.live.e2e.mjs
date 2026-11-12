// E2E cổng kinh doanh với BACKEND THẬT (Vite dev, proxy /api tới API_PROXY_TARGET, mặc định http://localhost:8080).
// Chỉ đọc dữ liệu, không gửi lệnh ghi nào lên DB dùng chung. Bỏ qua khi chưa khai tài khoản kinh doanh:
//   E2E_SALES_EMAIL=... E2E_SALES_PASSWORD=... [E2E_SURVEY_REQUEST_ID=<yêu cầu đã có báo giá khách đồng ý>] \
//   node --test tests/e2e/ops-contracts.live.e2e.mjs
// Luồng ghi đầy đủ (lập → phát hành → PDF → gửi ký → duyệt → PayOS) cần dữ liệu và PayOS thật, chạy tay theo
// docs/api/ops-contracts-verification.md
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const email = process.env.E2E_SALES_EMAIL
const password = process.env.E2E_SALES_PASSWORD
const surveyRequestId = process.env.E2E_SURVEY_REQUEST_ID
const skip = !email || !password ? 'chưa khai E2E_SALES_EMAIL / E2E_SALES_PASSWORD' : false

let server
let browser
let page
let baseUrl
/** Mọi response /api/* của phiên: { method, path, query, status } */
const responses = []

const last = (method, path) => responses.filter((r) => r.method === method && r.path === path).at(-1)

async function until(check, label) {
  for (let i = 0; i < 150; i++) {
    if (check()) return
    await new Promise((r) => setTimeout(r, 100))
  }
  assert.fail(`hết giờ chờ: ${label}`)
}

describe('cổng kinh doanh với backend thật (chỉ đọc)', { skip }, () => {
  before(async () => {
    server = await createServer({ server: { host: '127.0.0.1', port: 3185, strictPort: false }, logLevel: 'error' })
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
  })

  after(async () => {
    await browser?.close()
    await server?.close()
  })

  test('đăng nhập bằng form, vào cổng kinh doanh', async () => {
    await page.goto(`${baseUrl}/login`, { timeout: 120_000 })
    await page.locator('#login-email').fill(email)
    await page.locator('#login-password').fill(password)
    await page.locator('button[type=submit]').click()
    await page.waitForURL(/\/ops\//)
    assert.equal(last('POST', '/auth/login').status, 200)
  })

  test('hàng việc sau bán: đọc thật, không coi lỗi là danh sách rỗng', async () => {
    await page.goto(`${baseUrl}/ops/after-sales`)
    await page.getByRole('heading', { name: 'Bảo hành, sửa chữa' }).waitFor()
    await until(() => last('GET', '/sales/after-sales/tasks/mine'), 'GET tasks/mine')
    const status = last('GET', '/sales/after-sales/tasks/mine').status
    if (status !== 200) await page.getByRole('alert').first().waitFor()
  })

  test(
    'khối hợp đồng của yêu cầu và trang hợp đồng: đọc thật',
    { skip: !surveyRequestId && 'chưa khai E2E_SURVEY_REQUEST_ID' },
    async () => {
      await page.goto(`${baseUrl}/ops/surveys/${surveyRequestId}`)
      await page.getByRole('heading', { name: 'Hợp đồng' }).waitFor()
      await until(() => last('GET', `/survey-requests/${surveyRequestId}/contracts`), 'GET contracts')
      const list = last('GET', `/survey-requests/${surveyRequestId}/contracts`)
      assert.ok([200, 503].includes(list.status), `GET contracts trả ${list.status}`)
      const open = page.locator('#contracts').getByRole('link', { name: 'Mở' }).first()
      if (list.status === 200 && (await open.count()) > 0) {
        await open.click()
        await page.waitForURL(/\/ops\/contracts\//)
        // Địa chỉ đổi trước khi trang mới hiện, lúc đó tiêu đề khối "Hợp đồng <trạng thái>" của trang cũ cũng khớp
        await page.getByRole('heading', { level: 1, name: /^Hợp đồng / }).waitFor()
        const id = page.url().split('/').pop()
        await until(() => last('GET', `/contracts/${id}`), 'GET hợp đồng')
        assert.equal(last('GET', `/contracts/${id}`).status, 200)
      }
    },
  )
})
