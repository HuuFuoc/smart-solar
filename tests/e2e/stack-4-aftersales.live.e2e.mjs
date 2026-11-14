// Giai đoạn 4 trên backend thật (xem stack-harness.mjs): sau bán. Gói (mua; nhóm không làm hoàn tiền nên không xét huỷ gói), hỗ trợ thiên tai
// (từ chối, xin xét lại, duyệt), đóng trùng, sửa thiết bị, buổi kiểm tra ở lại sửa luôn (bảo hành / khách trả tiền), hạng mục phát sinh,
// dừng việc, việc báo giá của kinh doanh, bảo trì của gói (đặt, đổi giờ, báo lỗi từ lần bảo trì), bảo trì lẻ không thực hiện được.
// Endpoint thuộc 76 đi qua giao diện; bước nối giữa các vai trò ngoài 76 (khách báo lỗi, quản lý xếp buổi / quyết định chi phí, kỹ
// thuật viên kiểm tra…) gọi API thật qua stack-flows.mjs. Tiền trả qua PayOS GIẢ LẬP (không phải bằng chứng PayOS thật).
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { setupStack } from './stack-harness.mjs'
import * as S from './stack-api.mjs'
import * as F from './stack-flows.mjs'

const { skip, state, evidence, as, mark, until, expectCall } = await setupStack('4-aftersales')
const tag = new Date().toISOString().slice(11, 19).replace(/:/g, '')
const short = (id) => id.slice(0, 8).toUpperCase()
/** Response của trình duyệt theo method + mẫu đường dẫn (endpoint mới, không thuộc 76) */
const sawPath = (method, pattern, since, status) =>
  until(
    () =>
      evidence
        .slice(since)
        .find((e) => e.method === method && pattern.test(e.path) && (status ? e.status === status : e.status < 300)),
    `${method} ${pattern}`,
  )
const request = (id) => S.must('MANAGER', 'GET', `/manager/after-sales/requests/${id}`)

