import { toArea, toNumber } from '@/features/pre-surveys/components/assessmentForm'
import type { UpdatePreSurveySurfaceRequest } from '@/types/req/preSurveySurfaceReq'
import type { UpdatePreSurveyRequest } from '@/types/req/preSurveysReq'
import type { PreSurveySurfaceView, SurfaceObstacle } from '@/types/res/preSurveySurfaceRes'

/*
 * Form mặt lắp: hình chữ nhật rộng × dài (mét, đo trên mặt nghiêng), độ dốc, hướng và các vật cản chữ nhật.
 * Quy ước của backend (GetPreSurveySurface.SurfaceConventions): gốc (0, 0) là góc trên-trái = mép cao của mái;
 * X theo chiều rộng, Y xuôi dốc theo chiều dài; (xM, yM) là góc trên-trái của vật cản.
 * Ô nhập giữ dạng chuỗi (khách gõ "1,5"); kéo thả trên hình ghi lại chuỗi đã làm tròn.
 * Số liệu khai của form cũ (tổng diện tích, diện tích dùng được, có vật cản) tự tính từ mặt lắp (người dùng chốt
 * 09/10/2026); khách vẫn sửa được hai ô diện tích.
 */

/** Giới hạn mặc định của backend (SolarSimulationOptions.Limits); cấu hình backend đổi thì sửa ở đây. */
export const SURFACE_LIMITS = { maxSideM: 200, maxObstacles: 50, maxNameLength: 100, maxObstacleHeightM: 100 } as const

/** Bước kéo thả / phím mũi tên trên hình: 0,1 m; giữ Shift: 1 m. */
export const NUDGE_M = 0.1

export type ObstacleForm = {
  /** Khoá ổn định cho React (không gửi backend). */
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
  /** Khách tự khai diện tích thay vì lấy theo mặt lắp. */
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

/** Làm tròn mét về mm (3 chữ số): tránh 1.2000000000000002 sau khi kéo thả. */
export const round3 = (n: number) => Math.round(n * 1000) / 1000

/** Số → chuỗi ô nhập kiểu Việt ("1,5"); bỏ số 0 thừa. */
export function meterText(n: number) {
  return String(round3(n)).replace('.', ',')
}

/** Đọc ô số; rỗng / sai → null. */
export function num(value: string) {
  const n = toNumber(value)
  return n === null || !Number.isFinite(n) ? null : n
}

/** Đọc ô diện tích: "1.200" là một nghìn hai trăm m² (kiểu Việt), không phải 1,2. */
export function areaNum(value: string) {
  const n = toArea(value)
  return n === null || !Number.isFinite(n) ? null : n
}

/* ------------------------------------------------------------------ chuyển đổi server ⇄ form */

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
  // Số khai trên server khác số tính từ mặt lắp → khách đã tự khai lần trước: giữ chế độ tự khai.
  const auto = autoDeclared(form)
  if (view.surfaceDefined && auto && (declaredTotal !== auto.totalAreaM2 || declaredUsable !== auto.usableAreaM2)) form.declaredManual = true
  return form
}

/* ------------------------------------------------------------------ hình học */

/** Vật cản đã đọc được thành số (bỏ ô còn trống hoặc sai). */
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
 * Diện tích hợp của các vật cản trong mặt lắp (m²): cắt theo mép mặt lắp, phần chồng nhau chỉ tính một lần
 * (nén toạ độ, tối đa 50 vật cản nên ≤ 100 × 100 ô).
 */
export function obstacleUnionArea(obstacles: SurfaceObstacle[], widthM: number, lengthM: number) {
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
      if (rects.some((r) => cx > r.x1 && cx < r.x2 && cy > r.y1 && cy < r.y2)) area += (xs[i + 1]! - xs[i]!) * (ys[j + 1]! - ys[j]!)
    }
  }
  return area
}

