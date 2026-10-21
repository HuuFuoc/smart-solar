// Viết tay vì swagger không có schema response (tag ManagerInstallations)
// Theo record C# của backend: Modules/Installations/InstallationViews.cs, InstallationContracts.cs, InstallationEvidenceHandlers.cs
// Giờ là chuỗi ISO kèm "+07:00", ngày (DateOnly) là "YYYY-MM-DD"

/** InstallationStatuses */
export type InstallationStatus =
  | 'PENDING_ASSIGNMENT'
  | 'PENDING_TECHNICIAN_ACCEPTANCE'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'PENDING_CUSTOMER_ACCEPTANCE'
  | 'REWORK_REQUIRED'
  | 'COMPLETED'
  | 'CANCELLED'

/** AssignmentStatuses */
export type InstallationAssignmentStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REPLACED' | 'COMPLETED' | 'CANCELLED'

/** ChecklistStatuses */
export type ChecklistStatus = 'PENDING' | 'SATISFIED' | 'NOT_APPLICABLE'

/** AcceptanceDecisions */
export type AcceptanceDecision = 'PENDING' | 'ACCEPTED' | 'REWORK_REQUESTED'

/** AcceptanceDeciders: STAFF là quản lý / quản trị trả về làm lại */
export type AcceptanceDecider = 'CUSTOMER' | 'STAFF'

/** GET /api/installations/ready-contracts: hợp đồng đã thanh toán đủ, chưa có dự án */
export type PaidContractSource = {
  contractId: string
  contractNumber: string
  status: string
  surveyRequestId: string
  customerUserId: string
  propertySiteId: string
  latitude: number | null
  longitude: number | null
  totalAmount: number
  paidAt: string | null
}

/** Một dòng của GET /api/installation-projects */
export type InstallationProjectSummary = {
  projectId: string
  contractId: string
  status: InstallationStatus
  responsibleTechnicianUserId: string | null
  responsibleTechnicianName: string | null
  technicianAccepted: boolean
  scheduledStartsAt: string | null
  scheduledEndsAt: string | null
  operationalZoneId: string | null
  createdAt: string
  revision: number
}

export type ZoneSummary = {
  zoneId: string
  code: string
  name: string
}

/** Kỹ thuật viên của lần phân công hiện tại (PENDING hoặc ACCEPTED) */
export type ResponsibleTechnicianView = {
  technicianUserId: string
  fullName: string
  assignmentStatus: InstallationAssignmentStatus
  acceptedAt: string | null
}

export type InstallationSiteInfo = {
  propertySiteId: string
  propertyName: string
  province: string
  district: string | null
  ward: string | null
  streetLine: string | null
  latitude: number | null
  longitude: number | null
  customerName: string
  customerPhone: string | null
}

export type InstallationAssignmentView = {
  assignmentId: string
  technicianUserId: string
  technicianName: string
  startsAt: string
  endsAt: string
  status: InstallationAssignmentStatus
  assignedByUserId: string
  assignedAt: string
  assignmentReason: string | null
  respondedAt: string | null
  /** Lý do kỹ thuật viên từ chối */
  responseReason: string | null
  closedAt: string | null
}

export type EvidenceView = {
  evidenceId: string
  fileId: string
  round: number
  caption: string | null
  addedAt: string
}

export type AssetView = {
  assetId: string
  assetType: string
  productId: string | null
  manufacturer: string
  model: string
  serialNumber: string
  positionCode: string | null
  warrantyMonths: number | null
}

export type AcceptanceView = {
  round: number
  requestedAt: string
  completionReport: string
  decision: AcceptanceDecision
  decidedAt: string | null
  reason: string | null
  decidedBy: AcceptanceDecider | null
}

export type ChecklistItemView = {
  itemId: string
  code: string
  title: string
  isRequired: boolean
  status: ChecklistStatus
  evidenceFileId: string | null
  note: string | null
  verifiedAt: string | null
}

export type InstallationEventView = {
  eventType: string
  actorUserId: string
  fromStatus: InstallationStatus | null
  toStatus: InstallationStatus | null
  /** Ghi chú nội bộ của backend (tiếng Anh, có thể kèm id) */
  detail: string | null
  createdAt: string
}

/** Chi tiết dự án cho quản lý / quản trị; mọi thao tác ghi của quản lý cũng trả về dạng này */
export type InstallationStaffView = {
  projectId: string
  contractId: string
  surveyRequestId: string
  customerUserId: string
  status: InstallationStatus
  zone: ZoneSummary | null
  responsibleTechnician: ResponsibleTechnicianView | null
  scheduledStartsAt: string | null
  scheduledEndsAt: string | null
  plannedStartDate: string | null
  plannedEndDate: string | null
  startedAt: string | null
  acceptanceRequestedAt: string | null
  completedAt: string | null
  handoverAt: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  /** Lượt nghiệm thu đang làm; ảnh của báo cáo tới thuộc lượt này */
  currentRound: number
  revision: number
  site: InstallationSiteInfo | null
  assignments: InstallationAssignmentView[]
  evidence: EvidenceView[]
  assets: AssetView[]
  acceptances: AcceptanceView[]
  checklist: ChecklistItemView[]
  events: InstallationEventView[]
}

/** Thành viên khu vực đứng trước, người ngoài khu vực sau với `crossZone` = true */
export type InstallationCandidateView = {
  technicianUserId: string
  fullName: string
  isEligible: boolean
  /** Mã lý do khi không nhận được (EligibilityReasons) */
  reason: string | null
  crossZone: boolean
}

/** Ảnh nghiệm thu, không có vị trí lưu trữ. `downloadable` = false thì không xin link */
export type InstallationEvidenceFileView = {
  evidenceId: string
  round: number
  caption: string | null
  addedAt: string
  contentType: string | null
  sizeBytes: number | null
  fileName: string
  sha256: string | null
  downloadable: boolean
}

/** Link xem / tải ảnh có hạn ngắn. Không lưu lại, không ghi log */
export type InstallationEvidenceUrlView = {
  evidenceId: string
  url: string
  expiresAt: string
  disposition: 'inline' | 'attachment'
  contentType: string
  fileName: string
}

export type HandoverAssetView = {
  assetType: string
  productId: string | null
  manufacturer: string
  model: string
  serialNumber: string
  positionCode: string | null
  warrantyMonths: number | null
  warrantyEndsOn: string | null
}

/** GET /api/installation-projects/{id}/handover, chỉ có khi dự án COMPLETED */
export type HandoverView = {
  projectId: string
  contractId: string
  handoverAt: string
  technicianName: string | null
  assets: HandoverAssetView[]
  evidence: EvidenceView[]
  acceptances: AcceptanceView[]
}
