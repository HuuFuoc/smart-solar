import type { Tone } from '@/components/common/ui/badge'
import type { CustomerType, InstallationSurfaceType } from '@/types/req/customersReq'
import type { SurveyRequestStatus } from '@/types/res/surveyRequestsRes'

/*
 * Enum của đánh giá sơ bộ và yêu cầu khảo sát (khách hàng, sales, kỹ thuật viên dùng chung).
 * Swagger chỉ khai enum là số; tên từng giá trị lấy từ SmartSolar.Modules.PreSurvey.Enums (image 05/10/2026).
 * Hàm tra nhãn ở features/pre-surveys/preSurveyDisplay.ts; giá trị lạ thì in nguyên số thay vì đoán nghĩa.
 */

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

/** Cùng enum InstallationSurfaceType nhưng theo tên (Rooftop…): màn kỹ thuật viên nhận tên, màn sales nhận số. */
export const SURFACE_NAMES: Record<string, string> = {
  Rooftop: 'Mái nhà',
  Ground: 'Mặt đất',
  Carport: 'Mái che bãi xe',
  Facade: 'Mặt dựng',
  Other: 'Khác',
}

/*
 * Hướng mặt mái theo 8 hướng la bàn; giá trị gửi backend là góc phương vị (độ, 0 = Bắc, theo chiều kim đồng hồ).
 * Thứ tự mảng là thứ tự ô trên lưới 3×3 của bộ chọn (Tây Bắc ở góc trên trái), null là ô giữa.
 */
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

/** 8 hướng theo chiều kim đồng hồ từ Bắc, cách nhau 45°. */
export const DIRECTIONS = ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc']

/*
  Trạng thái yêu cầu khảo sát. Màu theo việc còn phải làm (Badge): "Chờ nhận" là yêu cầu cần người nhận nên tô đỏ; đã nhận /
  đang xem xét là đang xử lý (chấm xanh dương); đã hẹn là đúng tiến độ (chấm xanh lá); xong hoặc huỷ thì chấm xám.
*/
export const SURVEY_REQUEST_STATUSES: Record<SurveyRequestStatus, { label: string; tone: Tone }> = {
  1: { label: 'Chờ nhận', tone: 'danger' },
  2: { label: 'Đã nhận', tone: 'info' },
  3: { label: 'Đang xem xét', tone: 'info' },
  4: { label: 'Đã hẹn khảo sát', tone: 'ok' },
  5: { label: 'Hoàn tất', tone: 'neutral' },
  6: { label: 'Đã huỷ', tone: 'neutral' },
}
