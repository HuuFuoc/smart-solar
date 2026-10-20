import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { PasswordInput } from '@/features/auth/components/AuthInput'
import { PasswordRules } from '@/features/auth/components/PasswordRules'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { ROUTES } from '@/routes/paths'
import { useResetPasswordMutation } from '@/hooks/useAuthMutations'
import { errorMessage } from '@/services/api/errors'
import { cn } from '@/utils/cn'
import { isStrongPassword, resetContent } from '@/data/auth'

const schema = z
  .object({
    password: z.string().refine(isStrongPassword, 'Mật khẩu chưa đạt đủ 4 quy chuẩn an toàn'),
    confirm: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((values) => values.password === values.confirm, {
    path: ['confirm'],
    message: 'Mật khẩu xác nhận không khớp',
  })

type ResetValues = z.infer<typeof schema>

/*
 * /reset-password?token=…
 * ResetPasswordRequest trong swagger = { token, newPassword } – KHÔNG có email,
 * nên trang chỉ đọc `token` từ query.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const resetMutation = useResetPasswordMutation()

  const [done, setDone] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetValues>({ resolver: zodResolver(schema), defaultValues: { password: '', confirm: '' } })

  const password = watch('password')
  const submitting = resetMutation.isPending

  const onSubmit = handleSubmit(async (values) => {
    if (submitting || !token) return
    setFormError(null)
    try {
      await resetMutation.mutateAsync({ token, newPassword: values.password })
      setDone(true)
      toast.success(resetContent.toastSuccess)
    } catch (error) {
      setFormError(errorMessage(error, resetContent.failedMessage))
    }
  })

  // Thành công thì hiện thông báo rồi về /login sau 2 giây.
  useEffect(() => {
    if (!done) return
    const timer = window.setTimeout(() => navigate(ROUTES.login, { replace: true }), 2000)
    return () => window.clearTimeout(timer)
  }, [done, navigate])

  return (
    <AuthCard>
      <div className="mb-2 flex items-center justify-end">
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-label-sm',
            token ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-error-container text-on-error-container',
          )}
        >
          {token ? resetContent.tokenValid : resetContent.tokenInvalid}
        </span>
      </div>
      <h1 className="mb-space-xs text-headline-md text-on-surface">{resetContent.title}</h1>

      {done && (
        <div
          role="status"
          className="mb-space-sm flex items-center gap-2 rounded-lg bg-tertiary-fixed p-space-sm text-on-tertiary-fixed shadow-sm"
        >
          <Icon name="task_alt" className="text-[20px]" />
          <span className="text-label-lg">{resetContent.success}</span>
        </div>
      )}

      {/* Thiếu token hoặc token bị từ chối → gợi ý xin liên kết mới */}
      {(!token || formError) && !done && (
        <div
          role="alert"
          className="mb-space-sm flex items-start gap-3 rounded-lg bg-error-container p-space-sm text-on-error-container"
        >
          <Icon name="error" className="mt-0.5 shrink-0 text-[22px] text-error" />
          <div className="flex-1 text-body-sm">
            <p>{formError ?? resetContent.missingToken}</p>
            <Link
              to={ROUTES.forgotPassword}
              className="mt-1 inline-block text-label-sm font-semibold underline"
            >
              {resetContent.requestNewLink}
            </Link>
          </div>
        </div>
      )}

      <form className="flex flex-col gap-space-sm" onSubmit={onSubmit} noValidate>
        <div className="flex flex-col gap-1">
          <label htmlFor="reset-pass" className="text-label-lg text-on-surface">
            {resetContent.passwordLabel}
          </label>
          <PasswordInput
            id="reset-pass"
            size="md"
            autoComplete="new-password"
            placeholder={resetContent.passwordPlaceholder}
            {...register('password')}
          />
          {errors.password && <span className="text-body-sm text-error">{errors.password.message}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="reset-confirm" className="text-label-lg text-on-surface">
            {resetContent.confirmLabel}
          </label>
          <PasswordInput
            id="reset-confirm"
            size="md"
            autoComplete="new-password"
            placeholder={resetContent.confirmPlaceholder}
            {...register('confirm')}
          />
          {errors.confirm && <span className="text-body-sm text-error">{errors.confirm.message}</span>}
        </div>

        <PasswordRules value={password} />

        <button
          type="submit"
          disabled={done || submitting || !token}
          className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-label-lg text-on-primary shadow-sm transition-all hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Icon
            name={submitting ? 'progress_activity' : 'lock_reset'}
            className={submitting ? 'animate-spin text-[18px]' : 'text-[18px]'}
          />
          {submitting ? resetContent.submitting : resetContent.submit}
        </button>
      </form>
    </AuthCard>
  )
}
