import type { Tone } from '@/components/common/ui/badge'
import type { CustomerType, InstallationSurfaceType } from '@/types/req/customersReq'
import type { SurveyRequestStatus } from '@/types/res/surveyRequestsRes'

// Enum của đánh giá sơ bộ và yêu cầu khảo sát, dùng chung cho mọi vai trò
// Swagger chỉ có số của enum, tên từng giá trị lấy từ SmartSolar.Modules.PreSurvey.Enums của backend

export const CUSTOMER_TYPES = [
  { value: 1, label: 'Cá nhân' },
  { value: 2, label: 'Doanh nghiệp' },
] as const satisfies readonly { value: CustomerType; label: string }[]

export const SURFACE_TYPES = [
  { value: 1, label: 'Mái nhà', hint: 'Mái tôn, mái ngói, sân thượng' },
  { value: 2, label: 'Mặt đất', hint: 'Khoảng đất trống trong khuôn viên' },
  { value: 3, label: 'Mái che bãi xe', hint: 'Khung che chỗ đậu ô tô, xe máy' },
  { value: 4, label: 'Mặt dựng', hint: 'Tường đứng hoặc mặt ngoài toà nhà' },
  { value: 5, label: 'Khác', hint: 'Ghi rõ ở phần ghi chú' },
] as const satisfies readonly { value: InstallationSurfaceType; label: string; hint: string }[]

// Màn kỹ thuật viên nhận tên enum (Rooftop...), không phải số
export const SURFACE_NAMES: Record<string, string> = {
  Rooftop: 'Mái nhà',
  Ground: 'Mặt đất',
  Carport: 'Mái che bãi xe',
  Facade: 'Mặt dựng',
  Other: 'Khác',
}

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

// Chưa có kỹ thuật viên là đang chờ kỹ thuật viên trong khu vực nhận, chưa phải việc của sales nên không tô đỏ
export const SURVEY_REQUEST_STATUSES: Record<SurveyRequestStatus, { label: string; tone: Tone }> = {
  1: { label: 'Chưa có kỹ thuật viên', tone: 'info' },
  // 2, 3 không còn dùng ở backend mới, giữ nhãn để đọc được dữ liệu cũ
  2: { label: 'Đã nhận', tone: 'info' },
  3: { label: 'Đang xem xét', tone: 'info' },
  4: { label: 'Đã hẹn khảo sát', tone: 'ok' },
  5: { label: 'Hoàn tất', tone: 'neutral' },
  6: { label: 'Đã huỷ', tone: 'neutral' },
}
