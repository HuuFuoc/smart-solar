// Giám sát IoT (backend 7d27054): kiểm tra form, xung đột khi gắn, nhịp hỏi lại, số đo giữ dấu, lịch sử theo con trỏ, đại lượng
// chưa đo được, và các chốt an toàn (web không gửi số đo, không lưu khoá). Mỗi luật: đường chính, luật nghiệp vụ, trường hợp sai
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  ampsAxis,
  bindConflict,
  chartGapMs,
  chartPoints,
  defaultWindow,
  deviceIdError,
  formatAmps,
  isBindableProject,
  isFinalReadError,
  isNoBinding,
  isStale,
  latestPollMs,
  mergeHistory,
  normalizeDeviceId,
  noteError,
  parseAmps,
  pointsInWindow,
  quantityText,
  rangeError,
  reasonError,
  registerBody,
  registerErrors,
  spikeIds,
  vnDayEnd,
  vnDayStart,
  withGaps,
} from '../src/features/iot/iotRules.ts'

const form = (over = {}) => ({
  deviceId: 'ESP32-001',
  displayName: 'Kẹp dòng',
  sensorModel: '',
  maxCurrentAmps: '',
  ...over,
})

describe('Quản trị đăng ký thiết bị', () => {
  test('mã thiết bị 3–64 ký tự chữ, số, . _ -; so sánh theo chữ hoa như backend lưu', () => {
    assert.equal(deviceIdError('ESP32-001'), null)
    assert.equal(deviceIdError('esp32.a_b-1'), null)
    assert.ok(deviceIdError(''))
    assert.ok(deviceIdError('ab'))
    assert.ok(deviceIdError('x'.repeat(65)))
    assert.ok(deviceIdError('ESP 32'), 'khoảng trắng')
    assert.ok(deviceIdError('thiết-bị'), 'chữ có dấu')
    assert.equal(normalizeDeviceId(' esp32-001 '), 'ESP32-001')
  })

  test('tên bắt buộc ≤ 150, cảm biến ≤ 50, dải đo trống thì để backend dùng mặc định, có thì 0 < x ≤ 1000', () => {
    assert.deepEqual(registerErrors(form()), {})
    assert.ok(registerErrors(form({ displayName: ' ' })).displayName)
    assert.ok(registerErrors(form({ displayName: 'x'.repeat(151) })).displayName)
    assert.ok(registerErrors(form({ sensorModel: 'x'.repeat(51) })).sensorModel)
    for (const bad of ['0', '-5', '1001', 'abc'])
      assert.ok(registerErrors(form({ maxCurrentAmps: bad })).maxCurrentAmps, bad)
    assert.equal(parseAmps(''), null)
    assert.equal(parseAmps('20,5'), 20.5)
  })

  test('body gửi lên: chữ đã cắt khoảng trắng, cảm biến trống là null, không bịa dải đo', () => {
    assert.deepEqual(
      registerBody(form({ deviceId: ' esp32-002 ', displayName: ' A ', sensorModel: ' ', maxCurrentAmps: '' })),
      {
        deviceId: 'esp32-002',
        displayName: 'A',
        sensorModel: null,
        maxCurrentAmps: null,
      },
    )
    assert.equal(registerBody(form({ maxCurrentAmps: '20' })).maxCurrentAmps, 20)
  })

  test('khoá / tháo bắt buộc lý do ≤ 500; ghi chú lúc gắn không bắt buộc', () => {
    assert.ok(reasonError(''))
    assert.ok(reasonError('x'.repeat(501)))
    assert.equal(reasonError('Thiết bị cần kiểm tra'), null)
    assert.equal(noteError(''), null)
    assert.ok(noteError('x'.repeat(501)))
  })
})

