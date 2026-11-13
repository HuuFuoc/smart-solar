// Kiểm thử bộ lọc, tìm kiếm và sắp xếp mới nhất của công trình lắp đặt. Chạy: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { installationKeywords, matchesInstallation } from '../src/features/installations/installationFilter.ts'

const sampleInstallation = (overrides = {}) => ({
  projectId: 'proj-1',
  status: 'IN_PROGRESS',
  myAssignmentStatus: 'ACCEPTED',
  assignmentId: 'asg-1',
  startsAt: '2026-10-22T16:00:00+07:00',
  endsAt: '2026-10-23T17:00:00+07:00',
  zoneName: 'Khu Thủ Đức',
  site: {
    propertySiteId: 'site-1',
    propertyName: 'Shop quần áo',
    province: 'Thành phố Hồ Chí Minh',
    district: null,
    ward: 'Phường Thủ Đức',
    streetLine: '123 Kha Vạn Cân',
    latitude: 10.85,
    longitude: 106.75,
    customerName: 'Nguyễn Văn A',
    customerPhone: '0901234567',
  },
  startedAt: '2026-10-22T16:15:00+07:00',
  acceptanceRequestedAt: null,
  completedAt: null,
  currentRound: 1,
  ...overrides,
})

describe('Bộ lọc và tìm kiếm công trình lắp đặt', () => {
  test('tạo chuỗi từ khoá chứa ngày, giờ, công trình, khách hàng và khu vực', () => {
    const inst = sampleInstallation()
    const kw = installationKeywords(inst)
    assert.match(kw, /shop quan ao/)
    assert.match(kw, /thu duc/)
    assert.match(kw, /nguyen van a/)
    assert.match(kw, /22\/10/)
    assert.match(kw, /23\/10/)
    assert.match(kw, /16:00/)
    assert.match(kw, /16h/)
  })

  test('lọc ngày nằm trong khoảng thi công bắt đầu đến kết thúc', () => {
    const inst = sampleInstallation() // 2026-10-22 đến 2026-10-23
    assert.equal(matchesInstallation(inst, '', '2026-10-22', ''), true)
    assert.equal(matchesInstallation(inst, '', '2026-10-23', ''), true)
    assert.equal(matchesInstallation(inst, '', '2026-10-21', ''), false)
    assert.equal(matchesInstallation(inst, '', '2026-10-24', ''), false)
  })

  test('lọc theo giờ bắt đầu công trình', () => {
    const inst = sampleInstallation()
    assert.equal(matchesInstallation(inst, '', '', '16:00'), true)
    assert.equal(matchesInstallation(inst, '', '', '08:00'), false)
  })

  test('tìm kiếm từ khoá công trình, khách hàng, ngày, giờ', () => {
    const inst = sampleInstallation()
    assert.equal(matchesInstallation(inst, 'shop quan ao', '', ''), true)
    assert.equal(matchesInstallation(inst, 'nguyen van a', '', ''), true)
    assert.equal(matchesInstallation(inst, '22/10 16h', '', ''), true)
    assert.equal(matchesInstallation(inst, 'go vap', '', ''), false)
  })

  test('sắp xếp mới nhất lên đầu theo startsAt giảm dần', () => {
    const oldInst = sampleInstallation({ startsAt: '2026-10-10T08:00:00+07:00' })
    const newInst = sampleInstallation({ startsAt: '2026-11-12T08:00:00+07:00' })
    const list = [oldInst, newInst]
    const sorted = [...list].sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    assert.equal(sorted[0].startsAt, '2026-11-12T08:00:00+07:00')
    assert.equal(sorted[1].startsAt, '2026-10-10T08:00:00+07:00')
  })
})
