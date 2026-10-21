import type {
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  LogoutRequest,
  RefreshTokenRequest,
  RegisterRequest,
  ResendVerificationRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from '@/types/req/authReq'
import type {
  AuthTokensResponse,
  ForgotPasswordResponse,
  LogoutResponse,
  PasswordChangedResponse,
  RegisterResponse,
  ResendVerificationResponse,
  VerifyEmailResponse,
} from '@/types/res/authRes'
import { post } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Các endpoint Auth, đều là POST. Client đã bỏ wrapper nên các hàm trả thẳng `data`

/** POST /api/auth/register, { email, password, fullName, phone } */
export function register(body: RegisterRequest) {
  return post<RegisterResponse>(ENDPOINTS.auth.register, body)
}

/** POST /api/auth/verify-email, chỉ nhận { token } (schema không có email) */
export function verifyEmail(body: VerifyEmailRequest) {
  return post<VerifyEmailResponse>(ENDPOINTS.auth.verifyEmail, body)
}

/** POST /api/auth/resend-verification, { email } */
export function resendVerification(body: ResendVerificationRequest) {
  return post<ResendVerificationResponse>(ENDPOINTS.auth.resendVerification, body)
}

/** POST /api/auth/login, { email, password } */
export function login(body: LoginRequest) {
  return post<AuthTokensResponse>(ENDPOINTS.auth.login, body)
}

/** POST /api/auth/refresh, { refreshToken } */
export function refresh(body: RefreshTokenRequest) {
  return post<AuthTokensResponse>(ENDPOINTS.auth.refresh, body)
}

/** POST /api/auth/logout, { refreshToken } */
export function logout(body: LogoutRequest) {
  return post<LogoutResponse>(ENDPOINTS.auth.logout, body)
}

/** POST /api/auth/forgot-password, { email } */
export function forgotPassword(body: ForgotPasswordRequest) {
  return post<ForgotPasswordResponse>(ENDPOINTS.auth.forgotPassword, body)
}

/** POST /api/auth/reset-password, { token, newPassword } (schema không có email) */
export function resetPassword(body: ResetPasswordRequest) {
  return post<PasswordChangedResponse>(ENDPOINTS.auth.resetPassword, body)
}

/** POST /api/auth/change-password, { currentPassword, newPassword }, cần đăng nhập */
export function changePassword(body: ChangePasswordRequest) {
  return post<PasswordChangedResponse>(ENDPOINTS.auth.changePassword, body)
}
