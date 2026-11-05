// Phần dùng chung mọi cổng với BACKEND THẬT. Hai phần:
// 1. Không cần tài khoản: danh mục hành chính là API công khai nên đối chiếu thẳng response (mã tỉnh 79, mã phường mới khác
//    mã cũ, truncated, lỗi q ngắn); 3 endpoint chat phải trả 401 khi không có token (route có, cần đăng nhập), khác 404.
//    Bỏ qua khi không gọi được API_BASE (mặc định http://localhost:8080).
// 2. Có tài khoản: mở trang Trợ lý qua giao diện (Vite dev, proxy /api) và ghi lại backend đang bật chatbot hay chưa. Chỉ đọc;
//    chỉ gửi câu hỏi (ghi một phiên vào DB dùng chung) khi khai thêm E2E_CHAT_WRITE=1.
//    E2E_CUSTOMER_EMAIL=... E2E_CUSTOMER_PASSWORD=... node --test tests/e2e/shared-portal.live.e2e.mjs
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const apiBase = (process.env.API_BASE ?? 'http://localhost:8080').replace(/\/$/, '')
const email = process.env.E2E_CUSTOMER_EMAIL
const password = process.env.E2E_CUSTOMER_PASSWORD
const allowWrite = process.env.E2E_CHAT_WRITE === '1'
const ID = '00000000-0000-0000-0000-000000000001'

