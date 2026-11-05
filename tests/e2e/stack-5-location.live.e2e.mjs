// Giai đoạn 5 trên backend thật (xem stack-harness.mjs): tên tỉnh và tra địa chỉ cũ trong đánh giá sơ bộ (G04, G05), bổ sung phường, xã
// cho địa điểm cũ ở chỗ chọn giờ khảo sát (C11), rồi phường đó chưa có khu phục vụ nên khách nhờ xếp kỹ thuật viên; quản trị phân công
// thẳng lịch khảo sát cho kỹ thuật viên khác (A31) và đổi kinh doanh phụ trách (A32).
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { setupStack } from './stack-harness.mjs'
import * as S from './stack-api.mjs'
import * as F from './stack-flows.mjs'

const { skip, state, evidence, as, mark, until, expectCall } = await setupStack('5-location')
const tag = new Date().toISOString().slice(11, 19).replace(/:/g, '')
// Địa chỉ cũ (quận Gò Vấp) → một phường mới chưa thuộc khu phục vụ nào (chọn lúc chạy, nên chạy lại giai đoạn này vẫn có phường
// chưa phục vụ dù lần trước đã mở thêm phường vào khu)
const OLD_WARD = 'Gò Vấp'
const CANDIDATES = [
  'Phường An Hội Tây',
  'Phường Hạnh Thông',
  'Phường An Nhơn',
  'Phường Thông Tây Hội',
  'Phường An Hội Đông',
]
const zoneCodes =
  !skip && state.zoneId
    ? (await S.must('ADMIN', 'GET', `/admin/operational-zones/${state.zoneId}`)).communes.map((c) => c.code)
    : []
const catalog = skip ? [] : await S.must(null, 'GET', '/administrative-units/communes?provinceCode=79')
const NEW_WARD =
  CANDIDATES.find((name) => !zoneCodes.includes(catalog.find((c) => c.name === name)?.code)) ?? CANDIDATES[0]
const LEGACY_SITE = {
  district: 'Quận Gò Vấp',
  ward: 'Phường 12',
  streetLine: '5 Quang Trung',
  latitude: 10.8395,
  longitude: 106.6634,
}

