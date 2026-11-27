import type { RegisterIotDeviceRequest } from '@/types/req/adminIotDevicesReq'
import type { IotMeasuredQuantityView, IotReadingHistoryView, IotReadingView } from '@/types/res/iotMonitoringRes'

// Luật giám sát IoT bám IotDeviceHandlers, IotBindingHandlers, IotTelemetryHandlers của backend 7d27054. Chỉ để báo lỗi trước khi
// gửi và để vẽ; backend vẫn kiểm lại. Không import giá trị qua "@/" để chạy được bằng node --test

const LIMITS = {
  deviceIdMin: 3,
  deviceIdMax: 64,
  displayNameMax: 150,
  sensorModelMax: 50,
  reasonMax: 500,
  maxCurrentAmps: 1000,
  historyLimitMax: 500,
}

const DEVICE_ID = /^[A-Za-z0-9._-]+$/

/** Mã firmware: 3–64 ký tự chữ, số, `.`, `_`, `-`; backend lưu chữ hoa nên so sánh cũng theo chữ hoa */
export const normalizeDeviceId = (value: string) => value.trim().toUpperCase()

export function deviceIdError(value: string): string | null {
  const text = value.trim()
  if (!text) return 'Nhập mã thiết bị (đúng mã nạp trong firmware).'
  if (text.length < LIMITS.deviceIdMin || text.length > LIMITS.deviceIdMax)
    return `Mã thiết bị dài ${LIMITS.deviceIdMin} đến ${LIMITS.deviceIdMax} ký tự.`
  if (!DEVICE_ID.test(text)) return 'Mã thiết bị chỉ gồm chữ không dấu, số và các ký tự . _ -'
  return null
}

export type RegisterForm = { deviceId: string; displayName: string; sensorModel: string; maxCurrentAmps: string }
export type RegisterErrors = Partial<Record<keyof RegisterForm, string>>

/** Dải đo nhập bằng dấu phẩy hoặc chấm; trống là để backend dùng dải mặc định (IotMonitoring:DefaultMaxCurrentAmps) */
export function parseAmps(text: string): number | null {
  const t = text.trim().replace(',', '.')
  if (!t) return null
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : Number.NaN
}

export function registerErrors(form: RegisterForm): RegisterErrors {
  const errors: RegisterErrors = {}
  const id = deviceIdError(form.deviceId)
  if (id) errors.deviceId = id
  const name = form.displayName.trim()
  if (!name) errors.displayName = 'Nhập tên thiết bị.'
  else if (name.length > LIMITS.displayNameMax) errors.displayName = `Tối đa ${LIMITS.displayNameMax} ký tự.`
  if (form.sensorModel.trim().length > LIMITS.sensorModelMax)
    errors.sensorModel = `Tối đa ${LIMITS.sensorModelMax} ký tự.`
  const amps = parseAmps(form.maxCurrentAmps)
  if (amps !== null && (!Number.isFinite(amps) || amps <= 0 || amps > LIMITS.maxCurrentAmps))
    errors.maxCurrentAmps = `Dải đo lớn hơn 0 và tối đa ${LIMITS.maxCurrentAmps} A.`
  return errors
}

export function registerBody(form: RegisterForm): RegisterIotDeviceRequest {
  return {
    deviceId: form.deviceId.trim(),
    displayName: form.displayName.trim(),
    sensorModel: form.sensorModel.trim() || null,
    maxCurrentAmps: parseAmps(form.maxCurrentAmps),
  }
}

/** Lý do khoá thiết bị / tháo thiết bị: bắt buộc, tối đa 500 ký tự */
export function reasonError(text: string): string | null {
  const t = text.trim()
  if (!t) return 'Ghi lý do.'
  return t.length > LIMITS.reasonMax ? `Tối đa ${LIMITS.reasonMax} ký tự.` : null
}

/** Ghi chú lúc gắn: không bắt buộc, tối đa 500 ký tự */
export const noteError = (text: string) =>
  text.trim().length > LIMITS.reasonMax ? `Tối đa ${LIMITS.reasonMax} ký tự.` : null

// ---------- Gắn thiết bị ----------

/**
 * Kết quả của lệnh gắn bị 409: `replace` là công trình đã có thiết bị khác (hỏi người dùng rồi mới gửi lại `replaceCurrent: true`);
 * `elsewhere` là thiết bị đang ở công trình khác (`replaceCurrent` không cho lấy, phải tháo ở đó trước). Không bao giờ tự thay
 */
export function bindConflict(code: string | null | undefined): 'replace' | 'elsewhere' | null {
  if (code === 'IOT_PROJECT_ALREADY_BOUND') return 'replace'
  if (code === 'IOT_DEVICE_ALREADY_BOUND') return 'elsewhere'
  return null
}

/** Công trình đã huỷ thì backend không cho gắn (IOT_PROJECT_NOT_BINDABLE) */
export const isBindableProject = (status: string | null | undefined) => status !== 'CANCELLED'

