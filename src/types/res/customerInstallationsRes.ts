// Viết tay vì swagger của tag CustomerInstallations chỉ khai "200 OK". Theo record C# của Modules.Installations
// (InstallationCustomerView, InstallationEvidenceFileView, InstallationEvidenceUrlView, HandoverView)
// Giờ trả về kèm +07:00. Khách không bao giờ thấy checklist, nhật ký hay id của kỹ thuật viên

export type InstallationStatus =
  | 'PENDING_ASSIGNMENT'
  | 'PENDING_TECHNICIAN_ACCEPTANCE'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'PENDING_CUSTOMER_ACCEPTANCE'
  | 'REWORK_REQUIRED'
  | 'COMPLETED'
  | 'CANCELLED'
  | (string & {})

/** Kết quả của một lần nghiệm thu (khác giá trị `decision` gửi lên: ACCEPT / REQUEST_REWORK) */
export type AcceptanceDecision = 'PENDING' | 'ACCEPTED' | 'REWORK_REQUESTED' | (string & {})

export type AssetType = 'PANEL' | 'INVERTER' | 'BATTERY' | 'METER' | 'OTHER' | (string & {})

/** Ảnh thi công trong view dự án, chỉ có id. Muốn xem ảnh thì gọi .../evidence và .../evidence/{id}/url */
export type EvidenceView = {
  evidenceId: string
  fileId: string
  round: number
  caption: string | null
  /** Format: date-time */
  addedAt: string
}

export type AcceptanceView = {
  round: number
  /** Format: date-time, lúc kỹ thuật viên gửi báo cáo hoàn thành */
  requestedAt: string
  completionReport: string
  decision: AcceptanceDecision
  decidedAt: string | null
  reason: string | null
  /** CUSTOMER, STAFF (quản lý trả lại để sửa) hoặc null khi còn chờ */
  decidedBy: 'CUSTOMER' | 'STAFF' | (string & {}) | null
}

export type AssetView = {
  assetId: string
  assetType: AssetType
  productId: string | null
  manufacturer: string
  model: string
  serialNumber: string
  positionCode: string | null
  warrantyMonths: number | null
}

/** GET /api/customers/me/installation-projects(/{projectId}) và kết quả của POST .../acceptance */
export type InstallationCustomerView = {
  projectId: string
  contractId: string
  status: InstallationStatus
  /** null khi chưa xếp kỹ thuật viên hoặc đã huỷ */
  scheduledStartsAt: string | null
  scheduledEndsAt: string | null
  /** Chỉ có khi kỹ thuật viên đã nhận việc */
  technicianName: string | null
  startedAt: string | null
  acceptanceRequestedAt: string | null
  completedAt: string | null
  handoverAt: string | null
  cancelledAt: string | null
  currentRound: number
  revision: number
  evidence: EvidenceView[]
  assets: AssetView[]
  acceptances: AcceptanceView[]
}

/** GET .../evidence. downloadable=false: tệp không còn VERIFIED, không được xin URL (contentType, sizeBytes, sha256 null) */
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

export type EvidenceDisposition = 'inline' | 'attachment'

/** GET .../evidence/{evidenceId}/url. URL ký sẵn sống mặc định 300 giây: dùng ngay, không lưu lại */
export type InstallationEvidenceUrlView = {
  evidenceId: string
  url: string
  /** Format: date-time (UTC) */
  expiresAt: string
  disposition: EvidenceDisposition
  contentType: string
  fileName: string
}

export type HandoverAssetView = {
  assetType: AssetType
  productId: string | null
  manufacturer: string
  model: string
  serialNumber: string
  positionCode: string | null
  warrantyMonths: number | null
  /** Format: date (YYYY-MM-DD), tính từ ngày bàn giao theo giờ Việt Nam */
  warrantyEndsOn: string | null
}

/** GET .../handover, chỉ khi dự án COMPLETED (trước đó 409 INSTALLATION_NOT_HANDED_OVER) */
export type HandoverView = {
  projectId: string
  contractId: string
  handoverAt: string
  technicianName: string | null
  assets: HandoverAssetView[]
  evidence: EvidenceView[]
  acceptances: AcceptanceView[]
}
