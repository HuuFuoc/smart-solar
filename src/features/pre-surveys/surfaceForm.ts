import type { UpdatePreSurveySurfaceRequest } from '@/types/req/preSurveySurfaceReq'
import type { UpdatePreSurveyRequest } from '@/types/req/preSurveysReq'
import type { PreSurveySurfaceView, SurfaceObstacle } from '@/types/res/preSurveySurfaceRes'
import {
  capitalize,
  formatNumber,
  parseDecimal,
  parseGroupedNumber,
  readDecimal,
  readGroupedNumber,
  roundTo3Decimals,
  toInputText,
} from '@/utils/number'

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

let keyCounter = 0
/** Key React không trùng cho vật cản mới */
export function newObstacleKey() {
  keyCounter += 1
  return `o${Date.now().toString(36)}${keyCounter.toString(36)}`
}

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

// ---------- Đổi giữa dữ liệu server và form ----------

/** Số từ server thành chữ trong ô nhập (null thành ô trống) */
function inputText(value: number | null | undefined) {
  return value == null ? '' : toInputText(value)
}

export function surfaceToForm(view: PreSurveySurfaceView): SurfaceForm {
  const form: SurfaceForm = {
    widthM: inputText(view.surfaceWidthM),
    lengthM: inputText(view.surfaceLengthM),
    tiltDegree: inputText(view.surfaceTiltDegree),
    azimuthDegree: view.surfaceAzimuthDegree == null ? '' : String(view.surfaceAzimuthDegree),
    obstacles: view.obstacles.map((obstacle) => ({
      key: newObstacleKey(),
      name: obstacle.name,
      xM: toInputText(obstacle.xM),
      yM: toInputText(obstacle.yM),
      widthM: toInputText(obstacle.widthM),
      lengthM: toInputText(obstacle.lengthM),
      heightM: inputText(obstacle.heightM),
    })),
    declaredManual: false,
    totalAreaM2: inputText(view.declared.totalAreaM2),
    usableAreaM2: inputText(view.declared.usableAreaM2),
  }

  // Diện tích trên server khác số tự tính nghĩa là lần trước khách đã tự khai
  const auto = autoDeclared(form)
  if (view.surfaceDefined && auto) {
    const totalChanged = view.declared.totalAreaM2 !== auto.totalAreaM2
    const usableChanged = view.declared.usableAreaM2 !== auto.usableAreaM2
    if (totalChanged || usableChanged) form.declaredManual = true
  }
  return form
}

/**
 * Form mặt lắp lấy từ bản trên server khi mở lại bản nháp.
 * Bản nháp chưa lưu mặt lắp thì giữ form hiện tại, chỉ nạp lại độ dốc và hướng đã gửi lúc tạo bản nháp.
 */
export function surfaceFormFromServer(view: PreSurveySurfaceView, current: SurfaceForm): SurfaceForm {
  if (view.surfaceDefined) return surfaceToForm(view)
  return {
    ...current,
    tiltDegree: view.surfaceTiltDegree == null ? current.tiltDegree : toInputText(view.surfaceTiltDegree),
    azimuthDegree: view.surfaceAzimuthDegree == null ? current.azimuthDegree : String(view.surfaceAzimuthDegree),
  }
}

// ---------- Hình học ----------

/** Các vật cản đã nhập đủ số (bỏ qua vật cản còn ô trống hoặc gõ sai) */
export function parsedObstacles(form: SurfaceForm): SurfaceObstacle[] {
  const result: SurfaceObstacle[] = []
  for (const obstacle of form.obstacles) {
    const xM = readDecimal(obstacle.xM)
    const yM = readDecimal(obstacle.yM)
    const widthM = readDecimal(obstacle.widthM)
    const lengthM = readDecimal(obstacle.lengthM)
    if (xM === null || yM === null || widthM === null || lengthM === null) continue
    if (widthM <= 0 || lengthM <= 0) continue
    result.push({ name: obstacle.name.trim(), xM, yM, widthM, lengthM, heightM: readDecimal(obstacle.heightM) })
  }
  return result
}