/** `…/device`, `…/readings/latest` trả 404 IOT_BINDING_NOT_FOUND khi công trình không có thiết bị: không phải lỗi, hiện "chưa gắn" */
export const isNoBinding = (code: string | null | undefined) => code === 'IOT_BINDING_NOT_FOUND'

// ---------- Số đo ----------

/** Mã lỗi không nên tự thử lại: lỗi dữ liệu, quyền, không tìm thấy, giới hạn số lần, chức năng chưa bật */
export const isFinalReadError = (status: number | null | undefined) => status != null && status >= 400 && status < 500

/**
 * Nhịp hỏi lại số đo mới nhất: theo chu kỳ gửi của thiết bị (mặc định 10 giây), không nhanh hơn 10 giây để cả trang dưới hạn mức
 * 60 lần đọc / phút. Thiết bị bị khoá hay công trình không có thiết bị thì không hỏi lại
 */
export function latestPollMs(
  connectionStatus: string | null | undefined,
  expectedReportIntervalSeconds: number | null | undefined,
): number | false {
  if (!connectionStatus || connectionStatus === 'DISABLED' || connectionStatus === 'UNASSIGNED') return false
  const seconds = Math.max(10, expectedReportIntervalSeconds ?? 10)
  // Mất kết nối / chưa có số đo: hỏi thưa hơn, chờ thiết bị gửi lại
  return (connectionStatus === 'ONLINE' ? seconds : seconds * 3) * 1000
}

/** Số đo cũ hơn ngưỡng mất kết nối thì không gọi là "hiện tại" dù trạng thái chưa kịp đổi */
export function isStale(receivedAt: string, offlineAfterSeconds: number, now = Date.now()) {
  const at = Date.parse(receivedAt)
  return Number.isNaN(at) || now - at > offlineAfterSeconds * 1000
}

const ampsFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4, signDisplay: 'negative' })

/** "-0,2145 A": giữ dấu như cảm biến đo, không làm tròn mất số lẻ, không đổi dấu */
export const formatAmps = (value: number) => `${ampsFormat.format(value)} A`

/** Một đại lượng của khối `measured`: chưa đo được thì ghi rõ, không bao giờ hiện 0 thay cho null */
export function quantityText(q: IotMeasuredQuantityView | null | undefined): string {
  if (!q || q.status !== 'MEASURED' || q.value === null) return 'Chưa đo được'
  return q.unit === 'A'
    ? formatAmps(q.value)
    : `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(q.value)} ${q.unit}`
}

/** Gộp các trang lịch sử (mới nhất trước) theo `readingId`, không lặp khi tải lại trang đầu sau khi đã "Tải thêm" */
export function mergeHistory(pages: readonly Pick<IotReadingHistoryView, 'items'>[]): IotReadingView[] {
  const seen = new Set<string>()
  const out: IotReadingView[] = []
  for (const page of pages)
    for (const r of page.items) {
      if (seen.has(r.readingId)) continue
      seen.add(r.readingId)
      out.push(r)
    }
  return out
}

/** Điểm của biểu đồ: đúng các số đo backend trả, xếp theo thời gian tăng dần; không thêm điểm cho khoảng thiếu */
export function chartPoints(readings: readonly IotReadingView[]) {
  return [...readings]
    .map((r) => ({
      readingId: r.readingId,
      at: Date.parse(r.receivedAt),
      receivedAt: r.receivedAt,
      currentAmps: r.currentAmps,
    }))
    .filter((p) => !Number.isNaN(p.at))
    .sort((a, b) => a.at - b.at)
}

export type ChartPoint = ReturnType<typeof chartPoints>[number]

// ---------- Khung xem của biểu đồ dòng điện ----------
// Chỉ đổi phần nhìn thấy (khoảng thời gian, khung trục), không đổi số nào: bảng số đo vẫn đủ, số nằm ngoài khung được ghi rõ

export type ChartWindow = '15m' | '1h' | '6h' | '24h' | 'all'

const WINDOW_MS: Record<Exclude<ChartWindow, 'all'>, number> = {
  '15m': 15 * 60_000,
  '1h': 60 * 60_000,
  '6h': 6 * 60 * 60_000,
  '24h': 24 * 60 * 60_000,
}

export const CHART_WINDOWS: readonly { value: ChartWindow; label: string }[] = [
  { value: '15m', label: '15 phút' },
  { value: '1h', label: '1 giờ' },
  { value: '6h', label: '6 giờ' },
  { value: '24h', label: '24 giờ' },
  { value: 'all', label: 'Tất cả' },
]

/** Các điểm trong khoảng xem, tính lùi từ số đo mới nhất (điểm đã xếp tăng dần) */
export function pointsInWindow<T extends { at: number }>(points: readonly T[], window: ChartWindow): T[] {
  if (window === 'all' || points.length === 0) return [...points]
  const end = points[points.length - 1]!.at
  return points.filter((p) => p.at >= end - WINDOW_MS[window])
}

