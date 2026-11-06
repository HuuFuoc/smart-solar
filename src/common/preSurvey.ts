import type { Tone } from '@/components/common/ui/badge'
import type { CustomerType, InstallationSurfaceType } from '@/types/req/customersReq'
import type { CloseReasonCode, SurveyRequestStatus } from '@/types/res/surveyRequestsRes'

// Enum của đánh giá sơ bộ và yêu cầu khảo sát, dùng chung cho mọi vai trò
// Form gửi số (`value`), backend trả tên in hoa (`name`); tên lấy từ SmartSolar.Modules.PreSurvey.Enums

export const CUSTOMER_TYPES = [
  { value: 1, name: 'INDIVIDUAL', label: 'Cá nhân' },
  { value: 2, name: 'BUSINESS', label: 'Doanh nghiệp' },
] as const satisfies readonly { value: CustomerType; name: string; label: string }[]

// `icon`: Material Symbols trên thẻ chọn bề mặt
export const SURFACE_TYPES = [
  { value: 1, name: 'ROOFTOP', label: 'Mái nhà', hint: 'Mái tôn, mái ngói, sân thượng', icon: 'roofing' },
  { value: 2, name: 'GROUND', label: 'Mặt đất', hint: 'Khoảng đất trống trong khuôn viên', icon: 'grass' },
  { value: 3, name: 'CARPORT', label: 'Mái che bãi xe', hint: 'Khung che chỗ đậu ô tô, xe máy', icon: 'local_parking' },
  { value: 4, name: 'FACADE', label: 'Mặt dựng', hint: 'Tường đứng hoặc mặt ngoài toà nhà', icon: 'domain' },
  { value: 5, name: 'OTHER', label: 'Khác', hint: 'Ghi rõ ở phần ghi chú', icon: 'more_horiz' },
] as const satisfies readonly {
  value: InstallationSurfaceType
  name: string
  label: string
  hint: string
  icon: string
}[]

// 8 hướng la bàn, xếp theo lưới 3x3 của bộ chọn (null là ô giữa). Góc tính từ Bắc theo chiều kim đồng hồ
export const COMPASS_GRID = [
  { label: 'Tây Bắc', degree: 315 },
  { label: 'Bắc', degree: 0 },
  { label: 'Đông Bắc', degree: 45 },
  { label: 'Tây', degree: 270 },
  null,
  { label: 'Đông', degree: 90 },
  { label: 'Tây Nam', degree: 225 },
  { label: 'Nam', degree: 180 },
  { label: 'Đông Nam', degree: 135 },
] as const

/** 8 hướng theo chiều kim đồng hồ từ Bắc, cách nhau 45 độ */
export const DIRECTIONS = ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc']

// Trạng thái yêu cầu khảo sát thực địa
export const SURVEY_REQUEST_STATUSES: Partial<Record<SurveyRequestStatus, { label: string; tone: Tone }>> = {
  PENDING: { label: 'Chờ kỹ thuật viên', tone: 'warn' },
  SCHEDULED: { label: 'Đã hẹn khảo sát', tone: 'info' },
  COMPLETED: { label: 'Khảo sát xong', tone: 'ok' },
  CANCELLED: { label: 'Khách đã rút yêu cầu', tone: 'neutral' },
  CLOSED: { label: 'Đã đóng', tone: 'neutral' },
}

// Lý do sales đóng yêu cầu khi khách không lắp nữa
export const CLOSE_REASONS = [
  { value: 'CUSTOMER_DECLINED', label: 'Khách không lắp nữa' },
  { value: 'NO_RESPONSE', label: 'Khách không phản hồi' },
  { value: 'NOT_FEASIBLE', label: 'Khảo sát kết luận không lắp được' },
  { value: 'OTHER', label: 'Lý do khác' },
] as const satisfies readonly { value: CloseReasonCode; label: string }[]
