// E2E gói dịch vụ tính theo tấm pin (backend `main` 763cb0b) với BACKEND THẬT (Vite dev, proxy /api tới API_PROXY_TARGET). CHỈ ĐỌC:
// mở hộp chọn / mua rồi đóng, không chọn gói, không mua, không đối soát. Kiểm: quản lý / quản trị xem gói đi kèm hợp đồng (lọc và phân
// trang ở server), quản trị thấy đơn vị tính giá và tiền thu theo thành phần, khách đọc tấm pin còn mua được, kỹ thuật viên đọc danh mục
// gói theo tấm pin; không lệnh ghi nào bị gửi. Bỏ qua khi chưa khai tài khoản:
//   E2E_MANAGER_EMAIL=... E2E_MANAGER_PASSWORD=... E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... \
//   E2E_CUSTOMER_EMAIL=... E2E_CUSTOMER_PASSWORD=... E2E_CUSTOMER_PAID_CONTRACT=<mã hợp đồng đã trả đủ, đã bàn giao> \
//   E2E_TECHNICIAN_EMAIL=... E2E_TECHNICIAN_PASSWORD=... E2E_TECHNICIAN_DRAFT_JOB=<mã lịch khảo sát có giỏ báo giá nháp> \
//   node --test tests/e2e/per-panel-packages.live.e2e.mjs
// Backend phải chạy bản có gói theo tấm pin (763cb0b); bản cũ trả 404 cho /manager/after-sales/bundled-packages
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const account = (role) => ({
  email: process.env[`E2E_${role}_EMAIL`],
  password: process.env[`E2E_${role}_PASSWORD`],
})
const manager = account('MANAGER')
const admin = account('ADMIN')
const customer = account('CUSTOMER')
const technician = account('TECHNICIAN')
const paidContract = process.env.E2E_CUSTOMER_PAID_CONTRACT
const draftJob = process.env.E2E_TECHNICIAN_DRAFT_JOB

let server
let browser
let baseUrl

async function startServer() {
  server = await createServer({
    server: { host: '127.0.0.1', port: 3187, strictPort: false, hmr: false, watch: null },
    logLevel: 'error',
  })
  await server.listen()
  baseUrl = server.resolvedUrls.local[0].replace(/\/$/, '')
  browser = await chromium.launch({ channel: 'chromium' })
}

/** Một phiên trình duyệt ghi lại mọi response /api/* */
async function session(user, portal) {
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
      json: () => res.json(),
    })
  })
  await page.goto(`${baseUrl}/login`, { timeout: 120_000 })
  await page.locator('#login-email').fill(user.email)
  await page.locator('#login-password').fill(user.password)
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

const missing = (user, role) =>
  !user.email || !user.password ? `chưa khai E2E_${role}_EMAIL / E2E_${role}_PASSWORD` : false
const skipManager = missing(manager, 'MANAGER')
const skipAdmin = missing(admin, 'ADMIN')
const skipCustomer = missing(customer, 'CUSTOMER') || (!paidContract && 'chưa khai E2E_CUSTOMER_PAID_CONTRACT')
const skipTechnician = missing(technician, 'TECHNICIAN') || (!draftJob && 'chưa khai E2E_TECHNICIAN_DRAFT_JOB')

