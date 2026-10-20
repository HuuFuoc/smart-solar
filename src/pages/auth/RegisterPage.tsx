import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { AuthCard, RequiredMark } from '@/features/auth/components/AuthCard'
import { AuthInput, PasswordInput } from '@/features/auth/components/AuthInput'
import { PasswordRules } from '@/features/auth/components/PasswordRules'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { ROUTES } from '@/routes/paths'
import { useRegisterMutation } from '@/hooks/useAuthMutations'
import { errorMessage, isApiError } from '@/services/api/errors'
import { isStrongPassword, registerContent } from '@/data/auth'
import { homePathForRole } from '@/config/roles'
import { useAuth } from '@/context/AuthProvider'

const schema = z
  .object({
    name: z.string().trim().min(2, 'Vui lòng nhập họ và tên'),
    email: z.email({ error: (issue) => (issue.input ? 'Email không hợp lệ' : 'Vui lòng nhập email') }),
    phone: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập số điện thoại')
      .regex(/^[0-9\s.+-]{9,15}$/, 'Số điện thoại không hợp lệ'),
    password: z.string().refine(isStrongPassword, 'Mật khẩu chưa đạt đủ 4 quy chuẩn an toàn'),
    confirm: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
    terms: z.boolean().refine((checked) => checked, 'Bạn cần đồng ý với điều khoản sử dụng'),
  })
  .refine((values) => values.password === values.confirm, {
    path: ['confirm'],
    message: 'Mật khẩu xác nhận không khớp',
  })

type RegisterValues = z.infer<typeof schema>

/** Tên field trong ApiError.details (theo RegisterRequest) → field của form. */
const SERVER_FIELD_MAP: Record<string, keyof RegisterValues> = {
  email: 'email',
  password: 'password',
  fullname: 'name',
  full_name: 'name',
  name: 'name',
  phone: 'phone',
  phonenumber: 'phone',
}

