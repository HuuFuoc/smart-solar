/*
 * VIẾT TAY – swagger chỉ khai "200 OK" cho tag AdminUsers, không có schema response.
 * Tên kiểu và field lấy đúng theo SmartSolar.Modules.Identity.AdminUsers.AdminUserContracts và
 * Contracts.Persistence.IAdminUserStore (backend main 4d12e4d, 12/10/2026). Phản hồi không bao giờ
 * chứa mật khẩu, token hay link kích hoạt. Khi backend khai response trong swagger, `npm run gen:api`
 * sẽ ghi đè file này bằng bản sinh tự động.
 */

/** PENDING_VERIFICATION | ACTIVE | SUSPENDED | DISABLED */
export type UserStatusCode = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | (string & {})

/** CUSTOMER | SALES | TECHNICIAN | MANAGER | ADMIN */
export type RoleCode = 'CUSTOMER' | 'SALES' | 'TECHNICIAN' | 'MANAGER' | 'ADMIN' | (string & {})

export type AdminUserListItem = {
  id: string
  email: string
  fullName: string
  phone: string | null
  status: UserStatusCode
  roles: RoleCode[]
  emailVerifiedAt: string | null
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

/** Tóm tắt cấu hình lịch của kỹ thuật viên trên trang tài khoản. */
export type TechnicianProfileSummary = {
  hasProfile: boolean
  isSchedulingActive: boolean
  hasBaseLocation: boolean
  baseLabel: string | null
  maxAppointmentsPerDay: number | null
  hasCustomWorkingSchedule: boolean
  /** "HH:mm:ss" (TimeOnly) hoặc null = mặc định. */
  earliestBaseDeparture: string | null
}

export type AdminUserDetail = AdminUserListItem & {
  hasPassword: boolean
  technician: TechnicianProfileSummary | null
}

export type AdminUserPage = {
  items: AdminUserListItem[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

/**
 * Cách tài khoản do quản trị tạo được kích hoạt. Link chỉ gửi qua email, không bao giờ trả về.
 * status: PENDING_ACCOUNT_SETUP | PENDING_EMAIL_VERIFICATION | PASSWORD_RESET_ISSUED
 * emailDelivery: QUEUED | EMAIL_DELIVERY_DISABLED | PUBLISH_FAILED
 */
export type ActivationState = {
  status: string
  emailDelivery: string
  setupLinkExpiresAt: string | null
  message: string
}

/** POST /api/admin/users (201). */
export type CreatedAdminUser = {
  user: AdminUserDetail
  activation: ActivationState
}

/** PUT /api/admin/users/{id}; `activation` chỉ có khi đổi email (gửi link xác minh mới). */
export type UpdatedAdminUser = {
  user: AdminUserDetail
  activation: ActivationState | null
}

/** POST …/send-password-reset (202). */
export type RecoveryIssued = {
  userId: string
  activation: ActivationState
}

/** `error.details` của 409 ACCOUNT_HAS_ACTIVE_WORK. */
export type AccountActiveWork = {
  technicianAppointments: { appointmentId: string; surveyRequestId: string | null; startsAt: string; status: string }[]
  ownedOpenSurveyRequestIds: string[]
}