/**
 * Tổng diện tích các vật cản nằm trong mặt lắp, phần chồng lên nhau chỉ tính một lần.
 * Cách làm: lấy mọi toạ độ mép của vật cản chia mặt lắp thành lưới ô nhỏ,
 * ô nào có tâm nằm trong ít nhất một vật cản thì cộng diện tích ô đó.
 */
export function obstacleUnionArea(obstacles: SurfaceObstacle[], widthM: number, lengthM: number) {
  // Cắt từng vật cản theo mép mặt lắp, bỏ vật cản nằm hẳn bên ngoài
  const rects = obstacles
    .map((obstacle) => ({
      left: Math.max(0, obstacle.xM),
      top: Math.max(0, obstacle.yM),
      right: Math.min(widthM, obstacle.xM + obstacle.widthM),
      bottom: Math.min(lengthM, obstacle.yM + obstacle.lengthM),
    }))
    .filter((rect) => rect.right > rect.left && rect.bottom > rect.top)
  if (rects.length === 0) return 0

  const xs = uniqueSorted(rects.flatMap((rect) => [rect.left, rect.right]))
  const ys = uniqueSorted(rects.flatMap((rect) => [rect.top, rect.bottom]))
  let area = 0
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const centerX = (xs[i]! + xs[i + 1]!) / 2
      const centerY = (ys[j]! + ys[j + 1]!) / 2
      const covered = rects.some(
        (rect) => centerX > rect.left && centerX < rect.right && centerY > rect.top && centerY < rect.bottom,
      )
      if (covered) area += (xs[i + 1]! - xs[i]!) * (ys[j + 1]! - ys[j]!)
    }
  }
  return area
}

function uniqueSorted(values: number[]) {
  return [...new Set(values)].sort((a, b) => a - b)
}

/** Diện tích tự tính: tổng = rộng x dài, dùng được = tổng - phần vật cản. null khi chưa đủ kích thước */
export function autoDeclared(form: SurfaceForm) {
  const width = readDecimal(form.widthM)
  const length = readDecimal(form.lengthM)
  if (!width || !length || width <= 0 || length <= 0) return null
  const total = width * length
  const usable = Math.max(0, total - obstacleUnionArea(parsedObstacles(form), width, length))
  return { totalAreaM2: roundTo2Decimals(total), usableAreaM2: roundTo2Decimals(usable) }
}

function roundTo2Decimals(value: number) {
  return Math.round(value * 100) / 100
}

/** Bật chế độ tự khai diện tích, ô nào còn trống thì điền sẵn số đang tự tính */
export function withManualArea(form: SurfaceForm): SurfaceForm {
  const auto = autoDeclared(form)
  return {
    ...form,
    declaredManual: true,
    totalAreaM2: form.totalAreaM2 || (auto ? toInputText(auto.totalAreaM2) : ''),
    usableAreaM2: form.usableAreaM2 || (auto ? toInputText(auto.usableAreaM2) : ''),
  }
}

/**
 * Vật cản mới cỡ 1 x 1 m (nhỏ hơn nếu mặt lắp nhỏ hơn 1 m), đặt gần giữa mặt lắp.
 * Mỗi vật cản thêm sau lệch chéo 1,5 m để không chồng khít lên vật cản trước.
 */
export function newObstacle(form: SurfaceForm): ObstacleForm {
  const width = readDecimal(form.widthM) ?? 0
  const length = readDecimal(form.lengthM) ?? 0
  const obstacleWidth = width > 0 ? Math.min(1, width) : 1
  const obstacleLength = length > 0 ? Math.min(1, length) : 1
  const shift = (form.obstacles.length % 4) * 1.5
  return {
    key: newObstacleKey(),
    name: `Vật cản ${form.obstacles.length + 1}`,
    xM: toInputText(positionNearCenter(width, obstacleWidth, shift)),
    yM: toInputText(positionNearCenter(length, obstacleLength, shift)),
    widthM: toInputText(obstacleWidth),
    lengthM: toInputText(obstacleLength),
    heightM: '',
  }
}

