// E2E gói thanh toán 30/70 với BACKEND THẬT (Vite dev, proxy /api tới API_PROXY_TARGET). CHỈ ĐỌC: không mở thanh toán, không
// xác nhận tiền mặt, không tải trang ký, không nghiệm thu. Kiểm danh sách hợp đồng phân trang (lọc gửi lên server), hồ sơ công nợ,
// báo cáo tài chính của quản trị, danh sách hợp đồng của khách, và không có lệnh ghi nào bị gửi. Bỏ qua khi chưa khai tài khoản:
//   E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... E2E_CUSTOMER_EMAIL=... E2E_CUSTOMER_PASSWORD=... \
//   node --test tests/e2e/payment-plan.live.e2e.mjs
// Backend phải chạy bản có gói 30/70 (main 7d27054); bản cũ trả 404 cho /contracts và /collections
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const admin = { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD }
const customer = { email: process.env.E2E_CUSTOMER_EMAIL, password: process.env.E2E_CUSTOMER_PASSWORD }

let server
let browser
let baseUrl

async function startServer() {
  server = await createServer({
    server: { host: '127.0.0.1', port: 3186, strictPort: false, hmr: false, watch: null },
    logLevel: 'error',
  })
  await server.listen()
  baseUrl = server.resolvedUrls.local[0].replace(/\/$/, '')
  browser = await chromium.launch({ channel: 'chromium' })
}

/** Một phiên trình duyệt ghi lại mọi response /api/* */
async function session(account, portal) {
  const context = await browser.newContext({ locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' })
  const page = await context.newPage()
  page.setDefaultTimeout(30_000)
  const responses = []
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
  await page.goto(`${baseUrl}/login`, { timeout: 120_000 })
  await page.locator('#login-email').fill(account.email)
  await page.locator('#login-password').fill(account.password)
  await page.locator('button[type=submit]').click()
  await page.waitForURL(new RegExp(`/${portal}/`))
  const writes = () => responses.filter((r) => r.method !== 'GET' && !r.path.startsWith('/auth/'))
  const until = async (check, label) => {
    for (let i = 0; i < 150; i++) {
      if (check()) return
      await new Promise((r) => setTimeout(r, 100))
    }
    assert.fail(`hết giờ chờ: ${label}`)
  }
  return { page, responses, writes, until, close: () => context.close() }
}

const skipAdmin = !admin.email || !admin.password ? 'chưa khai E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD' : false
const skipCustomer =
  !customer.email || !customer.password ? 'chưa khai E2E_CUSTOMER_EMAIL / E2E_CUSTOMER_PASSWORD' : false

describe('gói 30/70 với backend thật', { skip: skipAdmin && skipCustomer }, () => {
  before(startServer)
  after(async () => {
    await browser?.close()
    await server?.close()
  })

  test(
    'quản trị: danh sách hợp đồng phân trang, lọc gửi lên server, công nợ, tài chính, không ghi gì',
    { skip: skipAdmin },
    async () => {
      const s = await session(admin, 'admin')
      try {
        await s.page.goto(`${baseUrl}/admin/contracts`)
        await s.until(() => s.responses.some((r) => r.path === '/contracts'), 'GET /contracts')
        const list = s.responses.find((r) => r.path === '/contracts')
        assert.equal(list.status, 200)
        assert.equal(list.query.pageSize, '20')

        await s.page.getByLabel('Cách trả').selectOption('DEPOSIT_30_BALANCE_70')
        await s.until(
          () => s.responses.some((r) => r.path === '/contracts' && r.query.paymentPlan === 'DEPOSIT_30_BALANCE_70'),
          'lọc gói 30/70',
        )
        assert.match(s.page.url(), /goi=DEPOSIT_30_BALANCE_70/)

        await s.page.goto(`${baseUrl}/admin/collections`)
        await s.until(() => s.responses.some((r) => r.path === '/collections'), 'GET /collections')
        const cases = s.responses.find((r) => r.path === '/collections')
        assert.equal(cases.status, 200)
        assert.equal(cases.query.openOnly, 'true')

        await s.page.goto(`${baseUrl}/admin/reports?muc=tai-chinh`)
        await s.until(() => s.responses.some((r) => r.path === '/admin/finance/overview'), 'GET finance')
        const finance = s.responses.find((r) => r.path === '/admin/finance/overview')
        assert.equal(finance.status, 200)
        assert.match(finance.query.from, /^\d{4}-\d{2}-01$/)
        await s.page.getByRole('heading', { name: 'Trong kỳ' }).waitFor()

        assert.deepEqual(s.writes(), [])
      } finally {
        await s.close()
      }
    },
  )

  test(
    'khách: danh sách hợp đồng tải được, không gọi API của luồng cũ đã bỏ, không ghi gì',
    { skip: skipCustomer },
    async () => {
      const s = await session(customer, 'customer')
      try {
        await s.page.goto(`${baseUrl}/customer/contracts`)
        await s.page.getByRole('heading', { level: 1, name: 'Hợp đồng' }).waitFor()
        await s.until(() => s.responses.some((r) => r.path === '/customers/me/contracts'), 'GET contracts')
        assert.equal(s.responses.find((r) => r.path === '/customers/me/contracts').status, 200)
        assert.equal(s.responses.filter((r) => r.status === 410).length, 0, 'không gọi lệnh đã bỏ (410) của luồng cũ')
        assert.deepEqual(s.writes(), [])
      } finally {
        await s.close()
      }
    },
  )
})
