import { toArea, toNumber } from '@/features/pre-surveys/assessmentForm'
import type { UpdatePreSurveySurfaceRequest } from '@/types/req/preSurveySurfaceReq'
import type { UpdatePreSurveyRequest } from '@/types/req/preSurveysReq'
import type { PreSurveySurfaceView, SurfaceObstacle } from '@/types/res/preSurveySurfaceRes'

// Form mặt lắp: một hình chữ nhật rộng x dài (mét) cùng các vật cản hình chữ nhật trên đó.
// Gốc (0, 0) là góc trên-trái (mép cao của mái), X theo chiều rộng, Y xuôi theo dốc.
// Ô nhập giữ dạng chuỗi (khách gõ "1,5"), chỉ đổi sang số khi tính toán hoặc gửi backend.

/** Giới hạn lấy theo SolarSimulationOptions.Limits của backend */
export const SURFACE_LIMITS = { maxSideM: 200, maxObstacles: 50, maxNameLength: 100, maxObstacleHeightM: 100 } as const

/** Bước dịch vật cản bằng phím mũi tên (giữ Shift thì 1 m) */
export const NUDGE_M = 0.1

export type ObstacleForm = {
  /** Chỉ dùng làm key React, không gửi backend */
  key: string
  name: string
  xM: string
  yM: string
  widthM: string
  lengthM: string
  heightM: string
}

export type SurfaceForm = {
  widthM: string
  lengthM: string
  tiltDegree: string
  azimuthDegree: string
  obstacles: ObstacleForm[]
  /** true: khách tự khai diện tích, false: diện tích tự tính từ mặt lắp */
  declaredManual: boolean
  totalAreaM2: string
  usableAreaM2: string
}

export const EMPTY_SURFACE_FORM: SurfaceForm = {
  widthM: '',
  lengthM: '',
  tiltDegree: '',
  azimuthDegree: '',
  obstacles: [],
  declaredManual: false,
  totalAreaM2: '',
  usableAreaM2: '',
}

let keySeed = 0
export const newObstacleKey = () => `o${Date.now().toString(36)}${(keySeed++).toString(36)}`

/** Làm tròn 3 chữ số thập phân (tới mm), tránh lỗi số thực như 1.2000000000000002 */
export const round3 = (n: number) => Math.round(n * 1000) / 1000

/** Số thành chữ để đặt vào ô nhập: 1.5 thành "1,5" */
export function meterText(n: number) {
  return String(round3(n)).replace('.', ',')
}

/** Đọc ô số, ô trống hoặc gõ sai thì trả null */
export function num(value: string) {
  const n = toNumber(value)
  return n === null || !Number.isFinite(n) ? null : n
}

/** Đọc ô diện tích, "1.200" là 1200 */
export function areaNum(value: string) {
  const n = toArea(value)
  return n === null || !Number.isFinite(n) ? null : n
}

export function surfaceToForm(view: PreSurveySurfaceView): SurfaceForm {
  const declaredTotal = view.declared.totalAreaM2
  const declaredUsable = view.declared.usableAreaM2
  const form: SurfaceForm = {
    widthM: view.surfaceWidthM == null ? '' : meterText(view.surfaceWidthM),
    lengthM: view.surfaceLengthM == null ? '' : meterText(view.surfaceLengthM),
    tiltDegree: view.surfaceTiltDegree == null ? '' : meterText(view.surfaceTiltDegree),
    azimuthDegree: view.surfaceAzimuthDegree == null ? '' : String(view.surfaceAzimuthDegree),
    obstacles: view.obstacles.map((o) => ({
      key: newObstacleKey(),
      name: o.name,
      xM: meterText(o.xM),
      yM: meterText(o.yM),
      widthM: meterText(o.widthM),
      lengthM: meterText(o.lengthM),
      heightM: o.heightM == null ? '' : meterText(o.heightM),
    })),
    declaredManual: false,
    totalAreaM2: declaredTotal == null ? '' : meterText(declaredTotal),
    usableAreaM2: declaredUsable == null ? '' : meterText(declaredUsable),
  }

  // Diện tích trên server khác số tự tính nghĩa là lần trước khách đã tự khai
  const auto = autoDeclared(form)
  if (view.surfaceDefined && auto && (declaredTotal !== auto.totalAreaM2 || declaredUsable !== auto.usableAreaM2))
    form.declaredManual = true
  return form
}

// Hình học