/** Vị trí để một vật cản cỡ `size` nằm giữa cạnh dài `side`, lệch thêm `shift` nhưng không tràn ra ngoài */
function positionNearCenter(side: number, size: number, shift: number) {
  if (side <= size) return 0
  const free = side - size
  return Math.min(free, Math.max(0, free / 2 + shift))
}

/** Nhân bản vật cản thứ `index`: đặt ngay bên phải cách 0,5 m, hết chỗ thì xuống dưới, vẫn hết thì để chồng lên */
export function duplicateObstacle(form: SurfaceForm, index: number): ObstacleForm {
  const source = form.obstacles[index]!
  const surfaceWidth = readDecimal(form.widthM) ?? 0
  const surfaceLength = readDecimal(form.lengthM) ?? 0
  const x = readDecimal(source.xM) ?? 0
  const y = readDecimal(source.yM) ?? 0
  const width = readDecimal(source.widthM) ?? 0
  const length = readDecimal(source.lengthM) ?? 0
  const gap = 0.5

  let newX = x
  let newY = y
  if (roundTo3Decimals(x + 2 * width + gap) <= surfaceWidth) newX = x + width + gap
  else if (roundTo3Decimals(y + 2 * length + gap) <= surfaceLength) newY = y + length + gap

  return { ...source, key: newObstacleKey(), xM: toInputText(newX), yM: toInputText(newY) }
}

// ---------- Kiểm tra form (theo UpdatePreSurveySurfaceCommandValidator của backend) ----------

export type ObstacleField = 'name' | 'xM' | 'yM' | 'widthM' | 'lengthM' | 'heightM'

/** Lỗi theo ô: key là tên ô của mặt lắp, hoặc `obstacles.<i>.<field>` cho ô của vật cản thứ i */
export type SurfaceErrors = Record<string, string>

export function obstacleErrorKey(index: number, field: ObstacleField) {
  return `obstacles.${index}.${field}`
}

const OBSTACLE_FIELDS: ObstacleField[] = ['name', 'xM', 'yM', 'widthM', 'lengthM', 'heightM']
const OBSTACLE_NUMBER_FIELDS: ObstacleField[] = ['xM', 'yM', 'widthM', 'lengthM', 'heightM']

/** Vật cản thứ `index` có ô nào đang báo lỗi không */
export function hasObstacleError(errors: SurfaceErrors, index: number) {
  return OBSTACLE_FIELDS.some((field) => errors[obstacleErrorKey(index, field)])
}

/**
 * Lỗi của các ô số của vật cản, hiện ngay khi gõ (không đợi bấm Tiếp tục) để khách biết vì sao hình bị tràn.
 * Ô đang trống thì chưa báo, để khách xoá đi gõ lại không bị nháy đỏ.
 */
export function liveObstacleErrors(form: SurfaceForm): SurfaceErrors {
  const allErrors = validateSurface(form)
  const live: SurfaceErrors = {}
  form.obstacles.forEach((obstacle, index) => {
    for (const field of OBSTACLE_NUMBER_FIELDS) {
      const key = obstacleErrorKey(index, field)
      const message = allErrors[key]
      if (message && obstacle[field].trim()) live[key] = message
    }
  })
  return live
}

type RangeOptions = {
  /** true: phải lớn hơn hẳn `min` (không được bằng) */
  minExclusive?: boolean
  /** false: ô trống là hợp lệ */
  required?: boolean
  /** Cách đọc số, mặc định là parseDecimal */
  parse?: (text: string) => number | null
}

/** Câu lỗi khi số trong ô nằm ngoài khoảng [min, max], hoặc null nếu hợp lệ */
function checkRange(text: string, label: string, min: number, max: number, options: RangeOptions = {}) {
  const { minExclusive = false, required = true, parse = parseDecimal } = options
  const value = parse(text)
  if (value === null) return required ? `Nhập ${label}.` : null
  if (!Number.isFinite(value)) return `Nhập ${label} bằng số.`
  if (minExclusive && value <= min) return `${capitalize(label)} phải lớn hơn ${min}.`
  if (!minExclusive && value < min) return `${capitalize(label)} từ ${min} đến ${formatNumber(max)}.`
  if (value > max) return `${capitalize(label)} tối đa ${formatNumber(max)}.`
  return null
}