describe('Quản lý gắn / thay / tháo thiết bị', () => {
  test('công trình đã có thiết bị khác: hỏi người dùng thay; thiết bị ở công trình khác: không được lấy', () => {
    assert.equal(bindConflict('IOT_PROJECT_ALREADY_BOUND'), 'replace')
    assert.equal(bindConflict('IOT_DEVICE_ALREADY_BOUND'), 'elsewhere')
    assert.equal(bindConflict('IOT_DEVICE_NOT_FOUND'), null)
    assert.equal(bindConflict(undefined), null)
  })

  test('công trình đã huỷ không gắn được; không có thiết bị (404 IOT_BINDING_NOT_FOUND) là trạng thái, không phải lỗi', () => {
    assert.equal(isBindableProject('COMPLETED'), true)
    assert.equal(isBindableProject('CANCELLED'), false)
    assert.equal(isNoBinding('IOT_BINDING_NOT_FOUND'), true)
    assert.equal(isNoBinding('INSTALLATION_PROJECT_NOT_FOUND'), false, 'công trình không thuộc khách vẫn là lỗi')
  })
})

describe('Số đo mới nhất', () => {
  test('hỏi lại theo chu kỳ thiết bị khi đang kết nối, thưa hơn khi mất kết nối, thôi khi bị khoá / chưa gắn', () => {
    assert.equal(latestPollMs('ONLINE', 10), 10_000)
    assert.equal(latestPollMs('OFFLINE', 10), 30_000)
    assert.equal(latestPollMs('NO_DATA', 10), 30_000)
    assert.equal(latestPollMs('DISABLED', 10), false)
    assert.equal(latestPollMs('UNASSIGNED', 10), false)
    assert.equal(latestPollMs(undefined, 10), false)
  })

  test('không bao giờ hỏi nhanh hơn 10 giây, kể cả khi cấu hình chu kỳ ngắn hơn (hạn mức 60 lần đọc / phút)', () => {
    assert.equal(latestPollMs('ONLINE', 2), 10_000)
    assert.ok(60_000 / (latestPollMs('ONLINE', 1) || Infinity) <= 6)
  })

  test('lỗi 4xx (kể cả 429) không tự thử lại; lỗi mạng / 5xx thì có', () => {
    for (const s of [400, 401, 403, 404, 409, 429]) assert.equal(isFinalReadError(s), true, String(s))
    for (const s of [0, 500, 503]) assert.equal(isFinalReadError(s), false, String(s))
  })

  test('số đo quá ngưỡng mất kết nối thì không gọi là hiện tại', () => {
    const now = Date.parse('2026-11-19T10:00:30Z')
    assert.equal(isStale('2026-11-19T10:00:10Z', 30, now), false)
    assert.equal(isStale('2026-11-19T09:59:00Z', 30, now), true)
    assert.equal(isStale('không phải ngày', 30, now), true)
  })

  test('dòng điện giữ dấu và số lẻ như cảm biến đo', () => {
    assert.match(formatAmps(-0.2145), /^-0,2145 A$/)
    assert.match(formatAmps(1.5), /^1,5 A$/)
    assert.match(formatAmps(0), /^0 A$/)
  })

  test('đại lượng chưa đo được hiện "Chưa đo được", không bao giờ thành 0', () => {
    assert.equal(quantityText({ status: 'NOT_AVAILABLE', value: null, unit: 'kWh' }), 'Chưa đo được')
    assert.equal(quantityText({ status: 'MEASURED', value: null, unit: 'A' }), 'Chưa đo được')
    assert.equal(quantityText(null), 'Chưa đo được')
    assert.match(quantityText({ status: 'MEASURED', value: -0.5, unit: 'A' }), /^-0,5 A$/)
  })
})

