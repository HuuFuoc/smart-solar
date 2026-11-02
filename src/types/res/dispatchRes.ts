// Viết tay theo SmartSolar.Modules.Scheduling.Dispatch (DispatchViews.cs), swagger chưa có schema response
// Điều phối: công trình chưa có kỹ thuật viên nhận lịch thì khách nhờ Smart Solar xếp người, quản lý / quản trị xử lý
import type { ZoneView } from '@/types/res/surveyRequestsRes'

/** OPEN (chờ nhân viên) | PROPOSAL_PENDING (chờ khách trả lời) | ASSIGNED | UNSERVICEABLE | CLOSED. Không có hạn tự huỷ */
export type DispatchStatus = 'OPEN' | 'PROPOSAL_PENDING' | 'ASSIGNED' | 'UNSERVICEABLE' | 'CLOSED' | (string & {})

/** PROPOSED | ACCEPTED | DECLINED | EXPIRED | WITHDRAWN | FAILED; chỉ PROPOSED còn trả lời được */
export type ProposalStatus = 'PROPOSED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'WITHDRAWN' | 'FAILED' | (string & {})

export type PreferredWindowView = { startsAt: string; endsAt: string }

/** Đề xuất như khách thấy: không có cờ ngoài khu vực, không có ghi chú nội bộ */
export type CustomerProposalView = {
  proposalId: string
  startsAt: string
  endsAt: string
  technicianName: string
  status: ProposalStatus
  expiresAt: string
  respondedAt: string | null
  /** Gửi lại làm expectedRevision khi đồng ý / từ chối */
  revision: number
}

export type CustomerDispatchView = {
  dispatchRequestId: string
  surveyRequestId: string
  status: DispatchStatus
  /** Mã vùng phủ lúc tạo (NO_ZONE_COVERAGE...) hoặc ASSIGNMENT_RELEASED khi kỹ thuật viên trả lại việc */
  reason: string
  createdAt: string
  /** Hạn nhân viên phản hồi */
  reviewDueAt: string
  customerNote: string | null
  preferredWindows: PreferredWindowView[]
  liveProposal: CustomerProposalView | null
  latestProposal: CustomerProposalView | null
  /** ASSIGNED | UNSERVICEABLE | CLOSED_BY_STAFF | CANCELLED_BY_CUSTOMER */
  resolution: string | null
  resolutionReason: string | null
  resolvedAt: string | null
  appointmentId: string | null
  revision: number
  /** false khi gửi lại lúc đã có yêu cầu đang mở */
  created: boolean
}

export type StaffProposalView = {
  proposalId: string
  technicianUserId: string
  technicianName: string
  startsAt: string
  endsAt: string
  crossZone: boolean
  crossZoneAuthorizationId: string | null
  proposedByUserId: string
  note: string | null
  createdAt: string
  responseWindowMinutes: number
  settingsVersion: number
  expiresAt: string
  status: ProposalStatus
  respondedAt: string | null
  failureReason: string | null
  revision: number
}

export type DispatchEventView = {
  eventId: string
  eventType: string
  actorUserId: string | null
  proposalId: string | null
  detail: string | null
  createdAt: string
}

export type CrossZoneAuthorizationView = {
  authorizationId: string
  technicianUserId: string
  targetZoneId: string | null
  reason: string
  authorizedByUserId: string
  authorizedAt: string
}

/** Hạn xử lý. `overdue` tính lúc đọc: còn OPEN mà đã qua reviewDueAt */
export type DispatchSlaView = {
  reviewSlaMinutes: number
  reviewDueAt: string
  escalationDueAt: string
  reminderIntervalMinutes: number
  settingsVersion: number
  overdue: boolean
  overdueAt: string | null
  /** Đã báo quản trị vì quá hạn lâu */
  escalated: boolean
  escalatedAt: string | null
  reminderCount: number
  lastReminderAt: string | null
}

export type DispatchQueueItemView = {
  dispatchRequestId: string
  surveyRequestId: string
  propertySiteId: string
  status: DispatchStatus
  reason: string
  customerName: string
  propertyName: string
  province: string
  communeCode: string | null
  zone: ZoneView | null
  createdAt: string
  sla: DispatchSlaView
  liveProposal: StaffProposalView | null
  revision: number
}

export type DispatchQueuePage = {
  items: DispatchQueueItemView[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export type DispatchStaffView = {
  request: DispatchQueueItemView
  customerNote: string | null
  preferredWindows: PreferredWindowView[]
  proposals: StaffProposalView[]
  crossZoneAuthorizations: CrossZoneAuthorizationView[]
  events: DispatchEventView[]
  resolution: string | null
  resolutionReason: string | null
  resolvedAt: string | null
  resolvedByUserId: string | null
  appointmentId: string | null
  /** Vùng phủ của địa điểm lúc đọc (có thể đã có khu vực sau khi tạo yêu cầu) */
  currentCoverageStatus: string
  /** Lịch kỹ thuật viên vừa trả lại (reason ASSIGNMENT_RELEASED) */
  releasedAppointmentId: string | null
}

export type WorkingIntervalView = { startsAt: string; endsAt: string }

/** Thành viên khu vực trước, rồi người khu khác (`crossZone`, cần cho phép kèm lý do). Chỉ có số liệu đã biết, không có quãng đường */
export type DispatchCandidateView = {
  technicianUserId: string
  fullName: string
  crossZone: boolean
  isEligible: boolean
  /** Mã vì sao không nhận được giờ này */
  reason: string | null
  requiresHoldRehoming: boolean
  zones: ZoneView[]
  commitmentsThatDay: number
  maxAppointmentsPerDay: number
  workingIntervals: WorkingIntervalView[]
}

export type DispatchCandidatesView = {
  dispatchRequestId: string
  startsAt: string
  endsAt: string
  siteZone: ZoneView | null
  coverageStatus: string
  candidates: DispatchCandidateView[]
  note: string
}
