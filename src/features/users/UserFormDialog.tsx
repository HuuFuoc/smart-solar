import { zodResolver } from '@hookform/resolvers/zod'
import { useId } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/common/stitch-ui/Button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/common/stitch-ui/Dialog'
import { Field } from '@/components/common/stitch-ui/Field'
import { Select } from '@/components/common/stitch-ui/FilterBar'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Input } from '@/components/common/stitch-ui/Input'
import { Switch } from '@/components/common/stitch-ui/Switch'
import { cn } from '@/utils/cn'
import { regionZones, userRoleMap, userRoleValues, userRoles, type UserRecord } from '@/data/users'

/*
 * "Governance Drawer" trong user_management chuyển thành Dialog (theo yêu cầu):
 * mode create = "+ Invite New User" (thêm ô tên/email/phòng ban), mode edit = sửa role, zone, MFA.
 * Validate bằng zod + react-hook-form.
 */
const userFormSchema = z.object({
  name: z.string().trim().min(2, 'Vui lòng nhập họ và tên'),
  email: z.email('Email không hợp lệ'),
  department: z.string().trim().min(2, 'Vui lòng nhập bộ phận'),
  role: z.enum(userRoleValues, { message: 'Vui lòng chọn vai trò' }),
  regions: z.array(z.string()).min(1, 'Chọn ít nhất một khu vực'),
  mfaEnforced: z.boolean(),
})

export type UserFormValues = z.infer<typeof userFormSchema>

export type UserFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  /** Bắt buộc ở mode edit */
  user?: UserRecord
  onSubmit: (values: UserFormValues) => void
}

const emptyValues: UserFormValues = {
  name: '',
  email: '',
  department: '',
  role: 'field-technician',
  regions: [],
  mfaEnforced: true,
}

function valuesFromUser(user: UserRecord): UserFormValues {
  return {
    name: user.name,
    email: user.email,
    department: user.department,
    role: user.role,
    regions: user.regions,
    mfaEnforced: user.mfaEnforced,
  }
}

const roleOptions = userRoles.map((role) => ({ value: role.value, label: role.label }))

