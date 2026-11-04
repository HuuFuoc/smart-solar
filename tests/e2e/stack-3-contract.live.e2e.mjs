// Giai đoạn 3 trên backend thật (xem stack-harness.mjs): lịch khảo sát chờ nhận → bổ sung biên bản → PDF báo giá → hợp đồng (lập, sửa,
// phát hành, gắn PDF, gửi ký) → khách tải PDF chính thức, gửi bản ký → quản lý duyệt → thanh toán.
// Thanh toán dùng PayOS GIẢ LẬP của stack (local-test/fake-payos.mjs, cùng giao thức + webhook có chữ ký): PAID ở đây là do backend thật
// xác nhận theo phụ thuộc giả lập, KHÔNG phải bằng chứng thanh toán PayOS thật (payOS không có sandbox: https://payos.vn/docs/moi-truong-test).
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { describe, test } from 'node:test'
import { setupStack } from './stack-harness.mjs'
import * as S from './stack-api.mjs'

const { skip, state, as, mark, until, expectCall, url } = await setupStack('3-contract')
const tag = new Date().toISOString().slice(11, 19).replace(/:/g, '')
const OFFICIAL_PDF = S.tinyPdf(`Hop dong lap dat ${tag}`)
const SIGNED_PDF = S.tinyPdf(`Ban da ky ${tag}`)
const QUOTE_PDF = S.tinyPdf(`Bao gia ${tag}`)

