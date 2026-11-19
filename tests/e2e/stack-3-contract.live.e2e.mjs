// Giai đoạn 3 trên backend thật (xem stack-harness.mjs), theo backend `main` 7d27054 (thanh toán 30/70, hợp đồng giấy, khách nghiệm
// thu): lịch khảo sát chờ nhận → bổ sung biên bản → kỹ thuật viên lập giỏ, chốt giá, trình bày, ghi khách đồng ý tại công trình →
// backend lập ngay đúng một hợp đồng 30/70 (bản nháp) → khách đọc trước → thu 30% bằng QR → hẹn ngày (dự kiến, chờ ký giấy) → tải ảnh
// từng trang hợp đồng giấy, chốt → SIGNED, lịch tự xác nhận, dự án lập → thi công khi đủ điều kiện (không cần trả đủ) → khách yêu cầu
// làm lại rồi nghiệm thu → khoản 70% đến hạn → khách trả 70% → PAID. Hợp đồng thứ hai: 30% tiền mặt, quản lý xác nhận. Kinh doanh chỉ
// đọc. Bước của vai trò khác ngoài giao diện đang kiểm (tiền đề) gọi API nghiệp vụ thật qua stack-flows.mjs.
// Thanh toán dùng PayOS GIẢ LẬP của stack (local-test/fake-payos.mjs, cùng giao thức + webhook có chữ ký): PAID ở đây là do backend thật
// xác nhận theo phụ thuộc giả lập, KHÔNG phải bằng chứng thanh toán PayOS thật (payOS không có sandbox: https://payos.vn/docs/moi-truong-test).
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import * as F from './stack-flows.mjs'
import { setupStack } from './stack-harness.mjs'
import * as S from './stack-api.mjs'

const { skip, state, evidence, as, mark, until, expectCall } = await setupStack('3-contract')
/** Response của trình duyệt theo method + mẫu đường dẫn (endpoint mới của bản 30/70, không thuộc 76 endpoint baseline) */
const sawPath = (method, pattern, since, status) =>
  until(
    () =>
      evidence
        .slice(since)
        .find((e) => e.method === method && pattern.test(e.path) && (status ? e.status === status : e.status < 300)),
    `${method} ${pattern}`,
    120_000,
  )
const tag = new Date().toISOString().slice(11, 19).replace(/:/g, '')

