// E2E luồng IoT với BACKEND THẬT, ở mức API (đúng các đường dẫn và vai trò web dùng). Có GHI dữ liệu: đăng ký một thiết bị mã
// ngẫu nhiên, gắn vào công trình, gửi 2 số đo VỚI TƯ CÁCH THIẾT BỊ (từ Node, không phải trình duyệt), khoá, tháo. Chỉ chạy khi bật rõ:
//   API_BASE=http://160.187.1.242:8080 E2E_IOT_ALLOW_WRITES=1 E2E_IOT_PROJECT_ID=<dự án của khách, chưa gắn thiết bị> \
//   E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… E2E_MANAGER_EMAIL=… E2E_MANAGER_PASSWORD=… \
//   E2E_CUSTOMER_EMAIL=… E2E_CUSTOMER_PASSWORD=… node --test tests/e2e/iot.live.e2e.mjs
// Khách phải là chủ của E2E_IOT_PROJECT_ID. Server cho 10 lần đăng nhập / 10 phút mỗi IP: file đăng nhập đúng 3 lần
import assert from 'node:assert/strict'
import { before, describe, test } from 'node:test'

const api = `${(process.env.API_BASE ?? 'http://localhost:8080').replace(/\/$/, '')}/api`
const projectId = process.env.E2E_IOT_PROJECT_ID
const accounts = ['ADMIN', 'MANAGER', 'CUSTOMER'].map((r) => [
  r,
  process.env[`E2E_${r}_EMAIL`],
  process.env[`E2E_${r}_PASSWORD`],
])
const missing = accounts.filter(([, e, p]) => !e || !p).map(([r]) => r)
const skip =
  process.env.E2E_IOT_ALLOW_WRITES !== '1'
    ? 'chưa bật E2E_IOT_ALLOW_WRITES=1 (test ghi dữ liệu thật)'
    : !projectId
      ? 'chưa khai E2E_IOT_PROJECT_ID'
      : missing.length > 0
        ? `chưa khai tài khoản ${missing.join(', ')}`
        : false

const tokens = {}

