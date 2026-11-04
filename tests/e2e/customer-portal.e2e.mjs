// E2E cổng khách hàng trên giao diện thật (Vite dev + Chromium), backend là bản giả trong mock-customer-api.mjs (page.route).
// Đây là test với API giả: chứng minh luồng giao diện và request gửi đi đúng hợp đồng của backend, KHÔNG chứng minh backend
// thật hay PayOS chạy. Nhân viên duyệt bản ký và PayOS xác nhận tiền được giả bằng hàm đổi trạng thái của mock.
// Chạy: node --test tests/e2e/customer-portal.e2e.mjs
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import {
  claimView,
  contractView,
  createCustomerState,
  entitlementView,
  handleCustomer,
  installCustomerMockApi,
  OFFICIAL_PDF,
  OFFICIAL_PDF_V2,
  packageCheckoutWithContract,
  payosConfirms,
  publishAmendment,
  reviewSignature,
  serviceRequest,
  sha,
  SIGNED_PDF,
  SITE,
  SR,
  subscriptionView,
  visitView,
} from './mock-customer-api.mjs'

let server
let browser
let baseUrl

const pdf = (name, buffer) => ({ name, mimeType: 'application/pdf', buffer })
const PNG = {
  name: 'mai-sau-bao.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da6300010000050001',
    'hex',
  ),
}

before(async () => {
  server = await createServer({ server: { port: 3176, strictPort: false }, logLevel: 'error' })
  await server.listen()
  baseUrl = server.resolvedUrls.local[0].replace(/\/$/, '')
  browser = await chromium.launch({ channel: 'chromium' })
  // Lần mở đầu Vite biên dịch mọi module: làm nóng trước khi chạy test
  const warm = await open(createCustomerState(), '/customer/contracts/c-1')
  await warm.getByRole('heading', { name: /Hợp đồng HD-/ }).waitFor({ timeout: 120_000 })
  await warm.context().close()
})

after(async () => {
  await browser?.close()
  await server?.close()
})

/** Trang đã đăng nhập (refresh token giả trong localStorage, /auth/refresh trả JWT khách hàng) */
async function open(state, path, storage = {}) {
  const context = await browser.newContext({ locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' })
  await context.addInitScript((extra) => {
    localStorage.setItem('smart-solar.refresh-token', 'refresh-1')
    localStorage.setItem('smart-solar.refresh-store', 'local')
    for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v)
  }, storage)
  const page = await context.newPage()
  page.setDefaultTimeout(15_000)
  // Gắn ở context để tab PayOS mở ra (popup) cũng dùng backend giả
  await installCustomerMockApi(context, state)
  await context.route('https://pay.payos.mock/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>PayOS giả</h1>' }),
  )
  await page.goto(`${baseUrl}${path}`)
  return page
}

const sent = (state, method, path) => state.requests.filter((r) => r.method === method && r.path === path)
const waitFor = async (check, label, ms = 10_000) => {
  for (let i = 0; i < ms / 100; i++) {
    if (await check()) return
    await new Promise((r) => setTimeout(r, 100))
  }
  assert.fail(`hết giờ chờ: ${label}`)
}

const signPanel = (page) => page.locator('#contract-sign')
const paymentPanel = (page) => page.locator('#contract-payment')