describe('3. Khảo sát → báo giá → hợp đồng 30/70 → thi công → nghiệm thu → thanh toán', { skip }, () => {
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

  test('K04: trình bày, khách đồng ý tại công trình → backend lập đúng một hợp đồng 30/70 bản nháp, giao diện mở trang hợp đồng', async () => {
    const page = await as('TECH', `/tech/jobs/${state.appointmentId}`)
    const quotation = page.locator('#quotation')
    const before = await S.must('TECH', 'GET', `/technician/quotations/${state.quotationId}`)

    const t = mark()
    await quotation.getByRole('button', { name: 'Trình bày cho khách' }).click()
    await page.getByRole('dialog', { name: 'Báo giá lắp đặt' }).getByRole('button', { name: 'Khách đồng ý' }).click()
    await page
      .getByRole('dialog', { name: 'Khách đồng ý báo giá?' })
      .getByRole('button', { name: 'Khách đồng ý' })
      .click()
    await expectCall('K04', t)
    // Không bắt khách đăng nhập, không mở thanh toán 100%: đi thẳng tới trang hợp đồng 30/70 vừa lập
    await page.waitForURL(/\/tech\/contracts\/[0-9a-f-]{36}$/)
    state.contractId = page.url().split('/').pop()
    const agreed = await S.must('TECH', 'GET', `/technician/quotations/${state.quotationId}`)
    assert.equal(agreed.status, 'ACCEPTED')
    assert.equal(agreed.contractId, state.contractId)

    // Ghi lại AGREED (mất phản hồi, bấm hai lần): cùng hợp đồng, không lập bản thứ hai
    const again = await S.must('TECH', 'POST', `/technician/quotations/${state.quotationId}/on-site-decision`, {
      decision: 'AGREED',
      revision: before.revision,
      note: null,
    })
    assert.equal(again.contractId, state.contractId)
    const list = await S.must('MANAGER', 'GET', `/contracts?quotationId=${state.quotationId}`)
    assert.equal(list.items.length, 1, 'đúng một hợp đồng cho báo giá')
    assert.equal(list.items[0].paymentPlan, 'DEPOSIT_30_BALANCE_70')

    // Thanh toán 100% báo giá đã bỏ
    const retired = await S.call('TECH', 'POST', `/technician/quotations/${state.quotationId}/payment`, {
      method: 'ONLINE',
    })
    assert.equal(retired.status, 410)
    assert.equal(retired.error?.code, 'ENDPOINT_RETIRED')
  })

  test('Khách đọc bản nháp 30/70 trước khi trả: điều khoản của backend, hai khoản 30% + 70% đúng bằng tổng', async () => {
    const c = await S.must('CUSTOMER', 'GET', `/customers/me/contracts/${state.contractId}`)
    assert.equal(c.status, 'DRAFT')
    const plan = c.paymentPlan
    assert.equal(plan.plan, 'DEPOSIT_30_BALANCE_70')
    assert.equal(plan.stage, 'DRAFT_CREATED')
    const [deposit, balance] = plan.installments
    assert.equal(deposit.sequence, 1)
    assert.equal(deposit.status, 'DUE')
    assert.equal(balance.status, 'PENDING')
    assert.equal(deposit.amount + balance.amount, plan.total, 'không lệch 1 đồng')
    assert.equal(plan.paid, 0)
    assert.equal(plan.outstanding, plan.total)
    assert.equal(c.paymentCompleted, false)
    state.depositAmount = deposit.amount
    state.balanceAmount = balance.amount

    const page = await as('CUSTOMER', `/customer/contracts/${state.contractId}`)
    await page.getByRole('heading', { name: /^Hợp đồng / }).waitFor()
    await page.getByText('Đọc kỹ toàn bộ điều khoản trước khi trả 30%').waitFor()
    await page
      .getByText(/ĐIỀU KHOẢN THANH TOÁN/)
      .first()
      .waitFor()
    if (plan.termsPendingLegalReview)
      await page.getByText('Điều khoản thanh toán và sở hữu đang chờ bộ phận pháp lý duyệt').waitFor()
    // Hợp đồng cũ có nút ký / tải bản ký; hợp đồng 30/70 thì khách không tải bản ký nào
    assert.equal(await page.getByRole('button', { name: 'Gửi bản đã ký' }).count(), 0)
  })

  test('Khoản 30% bằng QR: chưa trả thì chưa tải trang ký; QR đang mở chưa phải đã trả; PayOS xác minh → chờ ký giấy', async () => {
    const early = await S.call('TECH', 'POST', `/technician/contracts/${state.contractId}/signature-set`, {
      expectedPageCount: 2,
      signedOn: null,
      note: null,
    })
    assert.equal(early.error?.code, 'CONTRACT_DEPOSIT_REQUIRED', `ký trước khi trả 30%: ${early.status}`)
    // Khoản 70% chưa mở trước khi nghiệm thu
    const balance = await S.call('TECH', 'POST', `/technician/contracts/${state.contractId}/installments/2/payment`, {
      method: 'ONLINE',
    })
    assert.equal(balance.error?.code, 'CONTRACT_INSTALLMENT_NOT_PAYABLE')

    const page = await as('TECH', `/tech/contracts/${state.contractId}`)
    const installments = page.locator('#installments')
    let t = mark()
    await installments.getByRole('button', { name: 'Hiện mã QR' }).click()
    await sawPath('POST', /\/technician\/contracts\/\{id\}\/installments\/1\/payment$/, t)
    await page.getByRole('img', { name: /^Mã QR thanh toán/ }).waitFor()
    const open = await S.must('TECH', 'GET', `/technician/contracts/${state.contractId}/installments/1/payment`)
    assert.equal(open.paymentState, 'ONLINE_IN_PROGRESS')
    assert.equal(open.amount, state.depositAmount)
    // Đổi sang tiền mặt khi QR còn mở: phải huỷ trước
    const switched = await S.call('TECH', 'POST', `/technician/contracts/${state.contractId}/installments/1/payment`, {
      method: 'CASH',
    })
    assert.equal(switched.error?.code, 'PAYMENT_CHECKOUT_IN_PROGRESS')
    // Khách đổi ý khi đang mở thanh toán: backend từ chối, hợp đồng giữ nguyên
    const withdraw = await S.call('TECH', 'POST', `/technician/quotations/${state.quotationId}/on-site-decision`, {
      decision: 'DECLINED',
      revision: (await S.must('TECH', 'GET', `/technician/quotations/${state.quotationId}`)).revision,
      note: 'Kiểm thử: khách đổi ý khi QR đang mở',
    })
    assert.equal(withdraw.error?.code, 'QUOTATION_PAYMENT_STARTED')
    assert.equal(
      (await S.must('MANAGER', 'GET', `/contracts/${state.contractId}`)).status,
      'DRAFT',
      'QR mở chưa phải đã trả',
    )

    t = mark()
    await F.payFake(open.current.orderCode)
    // Trang tự hỏi lại; chỉ báo đã nhận khi backend báo PAID, rồi tải lại hợp đồng (chặng mới)
    await sawPath('GET', /\/technician\/contracts\/\{id\}\/installments\/1\/payment$/, t)
    await page.getByText('Đã nhận 30%, chờ ký giấy').first().waitFor({ timeout: 120_000 })
    const c = await S.must('MANAGER', 'GET', `/contracts/${state.contractId}`)
    assert.equal(c.status, 'AWAITING_SIGNATURE')
    assert.equal(c.paymentPlan.depositPaid, true)
    assert.equal(c.paymentPlan.fullyPaid, false)
    assert.equal(c.paymentCompleted, false, 'trả 30% không phải đã trả đủ')
    assert.equal(c.paymentPlan.paid, state.depositAmount)
    state.depositAttemptId = c.paymentPlan.installments[0].settledPaymentAttemptId
    // Đã nhận 30% thì không ghi khách đổi ý tại công trình được nữa
    const late = await S.call('TECH', 'POST', `/technician/quotations/${state.quotationId}/on-site-decision`, {
      decision: 'DECLINED',
      revision: (await S.must('TECH', 'GET', `/technician/quotations/${state.quotationId}`)).revision,
      note: 'Kiểm thử: khách đổi ý sau khi trả 30%',
    })
    assert.equal(late.status, 409)
  })

  test('Hẹn ngày thi công trước khi ký giấy: lịch chỉ là dự kiến, chờ hợp đồng giấy (awaitingContractSignature)', async () => {
    await F.openTechnicianDay()
    const page = await as('TECH', `/tech/contracts/${state.contractId}`)
    const panel = page.locator('#installation-schedule')
    await panel.getByRole('button', { name: 'Hẹn ngày', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Hẹn ngày thi công' })
    const day = F.vnDate(2).split('-').reverse().join('/')
    await dialog.locator('#schedule-date').fill(day)
    await dialog.locator('#schedule-date').press('Tab')
    await dialog.locator('#schedule-start').selectOption('08:00')
    await dialog.locator('#schedule-end-date').fill(day)
    await dialog.locator('#schedule-end-date').press('Tab')
    await dialog.locator('#schedule-end').selectOption('17:00')
    await dialog.locator('#schedule-agreement').fill('Kiểm thử: khách đồng ý ngày này tại nhà, có mặt chủ nhà')
    const t = mark()
    await dialog.getByRole('button', { name: 'Ghi lịch' }).click()
    await sawPath('POST', /\/technicians\/me\/contracts\/\{id\}\/installation-schedule$/, t)
    await panel.getByText('Lịch dự kiến, chờ ký hợp đồng giấy').waitFor()
    const history = await S.must('TECH', 'GET', `/technicians/me/contracts/${state.contractId}/installation-schedule`)
    const live = history.find((s) => s.status === 'PLANNED')
    assert.ok(live, 'có lịch dự kiến')
    assert.equal(live.awaitingContractSignature, true)
    assert.equal(live.awaitingPayment, false, 'hợp đồng 30/70 không chờ trả đủ')
    assert.equal(live.isConfirmed, false)
  })

  test('Hợp đồng giấy: thiếu trang, tệp sai mục đích, tệp của người khác không chốt được; đủ trang thì chốt → SIGNED, lịch tự xác nhận', async () => {
    const page = await as('TECH', `/tech/contracts/${state.contractId}`)
    const signature = page.locator('#paper-signature')
    await signature.locator('#sig-pages').fill('2')
    let t = mark()
    await signature.getByRole('button', { name: 'Bắt đầu tải các trang' }).click()
    await sawPath('POST', /\/technician\/contracts\/\{id\}\/signature-set$/, t)

    // Trang 1 qua giao diện (ảnh chụp, tệp SIGNED_CONTRACT_PAGE đã xác minh)
    t = mark()
    await signature
      .locator('input[type=file][multiple]')
      .setInputFiles({ name: 'trang-1.png', mimeType: 'image/png', buffer: S.tinyPng() })
    await signature.getByRole('button', { name: 'Tải lên 1 ảnh' }).click()
    await sawPath('PUT', /\/technician\/contracts\/\{id\}\/signature-set\/pages\/1$/, t)
    await until(async () => {
      const sets = await S.must('TECH', 'GET', `/contracts/${state.contractId}/signature-sets`)
      return sets.find((s) => s.status === 'UPLOADING')?.uploadedPageCount === 1
    }, 'trang 1 đã gắn')
    assert.equal(await signature.getByRole('button', { name: 'Chốt hợp đồng giấy' }).isDisabled(), true)
    let set = (await S.must('TECH', 'GET', `/contracts/${state.contractId}/signature-sets`)).find(
      (s) => s.status === 'UPLOADING',
    )
    const incomplete = await S.call(
      'TECH',
      'POST',
      `/technician/contracts/${state.contractId}/signature-set/finalize`,
      {
        expectedRevision: set.revision,
      },
    )
    assert.equal(incomplete.error?.code, 'CONTRACT_SIGNED_PAGES_INCOMPLETE')
    assert.deepEqual(incomplete.error?.details?.missingPages, [2])

    // Tệp tải cho việc khác, và tệp do người khác tải lên: không gắn được
    const survey = await S.uploadFile('TECH', 'ONSITE_SURVEY_EVIDENCE', 'mai.png', 'image/png', S.tinyPng())
    const wrong = await S.call('TECH', 'PUT', `/technician/contracts/${state.contractId}/signature-set/pages/2`, {
      fileId: survey,
    })
    assert.equal(wrong.error?.code, 'FILE_WRONG_PURPOSE')
    const managers = await S.uploadFile('MANAGER', 'SIGNED_CONTRACT_PAGE', 'trang-2.png', 'image/png', S.tinyPng())
    const notOwned = await S.call('TECH', 'PUT', `/technician/contracts/${state.contractId}/signature-set/pages/2`, {
      fileId: managers,
    })
    assert.equal(notOwned.error?.code, 'FILE_NOT_OWNED')
    // Ngoài số trang đã khai (tệp hợp lệ của chính kỹ thuật viên)
    const spare = await S.uploadFile('TECH', 'SIGNED_CONTRACT_PAGE', 'trang-du.png', 'image/png', S.tinyPng())
    const out = await S.call('TECH', 'PUT', `/technician/contracts/${state.contractId}/signature-set/pages/3`, {
      fileId: spare,
    })
    assert.equal(out.error?.code, 'CONTRACT_SIGNED_PAGE_OUT_OF_RANGE')

    // Trang 2 qua giao diện rồi chốt
    t = mark()
    await signature
      .locator('input[type=file][multiple]')
      .setInputFiles({ name: 'trang-2.png', mimeType: 'image/png', buffer: S.tinyPng() })
    await signature.getByRole('button', { name: 'Tải lên 1 ảnh' }).click()
    await sawPath('PUT', /\/technician\/contracts\/\{id\}\/signature-set\/pages\/2$/, t)
    await until(
      async () => !(await signature.getByRole('button', { name: 'Chốt hợp đồng giấy' }).isDisabled()),
      'đủ trang',
    )
    t = mark()
    await signature.getByRole('button', { name: 'Chốt hợp đồng giấy' }).click()
    await page
      .getByRole('dialog', { name: 'Chốt hợp đồng giấy?' })
      .getByRole('button', { name: 'Chốt', exact: true })
      .click()
    await sawPath('POST', /\/technician\/contracts\/\{id\}\/signature-set\/finalize$/, t)
    await signature.getByText(/^Đã chốt 2 trang lúc/).waitFor()

    const c = await S.must('MANAGER', 'GET', `/contracts/${state.contractId}`)
    assert.equal(c.status, 'SIGNED')
    assert.equal(c.paymentPlan.paperSigned, true)
    assert.equal(c.paymentPlan.readyForInstallation, true)
    assert.equal(c.paymentPlan.fullyPaid, false, 'SIGNED không phải PAID')
    assert.equal(c.paymentPlan.stage, 'READY_FOR_INSTALLATION')
    set = c.paymentPlan.signature
    assert.equal(set.status, 'FINALIZED')
    // Đã chốt là khoá
    const locked = await S.call('TECH', 'PUT', `/technician/contracts/${state.contractId}/signature-set/pages/1`, {
      fileId: spare,
    })
    assert.equal(locked.error?.code, 'CONTRACT_SIGNATURE_ALREADY_FINALIZED')
    // Khách xem lại được các trang đã ký
    const mine = await S.must('CUSTOMER', 'GET', `/customers/me/contracts/${state.contractId}/signature-sets`)
    assert.equal(mine.find((s) => s.status === 'FINALIZED')?.expectedPageCount, 2)

    // Lịch dự kiến được hệ thống xác nhận: dự án thi công lập và giao cho kỹ thuật viên đã khảo sát
    const confirmed = await F.poll(async () => {
      const history = await S.must('TECH', 'GET', `/technicians/me/contracts/${state.contractId}/installation-schedule`)
      return history.find((s) => s.status === 'CONFIRMED' && s.projectId)
    }, 'lịch được xác nhận sau khi chốt hợp đồng giấy')
    state.projectId = confirmed.projectId
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator('#installation-schedule').getByRole('link', { name: 'Mở công trình' }).waitFor()
  })

  test('Quyền: kinh doanh chỉ đọc, khách khác không thấy, kỹ thuật viên không xác nhận tiền; endpoint đã bỏ trả 410', async () => {
    const sales = await as('SALES', `/ops/contracts/${state.contractId}`)
    await sales.getByRole('heading', { name: /^Hợp đồng / }).waitFor()
    await sales.locator('#installments').waitFor()
    for (const name of [
      'Hiện mã QR',
      'Khách trả tiền mặt',
      'Xác nhận đã thu',
      'Bắt đầu tải các trang',
      'Chốt hợp đồng giấy',
    ])
      assert.equal(await sales.getByRole('button', { name }).count(), 0, `kinh doanh không có nút ${name}`)
    const salesPay = await S.call('SALES', 'POST', `/technician/contracts/${state.contractId}/installments/2/payment`, {
      method: 'CASH',
    })
    assert.equal(salesPay.status, 403)
    const techCash = await S.call('TECH', 'POST', `/manager/payments/${state.depositAttemptId}/cash/confirm`, {
      amount: state.depositAmount,
      receiptReference: `PT-${tag}`,
      evidenceFileId: null,
      note: null,
    })
    assert.equal(techCash.status, 403)
    assert.equal((await S.call('CUSTOMER2', 'GET', `/customers/me/contracts/${state.contractId}`)).status, 404)
    assert.equal(
      (await S.call('CUSTOMER2', 'GET', `/customers/me/contracts/${state.contractId}/signature-sets`)).status,
      404,
    )
    const customerUpload = await S.call('CUSTOMER', 'POST', `/technician/contracts/${state.contractId}/signature-set`, {
      expectedPageCount: 1,
      signedOn: null,
      note: null,
    })
    assert.equal(customerUpload.status, 403)
    const scan = await S.call('CUSTOMER', 'POST', `/customers/me/contracts/${state.contractId}/signed-document`, {
      fileId: state.contractId,
      officialDocumentSha256: 'x',
    })
    assert.equal(scan.status, 410)
    const internal = await S.call('MANAGER', 'POST', `/installation-projects/${state.projectId}/acceptance`, {
      expectedRevision: 0,
      note: 'Kiểm thử',
      evidenceFileId: null,
    })
    assert.equal(internal.status, 410)
    // Bước của luồng cũ trên hợp đồng 30/70
    const legacy = await S.call('MANAGER', 'POST', `/contracts/${state.contractId}/publish`, { revision: 0 })
    assert.equal(legacy.status >= 400 && legacy.status < 500, true)
  })

  test('Thi công khi backend báo đủ điều kiện (checklist, phân công, giờ); không cần trả đủ 100%', async () => {
    const tv = await S.must('TECH', 'GET', `/technicians/me/installation-projects/${state.projectId}`)
    assert.equal(tv.canStart, false, 'chưa tới giờ / chưa xong checklist thì chưa bắt đầu được')
    const tooEarly = await S.call('TECH', 'POST', `/technicians/me/installation-projects/${state.projectId}/start`)
    assert.ok(tooEarly.status >= 400 && tooEarly.status < 500, `bắt đầu khi chưa đủ điều kiện: ${tooEarly.status}`)

    const startsAt = await F.assignSoon(state.projectId)
    await F.satisfyChecklist(state.projectId)
    await F.acceptAndWait(state.projectId, startsAt)
    const page = await as('TECH', `/tech/installations/${state.projectId}`)
    const t = mark()
    await page.getByRole('button', { name: 'Bắt đầu lắp đặt' }).click()
    await sawPath('POST', /\/technicians\/me\/installation-projects\/\{id\}\/start$/, t)
    assert.equal(
      (await S.must('TECH', 'GET', `/technicians/me/installation-projects/${state.projectId}`)).status,
      'IN_PROGRESS',
    )
    const c = await S.must('MANAGER', 'GET', `/contracts/${state.contractId}`)
    assert.equal(c.status, 'SIGNED', 'thi công khi mới trả 30%')
    await F.reportCompletion(state.projectId, state.productId, { report: `Lượt 1: lắp xong (${tag})` })
  })

  test('Khách yêu cầu làm lại kèm ảnh → làm lại, khoản 70% chưa mở; lượt 2 → khách nghiệm thu → khoản 70% đến hạn', async () => {
    let page = await as('CUSTOMER', `/customer/projects/${state.projectId}`)
    await page.getByText('Báo cáo hoàn thành, chờ bạn nghiệm thu').waitFor()
    await page.getByRole('button', { name: 'Yêu cầu làm lại', exact: true }).click()
    const rework = page.getByRole('dialog', { name: 'Yêu cầu làm lại?' })
    await rework.locator('#acceptance-reason').fill(`Tấm pin hàng 2 bị lệch (${tag})`)
    await rework
      .locator('input[type=file]')
      .setInputFiles({ name: 'lech.png', mimeType: 'image/png', buffer: S.tinyPng() })
    let t = mark()
    await rework.getByRole('button', { name: 'Gửi yêu cầu làm lại' }).click()
    await sawPath('POST', /\/customers\/me\/installation-projects\/\{id\}\/acceptance$/, t)
    let p = await S.must('CUSTOMER', 'GET', `/customers/me/installation-projects/${state.projectId}`)
    assert.equal(p.status, 'REWORK_REQUIRED')
    assert.equal(p.acceptances.at(-1).decision, 'REWORK_REQUESTED')
    assert.equal(p.acceptances.at(-1).decidedBy, 'CUSTOMER')
    const notYet = await S.call(
      'CUSTOMER',
      'POST',
      `/customers/me/contracts/${state.contractId}/installments/2/payment`,
      {
        method: 'ONLINE',
      },
    )
    assert.equal(notYet.error?.code, 'CONTRACT_INSTALLMENT_NOT_PAYABLE', 'chưa nghiệm thu thì chưa trả 70%')
    // Kỹ thuật viên không nghiệm thu thay khách
    assert.equal(
      (
        await S.call('TECH', 'POST', `/customers/me/installation-projects/${state.projectId}/acceptance`, {
          decision: 'ACCEPT',
          expectedRevision: p.revision,
        })
      ).status,
      403,
    )

    await F.reportCompletion(state.projectId, state.productId, {
      registerAssets: false,
      report: `Lượt 2: đã chỉnh lại hàng 2 (${tag})`,
    })
    // Revision cũ (khách mở trang trước khi có báo cáo mới): 409, không ghi gì
    const stale = await S.call(
      'CUSTOMER',
      'POST',
      `/customers/me/installation-projects/${state.projectId}/acceptance`,
      {
        decision: 'ACCEPT',
        expectedRevision: p.revision,
      },
    )
    assert.equal(stale.status, 409)

    page = await as('CUSTOMER', `/customer/projects/${state.projectId}`)
    await page.getByText('Báo cáo hoàn thành, chờ bạn nghiệm thu').waitFor()
    await page.getByRole('button', { name: 'Nghiệm thu', exact: true }).click()
    t = mark()
    await page
      .getByRole('dialog', { name: 'Nghiệm thu công trình?' })
      .getByRole('button', { name: 'Nghiệm thu', exact: true })
      .click()
    await sawPath('POST', /\/customers\/me\/installation-projects\/\{id\}\/acceptance$/, t)
    await page
      .getByText(/^Trả khoản 70%/)
      .first()
      .waitFor({ timeout: 60_000 })

    p = await S.must('CUSTOMER', 'GET', `/customers/me/installation-projects/${state.projectId}`)
    assert.equal(p.status, 'COMPLETED')
    assert.deepEqual(
      p.acceptances.map((a) => a.decision),
      ['REWORK_REQUESTED', 'ACCEPTED'],
      'mỗi lượt giữ lịch sử',
    )
    const c = await S.must('CUSTOMER', 'GET', `/customers/me/contracts/${state.contractId}`)
    assert.equal(c.paymentPlan.stage, 'BALANCE_DUE')
    const balance = c.paymentPlan.installments.find((i) => i.sequence === 2)
    assert.equal(balance.status, 'DUE')
    const acceptedAt = Date.parse(p.acceptances.at(-1).decidedAt)
    const due = Date.parse(balance.dueAt)
    assert.ok(due > acceptedAt && due - acceptedAt <= 72 * 3600_000, `hạn trong tối đa 72 giờ: ${balance.dueAt}`)
    assert.equal(balance.overdue, false)
    state.inverterAssetId = p.assets.find((a) => a.assetType === 'INVERTER')?.assetId
    state.panelAssetId = p.assets.find((a) => a.assetType === 'PANEL')?.assetId
  })

  test('Khoản 70% bằng QR trong ứng dụng khách → hợp đồng PAID, đủ điều kiện xem xét chuyển quyền sở hữu', async () => {
    // Sau bán không gộp khoản 70% vào link mua gói
    const pkg = await F.createPackage('MAINTENANCE', `Bảo trì kiểm thử ${tag}`, 1_000_000)
    const bundle = await S.call('CUSTOMER', 'POST', '/customers/me/after-sales/purchases', {
      contractId: state.contractId,
      maintenancePackageId: pkg,
      disasterPackageId: null,
      includeContract: true,
    })
    assert.equal(bundle.status >= 400 && bundle.status < 500, true, `gộp khoản 70% vào mua gói: ${bundle.status}`)

    const page = await as('CUSTOMER', `/customer/contracts/${state.contractId}`)
    const installments = page.locator('#installments')
    let t = mark()
    await installments.getByRole('button', { name: 'Hiện mã QR' }).click()
    await sawPath('POST', /\/customers\/me\/contracts\/\{id\}\/installments\/2\/payment$/, t)
    await page.getByRole('img', { name: /^Mã QR thanh toán/ }).waitFor()
    const open = await S.must('CUSTOMER', 'GET', `/customers/me/contracts/${state.contractId}/installments/2/payment`)
    assert.equal(open.paymentState, 'ONLINE_IN_PROGRESS')
    assert.equal(open.amount, state.balanceAmount)
    t = mark()
    await F.payFake(open.current.orderCode)
    await page.getByText('Đã trả đủ 100%').first().waitFor({ timeout: 120_000 })
    const c = await S.must('CUSTOMER', 'GET', `/customers/me/contracts/${state.contractId}`)
    assert.equal(c.status, 'PAID')
    assert.equal(c.paymentPlan.fullyPaid, true)
    assert.equal(c.paymentPlan.outstanding, 0)
    assert.equal(c.paymentPlan.paid, c.paymentPlan.total)
    assert.equal(c.paymentPlan.ownershipStatus, 'OWNERSHIP_TRANSFER_ELIGIBLE')
    assert.equal(c.paymentCompleted, true)
    const again = await S.call(
      'CUSTOMER',
      'POST',
      `/customers/me/contracts/${state.contractId}/installments/2/payment`,
      {
        method: 'ONLINE',
      },
    )
    assert.equal(again.error?.code, 'CONTRACT_INSTALLMENT_ALREADY_PAID')
  })

  test('Khoản 30% tiền mặt (hợp đồng thứ hai): kỹ thuật viên không xác nhận được; quản lý xác nhận có phiếu thu → chờ ký giấy', async () => {
    const second = await F.planContract('CUSTOMER2', `Nhà kho ${tag}`, state.productId, { through: 'agreed' })
    let page = await as('TECH', `/tech/contracts/${second.contractId}`)
    await page.locator('#installments').getByRole('button', { name: 'Khách trả tiền mặt' }).click()
    let t = mark()
    await page
      .getByRole('dialog', { name: 'Khách trả tiền mặt?' })
      .getByRole('button', { name: 'Ghi trả tiền mặt' })
      .click()
    await sawPath('POST', /\/technician\/contracts\/\{id\}\/installments\/1\/payment$/, t)
    await page.getByText(/Chờ quản lý \/ quản trị xác nhận đã thu/).waitFor()
    assert.equal(
      await page.getByRole('button', { name: 'Xác nhận đã thu' }).count(),
      0,
      'kỹ thuật viên không xác nhận tiền',
    )
    const pending = await S.must('TECH', 'GET', `/technician/contracts/${second.contractId}/installments/1/payment`)
    assert.equal(pending.paymentState, 'AWAITING_CASH_CONFIRMATION')
    assert.equal(
      (await S.must('MANAGER', 'GET', `/contracts/${second.contractId}`)).status,
      'DRAFT',
      'chọn tiền mặt chưa phải đã trả',
    )

    page = await as('MANAGER', `/manage/contracts/${second.contractId}`)
    await page.locator('#installments').getByRole('button', { name: 'Xác nhận đã thu' }).click()
    const dialog = page.getByRole('dialog', { name: 'Xác nhận đã nhận tiền mặt' })
    await dialog.locator('#cash-receipt').fill(`PT-30-${tag}`)
    await dialog
      .locator('input[type=file]')
      .setInputFiles({ name: 'phieu-thu.png', mimeType: 'image/png', buffer: S.tinyPng() })
    t = mark()
    await dialog.getByRole('button', { name: 'Xác nhận đã nhận tiền' }).click()
    await sawPath('POST', /\/manager\/payments\/\{id\}\/cash\/confirm$/, t)
    await F.poll(
      async () => (await S.must('MANAGER', 'GET', `/contracts/${second.contractId}`)).status === 'AWAITING_SIGNATURE',
      'tiền mặt được quản lý xác nhận',
    )
    const c = await S.must('MANAGER', 'GET', `/contracts/${second.contractId}`)
    assert.equal(c.paymentPlan.depositPaid, true)
    assert.equal(c.paymentPlan.installments[0].status, 'PAID')
    state.cashContractId = second.contractId
  })

  test('Không trang nào của giai đoạn này gọi endpoint đã bỏ', () => {
    const retired = evidence.filter(
      (e) =>
        e.method === 'POST' &&
        (/\/technician\/quotations\/\{id\}\/payment$/.test(e.path) ||
          /^\/api\/installation-projects\/\{id\}\/acceptance$/.test(e.path) ||
          /\/customers\/me\/contracts\/\{id\}\/signed-document$/.test(e.path)),
    )
    assert.deepEqual(retired, [])
  })
})
