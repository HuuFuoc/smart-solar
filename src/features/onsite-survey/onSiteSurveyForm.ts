import { ONSITE_SURVEY_LIMITS as LIMITS } from '@/common/onsiteSurvey'
import type { OnSiteSurveyRequest } from '@/types/req/technicianOnSiteSurveyReq'
import type { OnSiteSurveyView } from '@/types/res/technicianOnSiteSurveyRes'
import {
  BOM_ERROR_KEY,
  bomErrors,
  bomRequest,
  rowsFromItems,
  type BomRow,
} from '@/features/onsite-survey/billOfMaterials'
import { parseDecimal, toInputText } from '@/utils/number'

// Form biên bản khảo sát tại công trình. Luật kiểm tra bám OnSiteSurveyHandlers.Validate của backend:
// lưu nháp chỉ kiểm tra khoảng giá trị, hoàn thành thì thêm các ô bắt buộc

export type ObstacleRow = { key: string; kind: string; description: string; heightM: string; areaM2: string }

export type OnSiteSurveyForm = {
  roofType: string
  roofMaterial: string
  roofLengthM: string
  roofWidthM: string
  usableAreaM2: string
  tiltDegree: string
  azimuthDegree: string
  roofCondition: string
  installationFeasibility: string
  electricalCabinetNotes: string
  electricalConnectionNotes: string
  proposedInverterLocation: string
  proposedPanelLayoutNotes: string
  notes: string
  measuredLatitude: number | null
  measuredLongitude: number | null
  obstacles: ObstacleRow[]
  materials: BomRow[]
  serviceItems: BomRow[]
  installationNotes: string
  /** Biên bản trên hệ thống đã có bảng vật tư */
  hadBom: boolean
}

/** Ô của bảng vật tư: đổi ô nào thì xoá mọi lỗi `billOfMaterials…` */
export const BOM_FIELDS: readonly string[] = ['materials', 'serviceItems', 'installationNotes']

export type ObstacleField = 'heightM' | 'areaM2'
/** Khoá là tên ô, vật cản dùng `obstacle-<chỉ số>-<ô>` */
export type OnSiteSurveyErrors = Partial<Record<string, string>>

/** Bỏ lỗi của các ô vừa sửa; sửa danh sách vật cản / bảng vật tư thì bỏ lỗi của mọi dòng trong đó */
export function clearTouchedErrors(errors: OnSiteSurveyErrors, touched: string[]) {
  const next = { ...errors }
  for (const key of Object.keys(next)) {
    if (
      touched.includes(key) ||
      (touched.includes('obstacles') && key.startsWith('obstacle-')) ||
      (touched.some((t) => BOM_FIELDS.includes(t)) && key.startsWith(BOM_ERROR_KEY))
    )
      delete next[key]
  }
  return next
}

export const obstacleErrorKey = (index: number, field: ObstacleField) => `obstacle-${index}-${field}`

let keySeed = 0
export function newObstacleRow(): ObstacleRow {
  keySeed += 1
  return { key: `o${keySeed}`, kind: 'WATER_TANK', description: '', heightM: '', areaM2: '' }
}

const text = (value: string | null | undefined) => value ?? ''
const numberText = (value: number | null | undefined) => (value == null ? '' : toInputText(value))

export function formFromView(view: OnSiteSurveyView | null | undefined): OnSiteSurveyForm {
  const d = view?.data
  return {
    roofType: text(d?.roofType),
    roofMaterial: text(d?.roofMaterial),
    roofLengthM: numberText(d?.roofLengthM),
    roofWidthM: numberText(d?.roofWidthM),
    usableAreaM2: numberText(d?.usableAreaM2),
    tiltDegree: numberText(d?.tiltDegree),
    azimuthDegree: numberText(d?.azimuthDegree),
    roofCondition: text(d?.roofCondition),
    installationFeasibility: text(d?.installationFeasibility),
    electricalCabinetNotes: text(d?.electricalCabinetNotes),
    electricalConnectionNotes: text(d?.electricalConnectionNotes),
    proposedInverterLocation: text(d?.proposedInverterLocation),
    proposedPanelLayoutNotes: text(d?.proposedPanelLayoutNotes),
    notes: text(d?.notes),
    measuredLatitude: d?.measuredLatitude ?? null,
    measuredLongitude: d?.measuredLongitude ?? null,
    obstacles: (view?.obstacles ?? []).map((o) => ({
      ...newObstacleRow(),
      kind: o.kind,
      description: text(o.description),
      heightM: numberText(o.heightM),
      areaM2: numberText(o.areaM2),
    })),
    materials: rowsFromItems(d?.billOfMaterials?.materials),
    serviceItems: rowsFromItems(d?.billOfMaterials?.serviceItems),
    installationNotes: text(d?.billOfMaterials?.installationNotes),
    hadBom: Boolean(d?.billOfMaterials),
  }
}

const textOrNull = (value: string) => (value.trim() === '' ? null : value.trim())
/** Ô số gõ sai đã bị chặn ở validate, nên ở đây chỉ còn số hoặc trống */
const numberOrNull = (value: string) => {
  const n = parseDecimal(value)
  return n === null || !Number.isFinite(n) ? null : n
}

