// E2E phần dùng chung mọi cổng trên giao diện thật (Vite dev + Chromium): trợ lý (chat) và tra địa chỉ cũ. Backend là bản giả
// (mock-shared-api.mjs xếp trên mock-customer-api.mjs, page.route). Đây là test với API giả: chứng minh luồng giao diện và
// request gửi đi đúng hợp đồng, KHÔNG chứng minh backend thật chạy (phần chạy với backend thật: shared-portal.live.e2e.mjs).
// Chạy: node --test tests/e2e/shared-portal.e2e.mjs
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { createCustomerState, installCustomerMockApi, SITE, SR } from './mock-customer-api.mjs'
import {
  createSharedState,
  fail,
  INSUFFICIENT,
  installSharedMockApi,
  NOTICE,
  rateLimited,
  seedSession,
  UNITS,
} from './mock-shared-api.mjs'

let server
let browser
let baseUrl

const ADMIN = { sub: 'admin-1', role: 'ADMIN' }

before(async () => {
  server = await createServer({ server: { port: 3191, strictPort: false, hmr: false, watch: null }, logLevel: 'error' })
  await server.listen()
  baseUrl = server.resolvedUrls.local[0].replace(/\/$/, '')
  browser = await chromium.launch({ channel: 'chromium' })
  // Lần mở đầu Vite biên dịch mọi module: làm nóng trước khi chạy test
  for (const [user, path] of [
    [undefined, '/customer/assistant'],
    [ADMIN, '/admin/assistant'],
  ]) {
    const warm = await open(createSharedState(user ? { currentUser: user } : {}), path)
    await warm.getByRole('heading', { name: 'Trợ lý', exact: true }).waitFor({ timeout: 120_000 })
    await warm.context().close()
  }
})

after(async () => {
  await browser?.close()
  await server?.close()
})

