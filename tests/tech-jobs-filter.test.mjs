// Kiểm thử bộ lọc và tìm kiếm lịch làm việc của kỹ thuật viên theo ngày, giờ và từ khoá. Chạy: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { jobKeywords, matchesJob } from '../src/features/scheduling/techJobFilter.ts'

const sampleJob = (overrides = {}) => ({
  appointmentId: 'apt-1',
  appointmentType: 'PRE_SURVEY',
  startsAt: '2026-10-13T09:00:00+07:00',
  endsAt: '2026-10-13T10:30:00+07:00',
  status: 'ACCEPTED',
  assignmentSource: 'MANUAL',
  propertyName: 'Kiểm thử luồng đặt lịch 12/10',
  province: 'Thành phố Hồ Chí Minh',
  district: 'Quận 7',
  ward: 'Phường Tân Thuận',
  communeName: null,
  assignedAt: '2026-10-12T17:18:00+07:00',
  surveyRequestId: 'sr-1',
  isOverdue: true,
  ...overrides,
})

describe('Bộ lọc và tìm kiếm việc của kỹ thuật viên', () => {
  test('tạo chuỗi từ khoá chứa ngày, giờ, công trình và địa bàn', () => {
    const job = sampleJob()
    const kw = jobKeywords(job)
    assert.match(kw, /kiem thu luong dat lich/)
    assert.match(kw, /tan thuan/)
    assert.match(kw, /13\/10/)
    assert.match(kw, /09:00/)
    assert.match(kw, /9h/)
  })

  test('lọc chính xác theo ngày Việt Nam (YYYY-MM-DD)', () => {
    const job = sampleJob({ startsAt: '2026-10-13T09:00:00+07:00' })
    assert.equal(matchesJob(job, '', '2026-10-13', ''), true)
    assert.equal(matchesJob(job, '', '2026-10-14', ''), false)
  })

  test('lọc chính xác theo giờ bắt đầu', () => {
    const job = sampleJob({ startsAt: '2026-10-13T09:00:00+07:00' })
    assert.equal(matchesJob(job, '', '', '09:00'), true)
    assert.equal(matchesJob(job, '', '', '08:30'), false)
  })

  test('tìm kiếm linh hoạt theo từ khoá ngày hoặc giờ', () => {
    const job = sampleJob({
      propertyName: 'S9.03 Vinhome Grand Park Quận 9',
      startsAt: '2026-11-12T08:30:00+07:00',
      endsAt: '2026-11-12T10:00:00+07:00',
    })
    assert.equal(matchesJob(job, 'vinhome', '', ''), true)
    assert.equal(matchesJob(job, '12/11', '', ''), true)
    assert.equal(matchesJob(job, '08:30', '', ''), true)
    assert.equal(matchesJob(job, '8h30', '', ''), true)
    assert.equal(matchesJob(job, 'vinhome 12/11 8h30', '', ''), true)
    assert.equal(matchesJob(job, 'vinhome 09:00', '', ''), false)
  })

  test('kết hợp đồng thời bộ lọc ngày, giờ và từ khoá', () => {
    const job = sampleJob({
      propertyName: 'Nha xuong ABC',
      startsAt: '2026-10-20T08:00:00+07:00',
      endsAt: '2026-10-20T09:30:00+07:00',
    })
    assert.equal(matchesJob(job, 'nha xuong', '2026-10-20', '08:00'), true)
    assert.equal(matchesJob(job, 'nha xuong', '2026-10-20', '09:00'), false)
    assert.equal(matchesJob(job, 'sai ten', '2026-10-20', '08:00'), false)
  })
})