export function validateSurface(form: SurfaceForm): SurfaceErrors {
  const errors: SurfaceErrors = {}
  // Mỗi ô chỉ giữ lỗi đầu tiên tìm thấy
  const addError = (key: string, message: string | null) => {
    if (message && !errors[key]) errors[key] = message
  }

  const maxSide = SURFACE_LIMITS.maxSideM
  addError('widthM', checkRange(form.widthM, 'chiều rộng (m)', 0, maxSide, { minExclusive: true }))
  addError('lengthM', checkRange(form.lengthM, 'chiều dài theo dốc (m)', 0, maxSide, { minExclusive: true }))
  addError('tiltDegree', checkRange(form.tiltDegree, 'độ dốc (độ)', 0, 90))
  if (!form.azimuthDegree.trim()) addError('azimuthDegree', 'Chọn hướng mặt mái.')
  if (form.obstacles.length > SURFACE_LIMITS.maxObstacles) {
    addError('obstacles', `Tối đa ${SURFACE_LIMITS.maxObstacles} vật cản.`)
  }

  const surfaceWidth = readDecimal(form.widthM)
  const surfaceLength = readDecimal(form.lengthM)
  form.obstacles.forEach((obstacle, index) => {
    validateObstacle(obstacle, surfaceWidth, surfaceLength, (field, message) =>
      addError(obstacleErrorKey(index, field), message),
    )
  })

  // Backend yêu cầu diện tích dùng được > 0, vật cản phủ kín mặt lắp thì bị từ chối
  const auto = autoDeclared(form)
  if (!form.declaredManual && auto && auto.usableAreaM2 <= 0) {
    addError(
      'obstacles',
      'Vật cản đang phủ kín mặt lắp nên diện tích dùng được bằng 0. Thu nhỏ vật cản hoặc tự khai diện tích.',
    )
  }

  if (form.declaredManual) validateManualArea(form, addError)
  return errors
}

function validateObstacle(
  obstacle: ObstacleForm,
  surfaceWidth: number | null,
  surfaceLength: number | null,
  addError: (field: ObstacleField, message: string | null) => void,
) {
  const maxSide = SURFACE_LIMITS.maxSideM
  const name = obstacle.name.trim()
  if (!name) addError('name', 'Đặt tên vật cản.')
  else if (name.length > SURFACE_LIMITS.maxNameLength) {
    addError('name', `Tên tối đa ${SURFACE_LIMITS.maxNameLength} ký tự.`)
  }
  addError('xM', checkRange(obstacle.xM, 'vị trí ngang (m)', 0, maxSide))
  addError('yM', checkRange(obstacle.yM, 'vị trí dọc (m)', 0, maxSide))
  addError('widthM', checkRange(obstacle.widthM, 'bề ngang (m)', 0, maxSide, { minExclusive: true }))
  addError('lengthM', checkRange(obstacle.lengthM, 'bề dọc (m)', 0, maxSide, { minExclusive: true }))
  addError(
    'heightM',
    checkRange(obstacle.heightM, 'chiều cao (m)', 0, SURFACE_LIMITS.maxObstacleHeightM, { required: false }),
  )

  // Vật cản phải nằm trọn trong mặt lắp (chạm mép thì được).
  // To hơn cả mặt lắp thì báo ở ô kích thước (dời vị trí cũng không sửa được), còn lại báo ở ô vị trí.
  const x = readDecimal(obstacle.xM)
  const y = readDecimal(obstacle.yM)
  const width = readDecimal(obstacle.widthM)
  const length = readDecimal(obstacle.lengthM)
  if (surfaceWidth && width !== null) {
    if (width > surfaceWidth) {
      addError('widthM', `Bề ngang lớn hơn chiều rộng mặt lắp (${toInputText(surfaceWidth)} m).`)
    } else if (x !== null && roundTo3Decimals(x + width) > surfaceWidth) {
      addError('xM', 'Vật cản tràn ra ngoài chiều rộng mặt lắp.')
    }
  }
  if (surfaceLength && length !== null) {
    if (length > surfaceLength) {
      addError('lengthM', `Bề dọc lớn hơn chiều dài mặt lắp (${toInputText(surfaceLength)} m).`)
    } else if (y !== null && roundTo3Decimals(y + length) > surfaceLength) {
      addError('yM', 'Vật cản tràn ra ngoài chiều dài mặt lắp.')
    }
  }
}

