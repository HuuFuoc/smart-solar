/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api` – KHÔNG sửa tay. */

export type ChangeUserStatusRequest = {
  status?: string | null
  reason?: string | null
}

export type CreateAdminUserRequest = {
  email?: string | null
  fullName?: string | null
  phone?: string | null
  roles?: string[] | null
}

export type ReplaceUserRolesRequest = {
  roles?: string[] | null
}

export type UpdateAdminUserRequest = {
  fullName?: string | null
  phone?: string | null
  email?: string | null
}