describe('Lịch sử số đo', () => {
  const r = (id, at, a = 1) => ({ readingId: id, deviceId: 'ESP32-001', receivedAt: at, currentAmps: a })

  test('gộp các trang theo con trỏ, bỏ trùng khi trang đầu được tải lại', () => {
    const page1 = { items: [r('c', '2026-11-19T10:00:20Z'), r('b', '2026-11-19T10:00:10Z')] }
    const page2 = { items: [r('b', '2026-11-19T10:00:10Z'), r('a', '2026-11-19T10:00:00Z')] }
    assert.deepEqual(
      mergeHistory([page1, page2]).map((x) => x.readingId),
      ['c', 'b', 'a'],
    )
    assert.deepEqual(mergeHistory([]), [])
  })

  test('điểm biểu đồ đúng số backend trả, xếp tăng dần theo thời gian, không thêm điểm cho khoảng thiếu', () => {
    const items = [r('c', '2026-11-19T10:05:00Z', -0.3), r('a', '2026-11-19T10:00:00Z', 0.2), r('x', 'sai', 9)]
    const points = chartPoints(items)
    assert.deepEqual(
      points.map((p) => [p.readingId, p.currentAmps]),
      [
        ['a', 0.2],
        ['c', -0.3],
      ],
    )
  })

  // Tình huống thật 27/11/2026: vài số đo tối hôm trước, một loạt dày buổi sáng quanh 0–1 A, cuối loạt có số đo nhiễu −22 A
  const t0 = Date.parse('2026-11-27T02:00:00Z')
  const pt = (id, at, a) => ({ readingId: id, at, receivedAt: new Date(at).toISOString(), currentAmps: a })
  const morning = Array.from({ length: 30 }, (_, i) =>
    pt(`m${i}`, t0 + i * 5000, i % 3 === 0 ? 0 : 0.9 + (i % 5) * 0.03),
  )
  const burst = [
    pt('e1', t0 - 13 * 3600_000, 0),
    pt('e2', t0 - 13 * 3600_000 + 5000, 0),
    ...morning,
    pt('s1', t0 + 30 * 5000, -22.4),
    pt('s2', t0 + 31 * 5000, -16.8),
    pt('m30', t0 + 32 * 5000, 1.01),
  ]

  test('khoảng xem mặc định là khoảng ngắn nhất có đủ số đo gần nhất; Tất cả giữ mọi số đo', () => {
    assert.equal(defaultWindow(burst), '15m')
    assert.equal(pointsInWindow(burst, '15m').length, 33)
    assert.equal(pointsInWindow(burst, 'all').length, burst.length)
    // Ít số đo: khoảng phải chứa hết
    assert.equal(defaultWindow(burst.slice(0, 5)), '24h')
    assert.deepEqual(pointsInWindow([], '1h'), [])
  })

  test('số đo chênh hẳn xung quanh được đánh dấu, kể cả ở cuối loạt; mức đo thật hay bước đổi mức thì không', () => {
    assert.deepEqual([...spikeIds(burst)].sort(), ['s1', 's2'])
    // Dòng điện tăng hẳn lên một mức mới và giữ ở đó: không phải đột biến
    const step = Array.from({ length: 20 }, (_, i) => pt(`k${i}`, t0 + i * 5000, i < 10 ? 0.5 : 8))
    assert.equal(spikeIds(step).size, 0)
    // Dao động nhỏ dưới ngưỡng tuyệt đối 2 A không bị đánh dấu
    const noisy = Array.from({ length: 20 }, (_, i) => pt(`n${i}`, t0 + i * 5000, i === 10 ? 1.8 : 0))
    assert.equal(spikeIds(noisy).size, 0)
    assert.equal(spikeIds(burst.slice(0, 4)).size, 0)
  })

  test('khung trục ôm sát số đo thường, có mốc 0 khi gần, không kéo về 0 khi số đo quanh một mức xa', () => {
    const normal = burst.filter((p) => !['s1', 's2'].includes(p.readingId)).map((p) => p.currentAmps)
    const { domain, ticks } = ampsAxis(normal)
    assert.deepEqual(domain, [0, 1.5])
    assert.deepEqual(ticks, [0, 0.5, 1, 1.5])
    assert.deepEqual(ampsAxis([-0.22, 1.04]).domain, [-0.5, 1.5])
    const high = ampsAxis([9.6, 10.1, 10.4]).domain
    assert.ok(high[0] > 9 && high[1] < 11, `${high}`)
    assert.deepEqual(ampsAxis([0, 0]).domain, [-0.5, 0.5])
    assert.deepEqual(ampsAxis([]).domain, [-1, 1])
  })

  test('đường ngắt ở chỗ thiếu số đo quá 5 chu kỳ gửi, không nối qua', () => {
    const { line, gaps } = withGaps(pointsInWindow(burst, 'all'), chartGapMs(5))
    assert.equal(gaps, 1)
    const gap = line.find((p) => p.currentAmps === null)
    assert.ok(gap && gap.at > burst[1].at && gap.at < burst[2].at)
    assert.equal(chartGapMs(5), 60_000)
    assert.equal(chartGapMs(30), 150_000)
    assert.equal(chartGapMs(null), 300_000)
  })

  test('khoảng ngày theo giờ Việt Nam; từ ngày sau đến ngày thì chặn', () => {
    assert.equal(vnDayStart('2026-11-19'), '2026-11-19T00:00:00+07:00')
    assert.equal(vnDayEnd('2026-11-19'), '2026-11-19T23:59:59.999+07:00')
    assert.equal(vnDayStart(''), undefined)
    assert.ok(rangeError('2026-11-20', '2026-11-19'))
    assert.equal(rangeError('2026-11-19', '2026-11-19'), null)
    assert.equal(rangeError('', '2026-11-19'), null)
  })
})