/** Các vật cản đã nhập đủ số (bỏ qua vật cản còn ô trống hoặc gõ sai) */
export function parsedObstacles(form: SurfaceForm): SurfaceObstacle[] {
  return form.obstacles.flatMap((o) => {
    const xM = num(o.xM)
    const yM = num(o.yM)
    const widthM = num(o.widthM)
    const lengthM = num(o.lengthM)
    if (xM === null || yM === null || widthM === null || lengthM === null || widthM <= 0 || lengthM <= 0) return []
    return [{ name: o.name.trim(), xM, yM, widthM, lengthM, heightM: num(o.heightM) }]
  })
}

/**
 * Tổng diện tích các vật cản nằm trong mặt lắp, phần chồng lên nhau chỉ tính một lần.
 * Cách làm: lấy mọi toạ độ mép của vật cản chia mặt lắp thành lưới ô nhỏ,
 * ô nào có tâm nằm trong ít nhất một vật cản thì cộng diện tích ô đó.
 */
export function obstacleUnionArea(obstacles: SurfaceObstacle[], widthM: number, lengthM: number) {
  // Cắt từng vật cản theo mép mặt lắp, bỏ vật cản nằm hẳn bên ngoài
  const rects = obstacles
    .map((o) => ({
      x1: Math.max(0, o.xM),
      y1: Math.max(0, o.yM),
      x2: Math.min(widthM, o.xM + o.widthM),
      y2: Math.min(lengthM, o.yM + o.lengthM),
    }))
    .filter((r) => r.x2 > r.x1 && r.y2 > r.y1)
  if (rects.length === 0) return 0
  const xs = [...new Set(rects.flatMap((r) => [r.x1, r.x2]))].sort((a, b) => a - b)
  const ys = [...new Set(rects.flatMap((r) => [r.y1, r.y2]))].sort((a, b) => a - b)
  let area = 0
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const cx = (xs[i]! + xs[i + 1]!) / 2
      const cy = (ys[j]! + ys[j + 1]!) / 2
      if (rects.some((r) => cx > r.x1 && cx < r.x2 && cy > r.y1 && cy < r.y2))
        area += (xs[i + 1]! - xs[i]!) * (ys[j + 1]! - ys[j]!)
    }
  }
  return area
}

/** Diện tích tự tính: tổng = rộng x dài, dùng được = tổng - phần vật cản. null khi chưa đủ kích thước */
export function autoDeclared(form: SurfaceForm) {
  const width = num(form.widthM)
  const length = num(form.lengthM)
  if (!width || !length || width <= 0 || length <= 0) return null
  const total = width * length
  const usable = Math.max(0, total - obstacleUnionArea(parsedObstacles(form), width, length))
  return { totalAreaM2: Math.round(total * 100) / 100, usableAreaM2: Math.round(usable * 100) / 100 }
}

/**
 * Vật cản mới cỡ 1 x 1 m (nhỏ hơn nếu mặt lắp nhỏ hơn 1 m), đặt gần giữa mặt lắp.
 * Mỗi vật cản thêm sau lệch chéo 1,5 m để không chồng khít lên vật cản trước.
 */
export function newObstacle(form: SurfaceForm): ObstacleForm {
  const width = num(form.widthM) ?? 0
  const length = num(form.lengthM) ?? 0
  const w = width > 0 ? Math.min(1, width) : 1
  const l = length > 0 ? Math.min(1, length) : 1
  const shift = (form.obstacles.length % 4) * 1.5
  const place = (side: number, size: number) =>
    side > size ? Math.min(side - size, Math.max(0, (side - size) / 2 + shift)) : 0
  return {
    key: newObstacleKey(),
    name: `Vật cản ${form.obstacles.length + 1}`,
    xM: meterText(place(width, w)),
    yM: meterText(place(length, l)),
    widthM: meterText(w),
    lengthM: meterText(l),
    heightM: '',
  }
}

/** Nhân bản vật cản thứ `index`: đặt ngay bên phải cách 0,5 m, hết chỗ thì xuống dưới, vẫn hết thì để chồng lên */
export function duplicateObstacle(form: SurfaceForm, index: number): ObstacleForm {
  const o = form.obstacles[index]!
  const width = num(form.widthM) ?? 0
  const length = num(form.lengthM) ?? 0
  const x = num(o.xM) ?? 0
  const y = num(o.yM) ?? 0
  const w = num(o.widthM) ?? 0
  const l = num(o.lengthM) ?? 0
  const gap = 0.5
  let nx = x
  let ny = y
  if (round3(x + 2 * w + gap) <= width) nx = x + w + gap
  else if (round3(y + 2 * l + gap) <= length) ny = y + l + gap
  return { ...o, key: newObstacleKey(), xM: meterText(nx), yM: meterText(ny) }
}