function validateManualArea(form: SurfaceForm, addError: (key: string, message: string | null) => void) {
  // Trần 1.000.000 m² chỉ để chặn số vô lý
  const maxArea = 1_000_000
  const options = { minExclusive: true, parse: parseGroupedNumber }
  addError('totalAreaM2', checkRange(form.totalAreaM2, 'tổng diện tích (m²)', 0, maxArea, options))
  addError('usableAreaM2', checkRange(form.usableAreaM2, 'diện tích dùng được (m²)', 0, maxArea, options))
  const total = readGroupedNumber(form.totalAreaM2)
  const usable = readGroupedNumber(form.usableAreaM2)
  if (total !== null && usable !== null && usable > total) {
    addError('usableAreaM2', 'Diện tích dùng được không được lớn hơn tổng diện tích.')
  }
}

// Tên field lỗi của backend (PascalCase) đổi sang key của form
const SERVER_SURFACE_FIELDS: Record<string, string> = {
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

const SERVER_OBSTACLE_FIELDS: Record<string, ObstacleField> = {
  Name: 'name',
  XM: 'xM',
  YM: 'yM',
  WidthM: 'widthM',
  LengthM: 'lengthM',
  HeightM: 'heightM',
}

/**
 * Lỗi theo field từ server, ví dụ "SurfaceWidthM" hoặc "Obstacles[0].XM".
 * Câu lỗi của server là tiếng Anh nên chỉ dùng để đánh dấu ô, câu hiển thị là câu chung tiếng Việt.
 */
export function serverSurfaceErrors(fieldErrors: Record<string, string>): SurfaceErrors {
  const errors: SurfaceErrors = {}
  for (const serverField of Object.keys(fieldErrors)) {
    const obstacleMatch = /^Obstacles\[(\d+)\]\.?(\w*)$/.exec(serverField)
    if (obstacleMatch) {
      const index = Number(obstacleMatch[1])
      const field = SERVER_OBSTACLE_FIELDS[obstacleMatch[2] ?? ''] ?? 'name'
      errors[obstacleErrorKey(index, field)] = 'Kiểm tra lại ô này.'
      continue
    }
    const formField = SERVER_SURFACE_FIELDS[serverField]
    if (formField) errors[formField] = 'Kiểm tra lại ô này.'
  }
  return errors
}

// ---------- Body gửi backend (form đã qua validateSurface) ----------

export function toSurfaceRequest(form: SurfaceForm, expectedRevision: number): UpdatePreSurveySurfaceRequest {
  const surfaceWidth = readDecimal(form.widthM)!
  const surfaceLength = readDecimal(form.lengthM)!
  return {
    expectedRevision,
    surfaceWidthM: roundTo3Decimals(surfaceWidth),
    surfaceLengthM: roundTo3Decimals(surfaceLength),
    surfaceTiltDegree: roundTo3Decimals(readDecimal(form.tiltDegree)!),
    surfaceAzimuthDegree: readDecimal(form.azimuthDegree)!,
    obstacles: form.obstacles.map((obstacle) => {
      const width = roundTo3Decimals(readDecimal(obstacle.widthM)!)
      const length = roundTo3Decimals(readDecimal(obstacle.lengthM)!)
      const height = readDecimal(obstacle.heightM)
      return {
        name: obstacle.name.trim(),
        // Kẹp lại sau khi làm tròn, để x + bề ngang không vượt quá chiều rộng mặt lắp
        xM: Math.min(roundTo3Decimals(readDecimal(obstacle.xM)!), roundTo3Decimals(surfaceWidth - width)),
        yM: Math.min(roundTo3Decimals(readDecimal(obstacle.yM)!), roundTo3Decimals(surfaceLength - length)),
        widthM: width,
        lengthM: length,
        heightM: height === null ? null : roundTo3Decimals(height),
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
  let totalAreaM2 = auto?.totalAreaM2 ?? null
  let usableAreaM2 = auto?.usableAreaM2 ?? null
  if (form.declaredManual) {
    totalAreaM2 = readGroupedNumber(form.totalAreaM2)
    usableAreaM2 = readGroupedNumber(form.usableAreaM2)
  }
  return {
    totalAreaM2,
    usableAreaM2,
    tiltDegree: roundTo3Decimals(readDecimal(form.tiltDegree)!),
    azimuthDegree: readDecimal(form.azimuthDegree)!,
    hasObstruction: form.obstacles.length > 0,
  }
}

// ---------- So với bản trên server (để bỏ qua lần ghi không cần thiết) ----------

function sameNumber(a: number | null | undefined, b: number | null | undefined) {
  return (a ?? null) === (b ?? null)
}

/** Mặt lắp trong body có khác bản trên server không (server chưa có mặt lắp thì coi là khác) */
export function surfaceDiffers(server: PreSurveySurfaceView, body: UpdatePreSurveySurfaceRequest) {
  if (!server.surfaceDefined) return true
  const sizeChanged =
    !sameNumber(server.surfaceWidthM, body.surfaceWidthM) ||
    !sameNumber(server.surfaceLengthM, body.surfaceLengthM) ||
    !sameNumber(server.surfaceTiltDegree, body.surfaceTiltDegree) ||
    !sameNumber(server.surfaceAzimuthDegree, body.surfaceAzimuthDegree)
  if (sizeChanged) return true

  const obstacles = body.obstacles ?? []
  if (obstacles.length !== server.obstacles.length) return true
  return obstacles.some((obstacle, index) => {
    const saved = server.obstacles[index]!
    return (
      obstacle.name !== saved.name ||
      !sameNumber(obstacle.xM, saved.xM) ||
      !sameNumber(obstacle.yM, saved.yM) ||
      !sameNumber(obstacle.widthM, saved.widthM) ||
      !sameNumber(obstacle.lengthM, saved.lengthM) ||
      !sameNumber(obstacle.heightM, saved.heightM)
    )
  })
}

/** Số liệu khai trong body có khác bản trên server không (so cả độ dốc, hướng vì API này cũng ghi 2 giá trị đó) */
export function declaredDiffers(server: PreSurveySurfaceView, body: UpdatePreSurveyRequest) {
  return (
    !sameNumber(server.declared.totalAreaM2, body.totalAreaM2) ||
    !sameNumber(server.declared.usableAreaM2, body.usableAreaM2) ||
    (server.declared.hasObstruction ?? null) !== (body.hasObstruction ?? null) ||
    !sameNumber(server.surfaceTiltDegree, body.tiltDegree) ||
    !sameNumber(server.surfaceAzimuthDegree, body.azimuthDegree)
  )
}

/**
 * Form mặt lắp có thay đổi chưa lưu lên server không.
 * Server chưa có mặt lắp: khách đã nhập gì đó là có thay đổi.
 */
export function surfaceChanged(form: SurfaceForm, server: PreSurveySurfaceView | undefined) {
  if (!server?.surfaceDefined) {
    return Boolean(form.widthM.trim() || form.lengthM.trim() || form.obstacles.length > 0)
  }
  const surfaceBody = toSurfaceRequest(form, server.revision)
  const declaredBody = toDeclaredRequest(form)
  return surfaceDiffers(server, surfaceBody) || declaredDiffers(server, declaredBody)
}