async function reachable() {
  try {
    const res = await fetch(`${apiBase}/swagger/v1/swagger.json`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

const getJson = async (path) => {
  const res = await fetch(`${apiBase}/api${path}`)
  return { status: res.status, headers: res.headers, body: await res.json().catch(() => null) }
}

describe('backend thật: danh mục hành chính (công khai)', async () => {
  const skip = (await reachable()) ? false : `không gọi được ${apiBase}`

  test('provinces có mã 79 "Thành phố Hồ Chí Minh"', { skip }, async () => {
    const { status, body } = await getJson('/administrative-units/provinces')
    assert.equal(status, 200)
    const hcm = body.data.find((p) => p.code === '79')
    assert.deepEqual(hcm, { code: '79', name: 'Thành phố Hồ Chí Minh', unitType: 'MUNICIPALITY' })
  })

  test(
    'legacy-lookup: candidate.code là mã phường MỚI (Phường 9, Quận 10 → 27190), luôn requiresConfirmation',
    { skip },
    async () => {
      const { status, body } = await getJson(
        `/administrative-units/legacy-lookup?q=${encodeURIComponent('phuong 9')}&provinceCode=79`,
      )
      assert.equal(status, 200)
      assert.equal(body.data.requiresConfirmation, true)
      const q10 = body.data.matches.find((m) => m.legacyDistrict.name === 'Quận 10')
      assert.equal(q10.legacyCommune.code, '27181')
      assert.deepEqual(
        q10.candidates.map((c) => [c.code, c.name]),
        [['27190', 'Phường Vườn Lài']],
      )
      for (const m of body.data.matches) assert.ok(m.candidates.every((c) => c.provinceCode === '79'))
    },
  )

  test(
    'legacy-lookup: tối đa 50 kết quả kèm truncated; q dưới 2 ký tự là 400 VALIDATION_FAILED ở ô q',
    { skip },
    async () => {
      const many = await getJson('/administrative-units/legacy-lookup?q=phuong&provinceCode=79')
      assert.equal(many.status, 200)
      assert.equal(many.body.data.matches.length, 50)
      assert.equal(many.body.data.truncated, true)
      const short = await getJson('/administrative-units/legacy-lookup?q=a&provinceCode=79')
      assert.equal(short.status, 400)
      assert.equal(short.body.error.code, 'VALIDATION_FAILED')
      assert.ok(short.body.error.details.q)
    },
  )

  for (const [method, path] of [
    ['POST', '/chat/messages'],
    ['GET', '/chat/sessions'],
    ['GET', `/chat/sessions/${ID}`],
  ])
    test(`${method} ${path} cần đăng nhập (401)`, { skip }, async () => {
      const res = await fetch(`${apiBase}/api${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'GET' ? undefined : '{}',
      })
      assert.equal(res.status, 401)
    })
  test('đối chứng: route không có trả 404', { skip }, async () => {
    const res = await fetch(`${apiBase}/api/chat/khong-co-route`)
    assert.equal(res.status, 404)
  })
})

describe(
  'trang Trợ lý với backend thật (chỉ đọc)',
  { skip: !email || !password ? 'chưa khai E2E_CUSTOMER_EMAIL / E2E_CUSTOMER_PASSWORD' : false },
  () => {
    let server
    let browser
    let page
    const responses = []

    before(async () => {
      process.env.API_PROXY_TARGET ??= apiBase
      server = await createServer({
        server: { host: '127.0.0.1', port: 3192, strictPort: false, hmr: false, watch: null },
        logLevel: 'error',
      })
      await server.listen()
      const baseUrl = server.resolvedUrls.local[0].replace(/\/$/, '')
      browser = await chromium.launch({ channel: 'chromium' })
      page = await (await browser.newContext({ locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' })).newPage()
      page.setDefaultTimeout(30_000)
      page.on('response', async (res) => {
        const u = new URL(res.url())
        if (!u.pathname.startsWith('/api/chat/')) return
        const body = await res.json().catch(() => null)
        responses.push({
          method: res.request().method(),
          path: u.pathname,
          status: res.status(),
          code: body?.error?.code ?? null,
          body,
        })
      })
      await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
      await page.locator('#login-email').fill(email)
      await page.locator('#login-password').fill(password)
      await page.locator('button[type="submit"]').click()
      await page.waitForURL(/\/customer/, { timeout: 60_000 })
      await page.getByRole('link', { name: 'Trợ lý', exact: true }).first().click()
      await page.getByRole('heading', { name: 'Trợ lý', exact: true }).waitFor()
    })

    after(async () => {
      await browser?.close()
      await server?.close()
    })

    test('GET /chat/sessions: chatbot tắt thì trang báo chưa sẵn sàng; bật thì có danh sách và ô hỏi', async () => {
      for (let i = 0; i < 100 && !responses.some((r) => r.path === '/api/chat/sessions'); i++)
        await new Promise((r) => setTimeout(r, 100))
      const res = responses.find((r) => r.path === '/api/chat/sessions')
      assert.ok(res, 'trang đã gọi GET /api/chat/sessions')
      console.log(`GET /api/chat/sessions → ${res.status} ${res.code ?? ''}`)
      if (res.status === 503) {
        assert.ok(['FEATURE_PENDING_MIGRATION', 'SCHEMA_NOT_READY'].includes(res.code))
        await page.getByText('Trợ lý chưa sẵn sàng.').waitFor()
        if (res.body?.error?.details?.pendingMigrations)
          console.log('pendingMigrations:', res.body.error.details.pendingMigrations.join(', '))
        return
      }
      assert.equal(res.status, 200)
      assert.ok(Array.isArray(res.body.data))
      await page.getByRole('textbox', { name: 'Câu hỏi cho trợ lý' }).waitFor()
    })

    test(
      'gửi một câu hỏi (ghi vào DB dùng chung)',
      { skip: allowWrite ? false : 'chưa khai E2E_CHAT_WRITE=1' },
      async () => {
        const box = page.getByRole('textbox', { name: 'Câu hỏi cho trợ lý' })
        await box.fill('Tấm pin được bảo hành bao lâu?')
        await box.press('Enter')
        for (let i = 0; i < 900 && !responses.some((r) => r.method === 'POST'); i++)
          await new Promise((r) => setTimeout(r, 100))
        const post = responses.find((r) => r.method === 'POST')
        console.log(`POST /api/chat/messages → ${post.status} ${post.code ?? ''}`)
        if (post.status !== 200) return
        const data = post.body.data
        assert.equal(typeof data.notice, 'string')
        await page.getByText(data.notice).waitFor()
        await page.waitForURL(new RegExp(`phien=${data.sessionId}`))
      },
    )
  },
)