/** Gợi ý tên vật cản hay gặp trên mái, vẫn gõ tên khác được */
export const OBSTACLE_NAME_SUGGESTIONS = [
  'Bồn nước',
  'Cục nóng máy lạnh',
  'Ống thông gió',
  'Quạt hút mái',
  'Cửa mái lấy sáng',
  'Giếng trời',
  'Ống khói',
  'Cột thu lôi',
  'Lối đi kỹ thuật',
  'Máng xối',
]

// Kiểm tra form (theo UpdatePreSurveySurfaceCommandValidator của backend)

export type ObstacleField = 'name' | 'xM' | 'yM' | 'widthM' | 'lengthM' | 'heightM'

/** Lỗi theo ô: key là tên ô của mặt lắp, hoặc `obstacles.<i>.<field>` cho ô của vật cản thứ i */
export type SurfaceErrors = Record<string, string>

export const obstacleErrorKey = (index: number, field: ObstacleField) => `obstacles.${index}.${field}`

const OBSTACLE_FIELDS: ObstacleField[] = ['name', 'xM', 'yM', 'widthM', 'lengthM', 'heightM']

/**
 * Lỗi của các ô số của vật cản, hiện ngay khi gõ (không đợi bấm Tiếp tục) để khách biết vì sao hình bị tràn.
 * Ô đang trống thì chưa báo, để khách xoá đi gõ lại không bị nháy đỏ.
 */
export function liveObstacleErrors(form: SurfaceForm): SurfaceErrors {
  const live: SurfaceErrors = {}
  for (const [key, message] of Object.entries(validateSurface(form))) {
    const m = /^obstacles\.(\d+)\.(xM|yM|widthM|lengthM|heightM)$/.exec(key)
    if (m && form.obstacles[Number(m[1])]?.[m[2] as ObstacleField].trim()) live[key] = message
  }
  return live
}

/** Vật cản thứ `index` có ô nào đang báo lỗi không */
export const hasObstacleError = (errors: SurfaceErrors, index: number) =>
  OBSTACLE_FIELDS.some((f) => errors[obstacleErrorKey(index, f)])

function rangeIssue(
  value: string,
  label: string,
  min: number,
  max: number,
  {
    minExclusive = false,
    required = true,
    parse = toNumber,
  }: { minExclusive?: boolean; required?: boolean; parse?: (v: string) => number | null } = {},
) {
  const n = parse(value)
  if (n === null) return required ? `Nhập ${label}.` : null
  if (!Number.isFinite(n)) return `Nhập ${label} bằng số.`
  if (minExclusive ? n <= min : n < min)
    return minExclusive ? `${cap(label)} phải lớn hơn ${min}.` : `${cap(label)} từ ${min} đến ${fmt(max)}.`
  if (n > max) return `${cap(label)} tối đa ${fmt(max)}.`
  return null
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n)