describe('3. Khảo sát → báo giá → hợp đồng → thanh toán', { skip }, () => {
  test('tiền đề (API, ngoài 76): hồ sơ, địa điểm ở Bến Thành, đánh giá sơ bộ, khách đặt lịch sáng mai', async () => {
    const settings = await S.must('ADMIN', 'GET', '/admin/system-settings/scheduling')
    if (settings.settings.find((s) => s.key === 'onsiteSurvey.earlyStartMinutes').value < 1440)
      await S.must('ADMIN', 'PUT', '/admin/system-settings/scheduling', {
        settings: [{ key: 'onsiteSurvey.earlyStartMinutes', value: 1440, unit: 'MINUTES' }],
        expectedVersion: settings.version,
        reason: 'Kiểm thử: cho bắt đầu khảo sát trong 24 giờ trước giờ hẹn',
      })
    const communes = await S.must(null, 'GET', '/administrative-units/communes?provinceCode=79')
    const benThanh = communes.find((c) => c.name === 'Phường Bến Thành')
    await S.call('CUSTOMER', 'POST', '/customers/me', { customerType: 'INDIVIDUAL', companyName: null, taxCode: null, note: null })
    const site = await S.must('CUSTOMER', 'POST', '/customers/me/sites', {
      name: `Nhà phố Lê Lợi ${tag}`,
      province: 'Thành phố Hồ Chí Minh',
      district: null,
      ward: benThanh.name,
      streetLine: '12 Lê Lợi',
      latitude: 10.7725,
      longitude: 106.698,
      installationSurfaceType: 'ROOFTOP',
      surfaceMaterial: 'Tôn',
      note: null,
      provinceCode: '79',
      communeCode: benThanh.code,
    })
    state.siteId = site.propertySiteId
    state.siteName = `Nhà phố Lê Lợi ${tag}`
    const pre = await S.must('CUSTOMER', 'POST', '/pre-surveys', {
      propertySiteId: site.propertySiteId,
      totalAreaM2: 50,
      usableAreaM2: 40,
      tiltDegree: 15,
      azimuthDegree: 180,
      hasObstruction: false,
    })
    const surf = await S.must('CUSTOMER', 'GET', `/pre-surveys/${pre.preSurveyId}/surface`)
    await S.must('CUSTOMER', 'PUT', `/pre-surveys/${pre.preSurveyId}/surface`, {
      expectedRevision: surf.revision,
      surfaceLengthM: 10,
      surfaceWidthM: 5,
      surfaceTiltDegree: 15,
      surfaceAzimuthDegree: 180,
      obstacles: [],
    })
    state.surveyRequestId = (await S.must('CUSTOMER', 'POST', `/pre-surveys/${pre.preSurveyId}/submit`)).surveyRequestId
    // Giờ hẹn ngày mai (bắt đầu khảo sát chỉ được trong 24 giờ trước giờ hẹn); chạy lại nhiều lần thì nới số lịch / ngày
    const tech = await S.userId('TECH')
    await S.must('ADMIN', 'PUT', `/admin/technicians/${tech}/profile`, { isSchedulingActive: true, maxAppointmentsPerDay: 20 })
    const day = new Date(Date.now() + 31 * 3600_000).toISOString().slice(0, 10)
    const slots = await S.must('CUSTOMER', 'GET', `/survey-slots?propertySiteId=${site.propertySiteId}&date=${day}`)
    const slot = slots.slots.find((x) => x.canBook)
    assert.ok(slot, `không còn giờ trống ngày ${day}: ${slots.coverageStatus}`)
    state.surveyStartsAt = slot.startsAt
    state.appointmentId = (
      await S.must('CUSTOMER', 'POST', `/customers/me/survey-requests/${state.surveyRequestId}/booking`, { startsAt: slot.startsAt, note: null })
    ).appointmentId
  })

  test('T01: kỹ thuật viên mở lịch chờ nhận từ danh sách (chi tiết thật) rồi nhận việc', async () => {
    const page = await as('TECH', '/tech/jobs')
    const t = mark()
    await page.getByRole('tab', { name: /^Chờ nhận/ }).click()
    await page.getByRole('link', { name: state.siteName }).click()
    await expectCall('T01', t)
    await page.getByRole('heading', { name: state.siteName }).waitFor()
    await page.getByRole('button', { name: 'Nhận việc' }).click()
    await page.waitForURL(new RegExp(`/tech/jobs/${state.appointmentId}$`))
    // Lịch đã có người nhận: GET open-appointments/{id} trả 404 (đúng contract), không còn ở "Chờ nhận"
    const gone = await S.call('TECH', 'GET', `/technicians/me/open-appointments/${state.appointmentId}`)
    assert.equal(gone.status, 404)
  })

  test('T02: biên bản đã hoàn thành (tiền đề API) → bổ sung qua giao diện, giữ lịch sử, revision tăng', async () => {
    const a = state.appointmentId
    const start = await S.must('TECH', 'POST', `/technicians/me/appointments/${a}/onsite-survey/start`)
    await S.must('TECH', 'PUT', `/technicians/me/appointments/${a}/onsite-survey`, {
      revision: start.revision,
      roofType: 'METAL_SHEET',
      roofMaterial: 'Tôn lạnh',
      roofLengthM: 10,
      roofWidthM: 5,
      usableAreaM2: 40,
      tiltDegree: 15,
      azimuthDegree: 180,
      roofCondition: 'GOOD',
      electricalCabinetNotes: 'Tủ điện 1 pha, còn chỗ lắp CB',
      electricalConnectionNotes: null,
      installationFeasibility: 'FEASIBLE',
      proposedInverterLocation: 'Tầng trệt',
      proposedPanelLayoutNotes: null,
      measuredLatitude: null,
      measuredLongitude: null,
      notes: null,
      obstacles: [],
      billOfMaterials: null,
    })
    const photo = await S.uploadFile('TECH', 'ONSITE_SURVEY_EVIDENCE', 'mai.png', 'image/png', S.tinyPng())
    const att = await S.must('TECH', 'POST', `/technicians/me/appointments/${a}/onsite-survey/attachments`, { fileId: photo, category: 'ROOF', caption: 'Mái' })
    await S.must('TECH', 'POST', `/technicians/me/appointments/${a}/onsite-survey/complete`, { revision: att.revision })

    const page = await as('TECH', `/tech/jobs/${a}`)
    const t = mark()
    await page.getByRole('button', { name: 'Bổ sung biên bản' }).click()
    await page.locator('#amendment-reason').fill('Đo lại chiều rộng mái theo thước laser')
    await page.locator('#os-roofWidthM').fill('5,5')
    await page.getByRole('button', { name: 'Gửi bổ sung' }).click()
    await page.getByRole('dialog', { name: 'Gửi bổ sung biên bản?' }).getByRole('button', { name: 'Gửi bổ sung' }).click()
    await expectCall('T02', t)
    const report = await S.must('SALES', 'GET', `/survey-requests/${state.surveyRequestId}/onsite-survey`).catch(async () => {
      await S.must('SALES', 'POST', `/survey-requests/${state.surveyRequestId}/claim`)
      return S.must('SALES', 'GET', `/survey-requests/${state.surveyRequestId}/onsite-survey`)
    })
    assert.equal(report.data.roofWidthM, 5.5)
    assert.equal(report.version, 2)
    assert.ok(report.amendments.length >= 1, 'có lịch sử bổ sung')
  })

  test('S11: báo giá (tiền đề API) đã gửi → kinh doanh tải PDF báo giá và gắn qua giao diện', async () => {
    const sr = state.surveyRequestId
    await S.call('SALES', 'POST', `/survey-requests/${sr}/claim`)
    const validUntil = `${new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10)}T23:59:59+07:00`
    let q = await S.must('SALES', 'POST', `/survey-requests/${sr}/quotations`, {
      revision: null,
      laborCost: 5_000_000,
      transportCost: 500_000,
      otherServiceCost: 0,
      discountAmount: 0,
      taxRatePercent: 8,
      validUntil,
      terms: 'Bảo hành theo hợp đồng.',
      notes: null,
    })
    q = await S.must('SALES', 'POST', `/quotations/${q.quotationId}/lines`, {
      revision: q.revision,
      productId: state.productId,
      name: null,
      unit: null,
      quantity: 10,
      unitPrice: null,
      description: null,
    })
    q = await S.must('SALES', 'POST', `/quotations/${q.quotationId}/issue`, { revision: q.revision, reviewNote: null })
    state.quotationId = q.quotationId
    const page = await as('SALES', `/ops/surveys/${sr}`)
    const t = mark()
    const section = page.getByRole('region', { name: 'Tệp PDF báo giá' })
    await section.locator('input[type=file]').setInputFiles({ name: 'bao-gia.pdf', mimeType: 'application/pdf', buffer: QUOTE_PDF })
    await section.getByRole('button', { name: 'Gắn vào báo giá' }).click()
    await expectCall('S11', t)
    await section.getByText('bao-gia.pdf').waitFor()
    const after = await S.must('SALES', 'GET', `/quotations/${state.quotationId}`)
    assert.ok(after.documentFileId ?? after.document?.fileId, 'báo giá đã gắn tệp')
    await S.must('CUSTOMER', 'POST', `/customers/me/quotations/${state.quotationId}/accept`)
  })

  test('S01–S07 + S09: lập, sửa, phát hành, gắn PDF, gửi ký, lập phụ lục rồi phát hành lại', async () => {
    const page = await as('SALES', `/ops/surveys/${state.surveyRequestId}`)
    let t = mark()
    await page.locator('#contracts').getByRole('button', { name: 'Lập hợp đồng' }).click()
    const create = page.getByRole('dialog', { name: 'Lập hợp đồng' })
    await create.getByLabel('Thời hạn bảo hành lắp đặt').selectOption('60')
    await create.getByRole('button', { name: 'Lập hợp đồng' }).click()
    await expectCall('S01', t, 201)
    await page.waitForURL(/\/ops\/contracts\/[0-9a-f-]{36}$/)
    state.contractId = page.url().split('/').pop()
    await page.getByRole('heading', { name: /^Hợp đồng / }).waitFor()
    await expectCall('S03', t)
    await expectCall('S02', t)

    t = mark()
    await page.getByRole('button', { name: 'Sửa bản nháp' }).click()
    const edit = page.getByRole('dialog', { name: 'Sửa bản nháp hợp đồng' })
    await edit.getByLabel('Điều khoản').fill(`Điều 1. Lắp đặt hệ 5,5 kWp tại 12 Lê Lợi (${tag}).`)
    await edit.getByRole('button', { name: 'Lưu bản nháp' }).click()
    await expectCall('S04', t)

    await issueAttachSend(page)
    const v1 = state.contractId

    // S09: phụ lục sau khi đã gửi ký → phiên bản 2 (nháp), phát hành thì phiên bản 1 bị thay
    t = mark()
    await page.getByRole('button', { name: 'Lập phụ lục' }).click()
    const amend = page.getByRole('dialog', { name: 'Lập phụ lục' })
    await amend.getByLabel('Điều khoản').fill(`Điều 1. Lắp đặt hệ 5,5 kWp tại 12 Lê Lợi (${tag}). Phụ lục: đổi vị trí inverter.`)
    await amend.getByRole('button', { name: 'Lập phụ lục' }).click()
    await expectCall('S09', t, 201)
    await page.waitForURL((u) => u.pathname.startsWith('/ops/contracts/') && !u.pathname.endsWith(v1))
    state.contractId = page.url().split('/').pop()
    state.supersededContractId = v1
    await page.getByRole('heading', { name: /^Hợp đồng / }).waitFor()
    // lập phụ lục lần hai khi đã có bản nháp: backend từ chối (CONTRACT_ALREADY_EXISTS)
    const again = await S.call('SALES', 'POST', `/contracts/${v1}/amendments`, { terms: null, warrantyMonths: null })
    assert.equal(again.error?.code, 'CONTRACT_ALREADY_EXISTS', `phụ lục thứ hai: ${again.status}`)
    await issueAttachSend(page)
    assert.equal((await S.must('SALES', 'GET', `/contracts/${v1}`)).status, 'SUPERSEDED')
    const c = await S.must('SALES', 'GET', `/contracts/${state.contractId}`)
    assert.equal(c.status, 'AWAITING_SIGNATURE')
    assert.equal(c.officialDocument.sha256, S.sha256(OFFICIAL_PDF))
  })

  async function issueAttachSend(page) {
    let t = mark()
    await page.getByRole('button', { name: 'Phát hành' }).click()
    await page.getByRole('dialog', { name: 'Phát hành hợp đồng?' }).getByRole('button', { name: 'Phát hành' }).click()
    await expectCall('S05', t)
    await page.getByText('Mã nội dung (ghi trên PDF)').waitFor()

    t = mark()
    await page.getByRole('button', { name: 'Gắn PDF chính thức' }).click()
    const doc = page.getByRole('dialog', { name: 'Gắn PDF hợp đồng chính thức' })
    await doc.locator('input[type=file]').setInputFiles({ name: 'hop-dong.pdf', mimeType: 'application/pdf', buffer: OFFICIAL_PDF })
    await doc.getByRole('checkbox').check()
    await doc.getByRole('button', { name: 'Gắn PDF' }).click()
    await expectCall('S06', t)

    t = mark()
    await page.locator('#contract-actions').getByRole('button', { name: 'Gửi khách ký' }).click()
    await page.getByRole('dialog', { name: 'Gửi khách ký?' }).getByRole('button', { name: 'Gửi khách ký' }).click()
    await expectCall('S07', t)
    await page.getByText(/Chờ khách ký/).first().waitFor()
  }

  test('PDF hợp đồng (API bổ sung): kinh doanh và khách tải đúng tệp; người khác không đọc được', async () => {
    const sales = await as('SALES', `/ops/contracts/${state.contractId}`)
    const [salesDownload] = await Promise.all([
      sales.waitForEvent('download'),
      sales.getByRole('button', { name: 'Tải PDF chính thức' }).first().click(),
    ])
    assert.equal(S.sha256(fs.readFileSync(await salesDownload.path())), S.sha256(OFFICIAL_PDF))

    const page = await as('CUSTOMER', `/customer/contracts/${state.contractId}`)
    const t = mark()
    await page.getByRole('heading', { name: /^Hợp đồng / }).waitFor()
    await expectCall('C01', t)
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Tải PDF chính thức' }).first().click()])
    const bytes = fs.readFileSync(await download.path())
    assert.equal(S.sha256(bytes), S.sha256(OFFICIAL_PDF))
    state.officialDownloadName = download.suggestedFilename()

    assert.equal((await S.call('CUSTOMER2', 'GET', `/customers/me/contracts/${state.contractId}/official-document/url`)).status, 404)
    assert.equal((await S.call('SALES2', 'GET', `/contracts/${state.contractId}/official-document/url`)).status, 404)
    assert.equal((await S.call('MANAGER', 'GET', `/contracts/${state.contractId}/official-document/url?disposition=bogus`)).status, 400)
  })

  test('C02: khách kiểm SHA-256 PDF đang giữ rồi gửi bản ký; tải lại thấy "đang kiểm tra" và tải được bản ký', async () => {
    const page = await as('CUSTOMER', `/customer/contracts/${state.contractId}`)
    const t = mark()
    await page.locator('#contract-sign').getByRole('button', { name: 'Gửi bản đã ký' }).click()
    const dialog = page.getByRole('dialog', { name: 'Gửi bản hợp đồng đã ký' })
    await dialog.locator('input[type=file]').nth(0).setInputFiles({ name: 'hop-dong.pdf', mimeType: 'application/pdf', buffer: OFFICIAL_PDF })
    await dialog.getByText('đúng là PDF chính thức của phiên bản này').waitFor()
    await dialog.locator('input[type=file]').nth(1).setInputFiles({ name: 'ban-da-ky.pdf', mimeType: 'application/pdf', buffer: SIGNED_PDF })
    await dialog.getByRole('button', { name: 'Gửi bản ký' }).click()
    await expectCall('C02', t)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByText('Smart Solar đang kiểm tra bản ký').first().waitFor()
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /^Tải bản ký gửi / }).first().click()])
    assert.equal(S.sha256(fs.readFileSync(await download.path())), S.sha256(SIGNED_PDF))
  })

  test('S08: quản lý mở hợp đồng, tải bản ký, duyệt; trạng thái SIGNED sau tải lại', async () => {
    const page = await as('MANAGER', `/manage/contracts/${state.contractId}`)
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /^Tải bản ký gửi lúc / }).first().click()])
    assert.equal(S.sha256(fs.readFileSync(await download.path())), S.sha256(SIGNED_PDF))
    const t = mark()
    await page.locator('#contract-review').getByRole('button', { name: 'Duyệt bản ký' }).click()
    await page.getByRole('dialog', { name: 'Duyệt bản ký?' }).getByRole('button', { name: 'Duyệt bản ký' }).click()
    await expectCall('S08', t)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByText('Đã ký, chờ khách thanh toán').first().waitFor()
    await expectCall('S10', t)
  })

  test('C03/C04/C05: tạo link, huỷ link, tạo link mới, trả tiền trên trang PayOS giả lập → backend xác nhận PAID', async () => {
    const page = await as('CUSTOMER', `/customer/contracts/${state.contractId}`)
    const pay = page.locator('#contract-payment')
    let t = mark()
    await pay.getByRole('button', { name: 'Tạo link thanh toán' }).click()
    await expectCall('C03', t)
    await pay.getByText('Mã đơn PayOS').waitFor()
    await expectCall('C04', t)
    t = mark()
    await pay.getByRole('button', { name: 'Huỷ link' }).click()
    await page.getByRole('dialog', { name: 'Huỷ link thanh toán?' }).getByRole('button', { name: 'Huỷ link' }).click()
    await expectCall('C05', t)
    await pay.getByRole('button', { name: 'Tạo link thanh toán' }).click()
    await pay.getByText('Mã đơn PayOS').waitFor()
    const [checkout] = await Promise.all([page.waitForEvent('popup'), pay.getByRole('link', { name: /Mở trang thanh toán PayOS/ }).click()])
    // Trang PayOS giả chuyển về Payments__ReturnUrl của stack (cổng dev 3000); E2E chạy Vite ở cổng khác nên mở cùng query tại đây
    const back = checkout.waitForRequest((r) => r.url().includes('/payments/return'), { timeout: 30_000 })
    await checkout.getByRole('button', { name: /Đã chuyển khoản/ }).click()
    const returned = new URL((await back).url())
    assert.ok(returned.searchParams.get('orderCode'), 'PayOS trả orderCode')
    const landing = await page.context().newPage()
    await landing.goto(url(`/payments/return${returned.search}`), { waitUntil: 'domcontentloaded' })
    await landing.waitForURL(/\/customer\/contracts\//, { timeout: 60_000 })
    await until(async () => (await S.must('CUSTOMER', 'GET', `/customers/me/contracts/${state.contractId}`)).status === 'PAID', 'PAID', 60_000, 2000)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByText(/Đã thanh toán đủ lúc/).first().waitFor()
    const staff = await S.must('MANAGER', 'GET', `/contracts/${state.contractId}/payments`)
    assert.equal(staff.contractStatus, 'PAID')
  })
})
