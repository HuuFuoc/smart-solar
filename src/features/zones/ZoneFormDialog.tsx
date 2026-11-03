import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Checkbox, Field, Input, Select } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { blockingWorkText, zoneInUseOf } from '@/features/zones/zoneDisplay'
import { ZONE_LIMITS, normalizeZoneCode, stopsNewWork, zoneCodeError, zoneNameError } from '@/features/zones/zoneRules'
import { useAdminUsersQuery } from '@/hooks/useAdminUsers'
import { useCreateZoneMutation, useUpdateZoneMutation } from '@/hooks/useOperationalZones'
import { errorMessage, isApiError } from '@/services/api/errors'
import type { OperationalZoneListItem } from '@/types/res/operationalZonesRes'

// Tạo / sửa khu vực phục vụ. Mã chỉ nhập lúc tạo. Sửa gửi revision lúc mở form: khu vừa bị sửa ở nơi khác thì báo, không ghi đè

/** Quản lý phụ trách: tài khoản quản lý đang hoạt động (backend nhận cả quản trị viên) */
const MANAGERS = { role: 'MANAGER', status: 'ACTIVE', pageSize: 100, sort: 'name', direction: 'asc' } as const

function fieldError(error: unknown, field: string) {
  if (!isApiError(error)) return undefined
  const key = Object.keys(error.fieldErrors).find((k) => k.toLowerCase() === field.toLowerCase())
  return key ? error.fieldErrors[key] : undefined
}