export function validateSurface(form: SurfaceForm): SurfaceErrors {
  const errors: SurfaceErrors = {}
  const add = (key: string, message: string | null) => {
    if (message && !errors[key]) errors[key] = message
  }
  add('widthM', rangeIssue(form.widthM, 'chiều rộng (m)', 0, SURFACE_LIMITS.maxSideM, { minExclusive: true }))
  add('lengthM', rangeIssue(form.lengthM, 'chiều dài theo dốc (m)', 0, SURFACE_LIMITS.maxSideM, { minExclusive: true }))
  add('tiltDegree', rangeIssue(form.tiltDegree, 'độ dốc (độ)', 0, 90))
  if (!form.azimuthDegree.trim()) add('azimuthDegree', 'Chọn hướng mặt mái.')
  if (form.obstacles.length > SURFACE_LIMITS.maxObstacles)
    add('obstacles', `Tối đa ${SURFACE_LIMITS.maxObstacles} vật cản.`)

  const width = num(form.widthM)
  const length = num(form.lengthM)
  form.obstacles.forEach((o, i) => {
    const key = (field: ObstacleField) => obstacleErrorKey(i, field)
    if (!o.name.trim()) add(key('name'), 'Đặt tên vật cản.')
    else if (o.name.trim().length > SURFACE_LIMITS.maxNameLength)
      add(key('name'), `Tên tối đa ${SURFACE_LIMITS.maxNameLength} ký tự.`)
    add(key('xM'), rangeIssue(o.xM, 'vị trí ngang (m)', 0, SURFACE_LIMITS.maxSideM))
    add(key('yM'), rangeIssue(o.yM, 'vị trí dọc (m)', 0, SURFACE_LIMITS.maxSideM))
    add(key('widthM'), rangeIssue(o.widthM, 'bề ngang (m)', 0, SURFACE_LIMITS.maxSideM, { minExclusive: true }))
    add(key('lengthM'), rangeIssue(o.lengthM, 'bề dọc (m)', 0, SURFACE_LIMITS.maxSideM, { minExclusive: true }))
    add(
      key('heightM'),
      rangeIssue(o.heightM, 'chiều cao (m)', 0, SURFACE_LIMITS.maxObstacleHeightM, { required: false }),
    )
    // Vật cản phải nằm trọn trong mặt lắp (chạm mép thì được).
    // To hơn cả mặt lắp thì báo ở ô kích thước (dời vị trí cũng không sửa được), còn lại báo ở ô vị trí.
    const x = num(o.xM)
    const y = num(o.yM)
    const w = num(o.widthM)
    const l = num(o.lengthM)
    if (width && w !== null && w > width)
      add(key('widthM'), `Bề ngang lớn hơn chiều rộng mặt lắp (${meterText(width)} m).`)
    else if (width && x !== null && w !== null && round3(x + w) > width)
      add(key('xM'), 'Vật cản tràn ra ngoài chiều rộng mặt lắp.')
    if (length && l !== null && l > length)
      add(key('lengthM'), `Bề dọc lớn hơn chiều dài mặt lắp (${meterText(length)} m).`)
    else if (length && y !== null && l !== null && round3(y + l) > length)
      add(key('yM'), 'Vật cản tràn ra ngoài chiều dài mặt lắp.')
  })

  // Backend yêu cầu diện tích dùng được > 0, vật cản phủ kín mặt lắp thì bị từ chối
  const auto = autoDeclared(form)
  if (!form.declaredManual && auto && auto.usableAreaM2 <= 0) {
    add(
      'obstacles',
      'Vật cản đang phủ kín mặt lắp nên diện tích dùng được bằng 0. Thu nhỏ vật cản hoặc tự khai diện tích.',
    )
  }

  if (form.declaredManual) {
    // Trần 1.000.000 m² chỉ để chặn số vô lý
    add(
      'totalAreaM2',
      rangeIssue(form.totalAreaM2, 'tổng diện tích (m²)', 0, 1_000_000, { minExclusive: true, parse: toArea }),
    )
    add(
      'usableAreaM2',
      rangeIssue(form.usableAreaM2, 'diện tích dùng được (m²)', 0, 1_000_000, { minExclusive: true, parse: toArea }),
    )
    const total = areaNum(form.totalAreaM2)
    const usable = areaNum(form.usableAreaM2)
    if (total !== null && usable !== null && usable > total)
      add('usableAreaM2', 'Diện tích dùng được không được lớn hơn tổng diện tích.')
  }
  return errors
}

/**
 * Lỗi theo field từ server, ví dụ "SurfaceWidthM" hoặc "Obstacles[0].XM".
 * Câu lỗi của server là tiếng Anh nên chỉ dùng để đánh dấu ô, câu hiển thị là câu chung tiếng Việt.
 */
export function serverSurfaceErrors(fieldErrors: Record<string, string>): SurfaceErrors {
  const errors: SurfaceErrors = {}
  const top: Record<string, string> = {
    SurfaceWidthM: 'widthM',
    SurfaceLengthM: 'lengthM',
    SurfaceTiltDegree: 'tiltDegree',
    SurfaceAzimuthDegree: 'azimuthDegree',
    Obstacles: 'obstacles',
    // Lỗi từ API số liệu khai (PUT /api/pre-surveys/{id})
    TotalAreaM2: 'totalAreaM2',
    UsableAreaM2: 'usableAreaM2',
    TiltDegree: 'tiltDegree',
    AzimuthDegree: 'azimuthDegree',
  }
  const fields: Record<string, ObstacleField> = {
    Name: 'name',
    XM: 'xM',
    YM: 'yM',
    WidthM: 'widthM',
    LengthM: 'lengthM',
    HeightM: 'heightM',
  }
  for (const raw of Object.keys(fieldErrors)) {
    const m = /^Obstacles\[(\d+)\]\.?(\w*)$/.exec(raw)
    if (m) {
      const field = fields[m[2] ?? ''] ?? 'name'
      errors[obstacleErrorKey(Number(m[1]), field)] = 'Kiểm tra lại ô này.'
    } else if (top[raw]) errors[top[raw]] = 'Kiểm tra lại ô này.'
  }
  return errors
}