function UserForm({ mode, user, onSubmit }: Pick<UserFormDialogProps, 'mode' | 'user' | 'onSubmit'>) {
  const idPrefix = useId()
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: user ? valuesFromUser(user) : emptyValues,
  })

  const role = userRoleMap[watch('role')]
  const isEdit = mode === 'edit'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-space-md" noValidate>
      <DialogHeader>
        <span className="text-label-sm font-semibold text-outline">
          {isEdit ? 'Chỉnh sửa quyền truy cập' : 'Mời người dùng mới'}
        </span>
        <DialogTitle className="mt-0.5">{isEdit && user ? user.name : 'New platform account'}</DialogTitle>
        <DialogDescription className="font-mono text-label-sm">
          {isEdit && user ? `${user.employeeId}, ${user.department}` : 'Cấp tài khoản, vai trò và khu vực truy cập'}
        </DialogDescription>
      </DialogHeader>
      <div className="h-px w-full bg-surface-container-high" />

      {!isEdit && (
        <>
          <Field label="Họ và tên" htmlFor={`${idPrefix}-name`} error={errors.name?.message}>
            <Input id={`${idPrefix}-name`} placeholder="Ví dụ: Nguyễn Văn An" invalid={!!errors.name} {...register('name')} />
          </Field>
          <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
            <Field label="Email công việc" htmlFor={`${idPrefix}-email`} error={errors.email?.message}>
              <Input
                id={`${idPrefix}-email`}
                type="email"
                placeholder="name@smartsolar.io"
                invalid={!!errors.email}
                {...register('email')}
              />
            </Field>
            <Field label="Bộ phận" htmlFor={`${idPrefix}-department`} error={errors.department?.message}>
              <Input
                id={`${idPrefix}-department`}
                placeholder="Ví dụ: Kỹ thuật hiện trường"
                invalid={!!errors.department}
                {...register('department')}
              />
            </Field>
          </div>
        </>
      )}

      <Field
        label="Vai trò chính"
        htmlFor={`${idPrefix}-role`}
        hint={`Cấp truy cập: ${role.clearance}`}
        help={role.description}
        error={errors.role?.message}
      >
        <Select id={`${idPrefix}-role`} size="md" options={roleOptions} {...register('role')} />
      </Field>

      <Controller
        control={control}
        name="regions"
        render={({ field }) => {
          const remaining = regionZones.filter((zone) => !field.value.includes(zone.value))
          return (
            <Field label="Khu vực được truy cập" error={errors.regions?.message}>
              <div className="flex flex-wrap gap-1.5">
                {field.value.map((zoneValue) => {
                  const zone = regionZones.find((z) => z.value === zoneValue)
                  return (
                    <span
                      key={zoneValue}
                      className="inline-flex items-center gap-1 rounded-lg bg-surface-container px-3 py-1 text-label-sm font-medium text-on-surface"
                    >
                      <span>{zone?.label ?? zoneValue}</span>
                      <button
                        type="button"
                        aria-label={`Bỏ ${zone?.label ?? zoneValue}`}
                        onClick={() => field.onChange(field.value.filter((v) => v !== zoneValue))}
                        className="flex items-center hover:text-error"
                      >
                        <Icon name="close" className="text-[13px]" />
                      </button>
                    </span>
                  )
                })}
                {remaining.length > 0 && (
                  <label className="relative inline-flex items-center gap-1 rounded-lg bg-surface-container-low px-3 py-1 text-label-sm text-primary transition-colors hover:bg-surface-container">
                    <Icon name="add" className="text-[14px]" />
                    <span>Thêm khu vực</span>
                    <select
                      aria-label="Thêm khu vực"
                      value=""
                      onChange={(e) => e.target.value && field.onChange([...field.value, e.target.value])}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    >
                      <option value="">Thêm khu vực</option>
                      {remaining.map((zone) => (
                        <option key={zone.value} value={zone.value}>
                          {zone.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            </Field>
          )
        }}
      />

      <div className="flex flex-col gap-space-sm rounded-xl bg-surface-container-low p-space-sm">
        <Controller
          control={control}
          name="mfaEnforced"
          render={({ field }) => (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon
                  name="verified_user"
                  className={cn('text-[20px]', field.value ? 'text-tertiary-container' : 'text-outline')}
                />
                <div className="flex flex-col">
                  <span className="text-label-md font-semibold text-on-surface">MFA phần cứng (FIDO2)</span>
                  <span
                    className={cn(
                      'text-label-sm font-medium',
                      field.value ? 'text-tertiary-container' : 'text-outline',
                    )}
                  >
                    {field.value ? 'Bắt buộc qua YubiKey' : 'Không bắt buộc'}
                  </span>
                </div>
              </div>
              <Switch
                aria-label="Bắt buộc MFA phần cứng"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
              />
            </div>
          )}
        />
        {isEdit && user && (
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Icon name="key" className="text-[20px] text-outline" />
              <div className="flex flex-col">
                <span className="text-label-md font-semibold text-on-surface">Khoá API</span>
                <span className="text-label-sm text-outline">{user.apiTokens} khoá cá nhân đang dùng</span>
              </div>
            </div>
            <button type="button" className="text-label-sm text-error hover:underline">
              Thu hồi tất cả
            </button>
          </div>
        )}
      </div>

      {isEdit && user && user.identityLog.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-label-sm font-semibold text-outline">Nhật ký tài khoản</span>
          <ul className="flex flex-col gap-1.5 rounded-xl bg-surface-container-low/50 p-2.5 text-label-sm text-outline">
            {user.identityLog.map((entry) => (
              <li key={entry.event} className="flex items-center justify-between">
                <span>{entry.event}</span>
                <span>{entry.when}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost" size="md" className="h-11 flex-1 font-semibold text-on-surface">
            Hủy
          </Button>
        </DialogClose>
        <Button type="submit" size="md" iconLeft={isEdit ? 'save' : 'send'} disabled={isSubmitting} className="h-11 flex-1">
          {isEdit ? 'Lưu thay đổi' : 'Gửi lời mời'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function UserFormDialog({ open, onOpenChange, mode, user, onSubmit }: UserFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        {/* key để form khởi tạo lại defaultValues khi đổi user */}
        <UserForm key={user?.id ?? 'new'} mode={mode} user={user} onSubmit={onSubmit} />
      </DialogContent>
    </Dialog>
  )
}