function ZoneForm({
  zone,
  create,
  update,
  onDone,
  onCreated,
}: {
  zone: OperationalZoneListItem | null
  create: ReturnType<typeof useCreateZoneMutation>
  update: ReturnType<typeof useUpdateZoneMutation>
  onDone: () => void
  onCreated?: (zone: OperationalZoneListItem) => void
}) {
  const managers = useAdminUsersQuery(MANAGERS)
  const saving = create.isPending || update.isPending
  const [code, setCode] = useState('')
  const [name, setName] = useState(zone?.name ?? '')
  const [managerId, setManagerId] = useState(zone?.responsibleManagerUserId ?? '')
  const [isActive, setIsActive] = useState(zone?.isActive ?? true)
  const [isServiceable, setIsServiceable] = useState(zone?.isServiceable ?? true)
  const [checked, setChecked] = useState(false)
  const [serverError, setServerError] = useState<unknown>(null)

  const codeError = !zone && checked ? (zoneCodeError(code) ?? fieldError(serverError, 'code')) : undefined
  const nameError = checked ? (zoneNameError(name) ?? fieldError(serverError, 'name')) : undefined
  const codeTaken = isApiError(serverError) && serverError.code === 'ZONE_CODE_EXISTS'
  const managerInvalid = isApiError(serverError) && serverError.code === 'RESPONSIBLE_MANAGER_INVALID'
  const inUse = zoneInUseOf(serverError)
  const options = managers.data?.items ?? []
  const stopping = zone ? stopsNewWork(zone, { isActive, isServiceable }) : false

  async function submit() {
    if (saving) return
    setChecked(true)
    setServerError(null)
    if ((!zone && zoneCodeError(code)) || zoneNameError(name)) {
      document.getElementById(!zone && zoneCodeError(code) ? 'zone-code' : 'zone-name')?.focus()
      return
    }
    const manager = managerId || null
    try {
      if (zone) {
        await update.mutateAsync({
          zoneId: zone.zoneId,
          body: {
            name: name.trim(),
            isActive,
            isServiceable,
            responsibleManagerUserId: manager,
            revision: zone.revision,
          },
        })
        toast.success(`Đã lưu ${name.trim()}`)
        onDone()
      } else {
        const view = await create.mutateAsync({
          code: normalizeZoneCode(code),
          name: name.trim(),
          isActive,
          isServiceable,
          responsibleManagerUserId: manager,
        })
        toast.success(`Đã tạo khu ${view.code}`)
        onDone()
        onCreated?.(view)
      }
    } catch (e) {
      // Khu đã đổi ở nơi khác: dữ liệu đã tải lại, đóng form để mở lại với bản mới
      if (isApiError(e) && e.code === 'ZONE_STALE_REVISION') {
        toast.error(errorMessage(e))
        onDone()
        return
      }
      setServerError(e)
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <DialogTitle>{zone ? `Sửa khu ${zone.code}` : 'Thêm khu vực'}</DialogTitle>
      <p className="mt-1 text-body text-fg-2">Ô có dấu * là bắt buộc.</p>
      <div className="mt-4 space-y-4">
        {!zone && (
          <Field
            label="Mã khu"
            required
            htmlFor="zone-code"
            error={codeError ?? (codeTaken ? errorMessage(serverError) : undefined)}
            hint="Chữ A–Z, số và dấu gạch ngang, ví dụ KHU-THU-DUC. Không đổi được sau khi tạo."
          >
            <Input
              id="zone-code"
              className="font-mono uppercase"
              value={code}
              maxLength={ZONE_LIMITS.codeMax}
              autoCapitalize="characters"
              aria-required
              aria-invalid={codeError || codeTaken ? true : undefined}
              onChange={(e) => {
                setCode(e.target.value)
                setServerError(null)
              }}
              onBlur={() => setCode((c) => normalizeZoneCode(c))}
            />
          </Field>
        )}
        <Field label="Tên khu" required htmlFor="zone-name" error={nameError}>
          <Input
            id="zone-name"
            value={name}
            maxLength={ZONE_LIMITS.nameMax}
            aria-required
            aria-invalid={nameError ? true : undefined}
            onChange={(e) => {
              setName(e.target.value)
              setServerError(null)
            }}
          />
        </Field>
        <Field
          label="Quản lý phụ trách"
          htmlFor="zone-manager"
          error={
            managerInvalid ? errorMessage(serverError) : managers.isError ? errorMessage(managers.error) : undefined
          }
          hint="Không bắt buộc."
        >
          <Select
            id="zone-manager"
            value={managerId}
            disabled={managers.isPending}
            onChange={(e) => {
              setManagerId(e.target.value)
              setServerError(null)
            }}
          >
            <option value="">{managers.isPending ? 'Đang tải danh sách…' : 'Chưa có người phụ trách'}</option>
            {managerId && !options.some((m) => m.id === managerId) && (
              <option value={managerId}>Người phụ trách hiện tại (không còn trong danh sách quản lý)</option>
            )}
            {options.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName || m.email}
              </option>
            ))}
          </Select>
        </Field>
        <Checkbox
          label="Đang hoạt động"
          description="Bỏ chọn là ngừng dùng khu (không xoá khu). Phường, xã của khu ngừng hoạt động gán được sang khu khác."
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        <Checkbox
          label="Nhận lịch mới"
          description='Bỏ chọn là tạm ngừng: khách ở khu này không tự đặt giờ khảo sát được, mà được chuyển sang "Nhờ xếp kỹ thuật viên".'
          checked={isServiceable}
          onChange={(e) => setIsServiceable(e.target.checked)}
        />
        {stopping && (
          <Notice tone="warn">
            Khu còn lịch khảo sát hoặc công trình chưa xong thì không tắt được. Lịch đã xác nhận không bị chuyển ngầm
            sang người khác.
          </Notice>
        )}
        {serverError != null && !codeTaken && !managerInvalid && (
          <div role="alert">
            <Notice tone="danger">
              {errorMessage(serverError)}
              {inUse && (
                <span className="mt-1 block">
                  Đang chặn: {blockingWorkText(inUse.blockingAppointments, inUse.blockingInstallationProjects)}.
                </span>
              )}
            </Notice>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={saving} onClick={onDone}>
          Huỷ
        </Button>
        <Button icon="save" type="submit" variant="primary" disabled={saving}>
          {saving ? 'Đang lưu…' : zone ? 'Lưu thay đổi' : 'Thêm khu'}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** `zone` có thì là sửa */
export function ZoneFormDialog({
  open,
  zone,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  zone: OperationalZoneListItem | null
  onOpenChange: (open: boolean) => void
  onCreated?: (zone: OperationalZoneListItem) => void
}) {
  const create = useCreateZoneMutation()
  const update = useUpdateZoneMutation()
  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      dismissible={!create.isPending && !update.isPending}
      aria-label={zone ? 'Sửa khu vực' : 'Thêm khu vực'}
      className="max-h-[calc(100dvh-2rem)] max-w-xl overflow-y-auto"
    >
      {open && (
        <ZoneForm
          zone={zone}
          create={create}
          update={update}
          onDone={() => onOpenChange(false)}
          onCreated={onCreated}
        />
      )}
    </ModalDialog>
  )
}
