// Kiểm thử tìm kiếm trong hàng chờ yêu cầu khảo sát của kinh doanh. Chạy: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { matchesSurveyRequest, surveyRequestKeywords } from '../src/features/pre-surveys/surveyRequestFilter.ts'

const row = (overrides = {}) => ({
  propertyName: 'Kiểm thử đặt lịch 27/10',
  customerName: 'Đoàn Nguyễn',
  communeName: 'Phường Tăng Nhơn Phú',
  ward: null,
  district: 'Thành phố Thủ Đức',
  province: 'Thành phố Hồ Chí Minh',
  ...overrides,
})

describe('Tìm kiếm yêu cầu khảo sát', () => {
  test('từ khoá gồm công trình, khách hàng và địa bàn, đã bỏ dấu', () => {
    const kw = surveyRequestKeywords(row())
    assert.match(kw, /kiem thu dat lich 27\/10/)
    assert.match(kw, /doan nguyen/)
    assert.match(kw, /tang nhon phu/)
    assert.match(kw, /thu duc/)
  })

  test('khớp không phân biệt dấu và hoa thường, mọi từ đều phải có', () => {
    assert.equal(matchesSurveyRequest(row(), 'tang nhon'), true)
    assert.equal(matchesSurveyRequest(row(), 'ĐOÀN nguyen'), true)
    assert.equal(matchesSurveyRequest(row(), 'doan tang'), true)
    assert.equal(matchesSurveyRequest(row(), 'doan binh thanh'), false)
  })

  test('ô trống hoặc chỉ khoảng trắng thì khớp hết', () => {
    assert.equal(matchesSurveyRequest(row(), ''), true)
    assert.equal(matchesSurveyRequest(row(), '   '), true)
  })

  test('công trình chưa đặt tên, khách không tên vẫn tìm được theo phường', () => {
    const r = row({ propertyName: null, customerName: null, communeName: null, ward: 'Phường Bến Thành' })
    assert.equal(matchesSurveyRequest(r, 'ben thanh'), true)
    assert.equal(matchesSurveyRequest(r, 'doan'), false)
  })
})