describe('Hợp đồng: ký → duyệt → PayOS → hệ thống xác nhận', () => {
  test('luồng đúng; trang PayOS chuyển về "thành công" không làm hợp đồng thành đã thanh toán', async () => {
    const state = createCustomerState()
    const page = await open(state, '/customer/contracts')
    await page.getByRole('heading', { name: 'Hợp đồng', exact: true }).waitFor()
    await page.getByText('1 hợp đồng chờ bạn ký hoặc thanh toán').waitFor()
    await page.getByRole('link', { name: 'Xem hợp đồng' }).click()
    await page.getByRole('heading', { name: 'Hợp đồng HD-20261103-ABC234' }).waitFor()
    // Chưa ký thì chưa có nút tạo link thanh toán
    assert.equal(await paymentPanel(page).getByRole('button', { name: 'Tạo link thanh toán' }).count(), 0)

    await signPanel(page).getByRole('button', { name: 'Gửi bản đã ký' }).click()
    const dialog = page.getByRole('dialog', { name: 'Gửi bản hợp đồng đã ký' })
    // Khách kiểm tệp PDF chính thức đang giữ: SHA-256 tính trên máy khớp bản hệ thống ghi nhận
    await dialog.locator('input[type=file]').nth(0).setInputFiles(pdf('hop-dong-chinh-thuc.pdf', OFFICIAL_PDF))
    await dialog.getByText('đúng là PDF chính thức của phiên bản này').waitFor()
    assert.equal(await dialog.getByRole('checkbox').isChecked(), true)
    await dialog.locator('input[type=file]').nth(1).setInputFiles(pdf('ban-da-ky.pdf', SIGNED_PDF))
    await dialog.getByRole('button', { name: 'Gửi bản ký' }).click()
    await page.getByText('Smart Solar đang kiểm tra bản ký').first().waitFor()

    const [submit] = sent(state, 'POST', '/customers/me/contracts/c-1/signed-document')
    assert.equal(submit.body.officialDocumentSha256, sha(OFFICIAL_PDF))
    assert.equal(state.files[submit.body.fileId].purpose, 'SIGNED_CONTRACT')
    assert.equal(sent(state, 'POST', '/files/presigned-upload')[0].body.contentType, 'application/pdf')

    // Nhân viên duyệt: tải lại trang thì thấy việc thanh toán
    reviewSignature(state, 'c-1', true)
    await page.reload()
    await page.getByText('Bạn cần thanh toán hợp đồng').waitFor()
    await paymentPanel(page).getByRole('button', { name: 'Tạo link thanh toán' }).click()
    await paymentPanel(page).getByText('Mã đơn PayOS').waitFor()
    assert.equal(sent(state, 'POST', '/customers/me/contracts/c-1/payments').length, 1)

    const [payos] = await Promise.all([
      page.waitForEvent('popup'),
      paymentPanel(page)
        .getByRole('link', { name: /Mở trang thanh toán PayOS/ })
        .click(),
    ])
    // PayOS chuyển về với tham số "đã trả", nhưng hệ thống chưa xác nhận
    await payos.goto(`${baseUrl}/payments/return?code=00&id=abc&cancel=false&status=PAID&orderCode=1000001`)
    await payos.waitForURL(/\/customer\/contracts\/c-1\?payos=return/)
    await payos.getByText('Bạn vừa quay lại từ PayOS').waitFor()
    await payos.getByText('Chờ thanh toán').first().waitFor()
    assert.equal(await payos.getByText(/Đã thanh toán đủ/).count(), 0)

    // PayOS xác nhận (webhook): trang tự hỏi lại và hiện đã thanh toán
    payosConfirms(state, 'c-1')
    await page.getByText(/Đã thanh toán đủ lúc/).waitFor({ timeout: 12_000 })
    assert.equal(sent(state, 'POST', '/customers/me/contracts/c-1/payments').length, 1, 'không tự tạo link thêm')
    await page.context().close()
  })

  test('bản ký bị từ chối thì hiện lý do và gửi lại được', async () => {
    const state = createCustomerState({
      contracts: [
        contractView({
          status: 'SIGNATURE_REJECTED',
          rejectionReason: 'Thiếu chữ ký trang 3',
          submissions: [
            {
              submissionId: 's-0',
              fileId: 'old',
              fileSha256: 'x',
              officialDocumentSha256: sha(OFFICIAL_PDF),
              submittedAt: '2026-11-02T02:00:00Z',
              outcome: 'REJECTED',
              reviewedAt: '2026-11-02T03:00:00Z',
              rejectionReason: 'Thiếu chữ ký trang 3',
            },
          ],
        }),
      ],
    })
    const page = await open(state, '/customer/contracts/c-1')
    await page.getByText('Lý do: Thiếu chữ ký trang 3').first().waitFor()
    await signPanel(page).getByRole('button', { name: 'Gửi lại bản ký' }).click()
    const dialog = page.getByRole('dialog', { name: 'Gửi bản hợp đồng đã ký' })
    await dialog.locator('input[type=file]').nth(1).setInputFiles(pdf('ban-ky-lan-2.pdf', SIGNED_PDF))
    // Chưa xác nhận đúng bản thì không gửi
    await dialog.getByRole('button', { name: 'Gửi bản ký' }).click()
    await dialog.getByText('Xác nhận bạn đã ký đúng bản có mã nội dung này.').waitFor()
    assert.equal(sent(state, 'POST', '/customers/me/contracts/c-1/signed-document').length, 0)
    await dialog.getByRole('checkbox').check()
    await dialog.getByRole('button', { name: 'Gửi bản ký' }).click()
    await page.getByText('Smart Solar đang kiểm tra bản ký').first().waitFor()
    assert.equal(state.contracts[0].submissions.length, 2)
    await page.context().close()
  })

  test('phiên bản đổi trong lúc ký: backend từ chối, không tự gửi lại; bản mới phải ký lại đúng PDF mới', async () => {
    const state = createCustomerState()
    const page = await open(state, '/customer/contracts/c-1')
    await signPanel(page).getByRole('button', { name: 'Gửi bản đã ký' }).click()
    const dialog = page.getByRole('dialog', { name: 'Gửi bản hợp đồng đã ký' })
    await dialog.locator('input[type=file]').nth(1).setInputFiles(pdf('ban-da-ky.pdf', SIGNED_PDF))
    await dialog.getByRole('checkbox').check()
    // Kinh doanh phát hành phụ lục trong lúc khách đang ký
    publishAmendment(state, 'c-1')
    await dialog.getByRole('button', { name: 'Gửi bản ký' }).click()
    await dialog.getByText('Bản chính thức đã thay đổi hoặc không còn chờ ký').waitFor()
    assert.equal(await dialog.getByRole('button', { name: 'Gửi bản ký' }).isDisabled(), true)
    assert.equal(sent(state, 'POST', '/customers/me/contracts/c-1/signed-document').length, 1)
    await dialog.getByRole('button', { name: 'Đóng' }).click()

    await page.getByText('Đã có phiên bản mới thay phiên bản này').waitFor()
    await page.getByRole('link', { name: /Mở phiên bản 2/ }).click()
    await page.waitForURL(/\/customer\/contracts\/c-1-v2$/)
    await signPanel(page).getByRole('button', { name: 'Gửi bản đã ký' }).click()
    const again = page.getByRole('dialog', { name: 'Gửi bản hợp đồng đã ký' })
    // Tệp PDF cũ không còn là bản chính thức
    await again.locator('input[type=file]').nth(0).setInputFiles(pdf('ban-cu.pdf', OFFICIAL_PDF))
    await again.getByText('không phải PDF chính thức hiện tại').waitFor()
    await again.locator('input[type=file]').nth(0).setInputFiles(pdf('ban-moi.pdf', OFFICIAL_PDF_V2))
    await again.getByText('đúng là PDF chính thức của phiên bản này').waitFor()
    await again.locator('input[type=file]').nth(1).setInputFiles(pdf('ky-ban-moi.pdf', SIGNED_PDF))
    await again.getByRole('button', { name: 'Gửi bản ký' }).click()
    await page.getByText('Smart Solar đang kiểm tra bản ký').first().waitFor()
    const last = sent(state, 'POST', '/customers/me/contracts/c-1-v2/signed-document').at(-1)
    assert.equal(last.body.officialDocumentSha256, sha(OFFICIAL_PDF_V2))
    await page.context().close()
  })

  test('tải PDF chính thức bằng link ký sẵn xin lúc bấm; hợp đồng chưa có tài liệu thì báo lỗi, không ghép link từ mã tệp', async () => {
    const state = createCustomerState()
    const page = await open(state, '/customer/contracts/c-1')
    await page.context().route('https://files.example.test/**', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="hop-dong.pdf"' },
        body: OFFICIAL_PDF,
      }),
    )
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Tải PDF chính thức' }).first().click(),
    ])
    assert.equal(download.url(), 'https://files.example.test/f-official.pdf?disposition=attachment&sig=mock')
    const [req] = sent(state, 'GET', '/customers/me/contracts/c-1/official-document/url')
    assert.equal(req.query.disposition, 'attachment')

    state.contracts[0].officialDocument = null
    await page.getByRole('button', { name: 'Tải PDF chính thức' }).first().click()
    await page.getByText('Hợp đồng chưa có tài liệu này.').first().waitFor()
    await page.context().close()
  })

  test('không đủ quyền: hợp đồng không thuộc khách hiện "không tìm thấy", không coi là rỗng', async () => {
    const state = createCustomerState({ notOwner: true })
    const page = await open(state, '/customer/contracts/c-1')
    await page.getByText('Không tìm thấy nội dung này.').waitFor()
    assert.equal(await page.getByRole('button', { name: 'Thử lại' }).count(), 0)
    await page.context().close()
  })

  test('chuyển không hợp lệ: đang duyệt bản ký thì không có nút ký lại, không có nút thanh toán', async () => {
    const state = createCustomerState({ contracts: [contractView({ status: 'UNDER_REVIEW' })] })
    const page = await open(state, '/customer/contracts/c-1')
    await page.getByText('Smart Solar đang kiểm tra bản ký').first().waitFor()
    assert.equal(await page.getByRole('button', { name: /Gửi (lại )?bản (đã )?ký/ }).count(), 0)
    assert.equal(await page.getByRole('button', { name: 'Tạo link thanh toán' }).count(), 0)
    assert.equal(sent(state, 'GET', '/customers/me/contracts/c-1/payments').length, 0)
    // Gửi thẳng lên backend cũng bị từ chối
    const forced = handleCustomer(state, 'POST', 'http://x/api/customers/me/contracts/c-1/payments', null)
    assert.equal(forced.status, 409)
    assert.equal(forced.body.error.code, 'PAYMENT_CONTRACT_NOT_SIGNED')
    await page.context().close()
  })
})

