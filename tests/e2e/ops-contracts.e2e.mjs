// E2E cổng kinh doanh trên giao diện thật (Vite dev + Chromium), backend là bản giả trong mock-ops-api.mjs (page.route).
// Đây là test với API giả: chứng minh luồng giao diện và request gửi đi đúng hợp đồng của backend, KHÔNG chứng minh backend
// thật chạy. Phần khách gửi bản ký và PayOS xác nhận tiền được giả bằng hàm đổi trạng thái của mock.
// Chạy: node --test tests/e2e/ops-contracts.e2e.mjs
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import {
  createOpsState,
  customerSubmitsSignature,
  handleOps,
  installOpsMockApi,
  paymentConfirmed,
  quotationView,
  QUOTE,
  SR,
} from './mock-ops-api.mjs'

let server
let browser
let baseUrl

const PDF = { name: 'hop-dong.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% test\n%%EOF\n') }

before(async () => {
  server = await createServer({ server: { host: '127.0.0.1', port: 3175, strictPort: false }, logLevel: 'error' })
  await server.listen()
  baseUrl = server.resolvedUrls.local[0].replace(/\/$/, '')
  browser = await chromium.launch({ channel: 'chromium' })
  // Lần mở đầu Vite biên dịch mọi module: làm nóng trước khi chạy test
  const warm = await open(createOpsState(), `/ops/surveys/${SR}`)
  await warm.getByRole('heading', { name: 'Nhà phố Bến Thành' }).waitFor({ timeout: 120_000 })
  await warm.context().close()
})

after(async () => {
  await browser?.close()
  await server?.close()
})

