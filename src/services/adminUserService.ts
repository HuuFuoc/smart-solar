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

/*
 * Quản lý tài khoản (role ADMIN, tag AdminUsers). Không có ô mật khẩu: tài khoản mới nhận link đặt mật khẩu qua email
 * (dùng trang /reset-password); link không bao giờ trả về giao diện. Đổi trạng thái / vai trò / xoá làm mọi phiên đang
 * mở của tài khoản đó hết hiệu lực ngay (claim "av" trong JWT).
 */

const base = '/admin/users'
const path = (id: string) => `${base}/${encodeURIComponent(id)}`

/** Giá trị hợp lệ lấy từ AdminUserHandlers.ListAsync: pageSize 1–100; sort name | createdAt | status. */
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
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== '' && value !== false))
}

/** GET /api/admin/users */
export function listUsers(params: AdminUserListParams) {
  return get<AdminUserPage>(base, { params: compact(params) })
}

/** GET /api/admin/users/{id} */
export function getUser(id: string) {
  return get<AdminUserDetail>(path(id))
}

/** POST /api/admin/users (201) – kèm trạng thái gửi link đặt mật khẩu. */
export function createUser(body: CreateAdminUserRequest) {
  return post<CreatedAdminUser>(base, body)
}

/** PUT /api/admin/users/{id} – đổi email thì mất dấu đã xác minh và gửi link xác minh mới. */
export function updateUser(id: string, body: UpdateAdminUserRequest) {
  return put<UpdatedAdminUser>(path(id), body)
}

/** PATCH …/status – ACTIVE | SUSPENDED | DISABLED (không quay về PENDING_VERIFICATION). */
export function changeUserStatus(id: string, body: ChangeUserStatusRequest) {
  return patch<AdminUserDetail>(`${path(id)}/status`, body)
}

/** PUT …/roles – thay toàn bộ vai trò (ít nhất một). */
export function replaceUserRoles(id: string, body: ReplaceUserRolesRequest) {
  return put<AdminUserDetail>(`${path(id)}/roles`, body)
}

/** DELETE …?reason= (204) – xoá mềm, giữ lịch sử; gọi lại khi đã xoá vẫn 204. */
export function deleteUser(id: string, reason: string | null) {
  return del<void>(path(id), { params: reason ? { reason } : undefined })
}

/** POST …/send-password-reset (202) – gửi link đặt mật khẩu / xác minh / đặt lại tuỳ trạng thái tài khoản. */
export function sendPasswordReset(id: string) {
  return post<RecoveryIssued>(`${path(id)}/send-password-reset`)
}