/** /register – view "Đăng ký tài khoản Khách hàng" của auth_portal. */
export function RegisterPage() {
  const navigate = useNavigate()
  const { user, status } = useAuth()
  const registerMutation = useRegisterMutation()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', password: '', confirm: '', terms: false },
  })

  const password = watch('password')
  const submitting = registerMutation.isPending

  const onSubmit = handleSubmit(async (values) => {
    if (submitting) return
    setFormError(null)
    try {
      // Body theo RegisterRequest trong swagger: { email, password, fullName, phone }
      const result = await registerMutation.mutateAsync({
        email: values.email,
        password: values.password,
        fullName: values.name,
        phone: values.phone,
      })
      toast.success(registerContent.toastSuccess)
      const email = result.email ?? values.email
      navigate(`${ROUTES.verifyEmail}?email=${encodeURIComponent(email)}`, { replace: true })
    } catch (error) {
      // Lỗi validate của server: gắn vào đúng ô nhập; phần còn lại hiện ở alert chung.
      let mappedAny = false
      if (isApiError(error)) {
        for (const [serverField, message] of Object.entries(error.fieldErrors)) {
          const field = SERVER_FIELD_MAP[serverField.toLowerCase()]
          if (field) {
            setError(field, { type: 'server', message })
            mappedAny = true
          }
        }
      }
      if (!mappedAny) setFormError(errorMessage(error))
    }
  })

  // Đã đăng nhập thì không đăng ký thêm tài khoản: vào thẳng trang làm việc.
  if (status === 'ready' && user) return <Navigate to={homePathForRole(user.role)} replace />

  return (
    <AuthCard>
      <h1 className="mb-space-md text-headline-xl text-on-surface">{registerContent.title}</h1>

      {formError && (
        <div
          role="alert"
          className="mb-space-sm flex items-start gap-3 rounded-lg bg-error-container p-space-sm text-on-error-container"
        >
          <Icon name="error" className="mt-0.5 shrink-0 text-[22px] text-error" />
          <div className="flex-1 text-body-sm">{formError}</div>
          <button
            type="button"
            aria-label="Đóng thông báo lỗi"
            onClick={() => setFormError(null)}
            className="p-1 text-on-error-container/70 transition-colors hover:text-on-error-container"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>
      )}

      <form className="flex flex-col gap-space-sm" onSubmit={onSubmit} noValidate>
        <div className="flex flex-col gap-1">
          <label htmlFor="reg-name" className="text-label-lg text-on-surface">
            {registerContent.nameLabel} <RequiredMark />
          </label>
          <AuthInput
            id="reg-name"
            size="md"
            leadingIcon="person"
            autoComplete="name"
            placeholder={registerContent.namePlaceholder}
            {...register('name')}
          />
          {errors.name && <span className="text-body-sm text-error">{errors.name.message}</span>}
        </div>

        <div className="grid grid-cols-1 gap-space-sm md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="reg-email" className="text-label-lg text-on-surface">
              {registerContent.emailLabel} <RequiredMark />
            </label>
            <AuthInput
              id="reg-email"
              size="md"
              type="email"
              leadingIcon="mail"
              autoComplete="email"
              placeholder={registerContent.emailPlaceholder}
              {...register('email')}
            />
            {errors.email && <span className="text-body-sm text-error">{errors.email.message}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="reg-phone" className="text-label-lg text-on-surface">
              {registerContent.phoneLabel} <RequiredMark />
            </label>
            <AuthInput
              id="reg-phone"
              size="md"
              type="tel"
              leadingIcon="phone"
              autoComplete="tel"
              placeholder={registerContent.phonePlaceholder}
              {...register('phone')}
            />
            {errors.phone && <span className="text-body-sm text-error">{errors.phone.message}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-space-sm md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="reg-pass" className="text-label-lg text-on-surface">
              {registerContent.passwordLabel} <RequiredMark />
            </label>
            <PasswordInput
              id="reg-pass"
              size="md"
              autoComplete="new-password"
              placeholder={registerContent.passwordPlaceholder}
              {...register('password')}
            />
            {errors.password && <span className="text-body-sm text-error">{errors.password.message}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="reg-confirm" className="text-label-lg text-on-surface">
              {registerContent.confirmLabel} <RequiredMark />
            </label>
            <PasswordInput
              id="reg-confirm"
              size="md"
              autoComplete="new-password"
              placeholder={registerContent.passwordPlaceholder}
              {...register('confirm')}
            />
            {errors.confirm && <span className="text-body-sm text-error">{errors.confirm.message}</span>}
          </div>
        </div>

        <PasswordRules value={password} />

        <label className="flex cursor-pointer items-start gap-2.5 pt-1">
          <input type="checkbox" className="mt-1 h-4 w-4 rounded accent-primary" {...register('terms')} />
          <span className="text-body-sm text-on-surface">
            {registerContent.termsBefore}
            {/* Tab mới: điều hướng tại chỗ sẽ xoá form đang điền dở. */}
            <Link to={ROUTES.comingSoon} target="_blank" rel="noreferrer" className="font-semibold text-accent-fg underline">
              {registerContent.termsLink}
            </Link>
            {registerContent.termsMiddle}
            <Link to={ROUTES.comingSoon} target="_blank" rel="noreferrer" className="font-semibold text-accent-fg underline">
              {registerContent.privacyLink}
            </Link>
            {registerContent.termsAfter}
          </span>
        </label>
        {errors.terms && <span className="text-body-sm text-error">{errors.terms.message}</span>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-space-xs flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-label-lg text-on-primary shadow-sm transition-all hover:bg-primary-container hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Icon
            name={submitting ? 'progress_activity' : 'how_to_reg'}
            className={submitting ? 'animate-spin text-[20px]' : 'text-[20px]'}
          />
          <span>{submitting ? registerContent.submitting : registerContent.submit}</span>
        </button>
      </form>

      <div className="mt-space-md text-center">
        <span className="text-body-md text-on-surface-variant">{registerContent.hasAccount}</span>
        <Link to={ROUTES.login} className="text-label-lg font-bold text-accent-fg hover:underline">
          {registerContent.loginLink}
        </Link>
      </div>
    </AuthCard>
  )
}
