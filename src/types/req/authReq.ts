/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type ChangePasswordRequest = {
  currentPassword?: string | null
  newPassword?: string | null
}

export type ForgotPasswordRequest = {
  email?: string | null
}

export type LoginRequest = {
  email?: string | null
  password?: string | null
}

export type LogoutRequest = {
  refreshToken?: string | null
}

export type RefreshTokenRequest = {
  refreshToken?: string | null
}

export type RegisterRequest = {
  email?: string | null
  password?: string | null
  fullName?: string | null
  phone?: string | null
}

export type ResendVerificationRequest = {
  email?: string | null
}

export type ResetPasswordRequest = {
  token?: string | null
  newPassword?: string | null
}

export type VerifyEmailRequest = {
  token?: string | null
}
