// Giai đoạn 7 trên backend thật (xem stack-harness.mjs): 5 lời gọi FE ngoài 76 endpoint từng trả 404/405 trên image 21/10 vì FE bám
// nhánh `fix/business-logic-v2` (deddde8). Ở đây chúng đi qua giao diện thật tới đúng bản backend đó. Không tính vào mẫu số 76.
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { setupStack } from './stack-harness.mjs'
import * as S from './stack-api.mjs'
import * as F from './stack-flows.mjs'

const { skip, state, evidence, as, mark, until } = await setupStack('7-offbaseline')
const tag = new Date().toISOString().slice(11, 19).replace(/:/g, '')
const saw = (method, pattern, since) =>
  until(() => evidence.slice(since).find((e) => e.method === method && pattern.test(e.path)), `${method} ${pattern}`)

/** Khách tạo địa điểm ở Bến Thành + đánh giá sơ bộ rồi gửi (tiền đề API); trả surveyRequestId */
async function submittedRequest(customer, name) {
  const communes = await S.must(null, 'GET', '/administrative-units/communes?provinceCode=79')
  const benThanh = communes.find((c) => c.name === 'Phường Bến Thành')
  const site = await S.must(customer, 'POST', '/customers/me/sites', {
    name,
    province: 'Thành phố Hồ Chí Minh',
    district: null,
    ward: benThanh.name,
    streetLine: '8 Lý Tự Trọng',
    latitude: 10.776,
    longitude: 106.699,
    installationSurfaceType: 'ROOFTOP',
    surfaceMaterial: 'Tôn',
    note: null,
    provinceCode: '79',
    communeCode: benThanh.code,
  })
  const pre = await S.must(customer, 'POST', '/pre-surveys', {
    propertySiteId: site.propertySiteId,
    totalAreaM2: 30,
    usableAreaM2: 24,
    tiltDegree: 10,
    azimuthDegree: 180,
    hasObstruction: false,
  })
  const surf = await S.must(customer, 'GET', `/pre-surveys/${pre.preSurveyId}/surface`)
  await S.must(customer, 'PUT', `/pre-surveys/${pre.preSurveyId}/surface`, {
    expectedRevision: surf.revision,
    surfaceLengthM: 6,
    surfaceWidthM: 5,
    surfaceTiltDegree: 10,
    surfaceAzimuthDegree: 180,
    obstacles: [],
  })
  return (await S.must(customer, 'POST', `/pre-surveys/${pre.preSurveyId}/submit`)).surveyRequestId
}