/** Số liệu khai tính từ mặt lắp: tổng = rộng × dài; dùng được = tổng − phần vật cản. null khi chưa đủ kích thước. */
export function autoDeclared(form: SurfaceForm) {
  const width = num(form.widthM)
  const length = num(form.lengthM)
  if (!width || !length || width <= 0 || length <= 0) return null
  const total = width * length
  const usable = Math.max(0, total - obstacleUnionArea(parsedObstacles(form), width, length))
  return { totalAreaM2: Math.round(total * 100) / 100, usableAreaM2: Math.round(usable * 100) / 100 }
}

/**
 * Vật cản mới 1 × 1 m quanh giữa mặt lắp (nhỏ hơn nếu mặt lắp nhỏ hơn 1 m). Mỗi vật cản thêm sau lệch chéo 1,5 m để
 * không chồng khít lên vật cản trước (bấm "Thêm" ba lần không còn trông như một ô).
 */
export function newObstacle(form: SurfaceForm): ObstacleForm {
  const width = num(form.widthM) ?? 0
  const length = num(form.lengthM) ?? 0
  const w = width > 0 ? Math.min(1, width) : 1
  const l = length > 0 ? Math.min(1, length) : 1
  const shift = (form.obstacles.length % 4) * 1.5
  const place = (side: number, size: number) => (side > size ? Math.min(side - size, Math.max(0, (side - size) / 2 + shift)) : 0)
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

/**
 * Bản sao của vật cản thứ `index` (cùng tên, cỡ, chiều cao) cho mái có nhiều vật cản giống nhau (dãy cục nóng máy lạnh,
 * ống thông gió): đặt ngay bên phải, cách 0,5 m; hết chỗ thì xuống dưới; vẫn hết thì chồng lên chỗ cũ để khách kéo đi.
 */
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

/** Gợi ý ở ô tên vật cản (vẫn gõ tên khác được): những thứ hay gặp trên mái nhà xưởng. */
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

/* ------------------------------------------------------------------ kiểm tra (bám đúng UpdatePreSurveySurfaceCommandValidator) */

export type ObstacleField = 'name' | 'xM' | 'yM' | 'widthM' | 'lengthM' | 'heightM'
/** Khoá lỗi: ô của mặt lắp, hoặc `obstacles.<i>.<field>` cho ô của vật cản. */
export type SurfaceErrors = Record<string, string>

export const obstacleErrorKey = (index: number, field: ObstacleField) => `obstacles.${index}.${field}`

const OBSTACLE_FIELDS: ObstacleField[] = ['name', 'xM', 'yM', 'widthM', 'lengthM', 'heightM']

/**
 * Lỗi của các ô SỐ của vật cản để báo ngay khi gõ (số quá lớn, vật cản to hơn / tràn khỏi mặt lắp), không đợi bấm Tiếp tục
 * (người test 10/10/2026 gõ 1000000 thấy hình "tràn" mà không biết vì sao). Ô đang trống thì chưa báo "Nhập …" để khách xoá đi
 * gõ lại không bị nháy đỏ; tên vật cản vẫn chỉ kiểm khi bấm Tiếp tục.
 */
export function liveObstacleErrors(form: SurfaceForm): SurfaceErrors {
  const live: SurfaceErrors = {}
  for (const [key, message] of Object.entries(validateSurface(form))) {
    const m = /^obstacles\.(\d+)\.(xM|yM|widthM|lengthM|heightM)$/.exec(key)
    if (m && form.obstacles[Number(m[1])]?.[m[2] as ObstacleField].trim()) live[key] = message
  }
  return live
}

/** Vật cản thứ `index` có ô nào đang báo lỗi không (dấu lỗi ở danh sách vật cản). */
export const hasObstacleError = (errors: SurfaceErrors, index: number) => OBSTACLE_FIELDS.some((f) => errors[obstacleErrorKey(index, f)])

function rangeIssue(
  value: string,
  label: string,
  min: number,
  max: number,
  { minExclusive = false, required = true, parse = toNumber }: { minExclusive?: boolean; required?: boolean; parse?: (v: string) => number | null } = {},
) {
  const n = parse(value)
  if (n === null) return required ? `Nhập ${label}.` : null
  if (!Number.isFinite(n)) return `Nhập ${label} bằng số.`
  if (minExclusive ? n <= min : n < min) return minExclusive ? `${cap(label)} phải lớn hơn ${min}.` : `${cap(label)} từ ${min} đến ${fmt(max)}.`
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
  if (form.obstacles.length > SURFACE_LIMITS.maxObstacles) add('obstacles', `Tối đa ${SURFACE_LIMITS.maxObstacles} vật cản.`)

  const width = num(form.widthM)
  const length = num(form.lengthM)
  form.obstacles.forEach((o, i) => {
    const key = (field: ObstacleField) => obstacleErrorKey(i, field)
    if (!o.name.trim()) add(key('name'), 'Đặt tên vật cản.')
    else if (o.name.trim().length > SURFACE_LIMITS.maxNameLength) add(key('name'), `Tên tối đa ${SURFACE_LIMITS.maxNameLength} ký tự.`)
    add(key('xM'), rangeIssue(o.xM, 'vị trí ngang (m)', 0, SURFACE_LIMITS.maxSideM))
    add(key('yM'), rangeIssue(o.yM, 'vị trí dọc (m)', 0, SURFACE_LIMITS.maxSideM))
    add(key('widthM'), rangeIssue(o.widthM, 'bề ngang (m)', 0, SURFACE_LIMITS.maxSideM, { minExclusive: true }))
    add(key('lengthM'), rangeIssue(o.lengthM, 'bề dọc (m)', 0, SURFACE_LIMITS.maxSideM, { minExclusive: true }))
    add(key('heightM'), rangeIssue(o.heightM, 'chiều cao (m)', 0, SURFACE_LIMITS.maxObstacleHeightM, { required: false }))
    // Vật cản phải nằm trọn trong mặt lắp; chạm mép được. To hơn cả mặt lắp thì báo ở ô cỡ (dời vị trí không cứu được, và
    // kéo trên hình theo chiều đó đứng im – người test 10/10/2026 tưởng kéo dọc bị hỏng); còn lại báo ở ô vị trí.
    const x = num(o.xM)
    const y = num(o.yM)
    const w = num(o.widthM)
    const l = num(o.lengthM)
    if (width && w !== null && w > width) add(key('widthM'), `Bề ngang lớn hơn chiều rộng mặt lắp (${meterText(width)} m).`)
    else if (width && x !== null && w !== null && round3(x + w) > width) add(key('xM'), 'Vật cản tràn ra ngoài chiều rộng mặt lắp.')
    if (length && l !== null && l > length) add(key('lengthM'), `Bề dọc lớn hơn chiều dài mặt lắp (${meterText(length)} m).`)
    else if (length && y !== null && l !== null && round3(y + l) > length) add(key('yM'), 'Vật cản tràn ra ngoài chiều dài mặt lắp.')
  })

  // Số khai tự tính phải đạt luật của backend (UsableAreaM2 > 0): vật cản phủ kín mặt lắp thì dùng được = 0 → bị từ chối.
  const auto = autoDeclared(form)
  if (!form.declaredManual && auto && auto.usableAreaM2 <= 0) {
    add('obstacles', 'Vật cản đang phủ kín mặt lắp nên diện tích dùng được bằng 0. Thu nhỏ vật cản hoặc tự khai diện tích.')
  }

  if (form.declaredManual) {
    // Trần 1.000.000 m² (100 ha) chỉ để chặn số vô nghĩa, như form cũ.
    add('totalAreaM2', rangeIssue(form.totalAreaM2, 'tổng diện tích (m²)', 0, 1_000_000, { minExclusive: true, parse: toArea }))
    add('usableAreaM2', rangeIssue(form.usableAreaM2, 'diện tích dùng được (m²)', 0, 1_000_000, { minExclusive: true, parse: toArea }))
    const total = areaNum(form.totalAreaM2)
    const usable = areaNum(form.usableAreaM2)
    if (total !== null && usable !== null && usable > total) add('usableAreaM2', 'Diện tích dùng được không được lớn hơn tổng diện tích.')
  }
  return errors
}

/**
 * Lỗi theo field từ server (FluentValidation, tên PascalCase: "SurfaceWidthM", "Obstacles[0].XM") → khoá của form.
 * Câu của server là tiếng Anh nên chỉ dùng để đánh dấu ô; câu hiển thị là câu chung tiếng Việt.
 */
export function serverSurfaceErrors(fieldErrors: Record<string, string>): SurfaceErrors {
  const errors: SurfaceErrors = {}
  const top: Record<string, string> = {
    SurfaceWidthM: 'widthM',
    SurfaceLengthM: 'lengthM',
    SurfaceTiltDegree: 'tiltDegree',
    SurfaceAzimuthDegree: 'azimuthDegree',
    Obstacles: 'obstacles',
    // Lỗi của form cũ (POST / PUT /api/pre-surveys): số khai báo và độ dốc, hướng dùng chung.
    TotalAreaM2: 'totalAreaM2',
    UsableAreaM2: 'usableAreaM2',
    TiltDegree: 'tiltDegree',
    AzimuthDegree: 'azimuthDegree',
  }
  const fields: Record<string, ObstacleField> = { Name: 'name', XM: 'xM', YM: 'yM', WidthM: 'widthM', LengthM: 'lengthM', HeightM: 'heightM' }
  for (const raw of Object.keys(fieldErrors)) {
    const m = /^Obstacles\[(\d+)\]\.?(\w*)$/.exec(raw)
    if (m) {
      const field = fields[m[2] ?? ''] ?? 'name'
      errors[obstacleErrorKey(Number(m[1]), field)] = 'Kiểm tra lại ô này.'
    } else if (top[raw]) errors[top[raw]] = 'Kiểm tra lại ô này.'
  }
  return errors
}

/* ------------------------------------------------------------------ body gửi backend (đã qua validateSurface) */

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
        // Kẹp sau khi làm tròn: x + w không vượt chiều rộng vì sai số làm tròn.
        xM: Math.min(round3(num(o.xM)!), round3(width - w)),
        yM: Math.min(round3(num(o.yM)!), round3(length - l)),
        widthM: w,
        lengthM: l,
        heightM: height === null ? null : round3(height),
      }
    }),
  }
}