/** Trang đã đăng nhập (refresh token giả trong localStorage, /auth/refresh trả JWT theo vai trò của state) */
async function open(state, path) {
  const context = await browser.newContext({ locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' })
  await context.addInitScript(() => {
    localStorage.setItem('smart-solar.refresh-token', 'refresh-1')
    localStorage.setItem('smart-solar.refresh-store', 'local')
  })
  const page = await context.newPage()
  page.setDefaultTimeout(15_000)
  await installOpsMockApi(page, state)
  await page.goto(`${baseUrl}${path}`)
  return page
}

const sent = (state, method, path) => state.requests.filter((r) => r.method === method && r.path === path)
const lastSent = (state, method, path) => sent(state, method, path).at(-1)
const waitFor = async (check, label) => {
  for (let i = 0; i < 100; i++) {
    if (await check()) return
    await new Promise((r) => setTimeout(r, 100))
  }
  assert.fail(`hết giờ chờ: ${label}`)
}

/** Gọi thẳng backend giả (như một người dùng khác) để dựng sẵn trạng thái */
function api(state, method, path, body) {
  const result = handleOps(state, method, `http://x/api${path}`, body === undefined ? null : JSON.stringify(body))
  state.requests.pop()
  assert.ok(result.status < 300, `${method} ${path}: ${JSON.stringify(result.body.error)}`)
  return result.body.data
}

/** Hợp đồng ở trạng thái `until`: DRAFT → ISSUED → AWAITING_SIGNATURE → UNDER_REVIEW → SIGNED */
function seed(state, until, { warrantyMonths = 12 } = {}) {
  let c = api(state, 'POST', `/quotations/${QUOTE}/contracts`, { terms: 'Điều 1', warrantyMonths })
  const steps = ['ISSUED', 'AWAITING_SIGNATURE', 'UNDER_REVIEW', 'SIGNED']
  for (const step of steps.slice(0, steps.indexOf(until) + 1)) {
    if (step === 'ISSUED') c = api(state, 'POST', `/contracts/${c.contractId}/issue`, { revision: c.revision })
    if (step === 'AWAITING_SIGNATURE') {
      const file = api(state, 'POST', '/files', {
        purpose: 'CONTRACT_DOCUMENT',
        objectKey: 'k',
        fileName: 'hd.pdf',
        contentType: 'application/pdf',
        sizeBytes: 20,
        checksumSha256: 'ab'.repeat(32),
      })
      c = api(state, 'PUT', `/contracts/${c.contractId}/official-document`, {
        revision: c.revision,
        fileId: file.fileId,
        canonicalHash: c.canonicalHash,
      })
      c = api(state, 'POST', `/contracts/${c.contractId}/publish`, { revision: c.revision })
    }
    if (step === 'UNDER_REVIEW') customerSubmitsSignature(state, c.contractId)
    if (step === 'SIGNED') {
      const current = state.contracts.find((x) => x.contractId === c.contractId)
      api(state, 'POST', `/contracts/${c.contractId}/review`, { revision: current.revision, decision: 'APPROVE' })
    }
  }
  return state.contracts.find((x) => x.contractId === c.contractId)
}

describe('A. luồng hợp đồng: báo giá đã đồng ý → nháp → phát hành → PDF → gửi ký → duyệt → thanh toán', () => {
  test('workflow chính trên giao diện, body đúng hợp đồng, PAID chỉ do hệ thống xác nhận', async () => {
    const state = createOpsState()
    const page = await open(state, `/ops/surveys/${SR}`)

    // Lập từ khối Hợp đồng của yêu cầu khảo sát
    await page.getByText('Chưa có hợp đồng').waitFor()
    await page.locator('#contracts').getByRole('button', { name: 'Lập hợp đồng' }).click()
    const create = page.getByRole('dialog', { name: 'Lập hợp đồng' })
    await create.getByLabel('Thời hạn bảo hành lắp đặt').selectOption('24')
    await create.getByRole('button', { name: 'Lập hợp đồng' }).click()
    await page.waitForURL(/\/ops\/contracts\/contract-1$/)
    assert.deepEqual(lastSent(state, 'POST', `/quotations/${QUOTE}/contracts`).body, {
      terms: 'Bảo hành theo hãng.',
      warrantyMonths: 24,
    })
    // Kinh doanh đọc thời hạn bằng API của kinh doanh, không gọi API của quản trị
    assert.equal(lastSent(state, 'GET', '/sales/after-sales/warranty-options').query.kind, 'INSTALLATION')
    assert.equal(sent(state, 'GET', '/admin/after-sales/warranty-options').length, 0)

    // Phát hành
    await page.getByRole('heading', { name: 'Hợp đồng HD-20261103-TEST01' }).waitFor()
    await page.getByRole('button', { name: 'Phát hành' }).click()
    await page.getByRole('dialog', { name: 'Phát hành hợp đồng?' }).getByRole('button', { name: 'Phát hành' }).click()
    await page.getByText('Mã nội dung (ghi trên PDF)').waitFor()
    assert.deepEqual(lastSent(state, 'POST', '/contracts/contract-1/issue').body, { revision: 0 })
    // Chưa gắn PDF thì chưa gửi ký được
    assert.equal(
      await page.locator('#contract-actions').getByRole('button', { name: 'Gửi khách ký' }).isDisabled(),
      true,
    )

    // Gắn PDF chính thức: tải lên xong mới gắn, gửi đúng mã nội dung của phiên bản
    await page.getByRole('button', { name: 'Gắn PDF chính thức' }).click()
    const doc = page.getByRole('dialog', { name: 'Gắn PDF hợp đồng chính thức' })
    await doc.locator('input[type=file]').setInputFiles(PDF)
    await doc.getByRole('checkbox').check()
    await doc.getByRole('button', { name: 'Gắn PDF' }).click()
    await waitFor(() => lastSent(state, 'PUT', '/contracts/contract-1/official-document'), 'gắn PDF')
    const presign = lastSent(state, 'POST', '/files/presigned-upload')
    assert.equal(presign.body.purpose, 'CONTRACT_DOCUMENT')
    assert.equal(presign.body.contentType, 'application/pdf')
    const c1 = state.contracts[0]
    assert.deepEqual(lastSent(state, 'PUT', '/contracts/contract-1/official-document').body, {
      revision: 1,
      fileId: 'file-1',
      canonicalHash: c1.canonicalHash,
    })

    // Gửi khách ký
    await page.getByText('hop-dong.pdf').first().waitFor()
    await page.locator('#contract-actions').getByRole('button', { name: 'Gửi khách ký' }).click()
    await page.getByRole('dialog', { name: 'Gửi khách ký?' }).getByRole('button', { name: 'Gửi khách ký' }).click()
    await page.getByText('Chờ khách ký và gửi bản ký').first().waitFor()
    assert.deepEqual(lastSent(state, 'POST', '/contracts/contract-1/publish').body, { revision: 2 })
    assert.equal(await page.locator('#contract-review').getByRole('button', { name: 'Duyệt bản ký' }).count(), 0)

    // Khách gửi bản ký (cổng khách), kinh doanh duyệt
    customerSubmitsSignature(state, 'contract-1')
    await page.reload()
    await page.locator('#contract-review').getByRole('button', { name: 'Duyệt bản ký' }).click()
    await page.getByRole('dialog', { name: 'Duyệt bản ký?' }).getByRole('button', { name: 'Duyệt bản ký' }).click()
    await page.getByText('Đã ký, chờ khách thanh toán').waitFor()
    assert.deepEqual(lastSent(state, 'POST', '/contracts/contract-1/review').body, {
      revision: 4,
      decision: 'APPROVE',
      reason: null,
    })
    await page.getByText('Khách chưa mở link thanh toán nào.').waitFor()

    // PayOS xác nhận (backend), nhân viên chỉ tải lại để thấy
    paymentConfirmed(state, 'contract-1')
    await page.getByRole('button', { name: 'Tải lại' }).click()
    await page.getByText(/Đã thanh toán đủ lúc/).waitFor()
    await page.getByText('Hợp đồng đã thanh toán nên không sửa được nữa.').waitFor()
    assert.equal(await page.getByRole('button', { name: 'Lập phụ lục' }).count(), 0)

    // Tải lại cả trang: dữ liệu vẫn là của backend
    await page.reload()
    await page.getByText(/Đã thanh toán đủ lúc/).waitFor()
    const writes = state.requests.filter((r) => r.method !== 'GET' && r.path.includes('/payments'))
    assert.equal(writes.length, 0, 'nhân viên không gửi lệnh thanh toán nào')

    // Yêu cầu đã có hợp đồng thì không còn nút đóng yêu cầu (backend từ chối SURVEY_REQUEST_CONTRACT_EXISTS)
    await page.goto(`${baseUrl}/ops/surveys/${SR}`)
    await page.locator('#contracts').getByText('Đã thanh toán').first().waitFor()
    assert.equal(await page.getByRole('button', { name: 'Đóng yêu cầu' }).count(), 0)
    await page.context().close()
  })
})

describe('B. chuyển trạng thái không hợp lệ và luật kiểm tra', () => {
  test('revision cũ: báo lỗi, tải lại, không tự gửi lại', async () => {
    const state = createOpsState()
    const c = seed(state, 'DRAFT')
    const page = await open(state, `/ops/contracts/${c.contractId}`)
    await page.getByRole('button', { name: 'Phát hành' }).waitFor()
    c.revision++ // người khác vừa sửa
    await page.getByRole('button', { name: 'Phát hành' }).click()
    const dialog = page.getByRole('dialog', { name: 'Phát hành hợp đồng?' })
    await dialog.getByRole('button', { name: 'Phát hành' }).click()
    await dialog.getByText('Hợp đồng vừa được cập nhật ở nơi khác. Đã tải lại, kiểm tra rồi thử lại.').waitFor()
    assert.equal(sent(state, 'POST', `/contracts/${c.contractId}/issue`).length, 1)
    await waitFor(
      () => state.requests.filter((r) => r.method === 'GET' && r.path === `/contracts/${c.contractId}`).length >= 2,
      'tải lại hợp đồng',
    )
    assert.equal(sent(state, 'POST', `/contracts/${c.contractId}/issue`).length, 1)
    assert.equal(state.contracts[0].status, 'DRAFT')
    await page.context().close()
  })

  test('chưa có thời hạn bảo hành: không phát hành được; quản trị chưa cấu hình thì báo', async () => {
    const state = createOpsState()
    state.warranty = state.warranty.filter((o) => o.kind !== 'INSTALLATION')
    const c = seed(state, 'DRAFT', { warrantyMonths: null })
    assert.equal(c.warrantyMonths, null)
    const page = await open(state, `/ops/contracts/${c.contractId}`)
    await page.getByText('Chưa chọn thời hạn bảo hành lắp đặt.').first().waitFor()
    assert.equal(await page.getByRole('button', { name: 'Phát hành' }).isDisabled(), true)
    await page.getByRole('button', { name: 'Sửa bản nháp' }).click()
    await page.getByText('Chưa có thời hạn bảo hành lắp đặt nào').waitFor()
    assert.equal(sent(state, 'POST', `/contracts/${c.contractId}/issue`).length, 0)
    await page.context().close()
  })

  test('PDF sai phiên bản (mã nội dung không khớp): không gắn; tệp không phải PDF: không tải; tải lỗi: không gắn', async () => {
    const state = createOpsState()
    const c = seed(state, 'ISSUED')
    const page = await open(state, `/ops/contracts/${c.contractId}`)
    await page.getByRole('button', { name: 'Gắn PDF chính thức' }).click()
    const doc = page.getByRole('dialog', { name: 'Gắn PDF hợp đồng chính thức' })

    await doc
      .locator('input[type=file]')
      .setInputFiles({ name: 'anh.png', mimeType: 'image/png', buffer: Buffer.from('x') })
    await doc.getByText('Chỉ nhận tệp PDF.').waitFor()

    state.failPresign = true
    await doc.locator('input[type=file]').setInputFiles(PDF)
    await doc.getByRole('checkbox').check()
    await doc.getByRole('button', { name: 'Gắn PDF' }).click()
    await doc.getByText(/Chưa tải được tệp lên/).waitFor()
    assert.equal(sent(state, 'PUT', `/contracts/${c.contractId}/official-document`).length, 0)

    state.failPresign = false
    state.forceHashMismatch = true
    await doc.getByRole('button', { name: 'Gắn PDF' }).click()
    await doc.getByText(/mã nội dung không khớp/).waitFor()
    assert.equal(sent(state, 'PUT', `/contracts/${c.contractId}/official-document`).length, 1)
    assert.equal(state.contracts[0].officialDocument, null)
    await page.context().close()
  })

  test('từ chối bản ký thiếu lý do: không gửi; có lý do: thành bản ký bị từ chối', async () => {
    const state = createOpsState()
    const c = seed(state, 'UNDER_REVIEW')
    const page = await open(state, `/ops/contracts/${c.contractId}`)
    await page.getByRole('button', { name: 'Từ chối' }).click()
    const dialog = page.getByRole('dialog', { name: 'Từ chối bản ký' })
    await dialog.getByRole('button', { name: 'Từ chối bản ký' }).click()
    await dialog.getByText('Ghi lý do từ chối.').waitFor()
    assert.equal(sent(state, 'POST', `/contracts/${c.contractId}/review`).length, 0)
    await dialog.getByLabel('Lý do từ chối').fill('Thiếu chữ ký trang 2')
    await dialog.getByRole('button', { name: 'Từ chối bản ký' }).click()
    await page.getByText('Chờ khách gửi lại bản ký').waitFor()
    assert.deepEqual(lastSent(state, 'POST', `/contracts/${c.contractId}/review`).body, {
      revision: c.revision - 1,
      decision: 'REJECT',
      reason: 'Thiếu chữ ký trang 2',
    })
    assert.equal(state.contracts[0].status, 'SIGNATURE_REJECTED')
    await page.context().close()
  })

  test('duyệt khi tệp đã bị đổi: báo lỗi, hợp đồng giữ trạng thái chờ duyệt', async () => {
    const state = createOpsState()
    const c = seed(state, 'UNDER_REVIEW')
    state.fileChanged = true
    const page = await open(state, `/ops/contracts/${c.contractId}`)
    await page.locator('#contract-review').getByRole('button', { name: 'Duyệt bản ký' }).click()
    const dialog = page.getByRole('dialog', { name: 'Duyệt bản ký?' })
    await dialog.getByRole('button', { name: 'Duyệt bản ký' }).click()
    await dialog.getByText(/đã thay đổi sau khi xác minh nên không duyệt được/).waitFor()
    assert.equal(state.contracts[0].status, 'UNDER_REVIEW')
    await page.context().close()
  })
})

describe('C. phụ lục giữ lịch sử phiên bản', () => {
  test('lập phụ lục từ bản đã ký; phát hành phụ lục thì bản cũ thành bị thay', async () => {
    const state = createOpsState()
    const v1 = seed(state, 'SIGNED')
    const page = await open(state, `/ops/contracts/${v1.contractId}`)
    await page.getByRole('button', { name: 'Lập phụ lục' }).click()
    const dialog = page.getByRole('dialog', { name: 'Lập phụ lục' })
    await dialog.getByLabel('Điều khoản').fill('Điều 1 sửa đổi')
    await dialog.getByRole('button', { name: 'Lập phụ lục' }).click()
    await page.waitForURL(/\/ops\/contracts\/contract-2$/)
    assert.deepEqual(lastSent(state, 'POST', `/contracts/${v1.contractId}/amendments`).body, {
      terms: 'Điều 1 sửa đổi',
      warrantyMonths: null,
    })
    await page.getByText('Phiên bản 2 (phụ lục)').first().waitFor()
    // Đang có phụ lục nháp thì bản cũ không lập thêm phụ lục
    assert.equal(state.contracts[0].status, 'SIGNED')

    await page.getByRole('button', { name: 'Phát hành' }).click()
    await page.getByRole('dialog', { name: 'Phát hành hợp đồng?' }).getByRole('button', { name: 'Phát hành' }).click()
    await page.getByText('Mã nội dung (ghi trên PDF)').waitFor()
    assert.equal(state.contracts[0].status, 'SUPERSEDED')
    await page.getByRole('heading', { name: 'Các phiên bản' }).waitFor()
    await page.getByText('Đã có phụ lục thay').first().waitFor()
    await page.context().close()
  })
})

describe('D. quyền và lỗi', () => {
  test('kinh doanh không phụ trách: không thấy hợp đồng, không có nút thao tác', async () => {
    const state = createOpsState()
    const c = seed(state, 'DRAFT')
    state.notOwner = true
    const page = await open(state, `/ops/contracts/${c.contractId}`)
    await page.getByText('Không tìm thấy nội dung này.').waitFor()
    assert.equal(await page.getByRole('button', { name: 'Phát hành' }).count(), 0)
    await page.context().close()
  })

  test('quản trị chỉ xem: không có nút duyệt, không gọi API thời hạn của kinh doanh', async () => {
    const state = createOpsState({ role: 'ADMIN', userId: 'admin-1' })
    const c = seed({ ...state, role: 'SALES' }, 'UNDER_REVIEW')
    state.contracts = [c]
    const page = await open(state, `/admin/contracts/${c.contractId}`)
    await page.getByRole('heading', { name: 'Bản khách đã ký' }).waitFor()
    await page.getByText('Khách đã gửi bản ký, chờ kinh doanh hoặc quản lý duyệt').waitFor()
    assert.equal(await page.locator('#contract-review').getByRole('button', { name: 'Duyệt bản ký' }).count(), 0)
    assert.equal(sent(state, 'GET', '/sales/after-sales/warranty-options').length, 0)
    await page.context().close()
  })

  test('quản lý duyệt được bản ký trên cổng quản lý', async () => {
    const state = createOpsState({ role: 'MANAGER', userId: 'manager-1' })
    const c = seed({ ...state, role: 'SALES' }, 'UNDER_REVIEW')
    state.contracts = [c]
    const page = await open(state, `/manage/contracts/${c.contractId}`)
    await page.locator('#contract-review').getByRole('button', { name: 'Duyệt bản ký' }).click()
    await page.getByRole('dialog', { name: 'Duyệt bản ký?' }).getByRole('button', { name: 'Duyệt bản ký' }).click()
    await waitFor(() => lastSent(state, 'POST', `/contracts/${c.contractId}/review`), 'quản lý duyệt')
    assert.equal(lastSent(state, 'POST', `/contracts/${c.contractId}/review`).body.decision, 'APPROVE')
    await page.context().close()
  })

  test('trạng thái thanh toán chưa sẵn sàng (503): hiện chưa sẵn sàng, không coi là chưa có thanh toán', async () => {
    const state = createOpsState()
    const c = seed(state, 'SIGNED')
    state.paymentsUnavailable = true
    const page = await open(state, `/ops/contracts/${c.contractId}`)
    await page.getByText('Chức năng này chưa sẵn sàng.').waitFor()
    await page.getByText('20261031043834_X').waitFor()
    assert.equal(await page.getByText('Khách chưa mở link thanh toán nào.').count(), 0)
    await page.context().close()
  })

  test('lần thanh toán cần hoàn tiền được tô đỏ', async () => {
    const state = createOpsState()
    const c = seed(state, 'SIGNED')
    paymentConfirmed(state, c.contractId)
    state.payments[c.contractId].attempts.push({
      ...state.payments[c.contractId].attempts[0],
      paymentAttemptId: 'pay-2',
      orderCode: 900002,
      status: 'REFUND_REQUIRED',
    })
    const page = await open(state, `/ops/contracts/${c.contractId}`)
    await page.getByText('1 lần thanh toán cần xử lý tay').waitFor()
    await page.getByText(/Mã đơn 900002/).waitFor()
    await page.context().close()
  })

  test('quá giới hạn ghi (429): báo số giây phải chờ theo Retry-After', async () => {
    const state = createOpsState()
    state.rateLimitWrites = true
    const page = await open(state, `/ops/surveys/${SR}`)
    await page.locator('#contracts').getByRole('button', { name: 'Lập hợp đồng' }).click()
    const create = page.getByRole('dialog', { name: 'Lập hợp đồng' })
    await create.getByRole('button', { name: 'Lập hợp đồng' }).click()
    await create.getByText(/Thử lại sau 42 giây/).waitFor()
    assert.equal(state.contracts.length, 0)
    await page.context().close()
  })
})

describe('E. PDF báo giá', () => {
  test('báo giá đã gửi chưa có tệp: tải lên rồi mới gắn; gắn rồi thì không gắn lại', async () => {
    const state = createOpsState()
    state.quotations = [quotationView({ status: 'ISSUED', canAccept: true })]
    const page = await open(state, `/ops/surveys/${SR}`)
    const section = page.getByRole('region', { name: 'Tệp PDF báo giá' })
    await section.locator('input[type=file]').setInputFiles(PDF)
    await section.getByRole('button', { name: 'Gắn vào báo giá' }).click()
    await waitFor(() => lastSent(state, 'PUT', `/quotations/${QUOTE}/document`), 'gắn PDF báo giá')
    assert.equal(lastSent(state, 'POST', '/files/presigned-upload').body.purpose, 'QUOTATION_DOCUMENT')
    assert.deepEqual(lastSent(state, 'PUT', `/quotations/${QUOTE}/document`).body, { fileId: 'file-1' })
    await section.getByText('hop-dong.pdf').waitFor()
    assert.equal(await section.getByRole('button', { name: /Chọn tệp/ }).count(), 0)
    await page.context().close()
  })

  test('tải lên lỗi: không gọi lệnh gắn, không báo đã gắn', async () => {
    const state = createOpsState()
    state.quotations = [quotationView({ status: 'ISSUED', canAccept: true })]
    state.failPresign = true
    const page = await open(state, `/ops/surveys/${SR}`)
    const section = page.getByRole('region', { name: 'Tệp PDF báo giá' })
    await section.locator('input[type=file]').setInputFiles(PDF)
    await section.getByRole('button', { name: 'Gắn vào báo giá' }).click()
    await section.getByText(/Chưa tải được tệp lên/).waitFor()
    assert.equal(sent(state, 'PUT', `/quotations/${QUOTE}/document`).length, 0)
    assert.equal(state.quotations[0].documentFileId, null)
    await page.context().close()
  })
})

describe('F. việc nhắc khách', () => {
  test('nhận việc, bắt đầu, ghi liên hệ: thiếu kết quả không gửi; không liên lạc được thì việc đóng', async () => {
    const state = createOpsState()
    const page = await open(state, '/ops/after-sales')
    await page.getByText('Khách chưa đặt lịch lượt bảo trì tháng thứ 3 của gói.').waitFor()

    await page.getByRole('button', { name: 'Bắt đầu' }).click()
    await waitFor(() => lastSent(state, 'POST', '/sales/after-sales/tasks/task-claimed/start'), 'bắt đầu')
    await page.getByText('Đang làm').first().waitFor()
    assert.equal(await page.getByRole('button', { name: 'Bắt đầu' }).count(), 0)

    await page.getByRole('button', { name: 'Ghi liên hệ' }).click()
    const dialog = page.getByRole('dialog', { name: 'Ghi liên hệ khách' })
    await dialog.getByRole('button', { name: 'Lưu liên hệ' }).click()
    await dialog.getByText('Ghi kết quả của lần liên hệ.').waitFor()
    assert.equal(sent(state, 'POST', '/sales/after-sales/tasks/task-claimed/follow-up').length, 0)

    await dialog.getByLabel('Kết quả liên hệ').fill('Gọi 3 lần không bắt máy')
    await dialog.getByLabel('Không liên lạc được').check()
    await dialog.getByRole('button', { name: 'Lưu liên hệ' }).click()
    await waitFor(() => lastSent(state, 'POST', '/sales/after-sales/tasks/task-claimed/follow-up'), 'ghi liên hệ')
    // Việc đã đóng rời "Của tôi" (backend chỉ trả việc còn mở)
    await waitFor(
      async () => (await page.getByRole('button', { name: 'Ghi liên hệ' }).count()) === 0,
      'việc rời danh sách',
    )
    const body = lastSent(state, 'POST', '/sales/after-sales/tasks/task-claimed/follow-up').body
    assert.match(body.contactedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+07:00$/)
    assert.deepEqual(
      { ...body, contactedAt: undefined },
      {
        contactedAt: undefined,
        result: 'Gọi 3 lần không bắt máy',
        note: null,
        outcome: 'UNREACHABLE',
      },
    )
    await page.context().close()
  })

  test('bắt đầu khi việc đã đổi trạng thái: báo lỗi của backend; nhận việc nhắc không chuyển trang', async () => {
    const state = createOpsState()
    const page = await open(state, '/ops/after-sales')
    await page.getByRole('button', { name: 'Bắt đầu' }).waitFor()
    state.tasks.find((t) => t.taskId === 'task-claimed').status = 'IN_PROGRESS'
    await page.getByRole('button', { name: 'Bắt đầu' }).click()
    await page
      .getByText('Trạng thái đã thay đổi nên không làm được thao tác này. Tải lại để xem trạng thái mới.')
      .waitFor()

    await page.getByRole('tab', { name: /Chờ nhận/ }).click()
    await page.getByRole('button', { name: 'Nhận việc' }).click()
    await waitFor(() => lastSent(state, 'POST', '/sales/after-sales/tasks/task-open/claim'), 'nhận việc')
    assert.match(page.url(), /\/ops\/after-sales$/)
    await page.context().close()
  })
})
