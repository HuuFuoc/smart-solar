import { useState, type FormEvent } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Checkbox, Field, Input } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { ROLE_CODES } from '@/common/user'
import { useCreateUserMutation, useUpdateUserMutation } from '@/hooks/useAdminUsers'
import { errorMessage, isApiError } from '@/services/api/errors'
import type { AdminUserDetail, CreatedAdminUser, UpdatedAdminUser } from '@/types/res/adminUsersRes'

type Form = { email: string; fullName: string; phone: string; roles: string[] }
type Errors = Partial<Record<keyof Form, string>>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^\+?[0-9 .-]{6,20}$/

/* Luật bám CreateAdminUserCommandValidator / UpdateAdminUserCommandValidator (backend main 4d12e4d). */
function validate(f: Form, creating: boolean): Errors {
  const errors: Errors = {}
  const email = f.email.trim()
  if (creating && !email) errors.email = 'Nhập email.'
  else if (email && (!EMAIL.test(email) || email.length > 255)) errors.email = 'Email chưa đúng định dạng.'
  if (!f.fullName.trim()) errors.fullName = 'Nhập họ tên.'
  else if (f.fullName.trim().length > 255) errors.fullName = 'Tối đa 255 ký tự.'
  if (f.phone.trim() && !PHONE.test(f.phone.trim())) errors.phone = 'Số điện thoại 6–20 chữ số (được có +, dấu cách, dấu chấm, gạch).'
  if (creating && f.roles.length === 0) errors.roles = 'Chọn ít nhất một vai trò.'
  return errors
}

function serverErrors(error: unknown): Errors {
  if (!isApiError(error)) return {}
  const out: Errors = {}
  for (const [key, message] of Object.entries(error.fieldErrors)) {
    const field = (['email', 'fullName', 'phone', 'roles'] as const).find((f) => f.toLowerCase() === key.toLowerCase())
    if (field) out[field] = message
  }
  if (error.code === 'AUTH_EMAIL_ALREADY_EXISTS') out.email = 'Email này đã có tài khoản.'
  return out
}

/*
  Tạo hoặc sửa tài khoản. Không có ô mật khẩu: tài khoản mới nhận link đặt mật khẩu qua email (không bao giờ hiện ở đây).
  Sửa thì không đổi vai trò (khối vai trò riêng ở trang chi tiết); đổi email làm mất dấu đã xác minh và gửi link xác minh mới.
*/
export function AccountFormDialog({
  open,
  onOpenChange,
  user,
  onCreated,
  onUpdated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Có là sửa, không có là tạo mới. */
  user?: AdminUserDetail | null
  onCreated?: (result: CreatedAdminUser) => void
  onUpdated?: (result: UpdatedAdminUser) => void
}) {
  return (
    <ModalDialog open={open} onOpenChange={onOpenChange} className="max-w-lg" aria-label={user ? 'Sửa tài khoản' : 'Tạo tài khoản'}>
      <AccountForm user={user ?? null} onClose={() => onOpenChange(false)} onCreated={onCreated} onUpdated={onUpdated} />
    </ModalDialog>
  )
}

function AccountForm({
  user,
  onClose,
  onCreated,
  onUpdated,
}: {
  user: AdminUserDetail | null
  onClose: () => void
  onCreated?: (result: CreatedAdminUser) => void
  onUpdated?: (result: UpdatedAdminUser) => void
}) {
  const creating = !user
  const [form, setForm] = useState<Form>(() => ({
    email: user?.email ?? '',
    fullName: user?.fullName ?? '',
    phone: user?.phone ?? '',
    roles: user ? [...user.roles] : [],
  }))
  const [errors, setErrors] = useState<Errors>({})
  const [failure, setFailure] = useState<string | null>(null)
  const create = useCreateUserMutation()
  const update = useUpdateUserMutation()
  const busy = create.isPending || update.isPending
  const emailChanged = user !== null && form.email.trim().toLowerCase() !== user.email.toLowerCase()

  const edit = (patch: Partial<Form>) => {
    setForm((f) => ({ ...f, ...patch }))
    setErrors((e) => {
      const next = { ...e }
      for (const key of Object.keys(patch)) delete next[key as keyof Form]
      return next
    })
    setFailure(null)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const found = validate(form, creating)
    if (Object.keys(found).length > 0) return setErrors(found)
    try {
      if (!user) {
        const result = await create.mutateAsync({
          email: form.email.trim(),
          fullName: form.fullName.trim(),
          phone: form.phone.trim() || null,
          roles: form.roles,
        })
        onCreated?.(result)
      } else {
        const result = await update.mutateAsync({
          id: user.id,
          body: { fullName: form.fullName.trim(), phone: form.phone.trim() || null, email: emailChanged ? form.email.trim() : null },
        })
        onUpdated?.(result)
      }
      onClose()
    } catch (error) {
      const fields = serverErrors(error)
      setErrors(fields)
      if (Object.keys(fields).length === 0) setFailure(errorMessage(error))
    }
  }

  return (
    <form noValidate onSubmit={submit}>
      <DialogTitle>{creating ? 'Tạo tài khoản' : 'Sửa tài khoản'}</DialogTitle>
      <div className="mt-4 space-y-4">
        <Field label="Email" htmlFor="account-email" required={creating} error={errors.email}>
          <Input
            id="account-email"
            type="email"
            autoComplete="off"
            maxLength={255}
            value={form.email}
            onChange={(e) => edit({ email: e.target.value })}
            aria-invalid={Boolean(errors.email)}
          />
        </Field>
        {emailChanged && <Notice tone="warn">Đổi email thì tài khoản phải xác minh lại email mới; hệ thống gửi link xác minh tới địa chỉ mới.</Notice>}
        <Field label="Họ tên" htmlFor="account-name" required error={errors.fullName}>
          <Input id="account-name" maxLength={255} value={form.fullName} onChange={(e) => edit({ fullName: e.target.value })} aria-invalid={Boolean(errors.fullName)} />
        </Field>
        <Field label="Điện thoại" htmlFor="account-phone" hint="Không bắt buộc." error={errors.phone}>
          <Input id="account-phone" type="tel" maxLength={20} value={form.phone} onChange={(e) => edit({ phone: e.target.value })} aria-invalid={Boolean(errors.phone)} />
        </Field>
        {creating && (
          <fieldset>
            <legend className="text-body font-medium text-fg">
              Vai trò
              <span aria-hidden className="text-danger">
                {' *'}
              </span>
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {ROLE_CODES.map((r) => (
                <Checkbox
                  key={r.value}
                  label={r.label}
                  checked={form.roles.includes(r.value)}
                  onChange={(e) => edit({ roles: e.target.checked ? [...form.roles, r.value] : form.roles.filter((x) => x !== r.value) })}
                />
              ))}
            </div>
            {errors.roles && (
              <p className="mt-2 text-meta text-danger" role="alert">
                {errors.roles}
              </p>
            )}
          </fieldset>
        )}
        {creating && <p className="text-meta text-fg-2">Không cần đặt mật khẩu: người dùng nhận link qua email để tự đặt mật khẩu và kích hoạt tài khoản.</p>}
      </div>
      <DialogFooter className="items-center">
        {failure && (
          <p className="flex basis-full items-center gap-1.5 text-body font-medium text-danger" role="alert">
            <Icon name="error" className="shrink-0 text-[20px]" />
            {failure}
          </p>
        )}
        <Button variant="ghost" disabled={busy} onClick={onClose}>
          Huỷ
        </Button>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Đang lưu…' : creating ? 'Tạo tài khoản' : 'Lưu thay đổi'}
        </Button>
      </DialogFooter>
    </form>
  )
}