describe('5. Địa chỉ hành chính, điều phối, người phụ trách', { skip }, () => {
  test('G04 + G05: bước Địa điểm hiện tên tỉnh từ danh mục; tra địa chỉ cũ (1 ký tự không gọi), chọn mới đổ vào ô', async () => {
    const page = await as('CUSTOMER2', '/customer/assessment')
    const province = page.getByRole('textbox', { name: 'Tỉnh, thành phố' })
    const next = page.getByRole('button', { name: /^Tiếp tục: Địa điểm/ })
    await until(async () => (await province.count()) > 0 || (await next.count()) > 0, 'bước hồ sơ hoặc địa điểm')
    if (await next.count()) await next.click()
    await expectCall('G04', 0)
    await until(async () => (await province.inputValue()) === 'Thành phố Hồ Chí Minh', 'tên tỉnh từ backend')

    const ward = page.getByRole('combobox', { name: /Phường, xã/ })
    const before = await ward.inputValue()
    await page.getByRole('button', { name: 'Chỉ biết địa chỉ cũ?' }).click()
    const box = page.getByRole('searchbox', { name: 'Tên phường, xã hoặc quận, huyện cũ' })
    const t = mark()
    await box.fill('a')
    await page.waitForTimeout(1000)
    assert.equal(evidence.slice(t).filter((e) => e.id === 'G05').length, 0, 'dưới 2 ký tự không gọi')
    await box.fill(OLD_WARD)
    await expectCall('G05', t)
    const choose = page.getByRole('button', { name: new RegExp(`^Chọn ${NEW_WARD} `) }).first()
    await choose.waitFor()
    assert.equal(await ward.inputValue(), before, 'không tự chọn khi chưa bấm')
    await choose.click()
    assert.equal(await ward.inputValue(), NEW_WARD)
  })

  test('C11: địa điểm cũ thiếu mã phường → bổ sung ở chỗ chọn giờ bằng tra địa chỉ cũ; mã không có trong danh mục bị từ chối', async () => {
    // Địa điểm tạo trước khi có mã phường, xã (tiền đề API, ngoài 76)
    const site = await S.must('CUSTOMER2', 'POST', '/customers/me/sites', {
      name: `Nhà Quang Trung ${tag}`,
      province: 'Thành phố Hồ Chí Minh',
      ...LEGACY_SITE,
      installationSurfaceType: 'ROOFTOP',
      surfaceMaterial: 'Tôn',
      note: null,
      provinceCode: '79',
      communeCode: null,
    })
    state.legacySiteId = site.propertySiteId
    const pre = await S.must('CUSTOMER2', 'POST', '/pre-surveys', {
      propertySiteId: site.propertySiteId,
      totalAreaM2: 30,
      usableAreaM2: 24,
      tiltDegree: 10,
      azimuthDegree: 180,
      hasObstruction: false,
    })
    const surf = await S.must('CUSTOMER2', 'GET', `/pre-surveys/${pre.preSurveyId}/surface`)
    await S.must('CUSTOMER2', 'PUT', `/pre-surveys/${pre.preSurveyId}/surface`, {
      expectedRevision: surf.revision,
      surfaceLengthM: 6,
      surfaceWidthM: 5,
      surfaceTiltDegree: 10,
      surfaceAzimuthDegree: 180,
      obstacles: [],
    })
    state.dispatchSurveyRequestId = (
      await S.must('CUSTOMER2', 'POST', `/pre-surveys/${pre.preSurveyId}/submit`)
    ).surveyRequestId

    const page = await as('CUSTOMER2', `/customer/requests/${state.dispatchSurveyRequestId}`)
    await page.getByRole('button', { name: 'Bổ sung phường, xã' }).click()
    const dialog = page.getByRole('dialog', { name: 'Bổ sung phường, xã' })
    await dialog.getByRole('button', { name: 'Chỉ biết địa chỉ cũ?' }).click()
    let t = mark()
    await dialog.getByRole('searchbox', { name: 'Tên phường, xã hoặc quận, huyện cũ' }).fill(OLD_WARD)
    await expectCall('G05', t)
    await dialog
      .getByRole('button', { name: new RegExp(`^Chọn ${NEW_WARD} `) })
      .first()
      .click()
    t = mark()
    await dialog.getByRole('button', { name: 'Lưu phường, xã' }).click()
    await expectCall('C11', t)
    await until(
      async () => (await page.getByRole('dialog', { name: 'Bổ sung phường, xã' }).count()) === 0,
      'đóng hộp thoại',
    )
    const communes = await S.must(null, 'GET', '/administrative-units/communes?provinceCode=79')
    const target = communes.find((c) => c.name === NEW_WARD)
    const saved = (await S.must('CUSTOMER2', 'GET', '/customers/me/sites?pageSize=100')).items.find(
      (s) => s.siteId === site.propertySiteId,
    )
    assert.equal(saved.communeCode, target.code)
    state.legacyCommuneCode = target.code
    // Phường mới chưa thuộc khu nào: chỗ chọn giờ chuyển sang nhờ xếp kỹ thuật viên
    await page.getByRole('button', { name: 'Nhờ xếp kỹ thuật viên' }).waitFor()

    const bad = await S.call('CUSTOMER2', 'PUT', `/customers/me/sites/${site.propertySiteId}/administrative-location`, {
      provinceCode: '79',
      communeCode: '00000',
    })
    assert.ok(
      bad.status >= 400 && /^ADMINISTRATIVE_LOCATION_/.test(bad.error?.code ?? ''),
      `mã lạ: ${bad.status} ${bad.error?.code}`,
    )
    const other = await S.call(
      'CUSTOMER',
      'PUT',
      `/customers/me/sites/${site.propertySiteId}/administrative-location`,
      { provinceCode: '79', communeCode: target.code },
    )
    assert.ok(other.status === 403 || other.status === 404, `khách khác sửa địa điểm: ${other.status}`)
  })

  test('A31 + A32: nhờ xếp → quản trị phân công (API) → đổi sang kỹ thuật viên khác qua giao diện (thiếu lý do bị chặn); đổi kinh doanh', async () => {
    const sr = state.dispatchSurveyRequestId
    const tech2 = await S.userId('TECH2')
    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
    for (const role of ['TECH', 'TECH2']) {
      const id = await S.userId(role)
      await S.must('ADMIN', 'PUT', `/admin/technicians/${id}/profile`, {
        isSchedulingActive: true,
        maxAppointmentsPerDay: 20,
      })
      await S.must('ADMIN', 'PUT', `/admin/technicians/${id}/working-schedule`, {
        useDefault: false,
        periods: days.map((day) => ({ day, start: '00:00', end: '23:59' })),
      })
    }
    // Ngày khác với các lần chạy trước (kỹ thuật viên đã có lịch đúng giờ thì backend không liệt kê người đó)
    const day = F.vnDate(3 + (new Date().getUTCMinutes() % 4))
    await S.must('CUSTOMER2', 'POST', `/customers/me/survey-requests/${sr}/dispatch-request`, {
      preferredWindows: [{ startsAt: `${day}T08:00:00+07:00`, endsAt: `${day}T12:00:00+07:00` }],
      note: 'Gọi trước khi tới',
    })
    const queue = await S.must('ADMIN', 'GET', '/admin/dispatch-requests?status=OPEN&page=1&pageSize=100')
    const item = queue.items.find((x) => x.surveyRequestId === sr)
    assert.ok(item, 'yêu cầu điều phối có trong hàng chờ')
    const startsAt = `${day}T08:00:00+07:00`
    await S.must('ADMIN', 'POST', `/admin/dispatch-requests/${item.dispatchRequestId}/assign`, {
      technicianUserId: await S.userId('TECH'),
      startsAt,
      crossZoneAuthorized: true,
      reason: 'Phường chưa có khu phục vụ, điều kỹ thuật viên khu Bến Thành',
      expectedRevision: item.revision,
    })
    // Khu Bến Thành nhận phục vụ thêm phường này và có thêm Kỹ Thuật Hai (A07 / A09 đã có bằng chứng giao diện ở giai đoạn 1).
    // Lệnh A31 chỉ cho chọn kỹ thuật viên trong khu của công trình nên cần bước này.
    const zone = await S.must('ADMIN', 'GET', `/admin/operational-zones/${state.zoneId}`)
    const communes = await S.must(null, 'GET', '/administrative-units/communes?provinceCode=79')
    const added = communes.find((c) => c.name === NEW_WARD).code
    await S.must('ADMIN', 'PUT', `/admin/operational-zones/${state.zoneId}/communes`, {
      communeCodes: [...new Set([...zone.communes.map((c) => c.code), added])],
      reason: `Mở phục vụ ${NEW_WARD}`,
      revision: zone.zone.revision,
    })
    await S.must('ADMIN', 'PUT', `/admin/technicians/${tech2}/zones`, { zoneIds: [state.zoneId] })

    const page = await as('ADMIN', `/admin/dispatch/${item.dispatchRequestId}`)
    await page.getByRole('button', { name: 'Phân công kỹ thuật viên' }).click()
    const dialog = page.getByRole('dialog', { name: 'Phân công kỹ thuật viên' })
    await dialog.getByRole('radio', { name: /Kỹ Thuật Hai/ }).check()
    let t = mark()
    await dialog.getByRole('button', { name: 'Phân công' }).click()
    await dialog.getByText('Ghi lý do.').waitFor()
    assert.equal(evidence.slice(t).filter((e) => e.id === 'A31').length, 0, 'thiếu lý do thì không gửi')
    await dialog.locator('#override-reason').fill('Kỹ thuật viên Một kín lịch buổi sáng')
    await dialog.getByRole('button', { name: 'Phân công' }).click()
    await expectCall('A31', t)
    await page.getByText(/Đã phân công Kỹ Thuật Hai/).waitFor()
    const availability = await S.must('MANAGER', 'GET', `/technicians/availability?surveyRequestId=${sr}`)
    assert.equal(availability.technicians.find((x) => x.isAssigned)?.technicianUserId, tech2)
    const stale = await S.call(
      'ADMIN',
      'POST',
      `/admin/survey-appointments/${availability.appointmentId}/assign-technician`,
      {
        technicianUserId: await S.userId('TECH'),
        reason: 'Thử revision cũ',
        expectedRevision: availability.revision - 1,
      },
    )
    assert.equal(stale.status, 409, `revision cũ: ${stale.status} ${stale.error?.code}`)

    await page.getByRole('button', { name: 'Đổi kinh doanh phụ trách' }).click()
    const owner = page.getByRole('dialog', { name: 'Đổi kinh doanh phụ trách' })
    await owner.locator('#sales-owner').selectOption(await S.userId('SALES2'))
    t = mark()
    await owner.getByRole('button', { name: 'Đổi người phụ trách' }).click()
    await owner.getByText('Ghi lý do.').waitFor()
    assert.equal(evidence.slice(t).filter((e) => e.id === 'A32').length, 0, 'thiếu lý do thì không gửi')
    await owner.locator('#sales-owner-reason').fill('Kinh doanh Hai phụ trách khu trung tâm')
    await owner.getByRole('button', { name: 'Đổi người phụ trách' }).click()
    await expectCall('A32', t)
    await page.getByText(/Đã giao yêu cầu cho Kinh Doanh Hai/).waitFor()
    const visible = await S.call('SALES2', 'GET', `/survey-requests/${sr}`)
    assert.equal(visible.status, 200, 'kinh doanh mới đọc được yêu cầu')
    const salesTry = await S.call('SALES', 'PUT', `/admin/survey-requests/${sr}/sales-owner`, {
      saleUserId: await S.userId('SALES'),
      reason: 'Thử quyền',
    })
    assert.equal(salesTry.status, 403, 'kinh doanh không tự giành yêu cầu')

    // Trả khu về như trước (để chạy lại giai đoạn này vẫn có phường chưa phục vụ); backend có thể từ chối nếu còn lịch đã hẹn
    const now = await S.must('ADMIN', 'GET', `/admin/operational-zones/${state.zoneId}`)
    const restore = await S.call('ADMIN', 'PUT', `/admin/operational-zones/${state.zoneId}/communes`, {
      communeCodes: now.communes.map((c) => c.code).filter((code) => code !== added),
      reason: 'Kiểm thử xong, trả khu về như trước',
      revision: now.zone.revision,
    })
    state.zoneRestore = `${restore.status} ${restore.error?.code ?? ''}`.trim()
  })
})