describe('Thanh toán hợp đồng: link sống, huỷ, hết hạn, lỗi PayOS, xung đột với mua gói', () => {
  test('link còn sống được dùng lại; huỷ link rồi tạo link mới', async () => {
    const state = createCustomerState({
      contracts: [contractView({ status: 'SIGNED', signedAt: '2026-11-02T02:00:00Z' })],
    })
    const page = await open(state, '/customer/contracts/c-1')
    await paymentPanel(page).getByRole('button', { name: 'Tạo link thanh toán' }).click()
    await paymentPanel(page).getByText('Mã đơn PayOS').waitFor()
    // Tạo lại (vd. tab khác) trả đúng link cũ
    const again = handleCustomer(state, 'POST', 'http://x/api/customers/me/contracts/c-1/payments', null)
    assert.equal(again.body.data.paymentAttemptId, 'pa-1')
    assert.equal(state.attempts.length, 1)

    await paymentPanel(page).getByRole('button', { name: 'Huỷ link' }).click()
    await page.getByRole('dialog', { name: 'Huỷ link thanh toán?' }).getByRole('button', { name: 'Huỷ link' }).click()
    await paymentPanel(page).getByRole('button', { name: 'Tạo link thanh toán' }).waitFor()
    assert.equal(state.attempts[0].status, 'CANCELLED')
    await page.context().close()
  })

  test('link hết hạn theo hệ thống thì tạo lại được; PayOS chưa cấu hình thì báo lỗi, không coi là đã có link', async () => {
    const state = createCustomerState({
      contracts: [contractView({ status: 'SIGNED', signedAt: '2026-11-02T02:00:00Z' })],
      providerNotConfigured: true,
    })
    packageCheckoutWithContract(state, 'c-1', 0)
    state.attempts[0].expiresAt = new Date(Date.now() - 60_000).toISOString()
    const page = await open(state, '/customer/contracts/c-1')
    await paymentPanel(page).getByRole('button', { name: 'Tạo link thanh toán' }).click()
    await paymentPanel(page).getByText('Thanh toán trực tuyến đang tạm tắt').waitFor()
    assert.equal(
      await paymentPanel(page)
        .getByRole('link', { name: /Mở trang thanh toán/ })
        .count(),
      0,
    )
    assert.equal(state.attempts[0].status, 'EXPIRED')
    await page.context().close()
  })

  test('quá 5 link trong 10 phút thì báo đúng giới hạn', async () => {
    const state = createCustomerState({
      contracts: [contractView({ status: 'SIGNED', signedAt: '2026-11-02T02:00:00Z' })],
    })
    for (let i = 0; i < 5; i++) packageCheckoutWithContract(state, 'c-1', 0).status = 'CANCELLED'
    const page = await open(state, '/customer/contracts/c-1')
    await paymentPanel(page).getByRole('button', { name: 'Tạo link thanh toán' }).click()
    await paymentPanel(page).getByText('nhiều link thanh toán trong 10 phút').waitFor()
    await page.context().close()
  })

  test('link mua gói kèm hợp đồng: trang hợp đồng không huỷ link đó; mua gói khi đang có link riêng của hợp đồng bị chặn', async () => {
    const state = createCustomerState({
      contracts: [contractView({ status: 'SIGNED', signedAt: '2026-11-02T02:00:00Z' })],
      packages: [
        {
          packageId: 'pk-1',
          kind: 'DISASTER_PROTECTION',
          name: 'Bảo vệ bão 1 năm',
          description: null,
          price: 1_500_000,
          durationMonths: 12,
          visitMonths: [],
          coveredDisasterTypes: ['STORM'],
          coveragePercent: 70,
          perIncidentLimit: 20_000_000,
          termLimit: 40_000_000,
          isActive: true,
          revision: 1,
        },
      ],
    })
    packageCheckoutWithContract(state, 'c-1', 1_500_000)
    const page = await open(state, '/customer/contracts/c-1')
    await paymentPanel(page).getByText('Link này gồm cả tiền gói dịch vụ').waitFor()
    assert.equal(await paymentPanel(page).getByRole('button', { name: 'Huỷ link' }).count(), 0)
    await page.context().close()

    // Link riêng của hợp đồng đang mở: mua gói gộp hợp đồng bị backend chặn, giao diện dẫn sang trang hợp đồng
    state.attempts[0].status = 'CANCELLED'
    handleCustomer(state, 'POST', 'http://x/api/customers/me/contracts/c-1/payments', null)
    const packages = await open(state, '/customer/packages')
    await packages.getByRole('button', { name: 'Mua gói' }).click()
    const dialog = packages.getByRole('dialog', { name: 'Mua Bảo vệ bão 1 năm' })
    await dialog.getByRole('button', { name: 'Mua và thanh toán' }).click()
    await dialog.getByText('đang có một link thanh toán chưa xong').waitFor()
    assert.equal(
      await dialog.getByRole('link', { name: 'Mở hợp đồng' }).getAttribute('href'),
      '/customer/contracts/c-1',
    )
    assert.equal(sent(state, 'POST', '/customers/me/after-sales/purchases')[0].body.includeContract, true)
    await packages.context().close()
  })
})