describe('4. Sau bán', { skip }, () => {
  test('tiền đề (API, ngoài 76): cài đặt, 2 gói đang bán, khách mua gói thiên tai trên hợp đồng đã trả tiền nhưng chưa bàn giao', async () => {
    assert.ok(state.contractId, 'cần chạy giai đoạn 3 trước')
    assert.equal((await S.must('CUSTOMER', 'GET', `/customers/me/contracts/${state.contractId}`)).status, 'PAID')
    await F.setAfterSalesSettings()
    state.maintenancePackageId = await F.createPackage('MAINTENANCE', `Bảo trì 12 tháng ${tag}`, 2_000_000)
    state.disasterPackageId = await F.createPackage('DISASTER_PROTECTION', `Bảo vệ bão ${tag}`, 1_500_000)
    const subs = await F.buyPackages('CUSTOMER', state.contractId, { disasterPackageId: state.disasterPackageId })
    // Chưa bàn giao: đã trả tiền nhưng kỳ chưa bắt đầu
    assert.deepEqual(
      subs.map((s) => s.status),
      ['PAID'],
    )
  })

  test('tiền đề (API, ngoài 76): thi công → bàn giao; gói thiên tai bắt đầu kỳ; khách mua gói bảo trì (bắt đầu ngay)', async () => {
    const { projectId, assets } = await F.installAndHandOver(state.contractId, state.productId)
    state.projectId = projectId
    state.inverterAssetId = assets.find((a) => a.assetType === 'INVERTER').assetId
    state.panelAssetId = assets.find((a) => a.assetType === 'PANEL').assetId
    const subs = await F.buyPackages('CUSTOMER', state.contractId, { maintenancePackageId: state.maintenancePackageId })
    state.maintenanceSubscriptionId = subs[0].subscriptionId
    state.maintenancePurchasedAt = new Date().toISOString()
    const active = await F.poll(async () => {
      const all = await S.must('CUSTOMER', 'GET', '/customers/me/after-sales/subscriptions')
      const m = all.find((s) => s.subscriptionId === state.maintenanceSubscriptionId)
      const d = all.find((s) => s.kind === 'DISASTER_PROTECTION' && s.contractId === state.contractId)
      return m?.status === 'ACTIVE' && d?.status === 'ACTIVE' && { m, d }
    }, 'hai gói bắt đầu kỳ sau bàn giao')
    state.coverageStartsAt = active.d.coverageStartsAt
  })

  test('M01 + C08 + M05: từ chối hỗ trợ (thiếu lý do bị chặn) → khách xin xét lại kèm ảnh → duyệt; sửa serial thiết bị', async () => {
    // Sự cố xảy ra sau khi gói bắt đầu bảo vệ
    await F.sleep(Math.max(0, Date.parse(state.coverageStartsAt) + 2000 - Date.now()))
    const claim = await F.reportFault(state.projectId, `Bão làm tốc 2 tấm pin (${tag})`, {
      disasterType: 'STORM',
      incidentOccurredAt: new Date(Date.now() - 1000).toISOString(),
    })
    assert.equal(claim.claim.status, 'SUBMITTED')
    state.claimRequestId = claim.requestId
    const page = await as('MANAGER', `/manage/after-sales/${claim.requestId}`)
    const panel = page.locator('#claim')
    let t = mark()
    await panel.getByRole('button', { name: 'Từ chối' }).click()
    await panel.getByText('Ghi lý do từ chối để khách biết.').waitFor()
    assert.equal(evidence.slice(t).filter((e) => e.id === 'M01').length, 0)
    await page.locator('#claim-reason').fill('Ảnh chưa cho thấy hư hại do bão')
    await panel.getByRole('button', { name: 'Từ chối' }).click()
    await expectCall('M01', t)
    await panel.getByText('Đã từ chối').waitFor()

    const customer = await as('CUSTOMER', `/customer/after-sales/${claim.requestId}`)
    await customer.getByRole('button', { name: 'Xin xét lại' }).click()
    const dialog = customer.getByRole('dialog', { name: 'Xin xét lại hỗ trợ thiên tai' })
    await dialog.getByLabel(/Thông tin bổ sung/).fill('Ảnh chụp mái tôn bị tốc sau bão')
    await dialog
      .locator('input[type=file]')
      .setInputFiles({ name: 'mai-toc.png', mimeType: 'image/png', buffer: S.tinyPng() })
    t = mark()
    await dialog.getByRole('button', { name: 'Gửi yêu cầu xét lại' }).click()
    await expectCall('C08', t)
    await until(
      async () => (await customer.getByRole('button', { name: 'Xin xét lại' }).count()) === 0,
      'hết nút xin xét lại',
    )
    const twice = await S.call(
      'CUSTOMER',
      'POST',
      `/customers/me/after-sales/requests/${claim.requestId}/reconsideration`,
      { note: 'Lần hai', evidenceFileIds: [] },
    )
    assert.equal(twice.error?.code, 'AFTER_SALES_INVALID_STATE')

    await page.reload()
    t = mark()
    await panel.getByRole('button', { name: 'Duyệt hỗ trợ' }).click()
    await expectCall('M01', t)
    await panel.getByText('Đã duyệt').waitFor()
    const decided = await request(claim.requestId)
    assert.equal(decided.claim.status, 'APPROVED')
    assert.ok(decided.claim.reconsiderationRequestedAt)

    // M05 trên cùng trang: thiếu lý do bị chặn, rồi đổi serial inverter
    const item = page
      .locator('li', { hasText: /Inverter/ })
      .filter({ has: page.getByRole('button', { name: 'Sửa', exact: true }) })
    await item.getByRole('button', { name: 'Sửa', exact: true }).click()
    const edit = page.getByRole('dialog', { name: 'Sửa thông tin thiết bị' })
    await edit.locator('#asset-serialNumber').fill(`INV-FIX-${tag}`)
    t = mark()
    await edit.getByRole('button', { name: 'Lưu thông tin' }).click()
    await page.waitForTimeout(500)
    assert.equal(evidence.slice(t).filter((e) => e.id === 'M05').length, 0, 'thiếu lý do thì không gửi')
    await edit.locator('#asset-reason').fill('Kỹ thuật viên ghi nhầm serial')
    await edit.getByRole('button', { name: 'Lưu thông tin' }).click()
    await expectCall('M05', t)
    const project = await S.must('CUSTOMER', 'GET', `/customers/me/installation-projects/${state.projectId}`)
    assert.equal(project.assets.find((a) => a.assetId === state.inverterAssetId).serialNumber, `INV-FIX-${tag}`)
  })

  test('M02: yêu cầu báo trùng cùng công trình → chọn yêu cầu gốc rồi đóng; đóng lần hai bị từ chối', async () => {
    const dup = await F.reportFault(state.projectId, `Tấm pin bị tốc, báo lại (${tag})`)
    const page = await as('MANAGER', `/manage/after-sales/${dup.requestId}`)
    await page.getByRole('button', { name: 'Đóng vì trùng' }).click()
    const dialog = page.getByRole('dialog', { name: 'Đóng vì trùng' })
    await dialog.locator('#duplicate-original').selectOption(state.claimRequestId)
    const t = mark()
    await dialog.getByRole('button', { name: 'Đóng vì trùng' }).click()
    await expectCall('M02', t)
    await page.getByText('Trùng yêu cầu khác').first().waitFor()
    const closed = await request(dup.requestId)
    assert.equal(closed.status, 'CLOSED_DUPLICATE')
    const again = await S.call('MANAGER', 'POST', `/manager/after-sales/requests/${dup.requestId}/duplicate`, {
      originalRequestId: state.claimRequestId,
      reason: null,
    })
    assert.equal(again.error?.code, 'AFTER_SALES_INVALID_STATE')
  })

  test('T03 + T05 + M03: ở lại sửa luôn khi chưa xét chi phí / quá giờ bị từ chối → bảo hành → sửa luôn → hạng mục phát sinh → dừng việc', async () => {
    const fault = await F.reportFault(state.projectId, `Inverter kêu to (${tag})`, {
      suspectedAssetId: state.inverterAssetId,
    })
    const visitId = await F.scheduleVisit(fault.requestId, F.vnAt(30 * 60_000), F.vnAt(6 * 3600_000))
    await F.startVisit(visitId)
    await F.inspectAndWait(visitId, state.inverterAssetId, 'Thay quạt tản nhiệt inverter')

    const page = await as('TECH', `/tech/after-sales/${visitId}`)
    await page.locator('#repair-minutes').fill('30')
    await page.getByLabel('Có đủ linh kiện').check()
    let t = mark()
    await page.getByRole('button', { name: 'Sửa luôn' }).click()
    const unpaid = await expectCall('T03', t, 409)
    assert.equal(unpaid.code, 'AFTER_SALES_PAYMENT_REQUIRED')

    await F.decideCoverage(fault.requestId, 'INSTALLATION_WARRANTY')
    await page.reload()
    await page.locator('#repair-minutes').fill('470')
    await page.getByLabel('Có đủ linh kiện').check()
    t = mark()
    await page.getByRole('button', { name: 'Sửa luôn' }).click()
    const late = await expectCall('T03', t, 409)
    assert.equal(late.code, 'AFTER_SALES_REPAIR_TIME_INSUFFICIENT')
    await page.locator('#repair-minutes').fill('30')
    t = mark()
    await page.getByRole('button', { name: 'Sửa luôn' }).click()
    await expectCall('T03', t)
    await page.getByRole('heading', { name: 'Báo cáo công việc' }).waitFor()

    await page.getByRole('button', { name: 'Báo hạng mục phát sinh' }).click()
    const dialog = page.getByRole('dialog', { name: 'Báo hạng mục phát sinh' })
    t = mark()
    await dialog.getByRole('button', { name: 'Gửi hạng mục' }).click()
    await page.waitForTimeout(500)
    assert.equal(evidence.slice(t).filter((e) => e.id === 'T05').length, 0, 'thiếu mô tả thì không gửi')
    await dialog.locator('#supplementary-description').fill('Đầu nối MC4 chuỗi 2 bị cháy')
    await dialog.locator('#supplementary-diagnosis').fill('Tiếp xúc kém, cháy vỏ')
    await dialog.locator('#supplementary-parts').fill('2 đầu MC4')
    await dialog.getByRole('button', { name: 'Gửi hạng mục' }).click()
    await expectCall('T05', t)
    const withExtra = await request(fault.requestId)
    const extra = withExtra.items.find((i) => i.description === 'Đầu nối MC4 chuỗi 2 bị cháy')
    assert.deepEqual([extra.status, extra.coverage], ['OPEN', 'PENDING'])

    // Khách không cho làm tiếp hạng mục phát sinh: quản lý dừng ngoại lệ. Nhóm không làm hoàn tiền nên hộp chỉ hỏi lý do
    const manager = await as('MANAGER', `/manage/after-sales/${fault.requestId}`)
    await manager.getByRole('button', { name: 'Dừng việc' }).click()
    const stop = manager.getByRole('dialog', { name: /^Dừng việc/ })
    t = mark()
    await stop.getByRole('button', { name: 'Dừng việc' }).click()
    await stop.getByText('Ghi lý do.').waitFor()
    assert.equal(evidence.slice(t).filter((e) => e.id === 'M03').length, 0, 'thiếu lý do thì không gửi')
    await stop.locator('#reason-dialog-text').fill('Khách không đồng ý làm tiếp hạng mục phát sinh')
    await stop.getByRole('button', { name: 'Dừng việc' }).click()
    await expectCall('M03', t)
    assert.equal((await request(fault.requestId)).status, 'CANCELLED')
    const again = await S.call('MANAGER', 'POST', `/manager/after-sales/requests/${fault.requestId}/stop`, {
      reason: 'Lần hai',
      refundAmount: 0,
    })
    assert.equal(again.error?.code, 'AFTER_SALES_INVALID_STATE')
  })

  test('M07 + M08 + S12 + T04: khách trả tiền → việc báo giá; quản lý giao bằng danh sách kinh doanh → kinh doanh bắt đầu; kỹ thuật viên kết thúc buổi chờ', async () => {
    const fault = await F.reportFault(state.projectId, `Tấm pin nứt kính do va đập (${tag})`, {
      suspectedAssetId: state.panelAssetId,
    })
    const visitId = await F.scheduleVisit(fault.requestId, F.vnAt(40 * 60_000), F.vnAt(6 * 3600_000))
    await F.startVisit(visitId)
    await F.inspectAndWait(visitId, state.panelAssetId, 'Thay tấm pin nứt kính')
    const decided = await F.decideCoverage(fault.requestId, 'CHARGEABLE')
    assert.equal(decided.status, 'AWAITING_QUOTATION')

    const manager = await as('MANAGER', '/manage/sales-tasks')
    let t = mark()
    await expectCall('M07', t)
    await sawPath('GET', /^\/api\/manager\/after-sales\/sales-assignees$/, t)
    const row = manager.locator('section li', { hasText: short(fault.requestId) })
    await row.getByRole('button', { name: 'Giao việc' }).click()
    const dialog = manager.getByRole('dialog', { name: 'Giao việc' })
    await dialog.locator('#assign-sales').selectOption(await S.userId('SALES'))
    t = mark()
    await dialog.getByRole('button', { name: 'Giao việc' }).click()
    await expectCall('M08', t)
    const task = (await S.must('MANAGER', 'GET', '/manager/after-sales/tasks')).find(
      (x) => x.requestId === fault.requestId,
    )
    assert.deepEqual(
      [task.taskType, task.status, task.assignedSalesUserId],
      ['REPAIR_QUOTATION', 'CLAIMED', await S.userId('SALES')],
    )
    state.quotationTaskId = task.taskId
    // Giao lại mà không ghi lý do: backend bắt buộc lý do
    const noReason = await S.call('MANAGER', 'POST', `/manager/after-sales/tasks/${task.taskId}/assign`, {
      salesUserId: await S.userId('SALES2'),
      reason: null,
    })
    assert.equal(noReason.error?.code, 'AFTER_SALES_REASON_REQUIRED')

    const sales = await as('SALES', '/ops/after-sales')
    const mine = sales.locator('main li', { hasText: short(fault.requestId) })
    t = mark()
    await mine.getByRole('button', { name: 'Bắt đầu' }).click()
    await expectCall('S12', t)
    await until(async () => (await mine.getByRole('button', { name: 'Bắt đầu' }).count()) === 0, 'hết nút bắt đầu')
    const twice = await S.call('SALES', 'POST', `/sales/after-sales/tasks/${task.taskId}/start`)
    assert.equal(twice.error?.code, 'AFTER_SALES_INVALID_STATE')
    const other = await S.call('SALES2', 'POST', `/sales/after-sales/tasks/${task.taskId}/start`)
    assert.ok(other.status >= 400, 'kinh doanh khác không bắt đầu được việc của người khác')

    const tech = await as('TECH', `/tech/after-sales/${visitId}`)
    await tech.locator('#repair-minutes').fill('30')
    await tech.getByLabel('Có đủ linh kiện').check()
    t = mark()
    await tech.getByRole('button', { name: 'Sửa luôn' }).click()
    assert.equal((await expectCall('T03', t, 409)).code, 'AFTER_SALES_PAYMENT_REQUIRED')
    await tech.getByRole('button', { name: 'Kết thúc buổi chờ' }).click()
    const finish = tech.getByRole('dialog', { name: 'Kết thúc buổi chờ?' })
    await finish.locator('#finish-note').fill('Chờ khách duyệt báo giá thay tấm pin')
    t = mark()
    await finish.getByRole('button', { name: 'Kết thúc buổi chờ' }).click()
    await expectCall('T04', t)
    await until(async () => (await tech.getByRole('button', { name: 'Sửa luôn' }).count()) === 0, 'buổi chờ đã đóng')
    const ended = await S.must('TECH', 'GET', `/technicians/me/after-sales/visits/${visitId}`)
    assert.deepEqual([ended.status, ended.waitingOnSite], ['REPORTED', false])
    const again = await S.call('TECH', 'POST', `/technicians/me/after-sales/visits/${visitId}/finish`, { note: null })
    assert.equal(again.error?.code, 'AFTER_SALES_INVALID_STATE')
  })

  test('C06 + C07 + C09 + C10: đặt lượt bảo trì của gói → đổi giờ → làm xong có phát hiện → báo lỗi từ lần bảo trì; thông báo', async () => {
    const page = await as('CUSTOMER', '/customer/packages')
    await page.getByRole('button', { name: 'Đặt lịch' }).first().click()
    const book = page.getByRole('dialog', { name: 'Đặt lịch bảo trì' })
    await book.getByLabel('Ghi chú').fill('Gọi trước 30 phút')
    let t = mark()
    await book.getByRole('button', { name: 'Đặt lịch' }).click()
    await expectCall('C06', t, 201)
    await page.waitForURL(/\/customer\/after-sales\/[0-9a-f-]{36}$/)
    const requestId = page.url().split('/').pop()
    const r = await request(requestId)
    assert.equal(r.kind, 'MAINTENANCE')
    const entitlements = (await S.must('CUSTOMER', 'GET', '/customers/me/after-sales/subscriptions')).find(
      (s) => s.subscriptionId === state.maintenanceSubscriptionId,
    ).entitlements
    const entitlementId = entitlements.find((e) => e.status === 'BOOKED').entitlementId
    // Lượt còn lại (chưa đặt) là lượt backend sẽ mở việc nhắc kinh doanh sau `customerResponseHours` (giai đoạn 6)
    state.followUpEntitlementId = entitlements.find((e) => e.status === 'AVAILABLE').entitlementId
    const rebook = await S.call('CUSTOMER', 'POST', `/customers/me/after-sales/maintenance/${entitlementId}/book`, {
      preferredStartsAt: r.preferredStartsAt,
      note: null,
    })
    assert.ok(rebook.status >= 400, `đặt lại lượt đã đặt: ${rebook.status}`)

    await F.scheduleVisit(
      requestId,
      r.preferredStartsAt,
      new Date(Date.parse(r.preferredStartsAt) + 2 * 3600_000).toISOString(),
    )
    await page.reload()
    await page.getByRole('button', { name: 'Đổi giờ' }).click()
    const move = page.getByRole('dialog', { name: 'Đổi giờ hẹn' })
    t = mark()
    await move.getByRole('button', { name: 'Đổi giờ' }).click()
    await expectCall('C07', t)
    await page.getByText('Đã đổi giờ.').waitFor()
    const moved = await S.must('CUSTOMER', 'GET', `/customers/me/after-sales/requests/${requestId}`)
    assert.deepEqual(
      moved.visits.map((v) => v.status),
      ['CANCELLED'],
    )

    // Quản lý xếp buổi sớm hơn giờ khách chọn → khách xác nhận → kỹ thuật viên làm, ghi phát hiện
    const visitId = await F.scheduleVisit(requestId, F.vnAt(30 * 60_000), F.vnAt(3 * 3600_000))
    await S.must('CUSTOMER', 'POST', `/customers/me/after-sales/requests/${requestId}/confirm-appointment`)
    await F.startVisit(visitId)
    await S.must('TECH', 'POST', `/technicians/me/after-sales/visits/${visitId}/work-report`, {
      report: 'Đã vệ sinh tấm pin, siết đầu nối',
      results: [],
      replacements: [],
      findingNote: 'Dây DC hộp nối bị lỏng',
    })
    const late = await S.call('CUSTOMER', 'POST', `/customers/me/after-sales/requests/${requestId}/reschedule`, {
      preferredStartsAt: `${F.vnDate(12)}T08:00:00+07:00`,
      note: null,
    })
    assert.ok(late.status >= 400, `đổi giờ khi đã làm xong: ${late.status}`)

    await page.reload()
    await page.getByText('Dây DC hộp nối bị lỏng').first().waitFor()
    await page.getByRole('button', { name: 'Báo lỗi' }).click()
    const report = page.getByRole('dialog', { name: 'Báo lỗi phát hiện khi bảo trì' })
    t = mark()
    await report.getByRole('button', { name: 'Gửi báo lỗi' }).click()
    await expectCall('C09', t, 201)
    await page.waitForURL(
      (u) => /\/customer\/after-sales\/[0-9a-f-]{36}$/.test(u.pathname) && !u.pathname.endsWith(requestId),
    )
    assert.equal(
      await page.getByRole('link', { name: 'Xem yêu cầu bảo trì' }).getAttribute('href'),
      `/customer/after-sales/${requestId}`,
    )
    const created = await S.must('CUSTOMER', 'GET', `/customers/me/after-sales/requests/${page.url().split('/').pop()}`)
    assert.deepEqual([created.kind, created.originRequestId], ['FAULT', requestId])

    t = mark()
    await page.goto(page.url().replace(/\/customer\/.*$/, '/customer/notifications'))
    await expectCall('C10', t)
    await page.getByText('Đã có kết quả xét hỗ trợ thiên tai').first().waitFor()
    await page.getByText('Việc sửa chữa đã dừng').first().waitFor()
    const other = await S.must('CUSTOMER2', 'GET', '/customers/me/after-sales/notifications')
    assert.ok(!other.some((n) => n.requestId === requestId), 'khách khác không thấy thông báo của khách này')
  })

  test('M04: bảo trì lẻ chưa làm → không thực hiện được (thiếu lý do bị chặn); yêu cầu báo lỗi thì backend từ chối', async () => {
    const otm = await S.must('CUSTOMER', 'POST', '/customers/me/after-sales/one-time-maintenance', {
      projectId: state.projectId,
      preferredStartsAt: `${F.vnDate(9)}T09:00:00+07:00`,
      note: null,
    })
    const page = await as('MANAGER', `/manage/after-sales/${otm.requestId}`)
    await page.getByRole('button', { name: 'Không thực hiện được' }).click()
    const dialog = page.getByRole('dialog', { name: /^Không thực hiện được/ })
    let t = mark()
    await dialog.getByRole('button', { name: 'Xác nhận không thực hiện được' }).click()
    await dialog.getByText('Ghi lý do.').waitFor()
    assert.equal(evidence.slice(t).filter((e) => e.id === 'M04').length, 0)
    await dialog.locator('#reason-dialog-text').fill('Không còn kỹ thuật viên trống, khách không nhận giờ khác')
    await dialog.getByRole('button', { name: 'Xác nhận không thực hiện được' }).click()
    await expectCall('M04', t)
    assert.equal((await request(otm.requestId)).status, 'CANCELLED')
    const fault = await F.reportFault(state.projectId, `Đèn báo inverter nhấp nháy (${tag})`)
    const wrong = await S.call('MANAGER', 'POST', `/manager/after-sales/requests/${fault.requestId}/not-fulfilled`, {
      reason: 'Thử sai loại',
    })
    assert.equal(wrong.error?.code, 'AFTER_SALES_INVALID_STATE')
  })
})
