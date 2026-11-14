import {
  INSTALLATION_FEASIBILITIES,
  ONSITE_ATTACHMENT_CATEGORIES,
  ONSITE_OBSTACLE_KINDS,
  ONSITE_SURVEY_LIMITS,
  ONSITE_SURVEY_STATUSES,
  ROOF_CONDITIONS,
} from '@/common/onsiteSurvey'
import type { Tone } from '@/components/common/ui/badge'

// Nhãn và mốc giờ của khảo sát tại công trình, đọc bảng ở common/onsiteSurvey.ts

const labelOf = (table: readonly { value: string; label: string }[], value: string | null | undefined) =>
  value ? (table.find((item) => item.value === value)?.label ?? value) : '—'

export function onSiteSurveyStatusMeta(status: string | null | undefined): { label: string; tone: Tone } {
  return ONSITE_SURVEY_STATUSES[status ?? 'DRAFT'] ?? { label: status ?? '—', tone: 'neutral' }
}

export const roofConditionLabel = (value: string | null | undefined) => labelOf(ROOF_CONDITIONS, value)
export const feasibilityLabel = (value: string | null | undefined) => labelOf(INSTALLATION_FEASIBILITIES, value)
export const attachmentCategoryLabel = (value: string | null | undefined) =>
  labelOf(ONSITE_ATTACHMENT_CATEGORIES, value)
export const obstacleKindLabel = (value: string | null | undefined) => labelOf(ONSITE_OBSTACLE_KINDS, value)

/** Màu của kết luận: không lắp được là việc kinh doanh phải xử lý, có điều kiện là lưu ý */
export function feasibilityTone(value: string | null | undefined): Tone {
  if (value === 'NOT_FEASIBLE') return 'danger'
  if (value === 'FEASIBLE_WITH_CONDITIONS') return 'warn'
  return 'ok'
}

/** Giờ sớm nhất bấm được "Bắt đầu khảo sát" (backend vẫn kiểm lại theo cài đặt của quản trị) */
export function surveyStartOpensAt(startsAt: string) {
  return new Date(new Date(startsAt).getTime() - ONSITE_SURVEY_LIMITS.earlyStartMinutes * 60_000)
}

/** Tên ô theo tên trường backend ghi trong `changes` của một lần bổ sung */
const AMENDMENT_FIELD_LABELS: Record<string, string> = {
  roofType: 'Loại mái',
  roofMaterial: 'Vật liệu mái',
  roofLengthM: 'Chiều dài mái',
  roofWidthM: 'Chiều rộng mái',
  usableAreaM2: 'Diện tích lắp được',
  tiltDegree: 'Độ dốc',
  azimuthDegree: 'Hướng mái',
  roofCondition: 'Tình trạng mái',
  electricalCabinetNotes: 'Tủ điện',
  electricalConnectionNotes: 'Đấu nối điện',
  installationFeasibility: 'Khả năng lắp đặt',
  proposedInverterLocation: 'Vị trí đặt inverter',
  proposedPanelLayoutNotes: 'Bố trí tấm pin',
  measuredLatitude: 'Vĩ độ đo',
  measuredLongitude: 'Kinh độ đo',
  notes: 'Ghi chú',
  obstacles: 'Vật cản',
  billOfMaterials: 'Vật tư và dịch vụ',
}
const AMENDMENT_UNITS: Record<string, string> = {
  roofLengthM: 'm',
  roofWidthM: 'm',
  usableAreaM2: 'm²',
  tiltDegree: 'độ',
  azimuthDegree: 'độ',
}

export const amendmentFieldLabel = (field: string) => AMENDMENT_FIELD_LABELS[field] ?? field

/** Giá trị cũ / mới của một ô trong lịch sử bổ sung; trống là "(trống)" */
export function amendmentValueText(field: string, value: string | number | boolean | null) {
  if (value === null || value === '') return '(trống)'
  if (field === 'roofCondition') return roofConditionLabel(String(value))
  if (field === 'installationFeasibility') return feasibilityLabel(String(value))
  if (typeof value === 'number') {
    const unit = AMENDMENT_UNITS[field]
    const text = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 6 }).format(value)
    return unit ? `${text} ${unit}` : text
  }
  return String(value)
}

/** "10,7754; 106,6996" */
export function formatCoordinates(latitude: number | null, longitude: number | null) {
  if (latitude == null || longitude == null) return '—'
  const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 6 })
  return `${f.format(latitude)}; ${f.format(longitude)}`
}
