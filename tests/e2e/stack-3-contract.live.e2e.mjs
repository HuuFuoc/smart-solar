// Giai đoạn 3 trên backend thật (xem stack-harness.mjs): lịch khảo sát chờ nhận → bổ sung biên bản → kỹ thuật viên lập giỏ, chốt giá,
// trình bày, ghi khách đồng ý tại công trình, mở QR → khách trả (PayOS giả lập) → backend tự lập bản nháp hợp đồng đã trả → quản lý
// sửa, phát hành, gắn PDF, gửi ký → khách gửi bản ký → quản lý duyệt → PAID, không thu lần hai. Luồng theo backend `main` 462733c;
// kinh doanh chỉ đọc, khách chỉ theo dõi.
// Thanh toán dùng PayOS GIẢ LẬP của stack (local-test/fake-payos.mjs, cùng giao thức + webhook có chữ ký): PAID ở đây là do backend thật
// xác nhận theo phụ thuộc giả lập, KHÔNG phải bằng chứng thanh toán PayOS thật (payOS không có sandbox: https://payos.vn/docs/moi-truong-test).
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { describe, test } from 'node:test'
import { payFake } from './stack-flows.mjs'
import { setupStack } from './stack-harness.mjs'
import * as S from './stack-api.mjs'

const { skip, state, as, mark, expectCall } = await setupStack('3-contract')
const tag = new Date().toISOString().slice(11, 19).replace(/:/g, '')
const OFFICIAL_PDF = S.tinyPdf(`Hop dong lap dat ${tag}`)
const SIGNED_PDF = S.tinyPdf(`Ban da ky ${tag}`)

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
    await S.call('CUSTOMER', 'POST', '/customers/me', {
      customerType: 'INDIVIDUAL',
      companyName: null,
      taxCode: null,
      note: null,
    })
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
    await S.must('ADMIN', 'PUT', `/admin/technicians/${tech}/profile`, {
      isSchedulingActive: true,
      maxAppointmentsPerDay: 20,
    })
    const day = new Date(Date.now() + 31 * 3600_000).toISOString().slice(0, 10)
    const slots = await S.must('CUSTOMER', 'GET', `/survey-slots?propertySiteId=${site.propertySiteId}&date=${day}`)
    const slot = slots.slots.find((x) => x.canBook)
    assert.ok(slot, `không còn giờ trống ngày ${day}: ${slots.coverageStatus}`)
    state.surveyStartsAt = slot.startsAt
    state.appointmentId = (
      await S.must('CUSTOMER', 'POST', `/customers/me/survey-requests/${state.surveyRequestId}/booking`, {
        startsAt: slot.startsAt,
        note: null,
      })
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
    const att = await S.must('TECH', 'POST', `/technicians/me/appointments/${a}/onsite-survey/attachments`, {
      fileId: photo,
      category: 'ROOF',
      caption: 'Mái',
    })
    await S.must('TECH', 'POST', `/technicians/me/appointments/${a}/onsite-survey/complete`, { revision: att.revision })

    const page = await as('TECH', `/tech/jobs/${a}`)
    const t = mark()
    await page.getByRole('button', { name: 'Bổ sung biên bản' }).click()
    await page.locator('#amendment-reason').fill('Đo lại chiều rộng mái theo thước laser')
    await page.locator('#os-roofWidthM').fill('5,5')
    await page.getByRole('button', { name: 'Gửi bổ sung' }).click()
    await page
      .getByRole('dialog', { name: 'Gửi bổ sung biên bản?' })
      .getByRole('button', { name: 'Gửi bổ sung' })
      .click()
    await expectCall('T02', t)
    const report = await S.must('SALES', 'GET', `/survey-requests/${state.surveyRequestId}/onsite-survey`).catch(
      async () => {
        await S.must('SALES', 'POST', `/survey-requests/${state.surveyRequestId}/claim`)
        return S.must('SALES', 'GET', `/survey-requests/${state.surveyRequestId}/onsite-survey`)
      },
    )
    assert.equal(report.data.roofWidthM, 5.5)
    assert.equal(report.version, 2)
    assert.ok(report.amendments.length >= 1, 'có lịch sử bổ sung')
  })

  test('K01–K03: kỹ thuật viên lập giỏ báo giá từ danh mục rồi chốt giá; khách không nhận gì trong ứng dụng', async () => {
    const product = await S.must(null, 'GET', `/products/${state.productId}`)
    const page = await as('TECH', `/tech/jobs/${state.appointmentId}`)
    const quotation = page.locator('#quotation')
    let t = mark()
    await quotation.getByRole('button', { name: 'Lập báo giá' }).click()
    await expectCall('K01', t, 201)

    t = mark()
    await quotation.getByRole('button', { name: 'Thêm sản phẩm' }).click()
    const add = page.getByRole('dialog', { name: 'Thêm sản phẩm vào báo giá' })
    await add.locator('#cart-line-product').fill(product.sku ? `${product.name} (${product.sku})` : product.name)
    await add.locator('#cart-line-quantity').fill('10')
    await add.getByRole('button', { name: 'Thêm vào báo giá' }).click()
    await expectCall('K02', t)

    t = mark()
    await quotation.getByRole('button', { name: 'Chốt báo giá' }).click()
    await page.getByRole('dialog', { name: 'Chốt báo giá?' }).getByRole('button', { name: 'Chốt báo giá' }).click()
    await expectCall('K03', t)
    const list = await S.must('TECH', 'GET', `/technician/survey-requests/${state.surveyRequestId}/quotations`)
    const issued = list.find((q) => q.status === 'ISSUED')
    assert.equal(issued.origin, 'TECHNICIAN')
    assert.ok(issued.totalAmount > 0, 'giá và tổng do backend tính')
    state.quotationId = issued.quotationId

    // Kinh doanh không còn lệnh ghi báo giá: backend trả 410 ENDPOINT_RETIRED
    const retired = await S.call('SALES', 'POST', `/survey-requests/${state.surveyRequestId}/quotations/generate`)
    assert.equal(retired.status, 410)
    assert.equal(retired.error?.code, 'ENDPOINT_RETIRED')

    // Khách không còn đọc / duyệt báo giá trong ứng dụng
    for (const path of ['/customers/me/quotations', `/customers/me/quotations/${state.quotationId}`]) {
      const gone = await S.call('CUSTOMER', 'GET', path)
      assert.equal(gone.status, 410, path)
    }
    const accept = await S.call('CUSTOMER', 'POST', `/customers/me/quotations/${state.quotationId}/accept`)
    assert.equal(accept.status, 410)
  })

  test('K04–K06: trình bày, khách đồng ý tại công trình, mở QR, khách trả → hợp đồng tự lập đúng một bản (đã trả)', async () => {
    const page = await as('TECH', `/tech/jobs/${state.appointmentId}`)
    const quotation = page.locator('#quotation')
    const before = await S.must('TECH', 'GET', `/technician/quotations/${state.quotationId}`)

    let t = mark()
    await quotation.getByRole('button', { name: 'Trình bày cho khách' }).click()
    await page.getByRole('dialog', { name: 'Báo giá lắp đặt' }).getByRole('button', { name: 'Khách đồng ý' }).click()
    await page
      .getByRole('dialog', { name: 'Khách đồng ý báo giá?' })
      .getByRole('button', { name: 'Khách đồng ý' })
      .click()
    await expectCall('K04', t)

    // Ghi lần hai với revision cũ (nháy đúp, máy khác): 409, không có quyết định thứ hai
    const again = await S.call('TECH', 'POST', `/technician/quotations/${state.quotationId}/on-site-decision`, {
      decision: 'AGREED',
      revision: before.revision,
      note: null,
    })
    assert.equal(again.status, 409, `ghi lại quyết định: ${again.status} ${again.error?.code}`)
    // Đồng ý chưa phải trả tiền: chưa có hợp đồng, lập tay cũng bị từ chối
    const none = await S.must('MANAGER', 'GET', `/survey-requests/${state.surveyRequestId}/contracts`)
    assert.equal(none.filter((c) => c.quotationId === state.quotationId).length, 0, 'chưa trả thì chưa có hợp đồng')
    const manual = await S.call('MANAGER', 'POST', `/quotations/${state.quotationId}/contracts`, {
      terms: null,
      warrantyMonths: null,
    })
    assert.equal(manual.error?.code, 'CONTRACT_PAYMENT_REQUIRED', `lập hợp đồng khi chưa trả: ${manual.status}`)

    t = mark()
    await page.locator('#quotation-payment').getByRole('button', { name: 'Hiện mã QR' }).click()
    await expectCall('K05', t)
    await page.getByRole('img', { name: /^Mã QR thanh toán/ }).waitFor()
    // Đổi sang tiền mặt khi QR còn mở: backend bắt huỷ trước
    const switched = await S.call('TECH', 'POST', `/technician/quotations/${state.quotationId}/payment`, {
      method: 'CASH',
    })
    assert.equal(switched.error?.code, 'PAYMENT_CHECKOUT_IN_PROGRESS')

    const open = await S.must('TECH', 'GET', `/technician/quotations/${state.quotationId}/payment`)
    assert.equal(open.paymentState, 'ONLINE_IN_PROGRESS')
    assert.equal(open.contractId, null, 'QR đang mở không phải là đã trả')
    t = mark()
    await payFake(open.current.orderCode)
    // Trang tự hỏi lại trạng thái; chỉ hiện "đã nhận" khi backend báo PAID kèm hợp đồng
    await expectCall('K06', t)
    await page
      .getByText(/^Đã nhận /)
      .first()
      .waitFor({ timeout: 120_000 })
    const paid = await S.must('TECH', 'GET', `/technician/quotations/${state.quotationId}/payment`)
    assert.equal(paid.paymentState, 'PAID')
    assert.ok(paid.contractId)

    const contracts = await S.must('MANAGER', 'GET', `/survey-requests/${state.surveyRequestId}/contracts`)
    const drafted = contracts.filter((c) => c.quotationId === state.quotationId)
    assert.equal(drafted.length, 1, 'đúng một hợp đồng cho báo giá đã trả')
    assert.equal(drafted[0].status, 'DRAFT')
    assert.equal(drafted[0].paymentCompleted, true)
    assert.equal(drafted[0].paymentAttemptId, paid.current.paymentAttemptId)
    state.contractId = drafted[0].contractId
  })

  test('S02–S07 + S09: quản lý mở bản nháp tự lập, sửa, phát hành, gắn PDF, gửi ký, lập phụ lục rồi phát hành lại', async () => {
    // Kinh doanh chỉ đọc hợp đồng
    const salesWrite = await S.call('SALES', 'POST', `/contracts/${state.contractId}/issue`, { revision: 0 })
    assert.equal(salesWrite.status, 403, `kinh doanh phát hành hợp đồng: ${salesWrite.status}`)

    let t = mark()
    const page = await as('MANAGER', `/manage/contracts/${state.contractId}`)
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
    await amend
      .getByLabel('Điều khoản')
      .fill(`Điều 1. Lắp đặt hệ 5,5 kWp tại 12 Lê Lợi (${tag}). Phụ lục: đổi vị trí inverter.`)
    await amend.getByRole('button', { name: 'Lập phụ lục' }).click()
    await expectCall('S09', t, 201)
    await page.waitForURL((u) => u.pathname.startsWith('/manage/contracts/') && !u.pathname.endsWith(v1))
    state.contractId = page.url().split('/').pop()
    state.supersededContractId = v1
    await page.getByRole('heading', { name: /^Hợp đồng / }).waitFor()
    // lập phụ lục lần hai khi đã có bản nháp: backend từ chối (CONTRACT_ALREADY_EXISTS)
    const again = await S.call('MANAGER', 'POST', `/contracts/${v1}/amendments`, { terms: null, warrantyMonths: null })
    assert.equal(again.error?.code, 'CONTRACT_ALREADY_EXISTS', `phụ lục thứ hai: ${again.status}`)
    await issueAttachSend(page)
    assert.equal((await S.must('MANAGER', 'GET', `/contracts/${v1}`)).status, 'SUPERSEDED')
    const c = await S.must('MANAGER', 'GET', `/contracts/${state.contractId}`)
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
    await doc
      .locator('input[type=file]')
      .setInputFiles({ name: 'hop-dong.pdf', mimeType: 'application/pdf', buffer: OFFICIAL_PDF })
    await doc.getByRole('checkbox').check()
    await doc.getByRole('button', { name: 'Gắn PDF' }).click()
    await expectCall('S06', t)

    t = mark()
    await page.locator('#contract-actions').getByRole('button', { name: 'Gửi khách ký' }).click()
    await page.getByRole('dialog', { name: 'Gửi khách ký?' }).getByRole('button', { name: 'Gửi khách ký' }).click()
    await expectCall('S07', t)
    await page
      .getByText(/Chờ khách ký/)
      .first()
      .waitFor()
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
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Tải PDF chính thức' }).first().click(),
    ])
    const bytes = fs.readFileSync(await download.path())
    assert.equal(S.sha256(bytes), S.sha256(OFFICIAL_PDF))
    state.officialDownloadName = download.suggestedFilename()

    assert.equal(
      (await S.call('CUSTOMER2', 'GET', `/customers/me/contracts/${state.contractId}/official-document/url`)).status,
      404,
    )
    assert.equal((await S.call('SALES2', 'GET', `/contracts/${state.contractId}/official-document/url`)).status, 404)
    assert.equal(
      (await S.call('MANAGER', 'GET', `/contracts/${state.contractId}/official-document/url?disposition=bogus`)).status,
      400,
    )
  })

  test('C02: khách kiểm SHA-256 PDF đang giữ rồi gửi bản ký; tải lại thấy "đang kiểm tra" và tải được bản ký', async () => {
    const page = await as('CUSTOMER', `/customer/contracts/${state.contractId}`)
    const t = mark()
    await page.locator('#contract-sign').getByRole('button', { name: 'Gửi bản đã ký' }).click()
    const dialog = page.getByRole('dialog', { name: 'Gửi bản hợp đồng đã ký' })
    await dialog
      .locator('input[type=file]')
      .nth(0)
      .setInputFiles({ name: 'hop-dong.pdf', mimeType: 'application/pdf', buffer: OFFICIAL_PDF })
    await dialog.getByText('đúng là PDF chính thức của phiên bản này').waitFor()
    await dialog
      .locator('input[type=file]')
      .nth(1)
      .setInputFiles({ name: 'ban-da-ky.pdf', mimeType: 'application/pdf', buffer: SIGNED_PDF })
    await dialog.getByRole('button', { name: 'Gửi bản ký' }).click()
    await expectCall('C02', t)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByText('Smart Solar đang kiểm tra bản ký').first().waitFor()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page
        .getByRole('button', { name: /^Tải bản ký gửi / })
        .first()
        .click(),
    ])
    assert.equal(S.sha256(fs.readFileSync(await download.path())), S.sha256(SIGNED_PDF))
  })

  test('S08: quản lý mở hợp đồng, tải bản ký, duyệt; hợp đồng đã trả trước thành PAID ngay', async () => {
    const page = await as('MANAGER', `/manage/contracts/${state.contractId}`)
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page
        .getByRole('button', { name: /^Tải bản ký gửi lúc / })
        .first()
        .click(),
    ])
    assert.equal(S.sha256(fs.readFileSync(await download.path())), S.sha256(SIGNED_PDF))
    const t = mark()
    await page.locator('#contract-review').getByRole('button', { name: 'Duyệt bản ký' }).click()
    await page.getByRole('dialog', { name: 'Duyệt bản ký?' }).getByRole('button', { name: 'Duyệt bản ký' }).click()
    await expectCall('S08', t)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByText('Đã thanh toán và đã duyệt bản ký').first().waitFor()
    await expectCall('S10', t)
    assert.equal((await S.must('MANAGER', 'GET', `/contracts/${state.contractId}`)).status, 'PAID')
  })

  test('C04: hợp đồng trả trước không thu lần hai; khách thấy đã thanh toán, không có nút trả tiền', async () => {
    const t = mark()
    const page = await as('CUSTOMER', `/customer/contracts/${state.contractId}`)
    await page.getByRole('heading', { name: /^Hợp đồng / }).waitFor()
    await expectCall('C04', t)
    await page
      .getByText(/Đã thanh toán đủ lúc/)
      .first()
      .waitFor()
    assert.equal(await page.getByRole('button', { name: 'Thanh toán qua PayOS' }).count(), 0)
    const second = await S.call('CUSTOMER', 'POST', `/customers/me/contracts/${state.contractId}/payments`)
    assert.equal(second.error?.code, 'PAYMENT_ALREADY_PAID', `thu lần hai: ${second.status}`)
    const staff = await S.must('MANAGER', 'GET', `/contracts/${state.contractId}/payments`)
    assert.equal(staff.contractStatus, 'PAID')
  })
})