/** Thân PUT. `revision` null khi chưa có biên bản trên hệ thống */
export function toRequest(form: OnSiteSurveyForm, revision: number | null): OnSiteSurveyRequest {
  return {
    revision,
    roofType: textOrNull(form.roofType),
    roofMaterial: textOrNull(form.roofMaterial),
    roofLengthM: numberOrNull(form.roofLengthM),
    roofWidthM: numberOrNull(form.roofWidthM),
    usableAreaM2: numberOrNull(form.usableAreaM2),
    tiltDegree: numberOrNull(form.tiltDegree),
    azimuthDegree: numberOrNull(form.azimuthDegree),
    roofCondition: textOrNull(form.roofCondition),
    installationFeasibility: textOrNull(form.installationFeasibility),
    electricalCabinetNotes: textOrNull(form.electricalCabinetNotes),
    electricalConnectionNotes: textOrNull(form.electricalConnectionNotes),
    proposedInverterLocation: textOrNull(form.proposedInverterLocation),
    proposedPanelLayoutNotes: textOrNull(form.proposedPanelLayoutNotes),
    notes: textOrNull(form.notes),
    measuredLatitude: form.measuredLatitude,
    measuredLongitude: form.measuredLongitude,
    obstacles: form.obstacles.map((o) => ({
      kind: o.kind,
      description: textOrNull(o.description),
      heightM: numberOrNull(o.heightM),
      areaM2: numberOrNull(o.areaM2),
    })),
    billOfMaterials: bomRequest(form.materials, form.serviceItems, form.installationNotes, form.hadBom) ?? undefined,
  }
}

/** Form khác bản đã lưu trên hệ thống */
export function formDiffers(form: OnSiteSurveyForm, view: OnSiteSurveyView | null | undefined) {
  return JSON.stringify(toRequest(form, null)) !== JSON.stringify(toRequest(formFromView(view), null))
}

/** Đọc ô số: null khi trống, NaN khi gõ không phải số */
function readNumber(value: string) {
  return parseDecimal(value)
}

export function validateOnSiteSurvey(
  form: OnSiteSurveyForm,
  { forCompletion, units }: { forCompletion: boolean; units?: Record<string, string | null | undefined> },
) {
  const errors: OnSiteSurveyErrors = { ...bomErrors(form.materials, form.serviceItems, form.installationNotes, units) }

  function checkRange(field: keyof OnSiteSurveyForm, ok: (n: number) => boolean, message: string) {
    const n = readNumber(form[field] as string)
    if (n === null) return null
    if (!Number.isFinite(n)) {
      errors[field] = 'Nhập một số, ví dụ 12,5.'
      return null
    }
    if (!ok(n)) errors[field] = message
    return n
  }

  const length = checkRange('roofLengthM', (n) => n > 0 && n <= LIMITS.maxSideM, `Từ trên 0 đến ${LIMITS.maxSideM} m.`)
  const width = checkRange('roofWidthM', (n) => n > 0 && n <= LIMITS.maxSideM, `Từ trên 0 đến ${LIMITS.maxSideM} m.`)
  const maxArea = length !== null && width !== null && !errors.roofLengthM && !errors.roofWidthM ? length * width : null
  checkRange(
    'usableAreaM2',
    (n) => n > 0 && (maxArea === null || n <= maxArea + 1e-9),
    maxArea === null ? 'Phải lớn hơn 0.' : `Phải lớn hơn 0 và không quá dài × rộng (${toInputText(maxArea)} m²).`,
  )
  checkRange('tiltDegree', (n) => n >= 0 && n <= 90, 'Từ 0 đến 90 độ. Mái bằng là 0.')
  checkRange('azimuthDegree', (n) => n >= 0 && n < 360, 'Từ 0 đến dưới 360 độ (0 là Bắc, 90 là Đông).')

  form.obstacles.forEach((o, i) => {
    const height = readNumber(o.heightM)
    if (height !== null && (!Number.isFinite(height) || height < 0 || height > LIMITS.maxObstacleHeightM))
      errors[obstacleErrorKey(i, 'heightM')] = `Từ 0 đến ${LIMITS.maxObstacleHeightM} m.`
    const area = readNumber(o.areaM2)
    if (area !== null && (!Number.isFinite(area) || area < 0 || area > LIMITS.maxObstacleAreaM2))
      errors[obstacleErrorKey(i, 'areaM2')] = `Từ 0 đến ${LIMITS.maxObstacleAreaM2.toLocaleString('vi-VN')} m².`
  })

  if (forCompletion) {
    const required: [keyof OnSiteSurveyForm, string][] = [
      ['roofType', 'Ghi loại mái.'],
      ['roofMaterial', 'Ghi vật liệu mái.'],
      ['roofLengthM', 'Nhập chiều dài mái.'],
      ['roofWidthM', 'Nhập chiều rộng mái.'],
      ['usableAreaM2', 'Nhập diện tích lắp được.'],
      ['tiltDegree', 'Nhập độ dốc mái.'],
      ['azimuthDegree', 'Nhập hướng mái.'],
      ['roofCondition', 'Chọn tình trạng mái.'],
      ['installationFeasibility', 'Chọn khả năng lắp đặt.'],
      ['electricalCabinetNotes', 'Ghi vị trí và tình trạng tủ điện.'],
    ]
    for (const [field, message] of required) {
      if (!errors[field] && String(form[field]).trim() === '') errors[field] = message
    }
  }
  return errors
}

/** Lỗi theo ô từ backend (VALIDATION_FAILED / ONSITE_SURVEY_INCOMPLETE): dùng câu tiếng Việt của FE cho đúng ô đó */
export function serverOnSiteSurveyErrors(fieldErrors: Record<string, string>, form: OnSiteSurveyForm) {
  const local = validateOnSiteSurvey(form, { forCompletion: true })
  const errors: OnSiteSurveyErrors = {}
  for (const field of Object.keys(fieldErrors)) {
    errors[field] =
      local[field] ??
      (field.startsWith(`${BOM_ERROR_KEY}.`)
        ? 'Sản phẩm này không còn bán hoặc sai loại (thiết bị / dịch vụ). Chọn sản phẩm khác.'
        : 'Giá trị chưa hợp lệ.')
  }
  return errors
}
