import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useId, useState } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Input } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { useChangePasswordMutation } from '@/hooks/useAuthMutations'
import { errorMessage, isApiError } from '@/services/api/errors'
import { changePasswordContent, isStrongPassword, passwordRules, registerContent } from '@/data/auth'
import { cx } from '@/utils/cx'

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z.string().refine(isStrongPassword, 'Mật khẩu chưa đạt đủ 4 quy chuẩn an toàn'),
    confirm: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((values) => values.newPassword === values.confirm, {
    path: ['confirm'],
    message: 'Mật khẩu xác nhận không khớp',
  })

type ChangePasswordValues = z.infer<typeof schema>

export type ChangePasswordDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/*
 * Dialog đổi mật khẩu, mở từ khối tài khoản ở rail (bộ portal kit, cùng kiểu với các hộp thoại khác).
 * <dialog> gốc nên tự là modal và trả focus về nút đã mở nó khi đóng.
 * ChangePasswordRequest trong swagger = { currentPassword, newPassword }; ô "xác nhận" chỉ validate phía client.
 */
export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  // Đang gửi thì không cho đóng (Esc): form báo trạng thái lên đây vì mutation nằm trong form.
  const [busy, setBusy] = useState(false)
  return (
    <ModalDialog open={open} onOpenChange={onOpenChange} dismissible={!busy} aria-label={changePasswordContent.title} className="max-w-lg">
      <ChangePasswordForm onDone={() => onOpenChange(false)} onBusyChange={setBusy} />
    </ModalDialog>
  )
}

/* Form gắn trong dialog chỉ khi đang mở (ModalDialog gỡ children lúc đóng), nên mỗi lần mở là form trống. */
function ChangePasswordForm({ onDone, onBusyChange }: { onDone: () => void; onBusyChange: (busy: boolean) => void }) {
  const id = useId()
  const changeMutation = useChangePasswordMutation()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  })
  const newPassword = watch('newPassword')
  const submitting = changeMutation.isPending
  useEffect(() => {
    onBusyChange(submitting)
    return () => onBusyChange(false)
  }, [submitting, onBusyChange])

  const onSubmit = handleSubmit(async (values) => {
    if (submitting) return
    setFormError(null)
    try {
      await changeMutation.mutateAsync({ currentPassword: values.currentPassword, newPassword: values.newPassword })
      toast.success(changePasswordContent.success)
      onDone()
    } catch (error) {
      // 401 ở đây là phiên đã hết (client.ts đã thử refresh và bật hộp "hết phiên"): mật khẩu CHƯA đổi.
      // Sai mật khẩu hiện tại là 400 AUTH_CURRENT_PASSWORD_INVALID (dò 08/10/2026), báo ngay dưới ô đó.
      if (isApiError(error) && (error.fieldErrors.currentPassword || error.code === 'AUTH_CURRENT_PASSWORD_INVALID')) {
        setError('currentPassword', { type: 'server', message: error.fieldErrors.currentPassword ?? error.message })
        return
      }
      setFormError(errorMessage(error))
    }
  })

  const f = (name: string) => `${id}-${name}`
  return (
    <form onSubmit={onSubmit} noValidate>
      <DialogTitle>{changePasswordContent.title}</DialogTitle>
      <div className="mt-6 space-y-4">
        <PasswordField id={f('current')} label={changePasswordContent.currentLabel} autoComplete="current-password" error={errors.currentPassword?.message} field={register('currentPassword')} />
        <PasswordField id={f('new')} label={changePasswordContent.newLabel} autoComplete="new-password" error={errors.newPassword?.message} field={register('newPassword')} />
        <PasswordField id={f('confirm')} label={changePasswordContent.confirmLabel} autoComplete="new-password" error={errors.confirm?.message} field={register('confirm')} />
        {/* Quy tắc đạt: dấu tích tròn màu xanh (ok); chưa đạt: vòng tròn xám. Chữ đọc thêm "(đã đạt)" cho trình đọc màn hình. */}
        <div className="rounded-container bg-surface-2 px-4 py-3">
          <p className="text-meta font-medium text-fg-2">{registerContent.rulesTitle}</p>
          <ul className="mt-2 grid gap-1.5 text-meta sm:grid-cols-2">
            {passwordRules.map((rule) => {
              const passed = rule.test(newPassword)
              return (
                <li key={rule.id} className={cx('flex items-center gap-2', passed ? 'text-fg' : 'text-fg-2')}>
                  <Icon
                    name={passed ? 'check_circle' : 'radio_button_unchecked'}
                    className={cx('shrink-0 text-[16px]', passed ? 'icon-fill text-ok' : 'text-fg-3')}
                  />
                  {rule.label}
                  <span className="sr-only">{passed ? '(đã đạt)' : '(chưa đạt)'}</span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
      {formError && (
        <div role="alert" className="mt-4">
          <Notice tone="danger">{formError}</Notice>
        </div>
      )}
      <DialogFooter>
        <Button variant="ghost" disabled={submitting} onClick={onDone}>
          {changePasswordContent.cancel}
        </Button>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? changePasswordContent.submitting : changePasswordContent.submit}
        </Button>
      </DialogFooter>
    </form>
  )
}

/* Ô mật khẩu của portal kit với nút Hiện / Ẩn (icon con mắt + chữ, cùng kiểu với các nút có icon khác). */
function PasswordField({
  id,
  label,
  autoComplete,
  error,
  field,
}: {
  id: string
  label: string
  autoComplete: string
  error?: string
  field: UseFormRegisterReturn
}) {
  const [shown, setShown] = useState(false)
  return (
    <Field label={label} htmlFor={id} error={error}>
      <div className="flex gap-2">
        <Input id={id} type={shown ? 'text' : 'password'} autoComplete={autoComplete} aria-invalid={error ? true : undefined} {...field} />
        <Button
          variant="ghost"
          bleed={false}
          icon={shown ? 'visibility_off' : 'visibility'}
          className="shrink-0"
          aria-pressed={shown}
          aria-label={shown ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`}
          onClick={() => setShown((v) => !v)}
        >
          {shown ? 'Ẩn' : 'Hiện'}
        </Button>
      </div>
    </Field>
  )
}