describe('Sau bán: lượt bảo trì, đổi giờ, xin xét lại, báo lỗi từ bảo trì, thông báo', () => {
  test('đặt một lượt bảo trì của gói: giờ gửi kèm +07:00, cách ít nhất 7 ngày, mở yêu cầu vừa tạo', async () => {
    const state = createCustomerState({ subscriptions: [subscriptionView()] })
    const page = await open(state, '/customer/packages')
    await page.getByRole('button', { name: 'Đặt lịch' }).click()
    const dialog = page.getByRole('dialog', { name: 'Đặt lịch bảo trì' })
    await dialog.getByLabel('Ghi chú').fill('Gọi trước 30 phút')
    await dialog.getByRole('button', { name: 'Đặt lịch' }).click()
    await page.waitForURL(/\/customer\/after-sales\/req-1$/)
    const [book] = sent(state, 'POST', '/customers/me/after-sales/maintenance/ent-1/book')
    assert.match(book.body.preferredStartsAt, /T08:00:00\+07:00$/)
    assert.ok(Date.parse(book.body.preferredStartsAt) >= Date.now() + 7 * 86_400_000)
    assert.equal(book.body.note, 'Gọi trước 30 phút')
    assert.equal(state.subscriptions[0].entitlements[0].status, 'BOOKED')
    await page.context().close()
  })

  test('quy tắc 7 ngày theo cài đặt của hệ thống: backend từ chối thì hiện lỗi, lượt không bị trừ', async () => {
    const state = createCustomerState({ subscriptions: [subscriptionView()], bookingLeadDays: 30 })
    const page = await open(state, '/customer/packages')
    await page.getByRole('button', { name: 'Đặt lịch' }).click()
    const dialog = page.getByRole('dialog', { name: 'Đặt lịch bảo trì' })
    await dialog.getByRole('button', { name: 'Đặt lịch' }).click()
    await dialog.getByText('Ngày hẹn quá gần so với thời gian phải đặt trước').waitFor()
    assert.equal(state.subscriptions[0].entitlements[0].status, 'AVAILABLE')
    await page.context().close()
  })

  test('lượt sắp hết hạn (không còn ngày đủ 7 ngày) thì không cho đặt', async () => {
    const soon = new Date(Date.now() + 5 * 86_400_000).toISOString()
    const state = createCustomerState({
      subscriptions: [subscriptionView({ endsAt: soon, entitlements: [entitlementView()] })],
    })
    const page = await open(state, '/customer/packages')
    await page.getByRole('button', { name: 'Đặt lịch' }).click()
    const dialog = page.getByRole('dialog', { name: 'Đặt lịch bảo trì' })
    await dialog.getByText('Không còn ngày nào đặt được').waitFor()
    assert.equal(await dialog.getByRole('button', { name: 'Đặt lịch' }).count(), 0)
    await page.context().close()
  })

  test('đổi giờ bảo trì: gửi giờ mới, không gửi ghi chú; trước giờ hẹn dưới 24 giờ thì khoá', async () => {
    const state = createCustomerState({
      serviceRequests: [
        serviceRequest({ status: 'SCHEDULED', visits: [visitView()] }),
        serviceRequest({
          requestId: 'req-late',
          status: 'SCHEDULED',
          visits: [visitView({ startsAt: new Date(Date.now() + 20 * 3_600_000).toISOString() })],
        }),
      ],
    })
    const page = await open(state, '/customer/after-sales/req-1')
    await page.getByRole('button', { name: 'Đổi giờ' }).click()
    const dialog = page.getByRole('dialog', { name: 'Đổi giờ hẹn' })
    assert.equal(await dialog.getByLabel('Ghi chú').count(), 0)
    await dialog.getByRole('button', { name: 'Đổi giờ' }).click()
    await page.getByText('Đã đổi giờ.').waitFor()
    const [body] = sent(state, 'POST', '/customers/me/after-sales/requests/req-1/reschedule').map((r) => r.body)
    assert.deepEqual(Object.keys(body), ['preferredStartsAt'])
    assert.equal(state.serviceRequests[0].visits[0].status, 'CANCELLED')

    await page.goto(`${baseUrl}/customer/after-sales/req-late`)
    await page.getByText('Đã quá hạn đổi giờ trên mạng').waitFor()
    assert.equal(await page.getByRole('button', { name: 'Đổi giờ' }).isDisabled(), true)
    await page.context().close()
  })

  test('xin xét lại hỗ trợ thiên tai một lần, kèm ảnh SERVICE_EVIDENCE; lần hai bị chặn', async () => {
    const state = createCustomerState({
      serviceRequests: [serviceRequest({ kind: 'FAULT', status: 'AWAITING_QUOTATION', claim: claimView() })],
    })
    const page = await open(state, '/customer/after-sales/req-1')
    await page.getByText('Không được hỗ trợ').waitFor()
    await page.getByRole('button', { name: 'Xin xét lại' }).click()
    const dialog = page.getByRole('dialog', { name: 'Xin xét lại hỗ trợ thiên tai' })
    await dialog.getByRole('button', { name: 'Gửi yêu cầu xét lại' }).click()
    await dialog.getByText('Ghi điều ảnh hoặc thông tin bổ sung cho thấy.').waitFor()
    assert.equal(sent(state, 'POST', '/customers/me/after-sales/requests/req-1/reconsideration').length, 0)
    await dialog.getByLabel(/Thông tin bổ sung/).fill('Ảnh chụp mái tôn bị tốc sau bão ngày 24/10')
    await dialog.locator('input[type=file]').setInputFiles(PNG)
    await dialog.getByRole('button', { name: 'Gửi yêu cầu xét lại' }).click()
    await page.getByText('Đang xét lại theo yêu cầu của bạn').waitFor()
    assert.equal(await page.getByRole('button', { name: 'Xin xét lại' }).count(), 0)
    const [req] = sent(state, 'POST', '/customers/me/after-sales/requests/req-1/reconsideration')
    assert.equal(state.files[req.body.evidenceFileIds[0]].purpose, 'SERVICE_EVIDENCE')
    // Lần hai gửi thẳng lên backend cũng bị từ chối
    const second = handleCustomer(
      state,
      'POST',
      'http://x/api/customers/me/after-sales/requests/req-1/reconsideration',
      JSON.stringify({ note: 'lần hai', evidenceFileIds: [] }),
    )
    assert.equal(second.body.error.code, 'AFTER_SALES_INVALID_STATE')
    // Quản lý xét lại và vẫn từ chối: backend không cho xin lần hai, giao diện không còn nút
    Object.assign(state.serviceRequests[0].claim, { status: 'REJECTED', canRequestReconsideration: false })
    await page.reload()
    await page.getByText('Bạn xin xét lại lúc').waitFor()
    assert.equal(await page.getByRole('button', { name: 'Xin xét lại' }).count(), 0)
    const third = handleCustomer(
      state,
      'POST',
      'http://x/api/customers/me/after-sales/requests/req-1/reconsideration',
      JSON.stringify({ note: 'lần hai', evidenceFileIds: [] }),
    )
    assert.equal(third.body.error.code, 'DISASTER_RECONSIDERATION_USED')
    await page.context().close()
  })

  test('báo lỗi từ lần bảo trì giữ liên kết tới yêu cầu bảo trì gốc', async () => {
    const state = createCustomerState({
      serviceRequests: [
        serviceRequest({
          status: 'COMPLETED',
          visits: [
            visitView({
              status: 'REPORTED',
              reportedAt: new Date().toISOString(),
              findingNote: 'Dây DC hộp nối bị lỏng',
            }),
          ],
        }),
      ],
    })
    const page = await open(state, '/customer/after-sales/req-1')
    await page.getByText('Dây DC hộp nối bị lỏng').first().waitFor()
    await page.getByRole('button', { name: 'Báo lỗi' }).click()
    const dialog = page.getByRole('dialog', { name: 'Báo lỗi phát hiện khi bảo trì' })
    await dialog.getByRole('button', { name: 'Gửi báo lỗi' }).click()
    await page.waitForURL(/\/customer\/after-sales\/req-2$/)
    assert.equal(sent(state, 'POST', '/customers/me/after-sales/requests/req-1/report-fault')[0].body.description, null)
    assert.equal(state.serviceRequests[1].originRequestId, 'req-1')
    assert.equal(
      await page.getByRole('link', { name: 'Xem yêu cầu bảo trì' }).getAttribute('href'),
      '/customer/after-sales/req-1',
    )
    await page.context().close()
  })

  test('thông báo trong ứng dụng: nhãn tiếng Việt theo loại, dẫn tới đúng yêu cầu / gói', async () => {
    const state = createCustomerState({
      notifications: [
        {
          notificationId: 'n1',
          type: 'QUOTATION_ISSUED',
          message: 'A quotation for SV-1 is ready.',
          requestId: 'req-1',
          subscriptionId: null,
          createdAt: new Date().toISOString(),
          readAt: null,
        },
        {
          notificationId: 'n2',
          type: 'MAINTENANCE_DUE',
          message: 'Maintenance due.',
          requestId: null,
          subscriptionId: 'sub-1',
          createdAt: new Date().toISOString(),
          readAt: null,
        },
        {
          notificationId: 'n3',
          type: 'SOMETHING_NEW',
          message: 'x',
          requestId: null,
          subscriptionId: null,
          createdAt: new Date().toISOString(),
          readAt: null,
        },
      ],
    })
    const page = await open(state, '/customer/notifications')
    await page.getByText('Có báo giá mới chờ bạn duyệt').waitFor()
    await page.getByText('Tới tháng bảo trì, mời bạn đặt lịch').waitFor()
    await page.getByText('Có cập nhật mới').waitFor()
    assert.equal(await page.getByText('A quotation for SV-1 is ready.').count(), 0)
    assert.equal(
      await page.getByRole('link', { name: 'Xem yêu cầu' }).getAttribute('href'),
      '/customer/after-sales/req-1',
    )
    await page.context().close()
  })
})