describe('Chốt an toàn trong mã nguồn', () => {
  const read = (p) => fs.readFileSync(path.resolve(p), 'utf8')
  const iotFiles = [
    'src/services/iotService.ts',
    'src/hooks/useIot.ts',
    'src/features/iot/DeviceKeyDialog.tsx',
    'src/features/iot/RegisterDeviceDialog.tsx',
    'src/features/iot/StaffIotPanel.tsx',
    'src/features/iot/IotMonitoring.tsx',
    'src/features/iot/CustomerIotPanel.tsx',
    'src/pages/admin/iot-devices-page.tsx',
  ]

  test('web không gọi API nhận số đo của ESP32 và không gửi X-Device-Key', () => {
    for (const f of iotFiles) {
      const s = read(f)
      assert.doesNotMatch(s, /X-Device-Key['"]?\s*:/, f)
      assert.doesNotMatch(s, /iot\/devices\/\$\{[^}]+\}\/readings/, f)
    }
    assert.doesNotMatch(read('src/services/api/endpoints.ts'), /iot\/devices\/\$\{[^}]+\}\/readings/)
  })

  test('khoá thiết bị không vào storage, URL hay log', () => {
    for (const f of iotFiles) {
      const s = read(f)
      assert.doesNotMatch(s, /localStorage|sessionStorage|console\.(log|info|debug|warn|error)/, f)
      assert.doesNotMatch(s, /searchParams|setSearchParams/, f)
    }
  })

  test('mutation trả khoá không giữ cache, hộp thoại khoá do nơi gọi xoá khi đóng', () => {
    assert.match(read('src/hooks/useIot.ts'), /gcTime: 0/)
    assert.match(read('src/pages/admin/iot-devices-page.tsx'), /onClose=\{\(\) => setKey\(null\)\}/)
  })

  test('sổ thiết bị chỉ có trong cổng quản trị; khách và quản lý không có route / menu đó', () => {
    const portals = read('src/config/portals.ts')
    assert.equal((portals.match(/ROUTES\.admin\.iotDevices/g) ?? []).length, 1)
    assert.doesNotMatch(read('src/features/iot/CustomerIotPanel.tsx'), /useIotDevicesQuery|Register|bindDevice/)
    assert.match(read('src/features/iot/StaffIotPanel.tsx'), /enabled: isAdmin/)
  })
})
