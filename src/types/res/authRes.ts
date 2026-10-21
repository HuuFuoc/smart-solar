/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type AuthTokensResponse = {
  /** Format: uuid */
  userId?: string
  accessToken?: string | null
  /** Format: date-time */
  accessTokenExpiresAt?: string
  refreshToken?: string | null
  /** Format: date-time */
  refreshTokenExpiresAt?: string
  tokenType?: string | null
}

export type ForgotPasswordResponse = {
  accepted?: boolean
}

export type LogoutResponse = {
  accepted?: boolean
}

export type PasswordChangedResponse = {
  passwordChanged?: boolean
}

export type RegisterResponse = {
  /** Format: uuid */
  userId?: string
  email?: string | null
  verificationRequired?: boolean
}

export type ResendVerificationResponse = {
  accepted?: boolean
}

export type VerifyEmailResponse = {
  emailVerified?: boolean
}