// Body gửi backend (form đã qua validateSurface)

export function toSurfaceRequest(form: SurfaceForm, expectedRevision: number): UpdatePreSurveySurfaceRequest {
  const width = num(form.widthM)!
  const length = num(form.lengthM)!
  return {
    expectedRevision,
    surfaceWidthM: round3(width),
    surfaceLengthM: round3(length),
    surfaceTiltDegree: round3(num(form.tiltDegree)!),
    surfaceAzimuthDegree: num(form.azimuthDegree)!,
    obstacles: form.obstacles.map((o) => {
      const w = round3(num(o.widthM)!)
      const l = round3(num(o.lengthM)!)
      const height = num(o.heightM)
      return {
        name: o.name.trim(),
        // Kẹp lại sau khi làm tròn, để x + bề ngang không vượt quá chiều rộng mặt lắp
        xM: Math.min(round3(num(o.xM)!), round3(width - w)),
        yM: Math.min(round3(num(o.yM)!), round3(length - l)),
        widthM: w,
        lengthM: l,
        heightM: height === null ? null : round3(height),
      }
    }),
  }
}

/**
 * Body của PUT /api/pre-surveys/{id} (số liệu khai).
 * Độ dốc và hướng PHẢI trùng với mặt lắp, nếu không mọi mô phỏng bị đánh dấu cũ.
 */
export function toDeclaredRequest(form: SurfaceForm): UpdatePreSurveyRequest {
  const auto = autoDeclared(form)
  return {
    totalAreaM2: form.declaredManual ? areaNum(form.totalAreaM2) : (auto?.totalAreaM2 ?? null),
    usableAreaM2: form.declaredManual ? areaNum(form.usableAreaM2) : (auto?.usableAreaM2 ?? null),
    tiltDegree: round3(num(form.tiltDegree)!),
    azimuthDegree: num(form.azimuthDegree)!,
    hasObstruction: form.obstacles.length > 0,
  }
}

// So với bản trên server để bỏ qua lần ghi không cần thiết

const same = (a: number | null | undefined, b: number | null | undefined) => (a ?? null) === (b ?? null)

/** Mặt lắp trong body có khác bản trên server không (server chưa có mặt lắp thì coi là khác) */
export function surfaceDiffers(server: PreSurveySurfaceView, body: UpdatePreSurveySurfaceRequest) {
  if (!server.surfaceDefined) return true
  if (
    !same(server.surfaceWidthM, body.surfaceWidthM) ||
    !same(server.surfaceLengthM, body.surfaceLengthM) ||
    !same(server.surfaceTiltDegree, body.surfaceTiltDegree) ||
    !same(server.surfaceAzimuthDegree, body.surfaceAzimuthDegree)
  )
    return true
  const next = body.obstacles ?? []
  if (next.length !== server.obstacles.length) return true
  return next.some((o, i) => {
    const s = server.obstacles[i]!
    return (
      o.name !== s.name ||
      !same(o.xM, s.xM) ||
      !same(o.yM, s.yM) ||
      !same(o.widthM, s.widthM) ||
      !same(o.lengthM, s.lengthM) ||
      !same(o.heightM, s.heightM)
    )
  })
}

/** Số liệu khai trong body có khác bản trên server không (so cả độ dốc, hướng vì API này cũng ghi 2 giá trị đó) */
export function declaredDiffers(server: PreSurveySurfaceView, body: UpdatePreSurveyRequest) {
  return (
    !same(server.declared.totalAreaM2, body.totalAreaM2) ||
    !same(server.declared.usableAreaM2, body.usableAreaM2) ||
    (server.declared.hasObstruction ?? null) !== (body.hasObstruction ?? null) ||
    !same(server.surfaceTiltDegree, body.tiltDegree) ||
    !same(server.surfaceAzimuthDegree, body.azimuthDegree)
  )
}

/**
 * Form mặt lắp có thay đổi chưa lưu lên server không.
 * Server chưa có mặt lắp: khách đã nhập gì đó là có thay đổi.
 */
export function surfaceChanged(form: SurfaceForm, server: PreSurveySurfaceView | undefined) {
  if (!server?.surfaceDefined) return Boolean(form.widthM.trim() || form.lengthM.trim() || form.obstacles.length > 0)
  return (
    surfaceDiffers(server, toSurfaceRequest(form, server.revision)) || declaredDiffers(server, toDeclaredRequest(form))
  )
}
