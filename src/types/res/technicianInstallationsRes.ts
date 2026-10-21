// Viết tay vì swagger của tag TechnicianInstallations chỉ khai "200 OK". Theo record C# InstallationTechnicianView,
// InstallationSiteInfo của Modules.Installations (đối chiếu DLL của image backend đang chạy). Giờ trả về kèm +07:00.
// Kỹ thuật viên không thấy checklist, nhật ký hay lịch sử phân công: chỉ có canStart / startBlockedReason
import type { AcceptanceView, AssetView, EvidenceView, InstallationStatus } from '@/types/res/customerInstallationsRes'

/** Phân công của chính kỹ thuật viên đang xem */
export type TechnicianAssignmentStatus =
  'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REPLACED' | 'COMPLETED' | 'CANCELLED' | (string & {})

/** Nơi lắp đặt và người liên hệ */
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

/**
 * GET /api/technicians/me/installation-projects(/{projectId}) và kết quả của mọi thao tác của kỹ thuật viên.
 * Danh sách gồm công trình có phân công đang hiệu lực (PENDING / ACCEPTED) hoặc đã hoàn thành của mình
 */
export type InstallationTechnicianView = {
  projectId: string
  status: InstallationStatus
  myAssignmentStatus: TechnicianAssignmentStatus
  assignmentId: string
  /** Khung giờ của phân công, kèm +07:00 */
  startsAt: string
  endsAt: string
  zoneName: string | null
  /** null sau khi từ chối (phân công DECLINED) */
  site: InstallationSiteInfo | null
  startedAt: string | null
  acceptanceRequestedAt: string | null
  completedAt: string | null
  /** Lượt hiện tại; khách yêu cầu sửa lại thì sang lượt mới và cần ảnh mới */
  currentRound: number
  /** Gửi lại làm expectedRevision khi nhận, từ chối, gửi báo cáo */
  revision: number
  canStart: boolean
  /** Mã lý do khi canStart = false, xem START_BLOCKED_REASONS */
  startBlockedReason: string | null
  evidence: EvidenceView[]
  assets: AssetView[]
  acceptances: AcceptanceView[]
}