/** Trang đã đăng nhập bằng refresh token giả; /auth/refresh cấp JWT cho `shared.currentUser` */
async function open(shared, path, { customer = createCustomerState(), storage = {} } = {}) {
  const context = await browser.newContext({ locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' })
  await context.addInitScript((extra) => {
    localStorage.setItem('smart-solar.refresh-token', 'refresh-1')
    localStorage.setItem('smart-solar.refresh-store', 'local')
    for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v)
  }, storage)
  const page = await context.newPage()
  page.setDefaultTimeout(15_000)
  await installCustomerMockApi(context, customer)
  await installSharedMockApi(context, shared)
  await goto(page, path)
  return page
}

// Không chờ sự kiện load: font icon tải từ Google Fonts có lúc chậm, không liên quan tới luồng đang kiểm
const goto = (page, path) => page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
const sent = (state, method, path) => state.requests.filter((r) => r.method === method && r.path === path)
const waitFor = async (check, label, ms = 10_000) => {
  for (let i = 0; i < ms / 100; i++) {
    if (await check()) return
    await new Promise((r) => setTimeout(r, 100))
  }
  assert.fail(`hết giờ chờ: ${label}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const composer = (page) => page.getByRole('textbox', { name: 'Câu hỏi cho trợ lý' })
const thread = (page) => page.getByRole('list', { name: 'Nội dung cuộc trò chuyện' })

describe('Trợ lý: luồng chính', () => {
  test('mở từ menu cổng khách → hỏi → câu trả lời, nguồn, notice → hỏi tiếp cùng phiên → tải lại vẫn đúng phiên', async () => {
    const shared = createSharedState()
    const older = seedSession(shared, 'cust-1', 'Inverter bảo hành mấy năm?', ['Inverter bảo hành mấy năm?'])
    shared.chat.delayMs = 700
    const page = await open(shared, `/customer/requests/${SR}`)
    await page.getByRole('link', { name: 'Trợ lý', exact: true }).first().click()
    await page.getByRole('heading', { name: 'Trợ lý', exact: true }).waitFor()
    await page.getByRole('link', { name: /Inverter bảo hành mấy năm\?/ }).waitFor()

    await composer(page).fill('  Tấm pin được bảo hành bao lâu?  ')
    await composer(page).press('Enter')
    // Đang gửi: khoá nút, Enter lần nữa không gửi thêm, câu hỏi hiện "Đang gửi" (chưa vào lịch sử)
    await page.getByRole('button', { name: 'Đang gửi…' }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Đang gửi…' }).isDisabled(), true)
    await composer(page).press('Enter')
    await page.getByText('Trợ lý đang trả lời…').waitFor()

    await page.getByText('Tấm pin được bảo hành sản phẩm 12 năm, hiệu suất 25 năm [1].').waitFor()
    const posts = sent(shared, 'POST', '/chat/messages')
    assert.equal(posts.length, 1, 'bấm lặp khi đang gửi không gửi thêm')
    assert.equal(posts[0].body.message, 'Tấm pin được bảo hành bao lâu?')
    assert.equal(posts[0].body.sessionId, null)
    assert.match(posts[0].body.clientMessageId, /^[0-9a-f-]{36}$/)
    await page.getByText('Chính sách bảo hành Smart Solar').waitFor()
    await page.getByText('. Phiên bản 2, trang 4, mục Tấm pin').waitFor()
    assert.equal(
      await page.getByRole('link', { name: 'Chính sách bảo hành Smart Solar' }).count(),
      0,
      'khách không mở được tài liệu',
    )
    await page.getByText(NOTICE).waitFor()
    await page.getByText('Trích đoạn').click()
    await page.getByText('Tấm pin được bảo hành sản phẩm 12 năm và hiệu suất 25 năm').waitFor()

    const created = shared.chat.sessions.find((s) => s.title === 'Tấm pin được bảo hành bao lâu?')
    await page.waitForURL(new RegExp(`phien=${created.sessionId}`))
    assert.equal(await composer(page).inputValue(), '', 'trả lời xong mới xoá ô hỏi')

    // grounded = false: hiện đúng câu của backend + nhãn, không có nguồn
    await composer(page).fill('Có hỗ trợ trả góp không?')
    await page.getByRole('button', { name: 'Gửi', exact: true }).click()
    await page.getByText('Chưa có tài liệu đã công bố hỗ trợ câu trả lời này').waitFor()
    await thread(page).getByText(INSUFFICIENT).waitFor()
    assert.equal(sent(shared, 'POST', '/chat/messages')[1].body.sessionId, created.sessionId)
    assert.equal(await thread(page).getByText('Nguồn', { exact: true }).count(), 1, 'chỉ câu có tài liệu mới có nguồn')

    // Tải lại: lịch sử lấy từ backend, phiên đang mở được đánh dấu
    await page.reload({ waitUntil: 'domcontentloaded' })
    await thread(page).getByText('Có hỗ trợ trả góp không?').waitFor()
    await thread(page).getByText('Chính sách bảo hành Smart Solar').waitFor()
    const current = page.getByRole('link', { name: /Tấm pin được bảo hành bao lâu\?/ })
    assert.equal(await current.getAttribute('aria-current'), 'page')

    // Mở lại phiên cũ
    await page.getByRole('link', { name: /Inverter bảo hành mấy năm\?/ }).click()
    await page.waitForURL(new RegExp(`phien=${older.sessionId}`))
    await thread(page).getByText('Inverter bảo hành mấy năm?').waitFor()
    assert.ok(sent(shared, 'GET', `/chat/sessions/${older.sessionId}`).length >= 1)
    await page.context().close()
  })

  test('cổng nhân viên dùng cùng module: quản trị hỏi được, nguồn dẫn sang tài liệu trong Kho tri thức; mọi cổng có trang', async () => {
    const shared = createSharedState({ currentUser: ADMIN })
    const page = await open(shared, '/admin/knowledge-base')
    await page.getByRole('link', { name: 'Trợ lý', exact: true }).first().click()
    await composer(page).fill('Điều kiện bảo hành tấm pin?')
    await page.getByRole('button', { name: 'Gửi', exact: true }).click()
    const link = page.getByRole('link', { name: 'Chính sách bảo hành Smart Solar' })
    await link.waitFor()
    assert.equal(await link.getAttribute('href'), '/admin/knowledge-base/doc-warranty')
    await page.context().close()

    for (const [role, path] of [
      ['TECHNICIAN', '/tech/assistant'],
      ['SALES', '/ops/assistant'],
      ['MANAGER', '/manage/assistant'],
    ]) {
      const staff = createSharedState({ currentUser: { sub: `${role}-1`, role } })
      const p = await open(staff, path)
      await p.getByRole('heading', { name: 'Trợ lý', exact: true }).waitFor()
      await p.getByText('Chưa có cuộc trò chuyện nào.').waitFor()
      await composer(p).waitFor()
      assert.equal(sent(staff, 'GET', '/chat/sessions').at(-1).user, `${role}-1`)
      await p.context().close()
    }
  })
})

describe('Trợ lý: lỗi, giới hạn, quyền', () => {
  test('429 có Retry-After: báo số giây, đếm ngược, giữ câu, không tự gửi lại; gửi lại dùng cùng clientMessageId', async () => {
    const shared = createSharedState()
    const s = seedSession(shared, 'cust-1', 'Hỏi về bảo hành', ['Hỏi về bảo hành'])
    shared.chat.failNext = [rateLimited(2)]
    const page = await open(shared, `/customer/assistant?phien=${s.sessionId}`)
    await thread(page).getByText('Hỏi về bảo hành').first().waitFor()
    await composer(page).fill('Bảo hành có chuyển cho chủ mới không?')
    await composer(page).press('Enter')
    await page.getByText('Bạn hỏi nhanh quá. Hỏi tiếp sau 2 giây.').waitFor()
    const waiting = page.getByRole('button', { name: /^Chờ \d giây$/ })
    await waiting.waitFor()
    assert.equal(await waiting.isDisabled(), true)
    assert.equal(await composer(page).inputValue(), 'Bảo hành có chuyển cho chủ mới không?')

    await page.getByRole('button', { name: 'Gửi', exact: true }).waitFor({ timeout: 5000 })
    await sleep(500)
    assert.equal(sent(shared, 'POST', '/chat/messages').length, 1, 'không tự gửi lại khi hết giờ chờ')
    await page.getByRole('button', { name: 'Gửi', exact: true }).click()
    await thread(page).getByText('Bảo hành có chuyển cho chủ mới không?').waitFor()
    const [first, second] = sent(shared, 'POST', '/chat/messages')
    assert.equal(second.body.clientMessageId, first.body.clientMessageId)
    assert.equal(second.body.sessionId, s.sessionId)

    // Hết lượt trong ngày: 429 không có Retry-After, không đếm ngược
    shared.chat.failNext = [
      fail('RAG_QUOTA_EXCEEDED', 'The daily chat allowance has been reached. Please try again tomorrow.'),
    ]
    await composer(page).fill('Thêm một câu nữa')
    await composer(page).press('Enter')
    await page.getByText('Đã hết lượt hỏi trợ lý trong hôm nay. Hỏi lại vào ngày mai.').waitFor()
    assert.equal(await page.getByRole('button', { name: /^Chờ/ }).count(), 0)
    await page.context().close()
  })

  test('backend lỗi khi gửi không thêm gì vào lịch sử; câu quá 8000 ký tự không gửi; hỏi vào phiên đã mất báo không tìm thấy', async () => {
    const shared = createSharedState()
    const s = seedSession(shared, 'cust-1', 'Câu cũ', ['Câu cũ'])
    shared.chat.failNext = [fail('RAG_SERVICE_UNAVAILABLE', 'The assistant is temporarily unavailable.')]
    const page = await open(shared, `/customer/assistant?phien=${s.sessionId}`)
    await thread(page).getByText('Câu cũ').first().waitFor()
    const before = await thread(page).getByRole('article').count()
    await composer(page).fill('Câu khi dịch vụ lỗi')
    await composer(page).press('Enter')
    await page.getByText('Dịch vụ chatbot tạm thời không phản hồi. Thử lại sau ít phút.').waitFor()
    assert.equal(await thread(page).getByRole('article').count(), before, 'không có câu trả lời tạm')
    assert.equal(await composer(page).inputValue(), 'Câu khi dịch vụ lỗi', 'giữ câu để gửi lại')

    await composer(page).fill('a'.repeat(8001))
    await page.getByText('8.001 / 8.000 ký tự').waitFor()
    assert.equal(await page.getByRole('button', { name: 'Gửi', exact: true }).isDisabled(), true)
    await composer(page).press('Enter')
    await sleep(300)
    assert.equal(sent(shared, 'POST', '/chat/messages').length, 1)

    // Phiên bị xoá phía backend trong lúc đang mở
    shared.chat.sessions = []
    await composer(page).fill('Còn ai đó không?')
    await composer(page).press('Enter')
    await page.getByText('Không tìm thấy cuộc trò chuyện này. Mở cuộc trò chuyện mới để hỏi tiếp.').waitFor()
    await page.context().close()
  })

  test('chức năng chưa bật (503) là "chưa sẵn sàng", không phải danh sách rỗng; quản trị có lối sang Kho tri thức', async () => {
    const shared = createSharedState()
    shared.chat.unavailable = 'FEATURE_PENDING_MIGRATION'
    const page = await open(shared, '/customer/assistant')
    await page.getByText('Trợ lý chưa sẵn sàng.').waitFor()
    await page.getByText('Trợ lý chưa được bật trên hệ thống. Liên hệ quản trị hệ thống.').waitFor()
    assert.equal(await page.getByText('Chưa có cuộc trò chuyện nào.').count(), 0)
    assert.equal(await composer(page).count(), 0)
    assert.equal(sent(shared, 'GET', '/chat/sessions').length, 1, '503 không thử lại')
    await page.context().close()

    const admin = createSharedState({ currentUser: ADMIN })
    admin.chat.unavailable = 'SCHEMA_NOT_READY'
    const p = await open(admin, '/admin/assistant')
    await p.getByText('20261030201618_KnowledgeDocumentAudience').waitFor()
    assert.equal(
      await p.getByRole('link', { name: 'Mở Kho tri thức AI' }).getAttribute('href'),
      '/admin/knowledge-base',
    )
    await p.context().close()
  })

  test('đổi tài khoản: đăng xuất A, đăng nhập B thì không thấy phiên của A; mở thẳng phiên của A bị từ chối', async () => {
    const shared = createSharedState()
    const own = seedSession(shared, 'cust-1', 'Câu riêng của A', ['Câu riêng của A'])
    const page = await open(shared, `/customer/assistant?phien=${own.sessionId}`)
    await thread(page).getByText('Câu riêng của A').first().waitFor()

    await page.getByRole('button', { name: /^Tài khoản:/ }).click()
    await page.getByRole('button', { name: 'Đăng xuất' }).click()
    await page.waitForURL(/\/login/)
    await page.locator('#login-email').fill('b@test.vn')
    await page.locator('#login-password').fill('Matkhau@123')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\/customer/)
    // Điều hướng trong app (không tải lại): nếu cache của A còn thì sẽ lộ ra ở đây
    await page.getByRole('link', { name: 'Trợ lý', exact: true }).first().click()
    await page.getByText('Chưa có cuộc trò chuyện nào.').waitFor()
    assert.equal(await page.getByText('Câu riêng của A').count(), 0)
    assert.equal(sent(shared, 'GET', '/chat/sessions').at(-1).user, 'cust-2')

    await goto(page, `/customer/assistant?phien=${own.sessionId}`)
    await page.getByText('Không tìm thấy cuộc trò chuyện').waitFor()
    assert.equal(await page.getByText('Câu riêng của A').count(), 0)
    assert.equal(sent(shared, 'GET', `/chat/sessions/${own.sessionId}`).at(-1).user, 'cust-2')
    // Mã phiên lạ trên địa chỉ: không gọi API
    const calls = shared.requests.length
    await goto(page, '/customer/assistant?phien=khong-phai-ma')
    await page.getByText('Không tìm thấy cuộc trò chuyện').waitFor()
    assert.equal(shared.requests.filter((r, i) => i >= calls && r.path.startsWith('/chat/sessions/')).length, 0)
    await page.context().close()
  })
})

// Danh mục phường, xã của mock cổng khách thay bằng danh mục thật (đủ các phường có trong kết quả tra cứu)
const customerWithUnits = (extra = {}) => createCustomerState({ communes: UNITS.communes, ...extra })
const lookupBox = (scope) => scope.getByRole('searchbox', { name: 'Tên phường, xã hoặc quận, huyện cũ' })

describe('Tra địa chỉ cũ', () => {
  test('hộp thoại bổ sung phường, xã: "Phường 9" → chọn Phường Vườn Lài (Quận 10) → PUT mã MỚI 27190, không tự chọn', async () => {
    const shared = createSharedState()
    const customer = customerWithUnits()
    const page = await open(shared, `/customer/requests/${SR}`, { customer })
    await page.getByRole('button', { name: 'Bổ sung phường, xã' }).click()
    const dialog = page.getByRole('dialog', { name: 'Bổ sung phường, xã' })
    await dialog.getByRole('button', { name: 'Chỉ biết địa chỉ cũ?' }).click()

    await lookupBox(dialog).fill('a')
    await dialog.getByText('Gõ ít nhất 2 ký tự.').waitFor()
    await sleep(600)
    assert.equal(sent(shared, 'GET', '/administrative-units/legacy-lookup').length, 0, 'q ngắn không gọi API')

    await lookupBox(dialog).fill('phuong 9')
    await dialog.getByText('8 địa chỉ cũ khớp. Chọn đúng phường, xã hiện tại của công trình.').waitFor()
    assert.deepEqual(sent(shared, 'GET', '/administrative-units/legacy-lookup').at(-1).query, {
      q: 'phuong 9',
      provinceCode: '79',
    })
    assert.equal(await dialog.getByRole('combobox').inputValue(), '', 'không tự chọn kết quả nào')

    await dialog.getByRole('button', { name: 'Chọn Phường Vườn Lài (địa chỉ cũ Phường 9, Quận 10)' }).click()
    assert.equal(await dialog.getByRole('combobox').inputValue(), 'Phường Vườn Lài')
    await dialog.getByText('Đã chọn Phường Vườn Lài theo địa chỉ cũ Phường 9, Quận 10.').waitFor()
    await dialog.getByRole('button', { name: 'Lưu phường, xã' }).click()
    await waitFor(
      () => sent(customer, 'PUT', `/customers/me/sites/${SITE}/administrative-location`).length === 1,
      'PUT',
    )
    assert.deepEqual(sent(customer, 'PUT', `/customers/me/sites/${SITE}/administrative-location`)[0].body, {
      provinceCode: '79',
      communeCode: '27190',
    })
    assert.equal(sent(customer, 'POST', '/customers/me/sites').length, 0, 'không tạo địa điểm mới')
    await page.context().close()
  })

  test('bước Địa điểm: tên tỉnh lấy từ danh mục; tra quận cũ "Gò Vấp" → chọn An Hội Tây → Tiếp tục gửi PUT 26882', async () => {
    const shared = createSharedState()
    const customer = customerWithUnits({
      sites: { 'site-legacy': { communeCode: null } },
      surfaces: {
        'ps-legacy': {
          preSurveyId: 'ps-legacy',
          status: 'DRAFT',
          revision: 3,
          geometryVersion: 1,
          surfaceDefined: false,
          surfaceLengthM: null,
          surfaceWidthM: null,
          surfaceTiltDegree: 15,
          surfaceAzimuthDegree: 180,
          obstacles: [],
          declared: {},
          latitude: 10.84,
          longitude: 106.67,
          selectedSimulationId: null,
          conventions: {},
        },
      },
    })
    const legacySite = {
      name: 'Nhà cũ Gò Vấp',
      province: 'Thành phố Hồ Chí Minh',
      provinceCode: '79',
      district: 'Quận Gò Vấp',
      ward: 'Phường 12',
      communeCode: null,
      streetLine: '5 Quang Trung',
      latitude: 10.84,
      longitude: 106.67,
      installationSurfaceType: 1,
      surfaceMaterial: null,
      note: null,
    }
    const page = await open(shared, '/customer/assessment?buoc=dia-diem', {
      customer,
      storage: {
        'smartsolar.customer-profile.cust-1': '1',
        'smartsolar.assessment-draft.cust-1': JSON.stringify({
          site: legacySite,
          siteId: 'site-legacy',
          preSurveyId: 'ps-legacy',
        }),
      },
    })
    const province = page.getByRole('textbox', { name: 'Tỉnh, thành phố' })
    await waitFor(async () => (await province.inputValue()) === 'Thành phố Hồ Chí Minh', 'tên tỉnh từ danh mục')
    assert.equal(sent(shared, 'GET', '/administrative-units/provinces').length, 1)

    await page.getByRole('button', { name: 'Chỉ biết địa chỉ cũ?' }).click()
    await lookupBox(page).fill('Gò Vấp')
    await page.getByText('Quận Gò Vấp', { exact: true }).waitFor()
    await page.getByText('Gồm Phường 12, Phường 14 cũ').waitFor()
    await page.getByRole('button', { name: 'Chọn Phường An Hội Tây (địa chỉ cũ Quận Gò Vấp)' }).click()
    const ward = page.getByRole('combobox', { name: /Phường, xã/ })
    assert.equal(await ward.inputValue(), 'Phường An Hội Tây')
    await page.getByRole('button', { name: 'Tiếp tục: Mặt lắp' }).click()
    await waitFor(
      () => sent(customer, 'PUT', '/customers/me/sites/site-legacy/administrative-location').length === 1,
      'PUT địa điểm',
    )
    assert.deepEqual(sent(customer, 'PUT', '/customers/me/sites/site-legacy/administrative-location')[0].body, {
      provinceCode: '79',
      communeCode: '26882',
    })
    await page.waitForURL(/buoc=mat-lap/)
    assert.equal(sent(customer, 'POST', '/customers/me/sites').length, 0)
    await page.context().close()
  })

  test('kết quả rỗng, quá 50 kết quả, response cũ về sau không đè kết quả của từ khoá mới', async () => {
    const shared = createSharedState()
    shared.units.legacyDelay['hiep thanh'] = 2000
    const page = await open(shared, `/customer/requests/${SR}`, { customer: customerWithUnits() })
    await page.getByRole('button', { name: 'Bổ sung phường, xã' }).click()
    const dialog = page.getByRole('dialog', { name: 'Bổ sung phường, xã' })
    await dialog.getByRole('button', { name: 'Chỉ biết địa chỉ cũ?' }).click()

    await lookupBox(dialog).fill('xyz khong co')
    await dialog.getByText('Không tìm thấy phường, xã hay quận, huyện cũ nào khớp.', { exact: false }).waitFor()

    await lookupBox(dialog).fill('phuong')
    await dialog.getByText('Có hơn 50 kết quả, chỉ hiện 50.', { exact: false }).waitFor()

    await lookupBox(dialog).fill('hiep thanh')
    await waitFor(
      () => sent(shared, 'GET', '/administrative-units/legacy-lookup').some((r) => r.query.q === 'hiep thanh'),
      'gọi tra "hiep thanh"',
    )
    await lookupBox(dialog).fill('go vap')
    await dialog.getByText('Quận Gò Vấp', { exact: true }).waitFor()
    await sleep(2500)
    assert.equal(await dialog.getByText('Phường Hiệp Thành, Quận 12').count(), 0, 'kết quả cũ không hiện')
    await dialog.getByText('Quận Gò Vấp', { exact: true }).waitFor()
    await page.context().close()
  })

  test('danh mục lỗi: tra cứu 503 / 429 báo lỗi kèm Thử lại (không coi là rỗng); tên tỉnh lỗi thì không điền tên viết sẵn', async () => {
    const shared = createSharedState()
    const down = { status: 503, body: { isSuccess: false, traceId: 't', data: null, error: null } }
    // Hai lần: hook thử lại lỗi 5xx đúng một lần
    shared.units.legacyFailNext = [down, down]
    const page = await open(shared, `/customer/requests/${SR}`, { customer: customerWithUnits() })
    await page.getByRole('button', { name: 'Bổ sung phường, xã' }).click()
    const dialog = page.getByRole('dialog', { name: 'Bổ sung phường, xã' })
    await dialog.getByRole('button', { name: 'Chỉ biết địa chỉ cũ?' }).click()
    await lookupBox(dialog).fill('hiep thanh')
    await dialog.getByText('Hệ thống đang bảo trì. Vui lòng thử lại sau.').waitFor()
    assert.equal(await dialog.getByText('Không tìm thấy', { exact: false }).count(), 0)
    await dialog.getByRole('button', { name: 'Thử lại' }).click()
    await dialog.getByText('Phường Hiệp Thành, Quận 12').waitFor()
    await dialog.getByText('Địa bàn cũ được chia cho nhiều phường, xã mới', { exact: false }).first().waitFor()

    shared.units.legacyFailNext = [rateLimited(30)]
    await lookupBox(dialog).fill('go vap')
    await dialog.getByText('Bạn thao tác quá nhanh. Thử lại sau 30 giây.').waitFor()
    await page.context().close()

    const broken = createSharedState()
    broken.units.provincesFail = down
    const p = await open(broken, '/customer/assessment?buoc=dia-diem', {
      customer: customerWithUnits(),
      storage: { 'smartsolar.customer-profile.cust-1': '1' },
    })
    await p.getByText('Không tải được tên tỉnh, thành phố.', { exact: false }).waitFor()
    assert.equal(await p.getByRole('textbox', { name: 'Tỉnh, thành phố' }).inputValue(), '')
    broken.units.provincesFail = null
    await p.getByRole('button', { name: 'Thử lại' }).first().click()
    await waitFor(
      async () => (await p.getByRole('textbox', { name: 'Tỉnh, thành phố' }).inputValue()) === 'Thành phố Hồ Chí Minh',
      'tên tỉnh sau khi thử lại',
    )
    await p.context().close()
  })
})
