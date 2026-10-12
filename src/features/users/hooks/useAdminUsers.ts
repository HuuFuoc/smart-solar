import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { technicianAdminKeys } from '@/features/scheduling/hooks/useTechnicianAdmin'
import * as adminUserService from '@/features/users/services/adminUserService'
import type { AdminUserListParams } from '@/features/users/services/adminUserService'
import type { ApiError } from '@/services/api/errors'
import type { CreateAdminUserRequest, UpdateAdminUserRequest } from '@/types/req/adminUsersReq'
import type { AdminUserDetail, AdminUserPage, CreatedAdminUser, RecoveryIssued, UpdatedAdminUser } from '@/types/res/adminUsersRes'

export const adminUserKeys = {
  all: ['admin-users'] as const,
  list: (params: AdminUserListParams) => [...adminUserKeys.all, 'list', params] as const,
  detail: (id: string) => [...adminUserKeys.all, 'detail', id] as const,
}

/** `enabled`: layout chỉ gọi khi phiên quản trị đã khôi phục. Giữ trang cũ khi đổi trang / bộ lọc để bảng không nháy. */
export function useAdminUsersQuery(params: AdminUserListParams, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<AdminUserPage, ApiError>({
    queryKey: adminUserKeys.list(params),
    queryFn: () => adminUserService.listUsers(params),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useAdminUserQuery(id: string | undefined) {
  return useQuery<AdminUserDetail, ApiError>({
    queryKey: adminUserKeys.detail(id ?? ''),
    queryFn: () => adminUserService.getUser(id!),
    enabled: Boolean(id),
  })
}

/* Đổi tài khoản có thể đổi danh sách kỹ thuật viên (thêm / bớt vai trò, khoá tài khoản): làm mới cả hai cụm. */
function useInvalidateUsers() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: adminUserKeys.all }),
      queryClient.invalidateQueries({ queryKey: technicianAdminKeys.all }),
    ])
}

export function useCreateUserMutation() {
  const invalidate = useInvalidateUsers()
  return useMutation<CreatedAdminUser, ApiError, CreateAdminUserRequest>({
    mutationFn: adminUserService.createUser,
    onSettled: invalidate,
  })
}

export function useUpdateUserMutation() {
  const invalidate = useInvalidateUsers()
  return useMutation<UpdatedAdminUser, ApiError, { id: string; body: UpdateAdminUserRequest }>({
    mutationFn: ({ id, body }) => adminUserService.updateUser(id, body),
    onSettled: invalidate,
  })
}

export function useChangeUserStatusMutation() {
  const invalidate = useInvalidateUsers()
  return useMutation<AdminUserDetail, ApiError, { id: string; status: string; reason: string | null }>({
    mutationFn: ({ id, status, reason }) => adminUserService.changeUserStatus(id, { status, reason }),
    onSettled: invalidate,
  })
}

export function useReplaceUserRolesMutation() {
  const invalidate = useInvalidateUsers()
  return useMutation<AdminUserDetail, ApiError, { id: string; roles: string[] }>({
    mutationFn: ({ id, roles }) => adminUserService.replaceUserRoles(id, { roles }),
    onSettled: invalidate,
  })
}

export function useDeleteUserMutation() {
  const invalidate = useInvalidateUsers()
  return useMutation<void, ApiError, { id: string; reason: string | null }>({
    mutationFn: ({ id, reason }) => adminUserService.deleteUser(id, reason),
    onSettled: invalidate,
  })
}

export function useSendPasswordResetMutation() {
  const queryClient = useQueryClient()
  return useMutation<RecoveryIssued, ApiError, string>({
    mutationFn: adminUserService.sendPasswordReset,
    onSettled: (_data, _error, id) => queryClient.invalidateQueries({ queryKey: adminUserKeys.detail(id) }),
  })
}
