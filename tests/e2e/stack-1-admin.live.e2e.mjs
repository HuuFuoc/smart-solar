// Giai đoạn 1 trên backend thật (xem stack-harness.mjs): cấu hình của quản trị – thời hạn bảo hành, khu vực phục vụ, ảnh sản phẩm,
// báo cáo + CSV. Bước ngoài 76 endpoint (gán kỹ thuật viên vào khu, tạo sản phẩm) gọi API nghiệp vụ thật.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { describe, test } from 'node:test'
import { setupStack } from './stack-harness.mjs'
import * as S from './stack-api.mjs'

const { skip, state, as, mark, expectCall, url } = await setupStack('1-admin')
const tag = new Date().toISOString().slice(11, 19).replace(/:/g, '')

describe('1. Quản trị: thời hạn bảo hành, khu vực, ảnh sản phẩm, báo cáo', { skip }, () => {
  test('A02/A01: thêm thời hạn lắp đặt + sửa chữa mặc định, tải lại vẫn còn', async () => {
    const page = await as('ADMIN', '/admin/warranty-options')
    for (const [kind, months, label] of [
      ['', 60, '5 năm'],
      ['?loai=sua-chua', 12, '1 năm'],
    ]) {
      await page.goto(url(`/admin/warranty-options${kind}`), { waitUntil: 'domcontentloaded' })
      const t = mark()
      await page.getByRole('button', { name: 'Thêm thời hạn' }).click()
      const dialog = page.getByRole('dialog', { name: 'Thêm thời hạn' })
      await dialog.getByLabel('Số tháng').fill(String(months))
      await dialog.getByLabel('Đặt làm mặc định').check()
      await dialog.getByRole('button', { name: 'Lưu' }).click()
      await expectCall('A02', t)
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.getByText(label, { exact: true }).waitFor()
      await page.getByText('Mặc định', { exact: true }).first().waitFor()
      await expectCall('A01', t)
    }
  })

  test('A11/A06/A07/A09/A08/A10: tạo khu, gán phường Bến Thành, sửa tên, kỹ thuật viên của khu, độ phủ', async () => {
    const page = await as('ADMIN', '/admin/zones')
    let t = mark()
    await page.getByText(/phường, xã của Thành phố Hồ Chí Minh chưa thuộc khu nào/).waitFor()
    await expectCall('A11', t)
    await page.getByRole('button', { name: 'Thêm khu vực' }).click()
    const dialog = page.getByRole('dialog', { name: 'Thêm khu vực' })
    await dialog.getByLabel('Mã khu').fill(`khu-q1-${tag}`)
    await dialog.getByLabel('Tên khu').fill(`Quận 1 kiểm thử ${tag}`)
    await dialog.getByRole('button', { name: 'Thêm khu' }).click()
    await expectCall('A06', t, 201)
    await page.waitForURL(/\/admin\/zones\/[0-9a-f-]{36}$/)
    state.zoneId = page.url().split('/').pop()
    await page.getByRole('heading', { name: `Quận 1 kiểm thử ${tag}` }).waitFor()
    await expectCall('A07', t)

    t = mark()
    await page.getByLabel('Thêm phường, xã').fill('ben thanh')
    await page.getByRole('option', { name: 'Phường Bến Thành' }).click()
    await page.getByRole('button', { name: 'Lưu danh sách' }).click()
    await page.getByRole('dialog', { name: 'Lưu phường, xã của khu' }).getByRole('button', { name: 'Lưu', exact: true }).click()
    await expectCall('A09', t)
    await page.getByRole('heading', { name: 'Phường, xã (1)' }).waitFor()

    t = mark()
    await page.getByRole('button', { name: 'Sửa thông tin' }).click()
    const edit = page.getByRole('dialog', { name: 'Sửa khu vực' })
    await edit.getByLabel('Tên khu').fill(`Quận 1 (kiểm thử) ${tag}`)
    await edit.getByRole('button', { name: /Lưu/ }).click()
    await expectCall('A08', t)
    await page.getByRole('heading', { name: `Quận 1 (kiểm thử) ${tag}` }).waitFor()

    // Ngoài 76: kỹ thuật viên nhận lịch trong khu này
    const tech = await S.userId('TECH')
    await S.must('ADMIN', 'PUT', `/admin/technicians/${tech}/profile`, { isSchedulingActive: true, maxAppointmentsPerDay: 4 })
    await S.must('ADMIN', 'PUT', `/admin/technicians/${tech}/zones`, { zoneIds: [state.zoneId] })
    t = mark()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByText('Kỹ Thuật Một').first().waitFor()
    await expectCall('A10', t)
    const coverage = await S.must('ADMIN', 'GET', '/admin/operational-zones/coverage?provinceCode=79')
    state.unmappedCommunes = coverage.unmappedCommuneCount
  })

  test('A26–A30: ảnh sản phẩm thêm / đổi thứ tự / ảnh chính / xoá, đọc lại đúng', async () => {
    const product = await S.must('ADMIN', 'POST', '/admin/products', {
      sku: `PV-AUDIT-${tag}`,
      productType: 'SOLAR_PANEL',
      category: 'PANEL',
      name: `Tấm pin kiểm thử ${tag}`,
      brand: 'Audit',
      model: 'A550',
      unit: 'tấm',
      unitPrice: 3_000_000,
      currency: 'VND',
      ratedPowerW: 550,
      widthMm: 1134,
      heightMm: 2278,
      warrantyMonth: 144,
      status: 'ACTIVE',
    })
    state.productId = product.id
    state.productName = product.name
    const page = await as('ADMIN', '/admin/products')
    const t = mark()
    await page.getByRole('button', { name: `Ảnh của ${product.name}` }).click()
    const dialog = page.getByRole('dialog', { name: `Ảnh của ${product.name}` })
    await expectCall('A26', t)
    for (const [link, alt] of [
      ['https://upload.wikimedia.org/wikipedia/commons/a/a9/Solar_panels_on_roof.jpg', 'Mặt trước'],
      ['https://upload.wikimedia.org/wikipedia/commons/6/6d/Solar_panel.png', 'Mặt sau'],
    ]) {
      const before = mark()
      await dialog.getByLabel('Link ảnh').fill(link)
      await dialog.getByLabel('Mô tả ảnh').fill(alt)
      await dialog.getByRole('button', { name: 'Thêm ảnh' }).click()
      await expectCall('A27', before, 201)
    }
    await dialog.getByText('#2').waitFor()
    await dialog.getByRole('button', { name: 'Đưa ảnh 2 lên trước' }).click()
    await expectCall('A29', t)
    await dialog.getByRole('button', { name: 'Đặt làm ảnh chính' }).first().click()
    await expectCall('A30', t)
    await dialog.getByRole('button', { name: 'Xoá ảnh 2' }).click()
    await dialog.getByRole('button', { name: 'Xoá ảnh', exact: true }).click()
    await expectCall('A28', t)
    const detail = await S.must('ADMIN', 'GET', `/admin/products/${state.productId}`)
    assert.equal(detail.images.length, 1)
    assert.equal(detail.images[0].altText, 'Mặt sau')
    assert.equal(detail.images[0].isPrimary, true)
  })

  test('A04/A05: báo cáo sau bán và tệp CSV tải được, nội dung là CSV', async () => {
    const page = await as('ADMIN', '/admin/reports')
    const t = mark()
    await page.getByText('Tiền hợp đồng lắp đặt').waitFor()
    await expectCall('A04', t)
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Tải CSV' }).click()])
    await expectCall('A05', t)
    const csv = fs.readFileSync(await download.path(), 'utf8')
    state.csvHeader = csv.split('\n')[0].slice(0, 120)
    assert.match(download.suggestedFilename(), /\.csv$/)
    assert.ok(csv.split('\n').length > 2, 'CSV có dòng dữ liệu')
    assert.match(csv.split('\n')[0], /,/)
  })
})