/** Body của form cũ (PUT /api/pre-surveys/{id}): độ dốc và hướng PHẢI trùng mặt lắp, nếu không mọi mô phỏng thành cũ. */
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

/* ------------------------------------------------------------------ so với bản trên server (bỏ qua lần ghi không cần) */

const same = (a: number | null | undefined, b: number | null | undefined) => (a ?? null) === (b ?? null)

/** Mặt lắp trong body khác bản đang lưu trên server (hoặc server chưa có mặt lắp). */
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
    return o.name !== s.name || !same(o.xM, s.xM) || !same(o.yM, s.yM) || !same(o.widthM, s.widthM) || !same(o.lengthM, s.lengthM) || !same(o.heightM, s.heightM)
  })
}

/** Số liệu khai trong body khác bản đang lưu (form cũ ghi cả độ dốc, hướng nên so luôn hai số này). */
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
 * Form mặt lắp có thay đổi chưa lưu lên server không: chưa có bản lưu thì là đã nhập gì đó; có rồi thì khác bản lưu (cả số
 * liệu khai). Dùng để nhắc ở bước mô phỏng / xem lại khi khách quay về sửa rồi đi tiếp bằng nút Forward của trình duyệt.
 */
export function surfaceChanged(form: SurfaceForm, server: PreSurveySurfaceView | undefined) {
  if (!server?.surfaceDefined) return Boolean(form.widthM.trim() || form.lengthM.trim() || form.obstacles.length > 0)
  return surfaceDiffers(server, toSurfaceRequest(form, server.revision)) || declaredDiffers(server, toDeclaredRequest(form))
}
