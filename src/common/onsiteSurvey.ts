import type { Tone } from '@/components/common/ui/badge'

// Enum của khảo sát tại công trình (Modules.OnSiteSurveys của backend: OnSiteSurveyVocabulary, OnSiteSurveyOptions)

export const ONSITE_SURVEY_STATUSES: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: 'Chưa bắt đầu', tone: 'neutral' },
  IN_PROGRESS: { label: 'Đang khảo sát', tone: 'info' },
  COMPLETED: { label: 'Đã hoàn thành', tone: 'ok' },
}

export const ROOF_CONDITIONS = [
  { value: 'GOOD', label: 'Tốt' },
  { value: 'FAIR', label: 'Trung bình' },
  { value: 'POOR', label: 'Kém' },
] as const

export const INSTALLATION_FEASIBILITIES = [
  { value: 'FEASIBLE', label: 'Lắp được', hint: 'Lắp theo phương án bình thường.' },
  {
    value: 'FEASIBLE_WITH_CONDITIONS',
    label: 'Lắp được, có điều kiện',
    hint: 'Cần gia cố, dời vật cản… ghi ở phần ghi chú.',
  },
  { value: 'NOT_FEASIBLE', label: 'Không lắp được', hint: 'Ghi lý do ở phần ghi chú.' },
] as const

/** Loại ảnh / tài liệu. Backend bắt ít nhất một ảnh loại ROOF trước khi hoàn thành */
export const ONSITE_ATTACHMENT_CATEGORIES = [
  { value: 'ROOF', label: 'Mái' },
  { value: 'ELECTRICAL', label: 'Tủ điện, đấu nối' },
  { value: 'OBSTACLE', label: 'Vật cản' },
  { value: 'SITE', label: 'Toàn cảnh công trình' },
  { value: 'DOCUMENT', label: 'Giấy tờ' },
] as const

export const ONSITE_OBSTACLE_KINDS = [
  { value: 'WATER_TANK', label: 'Bồn nước' },
  { value: 'CHIMNEY', label: 'Ống khói' },
  { value: 'VENT', label: 'Ống thông gió' },
  { value: 'SKYLIGHT', label: 'Cửa mái lấy sáng' },
  { value: 'ANTENNA', label: 'Ăng-ten' },
  { value: 'TREE_SHADE', label: 'Bóng cây' },
  { value: 'BUILDING_SHADE', label: 'Bóng nhà bên cạnh' },
  { value: 'OTHER', label: 'Khác' },
] as const

/** Gợi ý cho hai ô chữ tự do của backend (roofType, roofMaterial), vẫn gõ được giá trị khác */
export const ROOF_TYPE_SUGGESTIONS = ['Mái bằng', 'Sân thượng', 'Mái dốc một mặt', 'Mái dốc hai mặt', 'Mái nhiều mặt']
export const ROOF_MATERIAL_SUGGESTIONS = ['Tôn', 'Ngói', 'Bê tông', 'Fibro xi măng', 'Kính']

/** Giới hạn của backend (Validate, Trim, OnSiteSurveyOptions) */
export const ONSITE_SURVEY_LIMITS = {
  maxSideM: 500,
  maxObstacles: 50,
  maxObstacleHeightM: 100,
  maxObstacleAreaM2: 10_000,
  roofTextLength: 50,
  longNoteLength: 2000,
  inverterLocationLength: 500,
  notesLength: 4000,
  obstacleDescriptionLength: 500,
  maxAttachments: 60,
  /** Bắt đầu sớm nhất trước giờ hẹn (mặc định của backend, quản trị đổi được) */
  earlyStartMinutes: 120,
} as const