/** Khoảng xem mặc định: khoảng ngắn nhất có đủ `enough` số đo (ít số đo hơn thì phải chứa hết) */
export function defaultWindow(points: readonly { at: number }[], enough = 20): ChartWindow {
  const need = Math.min(enough, points.length)
  for (const w of ['15m', '1h', '6h', '24h'] as const) if (pointsInWindow(points, w).length >= need) return w
  return 'all'
}

const median = (xs: readonly number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}

/**
 * Số đo chênh hẳn các số đo xung quanh (lọc Hampel): lệch khỏi trung vị của 7 số đo liền kề quá 5 lần độ lệch thường và quá
 * `floorAmps`. Cửa sổ dịch vào trong ở hai đầu để số đo mới nhất vẫn so với đủ số đo trước nó. Quá 20% số đo bị đánh dấu thì đó là
 * mức đo thật, không đánh dấu số nào
 */
export function spikeIds(
  points: readonly Pick<ChartPoint, 'readingId' | 'currentAmps'>[],
  { half = 3, k = 5, floorAmps = 2 } = {},
): Set<string> {
  const out = new Set<string>()
  const size = half * 2 + 1
  if (points.length < size) return out
  points.forEach((p, i) => {
    const start = Math.min(Math.max(0, i - half), points.length - size)
    const near = points.slice(start, start + size).map((q) => q.currentAmps)
    const m = median(near)
    const mad = median(near.map((v) => Math.abs(v - m)))
    if (Math.abs(p.currentAmps - m) > Math.max(k * 1.4826 * mad, floorAmps)) out.add(p.readingId)
  })
  return out.size > points.length * 0.2 ? new Set() : out
}

const tidy = (n: number) => Number(n.toFixed(10)) || 0

function niceStep(raw: number) {
  const exp = 10 ** Math.floor(Math.log10(raw))
  const f = raw / exp
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp
}

/**
 * Khung trục dòng điện ôm sát các số đo, đệm 10% rồi làm tròn theo bước đẹp, kèm các mốc chia. Lấy cả mốc 0 khi số đo đổi dấu
 * hoặc 0 nằm gần (cách không quá một lần độ rộng của số đo), để thấy chiều dòng điện; số đo quanh một mức xa 0 thì không kéo về 0
 */
export function ampsAxis(values: readonly number[]): { domain: [number, number]; ticks: number[] } {
  if (values.length === 0) return { domain: [-1, 1], ticks: [-1, -0.5, 0, 0.5, 1] }
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  const span = hi - lo
  if (lo > 0 && lo <= span) lo = 0
  if (hi < 0 && -hi <= span) hi = 0
  if (lo === hi) {
    const d = Math.max(Math.abs(lo) * 0.1, 0.5)
    lo -= d
    hi += d
  } else {
    const pad = (hi - lo) * 0.1
    if (lo !== 0) lo -= pad
    if (hi !== 0) hi += pad
  }
  const step = niceStep((hi - lo) / 4)
  const from = tidy(Math.floor(lo / step) * step)
  const to = tidy(Math.ceil(hi / step) * step)
  const ticks: number[] = []
  for (let i = 0; tidy(from + i * step) <= to; i += 1) ticks.push(tidy(from + i * step))
  return { domain: [from, to], ticks }
}

export type GapPoint = { readingId: string; at: number; receivedAt: null; currentAmps: null }

/** Chèn điểm rỗng giữa hai số đo cách nhau quá `gapMs` để đường biểu đồ ngắt ở chỗ không có số đo, không vẽ nối qua */
export function withGaps(
  points: readonly ChartPoint[],
  gapMs: number,
): { line: (ChartPoint | GapPoint)[]; gaps: number } {
  const line: (ChartPoint | GapPoint)[] = []
  let gaps = 0
  points.forEach((p, i) => {
    const prev = points[i - 1]
    if (prev && p.at - prev.at > gapMs) {
      gaps += 1
      line.push({
        readingId: `gap-${prev.readingId}`,
        at: Math.round((prev.at + p.at) / 2),
        receivedAt: null,
        currentAmps: null,
      })
    }
    line.push(p)
  })
  return { line, gaps }
}

/** Khoảng thiếu để ngắt đường: 5 lần chu kỳ gửi, ít nhất 1 phút; chưa biết chu kỳ thì 5 phút */
export const chartGapMs = (reportIntervalSeconds: number | null | undefined) =>
  reportIntervalSeconds && reportIntervalSeconds > 0 ? Math.max(60, reportIntervalSeconds * 5) * 1000 : 5 * 60_000

/** "2026-11-19" theo giờ Việt Nam → mốc đầu / cuối ngày gửi làm `from` / `to` */
export const vnDayStart = (date: string) => (date ? `${date}T00:00:00+07:00` : undefined)
export const vnDayEnd = (date: string) => (date ? `${date}T23:59:59.999+07:00` : undefined)

/** Khoảng ngày lọc lịch sử: từ ngày không sau đến ngày (backend: IOT_VALIDATION_FAILED `from`) */
export const rangeError = (from: string, to: string) =>
  from && to && from > to ? 'Từ ngày phải trước hoặc bằng đến ngày.' : null

export const HISTORY_LIMIT_MAX = LIMITS.historyLimitMax