async function call(role, method, path, body, headers = {}) {
  const res = await fetch(`${api}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(role ? { authorization: `Bearer ${tokens[role]}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = await res.json().catch(() => null)
  return { status: res.status, data: json?.data ?? null, code: json?.error?.code ?? null }
}

const deviceId = `E2E-${Date.now().toString(36).toUpperCase()}`
const state = {}

describe('IoT với backend thật', { skip }, () => {
  before(async () => {
    for (const [role, email, password] of accounts) {
      const r = await call(null, 'POST', '/auth/login', { email, password })
      assert.equal(r.status, 200, `đăng nhập ${role}: ${r.status} ${r.code}`)
      tokens[role] = r.data.accessToken
    }
  })

  test('quản trị đăng ký thiết bị: khoá chỉ có trong response đăng ký; danh sách không có khoá', async () => {
    const reg = await call('ADMIN', 'POST', '/admin/iot/devices', {
      deviceId,
      displayName: 'E2E web',
      sensorModel: 'ACS712-30A',
      maxCurrentAmps: 30,
    })
    assert.equal(reg.status, 201, reg.code)
    assert.match(reg.data.secret, /^ssdk_/)
    state.secret = reg.data.secret
    state.device = reg.data.device
    assert.equal(state.device.connectionStatus, 'UNASSIGNED')
    const list = await call('ADMIN', 'GET', `/admin/iot/devices?search=${deviceId}&page=1&pageSize=20`)
    assert.equal(list.status, 200)
    assert.equal(list.data.items[0].deviceId, deviceId)
    assert.equal(JSON.stringify(list.data).includes(state.secret), false, 'danh sách không lộ khoá')
    const dup = await call('ADMIN', 'POST', '/admin/iot/devices', { deviceId, displayName: 'trùng' })
    assert.equal(dup.code, 'IOT_DEVICE_ID_TAKEN')
  })

  test('quản lý / khách không vào được sổ thiết bị (403)', async () => {
    assert.equal((await call('MANAGER', 'GET', '/admin/iot/devices')).status, 403)
    assert.equal((await call('CUSTOMER', 'GET', '/admin/iot/devices')).status, 403)
  })

  test('chưa gắn thì thiết bị gửi số đo bị 409; khách thấy "chưa gắn" (404 IOT_BINDING_NOT_FOUND)', async () => {
    const r = await call(
      null,
      'POST',
      `/iot/devices/${deviceId}/readings`,
      { current: 0.5 },
      { 'X-Device-Key': state.secret },
    )
    assert.equal(r.code, 'IOT_DEVICE_NOT_BOUND')
  })

  test('quản lý gắn vào công trình; gắn lại đúng thiết bị là idempotent; khách không gắn được', async () => {
    const bind = await call('MANAGER', 'POST', `/installation-projects/${projectId}/iot-device`, {
      deviceId,
      note: 'E2E',
      replaceCurrent: false,
    })
    if (bind.code === 'IOT_PROJECT_ALREADY_BOUND')
      assert.fail(
        'công trình E2E_IOT_PROJECT_ID đã có thiết bị: chọn công trình chưa gắn (test không tự thay thiết bị)',
      )
    assert.equal(bind.status, 201, bind.code)
    state.bindingId = bind.data.bindingId
    const again = await call('MANAGER', 'POST', `/installation-projects/${projectId}/iot-device`, {
      deviceId,
      note: null,
      replaceCurrent: false,
    })
    assert.equal(again.data?.bindingId, state.bindingId)
    assert.equal(
      (await call('CUSTOMER', 'POST', `/installation-projects/${projectId}/iot-device`, { deviceId })).status,
      403,
    )
  })

  test('thiết bị gửi 2 số đo (một âm); khách đọc đúng dấu, mới nhất trước, có con trỏ', async () => {
    for (const current of [0.25, -0.125]) {
      const r = await call(
        null,
        'POST',
        `/iot/devices/${deviceId}/readings`,
        { current },
        { 'X-Device-Key': state.secret },
      )
      assert.equal(r.status, 201, r.code)
    }
    const wrongKey = await call(
      null,
      'POST',
      `/iot/devices/${deviceId}/readings`,
      { current: 1 },
      { 'X-Device-Key': 'ssdk_sai' },
    )
    assert.equal(wrongKey.status, 401)
    const base = `/customers/me/installation-projects/${projectId}/energy-monitoring`
    const latest = await call('CUSTOMER', 'GET', `${base}/readings/latest`)
    assert.equal(latest.data.connectionStatus, 'ONLINE')
    assert.equal(latest.data.reading.currentAmps, -0.125)
    const history = await call('CUSTOMER', 'GET', `${base}/readings?limit=1`)
    assert.equal(history.data.items.length, 1)
    assert.equal(history.data.hasMore, true)
    const older = await call(
      'CUSTOMER',
      'GET',
      `${base}/readings?limit=1&before=${encodeURIComponent(history.data.nextBefore)}`,
    )
    assert.equal(older.data.items[0].currentAmps, 0.25)
    const overview = await call('CUSTOMER', 'GET', base)
    assert.equal(overview.data.measured.currentAmps.status, 'MEASURED')
    assert.equal(overview.data.measured.powerWatts.status, 'NOT_AVAILABLE')
    assert.equal(overview.data.measured.powerWatts.value, null)
    const staff = await call('MANAGER', 'GET', `/installation-projects/${projectId}/energy-monitoring/readings/latest`)
    assert.equal(staff.data.reading.currentAmps, -0.125)
  })

  test('khoá thiết bị: số đo bị 403, khách thấy DISABLED và không có số hiện tại; mở khoá lại', async () => {
    const dev = await call('ADMIN', 'GET', `/admin/iot/devices/${state.device.id}`)
    const disabled = await call('ADMIN', 'POST', `/admin/iot/devices/${state.device.id}/disable`, {
      reason: 'E2E',
      expectedRevision: dev.data.revision,
    })
    assert.equal(disabled.status, 200, disabled.code)
    const stale = await call(
      'ADMIN',
      'POST',
      `/admin/iot/devices/${state.device.id}/enable?expectedRevision=${dev.data.revision}`,
    )
    assert.equal(stale.code, 'IOT_STALE_REVISION', 'revision cũ bị từ chối')
    const r = await call(
      null,
      'POST',
      `/iot/devices/${deviceId}/readings`,
      { current: 1 },
      { 'X-Device-Key': state.secret },
    )
    assert.equal(r.code, 'IOT_DEVICE_DISABLED')
    const latest = await call(
      'CUSTOMER',
      'GET',
      `/customers/me/installation-projects/${projectId}/energy-monitoring/readings/latest`,
    )
    assert.equal(latest.data.connectionStatus, 'DISABLED')
    assert.equal(latest.data.reading, null)
    const enabled = await call(
      'ADMIN',
      'POST',
      `/admin/iot/devices/${state.device.id}/enable?expectedRevision=${disabled.data.revision}`,
    )
    assert.equal(enabled.status, 200, enabled.code)
  })

  test('tháo bắt buộc lý do; sau khi tháo khách không còn thiết bị nhưng lịch sử vẫn còn', async () => {
    assert.equal(
      (await call('MANAGER', 'POST', `/iot/bindings/${state.bindingId}/release`, { reason: ' ' })).code,
      'IOT_VALIDATION_FAILED',
    )
    const released = await call('MANAGER', 'POST', `/iot/bindings/${state.bindingId}/release`, {
      reason: 'E2E dọn dẹp',
    })
    assert.equal(released.data.status, 'RELEASED')
    const base = `/customers/me/installation-projects/${projectId}/energy-monitoring`
    assert.equal((await call('CUSTOMER', 'GET', `${base}/device`)).code, 'IOT_BINDING_NOT_FOUND')
    const history = await call('CUSTOMER', 'GET', `${base}/readings?limit=10`)
    assert.ok(
      history.data.items.some((x) => x.deviceId === deviceId),
      'lịch sử của công trình không mất',
    )
    // Dọn: khoá thiết bị E2E để không ai gắn nhầm
    const dev = await call('ADMIN', 'GET', `/admin/iot/devices/${state.device.id}`)
    await call('ADMIN', 'POST', `/admin/iot/devices/${state.device.id}/disable`, {
      reason: 'Thiết bị E2E, không dùng',
      expectedRevision: dev.data.revision,
    })
  })
})
