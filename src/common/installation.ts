import type { Tone } from '@/components/common/ui/badge'

// Enum của dự án lắp đặt (Modules.Installations của backend), dùng chung cho mọi vai trò

/** Người đang xem dự án, quyết định màu của trạng thái */
export type InstallationViewer = 'customer' | 'technician' | 'staff'

export const INSTALLATION_STATUS_LABELS: Record<string, string> = {
  PENDING_ASSIGNMENT: 'Chờ xếp kỹ thuật viên',
  PENDING_TECHNICIAN_ACCEPTANCE: 'Chờ kỹ thuật viên nhận việc',
  SCHEDULED: 'Đã lên lịch lắp đặt',
  IN_PROGRESS: 'Đang lắp đặt',
  PENDING_CUSTOMER_ACCEPTANCE: 'Chờ khách nghiệm thu',
  REWORK_REQUIRED: 'Cần sửa lại',
  COMPLETED: 'Đã bàn giao',
  CANCELLED: 'Đã huỷ',
}

// Khách xem công trình của chính mình nên gọi là "bạn"
export const CUSTOMER_INSTALLATION_LABELS: Record<string, string> = {
  PENDING_ASSIGNMENT: 'Đang xếp kỹ thuật viên',
  PENDING_CUSTOMER_ACCEPTANCE: 'Chờ bạn nghiệm thu',
  REWORK_REQUIRED: 'Đang sửa lại theo yêu cầu',
}

// Đỏ là việc người xem phải làm: khách thấy chờ nghiệm thu, kỹ thuật viên thấy việc chờ nhận / cần sửa lại,
// quản lý thấy dự án chưa có kỹ thuật viên
export const INSTALLATION_STATUS_TONES: Record<InstallationViewer, Record<string, Tone>> = {
  customer: {
    PENDING_ASSIGNMENT: 'info',
    PENDING_TECHNICIAN_ACCEPTANCE: 'info',
    SCHEDULED: 'ok',
    IN_PROGRESS: 'info',
    PENDING_CUSTOMER_ACCEPTANCE: 'danger',
    REWORK_REQUIRED: 'info',
    COMPLETED: 'neutral',
    CANCELLED: 'neutral',
  },
  technician: {
    PENDING_ASSIGNMENT: 'info',
    PENDING_TECHNICIAN_ACCEPTANCE: 'danger',
    SCHEDULED: 'ok',
    IN_PROGRESS: 'info',
    PENDING_CUSTOMER_ACCEPTANCE: 'info',
    REWORK_REQUIRED: 'danger',
    COMPLETED: 'neutral',
    CANCELLED: 'neutral',
  },
  staff: {
    PENDING_ASSIGNMENT: 'danger',
    PENDING_TECHNICIAN_ACCEPTANCE: 'info',
    SCHEDULED: 'ok',
    IN_PROGRESS: 'info',
    PENDING_CUSTOMER_ACCEPTANCE: 'info',
    REWORK_REQUIRED: 'info',
    COMPLETED: 'neutral',
    CANCELLED: 'neutral',
  },
}

/** Loại thiết bị đã lắp (assetType) */
export const ASSET_TYPES: Record<string, string> = {
  PANEL: 'Tấm pin',
  INVERTER: 'Inverter',
  BATTERY: 'Pin lưu trữ',
  METER: 'Đồng hồ điện',
  OTHER: 'Thiết bị khác',
}

// Kết quả từng lần nghiệm thu (acceptances[].decision). Lần đang chờ đã báo đỏ ở trạng thái dự án nên ở đây là info
export const ACCEPTANCE_DECISIONS: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: 'Chờ nghiệm thu', tone: 'info' },
  ACCEPTED: { label: 'Đã nghiệm thu', tone: 'ok' },
  REWORK_REQUESTED: { label: 'Yêu cầu sửa lại', tone: 'neutral' },
}

/** Ai đóng lần nghiệm thu (acceptances[].decidedBy). STAFF: quản lý trả báo cáo về để sửa */
export const ACCEPTANCE_DECIDERS: Record<string, string> = {
  CUSTOMER: 'Khách hàng',
  STAFF: 'Quản lý',
}

// `decision` của POST /customers/me/installation-projects/{id}/acceptance. Swagger chỉ khai string,
// backend nhận đúng hai giá trị này (không phân biệt hoa thường); yêu cầu sửa lại thì bắt buộc lý do
export const ACCEPTANCE_CHOICES = {
  accept: 'ACCEPT',
  requestRework: 'REQUEST_REWORK',
} as const

export type AcceptanceChoice = (typeof ACCEPTANCE_CHOICES)[keyof typeof ACCEPTANCE_CHOICES]

