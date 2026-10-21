import type {
  ChangeUserStatusRequest,
  CreateAdminUserRequest,
  ReplaceUserRolesRequest,
  UpdateAdminUserRequest,
} from '@/types/req/adminUsersReq'
import type {
  AdminUserDetail,
  AdminUserPage,
  CreatedAdminUser,
  RecoveryIssued,
  UpdatedAdminUser,
} from '@/types/res/adminUsersRes'
import { get, post, put, patch, del } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Quản lý tài khoản (ADMIN). Tài khoản mới nhận link đặt mật khẩu qua email
// Đổi trạng thái / vai trò / xoá thì mọi phiên của tài khoản đó hết hiệu lực

/** pageSize 1-100, sort: name | createdAt | status */
export type AdminUserListParams = {
  page?: number
  pageSize?: number
  search?: string
  role?: string
  status?: string
  sort?: 'name' | 'createdAt' | 'status'
  direction?: 'asc' | 'desc'
  includeDeleted?: boolean
}

function compact(params: AdminUserListParams) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== '' && value !== false),
  )
}

/** GET /api/admin/users */
export function listUsers(params: AdminUserListParams) {
  return get<AdminUserPage>(ENDPOINTS.adminUsers.base, { params: compact(params) })
}

/** GET /api/admin/users/{id} */
export function getUser(id: string) {
  return get<AdminUserDetail>(ENDPOINTS.adminUsers.byId(id))
}

/** POST /api/admin/users (201), kèm trạng thái gửi link đặt mật khẩu */
export function createUser(body: CreateAdminUserRequest) {
  return post<CreatedAdminUser>(ENDPOINTS.adminUsers.base, body)
}

/** PUT /api/admin/users/{id}, đổi email thì mất dấu đã xác minh và gửi link xác minh mới */
export function updateUser(id: string, body: UpdateAdminUserRequest) {
  return put<UpdatedAdminUser>(ENDPOINTS.adminUsers.byId(id), body)
}

/** PATCH .../status, ACTIVE | SUSPENDED | DISABLED (không quay về PENDING_VERIFICATION) */
export function changeUserStatus(id: string, body: ChangeUserStatusRequest) {
  return patch<AdminUserDetail>(ENDPOINTS.adminUsers.status(id), body)
}

/** PUT .../roles, thay toàn bộ vai trò (ít nhất một) */
export function replaceUserRoles(id: string, body: ReplaceUserRolesRequest) {
  return put<AdminUserDetail>(ENDPOINTS.adminUsers.roles(id), body)
}

/** DELETE ...?reason= (204), xoá mềm, giữ lịch sử. Gọi lại khi đã xoá vẫn 204 */
export function deleteUser(id: string, reason: string | null) {
  return del<void>(ENDPOINTS.adminUsers.byId(id), { params: reason ? { reason } : undefined })
}

/** Gửi link mật khẩu / xác minh tuỳ trạng thái tài khoản */
export function sendPasswordReset(id: string) {
  return post<RecoveryIssued>(ENDPOINTS.adminUsers.sendPasswordReset(id))
}