describe('7. Năm lời gọi ngoài baseline trên deddde8', { skip }, () => {
  test('GET /customers/me/sites + GET /customers/me/pre-surveys: bước đầu đánh giá sơ bộ đọc địa điểm và bản nháp đã lưu', async () => {
    const t = mark()
    const page = await as('CUSTOMER', '/customer/assessment')
    const sites = await saw('GET', /^\/api\/customers\/me\/sites$/, t)
    const drafts = await saw('GET', /^\/api\/customers\/me\/pre-surveys$/, t)
    assert.deepEqual([sites.status, drafts.status], [200, 200])
    await page.getByRole('heading', { name: 'Đánh giá sơ bộ' }).waitFor()
  })

  test('POST /customers/me/survey-requests/{id}/withdraw: khách rút yêu cầu chưa đặt giờ → CANCELLED; rút lại là lặp vô hại; khách khác không rút được', async () => {
    const sr = await submittedRequest('CUSTOMER', `Nhà phụ Lý Tự Trọng ${tag}`)
    const page = await as('CUSTOMER', `/customer/requests/${sr}`)
    await page.getByRole('button', { name: 'Rút yêu cầu' }).click()
    const dialog = page.getByRole('dialog', { name: 'Rút yêu cầu khảo sát' })
    await dialog.locator('#withdraw-reason').fill('Gia đình đổi kế hoạch, chưa lắp năm nay')
    const t = mark()
    await dialog.getByRole('button', { name: 'Rút yêu cầu' }).click()
    const call = await saw('POST', /^\/api\/customers\/me\/survey-requests\/\{id\}\/withdraw$/, t)
    assert.equal(call.status, 200)
    const list = await S.must('CUSTOMER', 'GET', '/customers/me/survey-requests')
    assert.equal((Array.isArray(list) ? list : list.items).find((x) => x.surveyRequestId === sr).status, 'CANCELLED')
    // Rút lần hai: backend coi là lặp lại vô hại (200, không đổi gì)
    const again = await S.call('CUSTOMER', 'POST', `/customers/me/survey-requests/${sr}/withdraw`, {
      reason: 'Lần hai',
    })
    assert.equal(again.status, 200)
    const other = await S.call('CUSTOMER2', 'POST', `/customers/me/survey-requests/${sr}/withdraw`, {
      reason: 'Không phải của tôi',
    })
    assert.ok(other.status === 403 || other.status === 404, `khách khác rút: ${other.status}`)
  })

  test('POST /survey-requests/{id}/close: kinh doanh đóng yêu cầu khách không lắp nữa', async () => {
    const sr = await submittedRequest('CUSTOMER2', `Kho Lý Tự Trọng ${tag}`)
    await S.must('SALES', 'POST', `/survey-requests/${sr}/claim`)
    const page = await as('SALES', `/ops/surveys/${sr}`)
    await page.getByRole('button', { name: 'Đóng yêu cầu' }).click()
    const dialog = page.getByRole('dialog', { name: 'Đóng yêu cầu khảo sát' })
    await dialog.getByLabel('Khách không lắp nữa').check()
    await dialog.locator('#close-note').fill('Khách gọi báo không lắp nữa')
    const t = mark()
    await dialog.getByRole('button', { name: 'Đóng yêu cầu' }).click()
    const call = await saw('POST', /^\/api\/survey-requests\/\{id\}\/close$/, t)
    assert.equal(call.status, 200)
    const other = await S.call('SALES2', 'POST', `/survey-requests/${sr}/close`, {
      reasonCode: 'OTHER',
      note: 'Thử quyền',
    })
    assert.ok(other.status >= 400, `kinh doanh khác đóng: ${other.status}`)
  })

  test('POST /manager/after-sales/assets/{id}/warranty-activation: quản lý ghi ngày kích hoạt bảo hành của hãng kèm phiếu', async () => {
    assert.ok(state.projectId && state.inverterAssetId, 'cần chạy giai đoạn 4 trước')
    const fault = await F.reportFault(state.projectId, `Inverter mất kết nối (${tag})`, {
      suspectedAssetId: state.inverterAssetId,
    })
    const page = await as('MANAGER', `/manage/after-sales/${fault.requestId}`)
    await page.getByRole('button', { name: 'Ghi ngày kích hoạt' }).first().click()
    const dialog = page.getByRole('dialog', { name: 'Ghi ngày kích hoạt bảo hành của hãng' })
    // Ô ngày gõ dd/mm/yyyy, nhận giá trị khi rời ô
    await dialog.locator('#activation-date').fill(F.vnDate(-1).split('-').reverse().join('/'))
    await dialog.locator('#activation-date').press('Tab')
    await dialog
      .locator('input[type=file]')
      .setInputFiles({ name: 'phieu-bao-hanh.pdf', mimeType: 'application/pdf', buffer: S.tinyPdf('Phieu bao hanh') })
    await dialog.locator('#activation-reason').fill('Ngày ghi trên phiếu bảo hành của hãng')
    const t = mark()
    await dialog.getByRole('button', { name: 'Ghi ngày kích hoạt' }).click()
    const call = await saw('POST', /^\/api\/manager\/after-sales\/assets\/\{id\}\/warranty-activation$/, t)
    assert.equal(call.status, 200, `ghi ngày kích hoạt: ${call.status} ${call.code}`)
    await page.getByText(/Đã ghi ngày kích hoạt/).waitFor()
  })
})