// Kỹ thuật viên xem việc của chính mình nên gọi là "bạn"
export const TECHNICIAN_INSTALLATION_LABELS: Record<string, string> = {
  PENDING_TECHNICIAN_ACCEPTANCE: 'Chờ bạn nhận việc',
  SCHEDULED: 'Đã nhận, chờ lắp đặt',
}

/** Phân công của chính kỹ thuật viên đang xem (myAssignmentStatus) */
export const TECHNICIAN_ASSIGNMENT_STATUSES: Record<string, string> = {
  PENDING: 'Chờ bạn trả lời',
  ACCEPTED: 'Bạn đã nhận',
  DECLINED: 'Bạn đã từ chối',
  REPLACED: 'Đã giao người khác',
  COMPLETED: 'Đã hoàn thành',
  CANCELLED: 'Đã huỷ',
}

// Vì sao kỹ thuật viên chưa bắt đầu lắp đặt được (startBlockedReason). Hạng mục bắt buộc do quản lý đánh dấu
export const START_BLOCKED_REASONS: Record<string, string> = {
  INSTALLATION_ASSIGNMENT_NOT_ACCEPTED: 'Nhận việc trước rồi mới bắt đầu lắp đặt được.',
  INSTALLATION_TOO_EARLY_TO_START: 'Chưa tới ngày lắp đặt.',
  INSTALLATION_SCHEDULE_EXPIRED: 'Đã hết khung giờ lắp đặt. Báo quản lý xếp lại lịch trước khi bắt đầu.',
  INSTALLATION_CHECKLIST_INCOMPLETE:
    'Quản lý chưa hoàn tất các hạng mục bắt buộc trước lắp đặt (đấu nối EVN, PCCC, kết cấu mái).',
}

// Các khoá dưới đây chỉ quản lý / quản trị thấy (checklist, lịch sử phân công, nhật ký là dữ liệu nội bộ)

/** Trạng thái một lần phân công kỹ thuật viên (assignments[].status) */
export const ASSIGNMENT_STATUSES: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: 'Chờ kỹ thuật viên nhận', tone: 'info' },
  ACCEPTED: { label: 'Kỹ thuật viên đã nhận', tone: 'ok' },
  DECLINED: { label: 'Kỹ thuật viên từ chối', tone: 'neutral' },
  REPLACED: { label: 'Đã đổi người hoặc đổi lịch', tone: 'neutral' },
  COMPLETED: { label: 'Đã hoàn thành', tone: 'neutral' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
}

// Tình trạng một mục checklist trước khi thi công. Mục bắt buộc còn PENDING thì kỹ thuật viên chưa bắt đầu được;
// SATISFIED cần một tài liệu PROJECT_DOCUMENT đã xác minh
export const CHECKLIST_STATUSES = {
  pending: 'PENDING',
  satisfied: 'SATISFIED',
  notApplicable: 'NOT_APPLICABLE',
} as const

export const CHECKLIST_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chưa xong',
  SATISFIED: 'Đã đạt',
  NOT_APPLICABLE: 'Không áp dụng',
}

/** Mục checklist mặc định của mỗi dự án (code); backend chỉ có tên tiếng Anh */
export const CHECKLIST_ITEMS: Record<string, string> = {
  GRID_CONNECTION_APPROVAL: 'Đấu nối lưới điện, chấp thuận của EVN',
  FIRE_SAFETY_APPROVAL: 'Thẩm duyệt phòng cháy chữa cháy (PCCC)',
  STRUCTURAL_ASSESSMENT: 'Đánh giá kết cấu mái',
}

/** Loại sự kiện trong nhật ký dự án (events[].eventType) */
export const INSTALLATION_EVENT_TYPES: Record<string, string> = {
  PROJECT_CREATED: 'Tạo dự án từ hợp đồng',
  TECHNICIAN_ASSIGNED: 'Phân công kỹ thuật viên',
  TECHNICIAN_REASSIGNED: 'Đổi kỹ thuật viên',
  RESCHEDULED: 'Đổi lịch thi công',
  ASSIGNMENT_ACCEPTED: 'Kỹ thuật viên nhận việc',
  ASSIGNMENT_DECLINED: 'Kỹ thuật viên từ chối việc',
  PROJECT_STARTED: 'Bắt đầu thi công',
  EVIDENCE_ADDED: 'Thêm ảnh nghiệm thu',
  ASSETS_REGISTERED: 'Ghi thiết bị đã lắp',
  COMPLETION_REPORTED: 'Gửi báo cáo hoàn thành',
  CUSTOMER_ACCEPTED: 'Khách nghiệm thu',
  REWORK_REQUESTED: 'Khách yêu cầu sửa lại',
  RETURNED_TO_REWORK: 'Quản lý trả về làm lại',
  CHECKLIST_UPDATED: 'Cập nhật checklist',
  PROJECT_CANCELLED: 'Huỷ dự án',
}