describe(
  'gói theo tấm pin với backend thật',
  { skip: skipManager && skipAdmin && skipCustomer && skipTechnician },
  () => {
    before(startServer)
    after(async () => {
      await browser?.close()
      await server?.close()
    })

    test(
      'quản lý: gói đi kèm hợp đồng lọc theo trạng thái và phân trang ở server, không ghi gì',
      { skip: skipManager },
      async () => {
        const s = await session(manager, 'manage')
        try {
          await s.page.goto(`${baseUrl}/manage/bundled-packages`)
          await s.page.getByRole('heading', { level: 1, name: 'Gói dịch vụ đi kèm hợp đồng' }).waitFor()
          await s.until(
            () => s.responses.some((r) => r.path === '/manager/after-sales/bundled-packages'),
            'GET bundled',
          )
          const first = s.responses.find((r) => r.path === '/manager/after-sales/bundled-packages')
          assert.equal(first.status, 200)
          assert.equal(first.query.status, 'RECONCILIATION_REQUIRED')
          assert.equal(first.query.page, '1')
          assert.equal(first.query.pageSize, '20')

          await s.page.getByRole('tab', { name: 'Tất cả' }).click()
          await s.until(
            () => s.responses.some((r) => r.path === '/manager/after-sales/bundled-packages' && !('status' in r.query)),
            'lọc tất cả',
          )
          assert.deepEqual(s.writes(), [])
        } finally {
          await s.close()
        }
      },
    )

    test('quản trị: đơn vị tính giá của gói, tiền thu theo thành phần, không ghi gì', { skip: skipAdmin }, async () => {
      const s = await session(admin, 'admin')
      try {
        await s.page.goto(`${baseUrl}/admin/packages`)
        await s.until(() => s.responses.some((r) => r.path === '/admin/after-sales/packages'), 'GET packages')
        const list = await s.responses.find((r) => r.path === '/admin/after-sales/packages').json()
        assert.ok(list.data.every((p) => p.pricingUnit === 'PER_PANEL' || p.pricingUnit === 'PER_INSTALLATION_LEGACY'))
        await s.page.getByRole('button', { name: 'Thêm gói' }).first().click()
        await s.page.getByText('Đơn vị tính giá', { exact: true }).waitFor()
        await s.page.getByRole('button', { name: 'Huỷ' }).click()

        await s.page.goto(`${baseUrl}/admin/bundled-packages`)
        await s.until(() => s.responses.some((r) => r.path === '/manager/after-sales/bundled-packages'), 'GET bundled')
        assert.equal(s.responses.find((r) => r.path === '/manager/after-sales/bundled-packages').status, 200)

        await s.page.goto(`${baseUrl}/admin/dashboard`)
        await s.until(() => s.responses.some((r) => r.path === '/admin/finance/overview'), 'GET finance')
        const finance = await s.responses.find((r) => r.path === '/admin/finance/overview').json()
        if (Array.isArray(finance.data.collectedByComponent))
          await s.page.getByRole('heading', { name: 'Tiền đã thu theo thành phần' }).waitFor()
        assert.deepEqual(s.writes(), [])
      } finally {
        await s.close()
      }
    })

    test(
      'khách: hộp mua theo tấm pin đọc số tấm còn mua được của backend, không mua',
      { skip: skipCustomer },
      async () => {
        const s = await session(customer, 'customer')
        try {
          await s.page.goto(`${baseUrl}/customer/packages`)
          await s.until(() => s.responses.some((r) => r.path === '/customers/me/after-sales/subscriptions'), 'GET subs')
          await s.until(() => s.responses.some((r) => r.path === '/customers/me/after-sales/packages'), 'GET packages')
          const perPanel = s.page.getByText('/tấm pin').first()
          if (await perPanel.count()) {
            const card = s.page.locator('article').filter({ hasText: '/tấm pin' }).first()
            await card.getByRole('button', { name: /Mua gói/ }).click()
            await s.page.locator('#panel-purchase-contract').selectOption(paidContract)
            await s.until(
              () =>
                s.responses.some(
                  (r) => r.path === `/customers/me/after-sales/contracts/${paidContract}/panel-coverage`,
                ),
              'GET panel-coverage',
            )
            assert.equal(s.responses.find((r) => r.path.endsWith(`${paidContract}/panel-coverage`)).status, 200)
            await s.page.getByRole('button', { name: 'Huỷ' }).click()
          }
          assert.deepEqual(s.writes(), [])
        } finally {
          await s.close()
        }
      },
    )

    test(
      'kỹ thuật viên: hộp chọn gói đọc danh mục gói theo tấm pin, không chọn gói',
      { skip: skipTechnician },
      async () => {
        const s = await session(technician, 'tech')
        try {
          await s.page.goto(`${baseUrl}/tech/jobs/${draftJob}`)
          await s.page.getByRole('heading', { name: 'Gói dịch vụ đi kèm' }).waitFor()
          const choose = s.page.getByRole('button', { name: /Chọn gói/ }).first()
          if (await choose.isEnabled()) {
            await choose.click()
            await s.until(() => s.responses.some((r) => r.path === '/technician/service-packages'), 'GET catalog')
            const catalog = s.responses.find((r) => r.path === '/technician/service-packages')
            assert.equal(catalog.status, 200)
            assert.ok((await catalog.json()).data.every((p) => p.pricingUnit === 'PER_PANEL' && p.isActive))
            await s.page.getByRole('button', { name: 'Đóng' }).last().click()
          }
          assert.deepEqual(s.writes(), [])
        } finally {
          await s.close()
        }
      },
    )
  },
)
