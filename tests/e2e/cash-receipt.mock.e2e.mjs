// E2E phiếu thu tiền mặt của kỹ thuật viên (luồng 2, khoản 30/70) trên trình duyệt thật (Chromium, Vite dev) với BACKEND GIẢ LẬP
// (tests/e2e/support/cash-receipt-backend.mjs, mô phỏng luật của backend main 9ae01e7). Không cần tài khoản hay mạng. Kiểm:
// kỹ thuật viên chọn tiền mặt, chụp, tải, gửi phiếu; khoản vẫn chưa trả; quản lý xác nhận / yêu cầu bổ sung; kỹ thuật viên thấy
// kết quả không cần tải lại trang; khoản 70%; lỗi tải lên, số phiếu trùng, ảnh của người khác, hai người xét cùng lúc, revision
// cũ, link ảnh hết hạn, SCHEMA_NOT_READY; quyền của kỹ thuật viên khác / khách; khách không thấy phiếu thu.
// Đây là test với API GIẢ LẬP: không thay cho kiểm với backend thật, camera thật và S3 thật.
//   node --test tests/e2e/cash-receipt.mock.e2e.mjs          (ảnh chụp màn: E2E_SCREENSHOT_DIR=...)
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, test } from 'node:test'
import { crc32, deflateSync } from 'node:zlib'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { startCashReceiptBackend, USERS } from './support/cash-receipt-backend.mjs'

const CONTRACT = 'c-e2e-1'
const SHOTS = process.env.E2E_SCREENSHOT_DIR ?? join(tmpdir(), 'cash-receipt-e2e')
const TIMEOUT = { timeout: 180_000 }

let mock
let server
let browser
let baseUrl

/** Ảnh PNG thật (mỗi màu một ảnh khác nhau) để trình duyệt vẽ được và byte đầu đúng PNG */
function png(r, g, b, size = 24) {
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data])
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
    return Buffer.concat([length, body, crc])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 2
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3, Buffer.from([r, g, b]))])
  const pixels = deflateSync(Buffer.concat(Array.from({ length: size }, () => row)))
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', pixels),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
const photo = (name, rgb) => ({ name, mimeType: 'image/png', buffer: png(...rgb) })

/** Một phiên trình duyệt đã đăng nhập (refresh token giả trong localStorage); kỹ thuật viên dùng khung điện thoại */
async function session(user, { mobile = false } = {}) {
  const context = await browser.newContext({
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    ...(mobile
      ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
      : { viewport: { width: 1366, height: 900 } }),
  })
  await context.addInitScript((id) => {
    localStorage.setItem('smart-solar.refresh-token', `rt:${id}`)
    localStorage.setItem('smart-solar.refresh-store', 'local')
  }, user.id)
  const page = await context.newPage()
  page.setDefaultTimeout(20_000)
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  const seen = []
  page.on('request', (r) => {
    const url = new URL(r.url())
    if (url.pathname.startsWith('/api/')) seen.push({ method: r.method(), path: url.pathname.slice(4) })
  })
  return { page, errors, seen, close: () => context.close() }
}

const count = (predicate) => mock.requests.filter(predicate).length
const shot = (page, name) => page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true })
const dialog = (page) => page.locator('dialog[open]')
const installmentRow = (page, label) => page.getByRole('row').filter({ hasText: label })

/** Gọi thẳng API giả lập bằng token của một người (kiểm luật phía backend mà giao diện đã ẩn nút) */
async function api(user, method, path, body) {
  const refresh = await fetch(`${mock.url}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: `rt:${user.id}` }),
  }).then((r) => r.json())
  const res = await fetch(`${mock.url}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${refresh.data.accessToken}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, body: await res.json() }
}

async function chooseCash(page, buttonName = 'Khách trả tiền mặt') {
  await page.getByRole('button', { name: buttonName }).click()
  await dialog(page).getByRole('button', { name: 'Ghi trả tiền mặt' }).click()
  await page.getByRole('button', { name: 'Chụp phiếu thu' }).waitFor()
}

async function captureAndSend(page, { number, file, submit = 'Gửi phiếu thu cho quản lý' }) {
  const d = dialog(page)
  if (file) await d.locator('input[type=file][capture]').setInputFiles(file)
  if (number !== undefined) await d.getByLabel('Số phiếu thu').fill(number)
  await d.getByRole('button', { name: submit }).click()
}