describe('Địa điểm cũ thiếu mã phường, xã', () => {
  test('bổ sung ngay ở chỗ chọn giờ khảo sát: PUT đúng mã, giờ trống tải lại; mã không còn trong danh mục thì báo ở ô', async () => {
    const state = createCustomerState()
    const page = await open(state, `/customer/requests/${SR}`)
    await page.getByRole('button', { name: 'Bổ sung phường, xã' }).click()
    const dialog = page.getByRole('dialog', { name: 'Bổ sung phường, xã' })
    // Mã này đã bị bỏ khỏi danh mục của backend sau khi trang tải danh sách
    state.communes = state.communes.filter((c) => c.code !== '26740')
    await dialog.getByRole('combobox').fill('sai gon')
    await page.getByRole('option', { name: 'Phường Sài Gòn' }).click()
    await dialog.getByRole('button', { name: 'Lưu phường, xã' }).click()
    await dialog.getByText('Phường, xã này không có trong danh mục').waitFor()

    await dialog.getByRole('combobox').fill('ben thanh')
    await page.getByRole('option', { name: 'Phường Bến Thành' }).click()
    await dialog.getByRole('button', { name: 'Lưu phường, xã' }).click()
    await page.getByRole('radio', { name: /08:00/ }).first().waitFor()
    const puts = sent(state, 'PUT', `/customers/me/sites/${SITE}/administrative-location`)
    assert.deepEqual(puts.at(-1).body, { provinceCode: '79', communeCode: '26734' })
    assert.equal(sent(state, 'POST', '/customers/me/sites').length, 0)
    await page.context().close()
  })

  test('đánh giá sơ bộ: địa điểm cũ chỉ thiếu mã thì sửa trên chính địa điểm đó, giữ bản nháp, không tạo bản sao', async () => {
    const state = createCustomerState({
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
          latitude: 10.77,
          longitude: 106.7,
          selectedSimulationId: null,
          conventions: {},
        },
      },
    })
    const legacySite = {
      name: 'Nhà cũ quận 1',
      province: 'Thành phố Hồ Chí Minh',
      provinceCode: '79',
      district: 'Quận 1',
      ward: 'Phường Bến Nghé',
      communeCode: null,
      streetLine: '12 Lê Duẩn',
      latitude: 10.7769,
      longitude: 106.7009,
      installationSurfaceType: 1,
      surfaceMaterial: null,
      note: null,
    }
    const page = await open(state, '/customer/assessment?buoc=dia-diem', {
      'smartsolar.customer-profile.cust-1': '1',
      'smartsolar.assessment-draft.cust-1': JSON.stringify({
        site: legacySite,
        siteId: 'site-legacy',
        preSurveyId: 'ps-legacy',
      }),
    })
    const ward = page.getByRole('combobox', { name: /Phường, xã/ })
    await ward.waitFor()
    await ward.fill('ben thanh')
    await page.getByRole('option', { name: 'Phường Bến Thành' }).click()
    await page.getByRole('button', { name: 'Tiếp tục: Mặt lắp' }).click()
    await waitFor(
      () => sent(state, 'PUT', '/customers/me/sites/site-legacy/administrative-location').length === 1,
      'PUT địa điểm',
    )
    await page.waitForURL(/buoc=mat-lap/)
    assert.equal(sent(state, 'POST', '/customers/me/sites').length, 0, 'không tạo địa điểm mới')
    assert.equal(sent(state, 'POST', '/pre-surveys').length, 0, 'không tạo bản nháp mới')
    const draft = JSON.parse(await page.evaluate(() => localStorage.getItem('smartsolar.assessment-draft.cust-1')))
    assert.equal(draft.preSurveyId, 'ps-legacy')
    assert.equal(draft.siteId, 'site-legacy')
    assert.equal(draft.site.communeCode, '26734')
    await page.context().close()
  })
})
