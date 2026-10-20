import { useMutation } from '@tanstack/react-query'
import * as authService from '@/features/auth/services/authService'
import type {
  ChangePasswordRequest,
  ForgotPasswordRequest,
  RegisterRequest,
  ResendVerificationRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from '@/types/req/authReq'
import type {
  ForgotPasswordResponse,
  PasswordChangedResponse,
  RegisterResponse,
  ResendVerificationResponse,
  VerifyEmailResponse,
} from '@/types/res/authRes'
import type { ApiError } from '@/services/api/errors'

/*
 * Mutation cho 9 endpoint Auth (trừ refresh – interceptor trong client.ts tự lo).
 * Lỗi luôn là ApiError nên component đọc được `status`, `code`, `fieldErrors`.
 *
 * Hai mutation có ảnh hưởng tới phiên đăng nhập (login / logout) nằm trong
 * AuthProvider vì còn phải lưu token và dựng user.
 */

export function useRegisterMutation() {
  return useMutation<RegisterResponse, ApiError, RegisterRequest>({
    mutationFn: (body) => authService.register(body),
  })
}

export function useVerifyEmailMutation() {
  return useMutation<VerifyEmailResponse, ApiError, VerifyEmailRequest>({
    mutationFn: (body) => authService.verifyEmail(body),
  })
}

export function useResendVerificationMutation() {
  return useMutation<ResendVerificationResponse, ApiError, ResendVerificationRequest>({
    mutationFn: (body) => authService.resendVerification(body),
  })
}

export function useForgotPasswordMutation() {
  return useMutation<ForgotPasswordResponse, ApiError, ForgotPasswordRequest>({
    mutationFn: (body) => authService.forgotPassword(body),
  })
}

export function useResetPasswordMutation() {
  return useMutation<PasswordChangedResponse, ApiError, ResetPasswordRequest>({
    mutationFn: (body) => authService.resetPassword(body),
  })
}

export function useChangePasswordMutation() {
  return useMutation<PasswordChangedResponse, ApiError, ChangePasswordRequest>({
    mutationFn: (body) => authService.changePassword(body),
  })
}
