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
import { apiPost } from '@/services/api/client'

/*
 * 9 endpoint Auth; kiểu request ở types/req/authReq.ts, response ở types/res/authRes.ts.
 * Mọi endpoint đều là POST, body JSON, trả về wrapper *ApiResponse; apiPost đã
 * mở wrapper nên các hàm dưới đây trả thẳng phần `data`.
 */

/** POST /api/auth/register – { email, password, fullName, phone } */
export function register(body: RegisterRequest) {
  return apiPost<RegisterResponse>('/auth/register', body)
}

/** POST /api/auth/verify-email – chỉ nhận { token } (schema không có email) */
export function verifyEmail(body: VerifyEmailRequest) {
  return apiPost<VerifyEmailResponse>('/auth/verify-email', body)
}

/** POST /api/auth/resend-verification – { email } */
export function resendVerification(body: ResendVerificationRequest) {
  return apiPost<ResendVerificationResponse>('/auth/resend-verification', body)
}

/** POST /api/auth/login – { email, password } */
export function login(body: LoginRequest) {
  return apiPost<AuthTokensResponse>('/auth/login', body)
}

/** POST /api/auth/refresh – { refreshToken } */
export function refresh(body: RefreshTokenRequest) {
  return apiPost<AuthTokensResponse>('/auth/refresh', body)
}

/** POST /api/auth/logout – { refreshToken } */
export function logout(body: LogoutRequest) {
  return apiPost<LogoutResponse>('/auth/logout', body)
}

/** POST /api/auth/forgot-password – { email } */
export function forgotPassword(body: ForgotPasswordRequest) {
  return apiPost<ForgotPasswordResponse>('/auth/forgot-password', body)
}

/** POST /api/auth/reset-password – { token, newPassword } (schema không có email) */
export function resetPassword(body: ResetPasswordRequest) {
  return apiPost<PasswordChangedResponse>('/auth/reset-password', body)
}

/** POST /api/auth/change-password – { currentPassword, newPassword }; cần Authorization */
export function changePassword(body: ChangePasswordRequest) {
  return apiPost<PasswordChangedResponse>('/auth/change-password', body)
}