const skip = process.env.E2E_SKIP_MOCK ? 'E2E_SKIP_MOCK' : false

describe('phiếu thu tiền mặt (API giả lập)', { skip, concurrency: 1 }, () => {
  /** Phiên dùng xuyên suốt: kỹ thuật viên trên điện thoại, quản lý và quản trị trên máy tính */
  let tech
  let manager
  let admin

  before(async () => {
    mkdirSync(SHOTS, { recursive: true })
    mock = await startCashReceiptBackend()
    process.env.API_PROXY_TARGET = mock.url
    server = await createServer({
      server: { host: '127.0.0.1', port: 3187, strictPort: false, hmr: false, watch: null },
      logLevel: 'error',
    })
    await server.listen()
    baseUrl = server.resolvedUrls.local[0].replace(/\/$/, '')
    browser = await chromium.launch({ channel: 'chromium' })
    tech = await session(USERS.tech, { mobile: true })
    manager = await session(USERS.manager)
    admin = await session(USERS.admin)
  })

  after(async () => {
    for (const s of [tech, manager, admin]) await s?.close()
    await browser?.close()
    await server?.close()
    await mock?.close()
  })

  test('1. kỹ thuật viên chọn tiền mặt cho khoản 30%: hiện nút "Chụp phiếu thu", khoản chưa trả', TIMEOUT, async () => {
    const { page } = tech
    await page.goto(`${baseUrl}/tech/contracts/${CONTRACT}`, { timeout: 120_000 })
    await chooseCash(page)
    assert.equal(
      count((r) => r.method === 'POST' && r.path === `/technician/contracts/${CONTRACT}/installments/1/payment`),
      1,
    )
    await page.getByText('Khoản thanh toán chỉ được ghi nhận sau khi quản lý xác nhận phiếu thu.').waitFor()
    assert.equal(mock.contract.installments[0].status, 'DUE')
    await shot(page, '01-tech-capture-button-mobile')
  })

  test('2. form thiếu số phiếu / ảnh và ảnh sai loại: báo cạnh ô, không gọi API', TIMEOUT, async () => {
    const { page } = tech
    await page.getByRole('button', { name: 'Chụp phiếu thu' }).click()
    const d = dialog(page)
    await d.getByText('Số tiền đã thu').waitFor()
    await d.getByText('5.550.000').first().waitFor()
    const before = mock.requests.length
    await d.getByRole('button', { name: 'Gửi phiếu thu cho quản lý' }).click()
    await d.getByText('Ghi số in trên phiếu thu.').waitFor()
    await d.getByText('Chụp hoặc chọn ảnh phiếu thu.').waitFor()
    await d.locator('input[type=file]:not([capture])').setInputFiles({
      name: 'phieu.gif',
      mimeType: 'image/gif',
      buffer: Buffer.from('GIF89a'),
    })
    await d.getByText('Chỉ nhận ảnh JPEG, PNG, WebP hoặc tệp PDF.').waitFor()
    assert.equal(mock.requests.length, before, 'không gửi gì lên khi form chưa hợp lệ')
    await shot(page, '02-tech-capture-validation-mobile')
  })

  test(
    '3+18. tải ảnh lỗi giữa chừng rồi gửi lại; ảnh lên kho không kèm token; phiếu SUBMITTED, khoản vẫn DUE',
    TIMEOUT,
    async () => {
      const { page } = tech
      await mock.control('fail-next-storage-put')
      await captureAndSend(page, { number: 'PT-000123', file: photo('phieu-thu.png', [200, 40, 40]) })
      await dialog(page)
        .getByText(/Chưa tải được ảnh phiếu thu lên/)
        .waitFor()
      assert.equal(
        count((r) => r.path.endsWith('/payment/cash-receipt')),
        0,
        'chưa gửi phiếu khi ảnh chưa lên kho',
      )
      // Preview còn, bấm gửi lại là tải lại ảnh đã chọn
      await dialog(page).getByRole('img', { name: 'Ảnh phiếu thu vừa chụp' }).waitFor()
      await dialog(page).getByRole('button', { name: 'Gửi phiếu thu cho quản lý' }).click()
      await page.getByText('Đã gửi phiếu thu, chờ quản lý xác nhận').waitFor()
      assert.equal(mock.storagePuts.length, 2)
      assert.ok(
        mock.storagePuts.every((p) => p.authorization === null),
        'PUT lên kho không được mang Bearer token',
      )
      assert.equal(
        count((r) => r.method === 'POST' && r.path === '/files'),
        1,
      )
      assert.equal(mock.receipts.length, 1)
      assert.equal(mock.receipts[0].status, 'SUBMITTED')
      assert.equal(mock.contract.installments[0].status, 'DUE')
      assert.equal(await installmentRow(page, 'Khoản 30%').getByText('Đã thanh toán').count(), 0)
      await shot(page, '03-tech-submitted-mobile')
    },
  )

  test(
    '10. phiếu đang chờ: không có nút bỏ chọn tiền mặt, không gửi thêm; backend chặn huỷ (409)',
    TIMEOUT,
    async () => {
      const { page } = tech
      assert.equal(await page.getByRole('button', { name: 'Bỏ chọn tiền mặt' }).count(), 0)
      assert.equal(await page.getByRole('button', { name: 'Chụp phiếu thu' }).count(), 0)
      const cancel = await api(USERS.tech, 'POST', `/technician/contracts/${CONTRACT}/installments/1/payment/cancel`)
      assert.equal(cancel.status, 409)
      assert.equal(cancel.body.error.code, 'PAYMENT_CASH_RECEIPT_UNDER_REVIEW')
      // 16. Kỹ thuật viên không khảo sát công trình này chỉ đọc: không chụp, không bỏ chọn, không xét duyệt
      const other = await session(USERS.otherTech)
      try {
        await other.page.goto(`${baseUrl}/tech/contracts/${CONTRACT}`, { timeout: 120_000 })
        await other.page.getByText('Phiếu thu PT-000123').waitFor()
        for (const name of ['Chụp phiếu thu', 'Bỏ chọn tiền mặt', 'Khách trả tiền mặt'])
          assert.equal(await other.page.getByRole('button', { name }).count(), 0, name)
        assert.equal(await other.page.getByRole('link', { name: 'Xét duyệt phiếu thu' }).count(), 0)
      } finally {
        await other.close()
      }
    },
  )

  test(
    '11. quản lý không xác nhận trực tiếp được khi phiếu đang chờ: trang hợp đồng và bàn thu tiền dẫn tới xét duyệt',
    TIMEOUT,
    async () => {
      const { page } = manager
      await page.goto(`${baseUrl}/manage/contracts/${CONTRACT}`, { timeout: 120_000 })
      await page.getByRole('link', { name: 'Xét duyệt phiếu thu' }).waitFor()
      assert.equal(await page.getByRole('button', { name: 'Xác nhận đã thu' }).count(), 0)
      await page.goto(`${baseUrl}/manage/payments`)
      await page.getByText('Kỹ thuật viên đã gửi phiếu thu PT-000123').waitFor()
      await page.getByRole('link', { name: 'Xét duyệt phiếu thu' }).waitFor()
      assert.equal(await page.getByRole('button', { name: 'Xác nhận đã thu' }).count(), 0)
      const attemptId = mock.receipts[0].paymentAttemptId
      const direct = await api(USERS.manager, 'POST', `/manager/payments/${attemptId}/cash/confirm`, {
        amount: 5_550_000,
        receiptReference: 'PT-X',
        evidenceFileId: mock.receipts[0].evidenceFileId,
      })
      assert.equal(direct.body.error.code, 'PAYMENT_CASH_RECEIPT_UNDER_REVIEW')
    },
  )

  test('4. quản lý xem hàng chờ, mở chi tiết (ảnh của kỹ thuật viên, không tải lại), xác nhận', TIMEOUT, async () => {
    const { page } = manager
    await page.goto(`${baseUrl}/manage/cash-receipts`)
    const row = page.getByRole('row').filter({ hasText: 'PT-000123' })
    await row.waitFor()
    for (const text of ['HD-E2E-0001', 'Đợt 1 (30%)', 'Nguyễn Văn An', 'KTV Bình', '5.550.000'])
      await row.getByText(text).first().waitFor()
    await shot(page, '04-manager-queue')
    await row.getByRole('link', { name: /Xét duyệt/ }).click()
    const image = page.getByRole('img', { name: 'Ảnh phiếu thu PT-000123' }).first()
    await image.waitFor()
    await page.waitForFunction(() => {
      const img = document.querySelector('img[alt="Ảnh phiếu thu PT-000123"]')
      return img && img.complete && img.naturalWidth > 0
    })
    await shot(page, '05-manager-detail')
    const presignedBefore = count((r) => r.path === '/files/presigned-upload')
    await page.getByRole('button', { name: 'Xác nhận phiếu thu' }).click()
    const d = dialog(page)
    await d.getByText('5.550.000').first().waitFor()
    await d.getByText('HD-E2E-0001').waitFor()
    await shot(page, '06-manager-accept-dialog')
    await d.getByRole('button', { name: 'Xác nhận phiếu thu' }).click()
    await page.getByText(/Đã xác nhận phiếu thu PT-000123\. Đợt 1 \(30%\) đã được ghi đã trả\./).waitFor()
    await page.getByText(/Đã xác nhận phiếu thu lúc/).waitFor()
    assert.equal(
      count((r) => r.path === '/files/presigned-upload'),
      presignedBefore,
      'quản lý không tải ảnh lên lại',
    )
    assert.equal(mock.receipts[0].status, 'ACCEPTED')
    assert.equal(mock.contract.installments[0].status, 'PAID')
    await page.getByRole('link', { name: 'Phiếu thu tiền mặt' }).first().click()
    await page.getByText('Không có phiếu thu nào chờ xác nhận').waitFor()
  })

  test('5. kỹ thuật viên thấy khoản 30% đã trả mà không tải lại trang', TIMEOUT, async () => {
    const { page } = tech
    const reads = count(
      (r) => r.method === 'GET' && r.path === `/technician/contracts/${CONTRACT}/installments/1/payment`,
    )
    await installmentRow(page, 'Khoản 30%').getByText('Đã thanh toán').waitFor({ timeout: 30_000 })
    assert.ok(
      count((r) => r.method === 'GET' && r.path === `/technician/contracts/${CONTRACT}/installments/1/payment`) > reads,
      'trạng thái tới từ lần hỏi lại định kỳ',
    )
    await shot(page, '07-tech-paid-mobile')
  })

  test(
    '6+12+20. khoản 70%: hệ thống đang cập nhật, số phiếu trùng của lần thanh toán khác báo cạnh ô, đổi số gửi lại không tải ảnh lại',
    TIMEOUT,
    async () => {
      await mock.control('open-balance')
      const { page } = tech
      await page.reload()
      await chooseCash(page)
      await page.getByRole('button', { name: 'Chụp phiếu thu' }).click()
      const presigned = count((r) => r.path === '/files/presigned-upload')
      // 20 (kỹ thuật viên). Hệ thống chưa chạy migration: báo đang cập nhật, không coi là đã gửi
      await page.route('**/payment/cash-receipt', (route) =>
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ isSuccess: false, error: { code: 'SCHEMA_NOT_READY', message: 'not ready' } }),
        }),
      )
      await captureAndSend(page, { number: 'PT-000777', file: photo('phieu-70.png', [40, 160, 40]) })
      await dialog(page)
        .getByText(/Hệ thống đang cập nhật nên tạm thời chưa dùng được phiếu thu/)
        .waitFor()
      await page.unroute('**/payment/cash-receipt')
      assert.equal(mock.receipts.length, 1)
      // 12. Số phiếu của lần thanh toán khác
      await captureAndSend(page, { number: 'PT-000123' })
      await dialog(page).getByText('Số phiếu thu này đã dùng cho một lần thanh toán khác.').waitFor()
      assert.equal(
        count((r) => r.path === '/files/presigned-upload'),
        presigned + 1,
      )
      await captureAndSend(page, { number: 'PT-000124' })
      await page.getByText('Đã gửi phiếu thu, chờ quản lý xác nhận').waitFor()
      assert.equal(
        count((r) => r.path === '/files/presigned-upload'),
        presigned + 1,
        'ảnh đã xác minh được dùng lại',
      )
      assert.equal(mock.contract.installments[1].status, 'DUE')
    },
  )

  test('17. khách xem hợp đồng: không có phiếu thu, ảnh hay lịch sử xét duyệt', TIMEOUT, async () => {
    const customer = await session(USERS.customer)
    try {
      await customer.page.goto(`${baseUrl}/customer/contracts/${CONTRACT}`, { timeout: 120_000 })
      await customer.page.getByText('HD-E2E-0001').first().waitFor()
      await customer.page.waitForTimeout(1500)
      const body = await customer.page.locator('body').innerText()
      for (const secret of ['PT-000124', 'PT-000123', 'Ảnh phiếu thu', 'Xét duyệt'])
        assert.ok(!body.includes(secret), `khách không được thấy "${secret}"`)
      assert.ok(
        !customer.seen.some((r) => /cash-receipt|evidence\/url|\/manager\//.test(r.path)),
        'khách không gọi API phiếu thu',
      )
      const view = await api(USERS.customer, 'GET', `/customers/me/contracts/${CONTRACT}/installments/2/payment`)
      assert.equal(view.body.data.currentCashReceipt, null)
      assert.equal(view.body.data.cashReceipts, null)
      await shot(customer.page, '08-customer-no-receipt')
    } finally {
      await customer.close()
    }
  })

  test('7. quản lý yêu cầu bổ sung: lý do bắt buộc', TIMEOUT, async () => {
    const { page } = manager
    await page.goto(`${baseUrl}/manage/cash-receipts`)
    await page
      .getByRole('row')
      .filter({ hasText: 'PT-000124' })
      .getByRole('link', { name: /Xét duyệt/ })
      .click()
    await page.getByRole('button', { name: 'Yêu cầu bổ sung' }).click()
    const d = dialog(page)
    await d.getByRole('button', { name: 'Gửi yêu cầu bổ sung' }).click()
    await d.getByText('Ghi điều kỹ thuật viên cần bổ sung.').waitFor()
    assert.equal(
      count((r) => r.path.endsWith('/reject')),
      0,
    )
    await d.getByLabel('Lý do').fill('Ảnh mờ, vui lòng chụp lại số phiếu thu')
    await shot(page, '09-manager-reject-dialog')
    await d.getByRole('button', { name: 'Gửi yêu cầu bổ sung' }).click()
    await page.getByText('Đã yêu cầu kỹ thuật viên bổ sung phiếu thu PT-000124.').waitFor()
    await page.getByText(/Đã yêu cầu bổ sung lúc/).waitFor()
    assert.equal(mock.receipts[1].status, 'REJECTED')
    assert.equal(mock.contract.installments[1].status, 'DUE')
  })

  test(
    '8. kỹ thuật viên thấy lý do (không tải lại trang) và gửi lại; ảnh của người khác bị từ chối',
    TIMEOUT,
    async () => {
      const { page } = tech
      await page.getByText('Ảnh mờ, vui lòng chụp lại số phiếu thu').first().waitFor({ timeout: 30_000 })
      await page.getByRole('button', { name: 'Bỏ chọn tiền mặt' }).waitFor()
      await shot(page, '10-tech-rejected-mobile')
      await page.getByRole('button', { name: 'Gửi lại phiếu thu' }).click()
      const d = dialog(page)
      assert.equal(await d.getByLabel('Số phiếu thu').inputValue(), 'PT-000124')
      // Backend báo ảnh do tài khoản khác tải lên (13): bỏ ảnh, giải thích
      await page.route('**/payment/cash-receipt', (route) =>
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            isSuccess: false,
            error: { code: 'FILE_NOT_OWNED', message: 'owned by another user' },
          }),
        }),
      )
      await captureAndSend(page, { file: photo('lai.png', [40, 40, 200]), submit: 'Gửi lại phiếu thu' })
      await d.getByText(/do tài khoản khác tải lên/).waitFor()
      assert.equal(await d.getByRole('img', { name: 'Ảnh phiếu thu vừa chụp' }).count(), 0)
      await page.unroute('**/payment/cash-receipt')
      await captureAndSend(page, { file: photo('lai-2.png', [10, 90, 200]), submit: 'Gửi lại phiếu thu' })
      await page.getByText('Đã gửi phiếu thu, chờ quản lý xác nhận').waitFor()
      assert.equal(mock.receipts.length, 3)
      assert.equal(mock.receipts[2].status, 'SUBMITTED')
      await page.getByText('Các lần gửi phiếu thu (2)').waitFor()
    },
  )

  test('13. API: ảnh do kỹ thuật viên khác tải lên bị từ chối 403 FILE_NOT_OWNED', TIMEOUT, async () => {
    const presign = await api(USERS.otherTech, 'POST', '/files/presigned-upload', {
      purpose: 'PAYMENT_EVIDENCE',
      fileName: 'x.png',
      contentType: 'image/png',
      sizeBytes: 3,
    })
    await fetch(presign.body.data.uploadUrl, {
      method: 'PUT',
      headers: presign.body.data.headers,
      body: Buffer.from('abc'),
    })
    const file = await api(USERS.otherTech, 'POST', '/files', {
      purpose: 'PAYMENT_EVIDENCE',
      objectKey: presign.body.data.objectKey,
      fileName: 'x.png',
      contentType: 'image/png',
      sizeBytes: 3,
    })
    const view = await api(USERS.tech, 'GET', `/technician/contracts/${CONTRACT}/installments/2/payment`)
    // Phiếu đang chờ nên dùng lần thanh toán đang mở với phiếu mới sẽ bị chặn; kiểm ảnh trước khi kiểm phiếu chờ như backend
    const sent = await api(
      USERS.tech,
      'POST',
      `/technician/contracts/${CONTRACT}/installments/2/payment/cash-receipt`,
      {
        paymentAttemptId: view.body.data.current.paymentAttemptId,
        receiptNumber: 'PT-999',
        evidenceFileId: file.body.data.fileId,
      },
    )
    assert.equal(sent.status, 403)
    assert.equal(sent.body.error.code, 'FILE_NOT_OWNED')
  })

  test(
    '9+14+15. hai người xét cùng lúc: revision cũ thì tải lại; người sau không ghi đè; quản lý xác nhận phiếu gửi lại',
    TIMEOUT,
    async () => {
      const receiptId = mock.receipts[2].cashReceiptId
      await admin.page.goto(`${baseUrl}/admin/cash-receipts/${receiptId}`, { timeout: 120_000 })
      await admin.page.getByRole('button', { name: 'Xác nhận phiếu thu' }).click()
      await dialog(admin.page).getByText('Xác nhận phiếu thu?').waitFor()

      const { page } = manager
      await page.goto(`${baseUrl}/manage/cash-receipts/${receiptId}`)
      // Lần đầu backend báo revision cũ: hộp đóng, trang tải lại, không ghi gì
      let stale = true
      await page.route('**/cash-receipts/*/accept', (route) => {
        if (!stale) return route.continue()
        stale = false
        return route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ isSuccess: false, error: { code: 'PAYMENT_CASH_RECEIPT_STALE', message: 'stale' } }),
        })
      })
      const detailReads = count((r) => r.method === 'GET' && r.path === `/manager/payments/cash-receipts/${receiptId}`)
      await page.getByRole('button', { name: 'Xác nhận phiếu thu' }).click()
      await dialog(page).getByRole('button', { name: 'Xác nhận phiếu thu' }).click()
      await page.getByText('Phiếu thu vừa thay đổi ở nơi khác. Đã tải lại, xem lại rồi quyết định.').waitFor()
      assert.ok(
        count((r) => r.method === 'GET' && r.path === `/manager/payments/cash-receipts/${receiptId}`) > detailReads,
      )
      assert.equal(mock.receipts[2].status, 'SUBMITTED')
      // Xem lại rồi xác nhận thật
      await page.getByRole('button', { name: 'Xác nhận phiếu thu' }).click()
      await dialog(page).getByRole('button', { name: 'Xác nhận phiếu thu' }).click()
      await page.getByText(/Đợt 2 \(70%\) đã được ghi đã trả/).waitFor()
      await page.unroute('**/cash-receipts/*/accept')

      // Quản trị vẫn đang mở hộp với phiếu cũ
      await dialog(admin.page).getByRole('button', { name: 'Xác nhận phiếu thu' }).click()
      await admin.page.getByText('Phiếu thu này đã được xác nhận hoặc đã yêu cầu bổ sung. Đã tải lại.').waitFor()
      await admin.page.getByText(/Đã xác nhận phiếu thu lúc/).waitFor()
      assert.equal(await admin.page.getByRole('button', { name: 'Xác nhận phiếu thu' }).count(), 0)
      assert.equal(mock.receipts.filter((r) => r.status === 'ACCEPTED').length, 2)
      await shot(admin.page, '11-admin-concurrent-review')
    },
  )

  test('5 (70%). kỹ thuật viên thấy khoản 70% đã trả mà không tải lại trang', TIMEOUT, async () => {
    const { page } = tech
    await installmentRow(page, 'Khoản 70%').getByText('Đã thanh toán').waitFor({ timeout: 30_000 })
    assert.equal(mock.contract.status, 'PAID')
  })

  test(
    '16. kỹ thuật viên và khách không vào được trang phiếu thu, không gọi được API của quản lý',
    TIMEOUT,
    async () => {
      const other = await session(USERS.otherTech)
      const customer = await session(USERS.customer)
      try {
        for (const s of [other, customer]) {
          await s.page.goto(`${baseUrl}/manage/cash-receipts`, { timeout: 120_000 })
          await s.page.waitForURL(/\/403/)
          await s.page.goto(`${baseUrl}/admin/cash-receipts/${mock.receipts[0].cashReceiptId}`)
          await s.page.waitForURL(/\/403/)
        }
        for (const user of [USERS.tech, USERS.customer]) {
          const list = await api(user, 'GET', '/manager/payments/cash-receipts?status=SUBMITTED&page=1&pageSize=20')
          assert.equal(list.status, 403)
          const accept = await api(
            user,
            'POST',
            `/manager/payments/cash-receipts/${mock.receipts[0].cashReceiptId}/accept`,
            {
              revision: 1,
            },
          )
          assert.equal(accept.status, 403)
        }
        const foreign = await api(USERS.otherTech, 'GET', `/technician/contracts/${CONTRACT}/installments/1/payment`)
        assert.equal(foreign.status, 404)
      } finally {
        await other.close()
        await customer.close()
      }
    },
  )

  test('19. link ảnh hết hạn: xin link mới khi phóng to, ảnh vẫn hiện', TIMEOUT, async () => {
    await mock.control('evidence-ttl', '?ms=1500')
    const { page } = manager
    const receiptId = mock.receipts[0].cashReceiptId
    await page.goto(`${baseUrl}/manage/cash-receipts/${receiptId}`)
    await page.waitForFunction(() => {
      const img = document.querySelector('img[alt="Ảnh phiếu thu PT-000123"]')
      return img && img.complete && img.naturalWidth > 0
    })
    const urls = () => count((r) => r.path === `/manager/payments/cash-receipts/${receiptId}/evidence/url`)
    const before = urls()
    await page.waitForTimeout(2000)
    await page.getByRole('button', { name: 'Phóng to', exact: true }).click()
    await dialog(page).getByRole('img', { name: 'Ảnh phiếu thu PT-000123' }).waitFor()
    await page.waitForFunction(() => {
      const img = document.querySelector('dialog[open] img')
      return img && img.complete && img.naturalWidth > 0
    })
    assert.ok(urls() > before, 'xin link mới vì link cũ đã hết hạn')
    await mock.control('evidence-ttl', '?ms=300000')
    await dialog(page).getByRole('button', { name: 'Đóng' }).click()
  })

  test('20. SCHEMA_NOT_READY: hàng chờ báo tạm thời chưa dùng được, các trang khác không vỡ', TIMEOUT, async () => {
    const { page } = manager
    await page.goto(`${baseUrl}/manage/cash-receipts`)
    await page.getByRole('tab', { name: /Chờ xác nhận/ }).waitFor()
    await mock.control('schema-not-ready', '?on=true')
    try {
      await page.getByRole('tab', { name: 'Tất cả' }).click()
      await page.getByText('Phiếu thu tiền mặt tạm thời chưa dùng được.').waitFor()
      await page.getByText('20261127021802_TechnicianCashReceipts').waitFor()
      await shot(page, '12-manager-schema-not-ready')
    } finally {
      await mock.control('schema-not-ready', '?on=false')
    }
  })

  test('không có lỗi JavaScript trên trang trong cả luồng', () => {
    for (const s of [tech, manager, admin]) assert.deepEqual(s.errors, [])
  })
})
