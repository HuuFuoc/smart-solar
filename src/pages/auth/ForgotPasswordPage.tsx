import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { AuthCard } from '@/features/auth/AuthCard'
import { AuthInput } from '@/features/auth/AuthInput'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { ROUTES } from '@/routes/paths'
import { useForgotPasswordMutation } from '@/hooks/useAuthMutations'
import { forgotContent } from '@/data/auth'

const schema = z.object({ email: z.email({ error: (issue) => (issue.input ? 'Email không hợp lệ' : 'Vui lòng nhập email') }) })
type ForgotValues = z.infer<typeof schema>

/** /forgot-password – sub-card "Quên mật khẩu?" của auth_portal. */
export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const forgotMutation = useForgotPasswordMutation()
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotValues>({ resolver: zodResolver(schema), defaultValues: { email: '' } })

  const submitting = forgotMutation.isPending

  /*
   * Thông báo luôn trung tính, kể cả khi email không tồn tại hoặc API trả lỗi:
   * không để lộ email nào đang có trong hệ thống.
   */
  const onSubmit = handleSubmit(async (values) => {
    if (submitting) return
    try {
      await forgotMutation.mutateAsync({ email: values.email })
    } catch {
      // nuốt lỗi có chủ đích – xem ghi chú ở trên
    } finally {
      setSent(true)
      toast.success(forgotContent.toastSuccess)
    }
  })

  return (
    <AuthCard>
      <h1 className="mb-space-md text-headline-lg text-on-surface">{forgotContent.title}</h1>

      <form className="flex flex-col gap-space-md" onSubmit={onSubmit} noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="forgot-email" className="text-label-lg text-on-surface">
            {forgotContent.emailLabel}
          </label>
          <AuthInput
            id="forgot-email"
            type="email"
            autoComplete="email"
            leadingIcon="mail"
            placeholder={forgotContent.emailPlaceholder}
            {...register('email')}
          />
          {errors.email && <span className="text-body-sm text-error">{errors.email.message}</span>}
        </div>

        {sent && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-lg bg-surface-container-low p-space-sm text-on-surface-variant"
          >
            <Icon name="info" className="mt-0.5 shrink-0 text-[20px] text-accent-fg" />
            <span className="text-body-sm">{forgotContent.notice}</span>
          </div>
        )}

        <div className="flex items-center gap-space-sm pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-label-lg text-on-primary shadow-sm transition-all hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Icon
              name={submitting ? 'progress_activity' : 'send'}
              className={submitting ? 'animate-spin text-[18px]' : 'text-[18px]'}
            />
            {submitting ? forgotContent.submitting : forgotContent.submit}
          </button>
          <button
            type="button"
            onClick={() => navigate(ROUTES.login)}
            className="h-11 rounded-xl bg-surface-container px-4 text-label-lg text-on-surface transition-all hover:bg-surface-container-high"
          >
            {forgotContent.cancel}
          </button>
        </div>
      </form>
    </AuthCard>
  )
}
