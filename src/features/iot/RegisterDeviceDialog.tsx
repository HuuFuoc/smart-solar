import { useState } from 'react'
import { IOT_LIMITS } from '@/common/iot'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Input, WithUnit, fieldMessageId } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { iotErrorMessage } from '@/features/iot/iotDisplay'
import { registerBody, registerErrors, type RegisterErrors, type RegisterForm } from '@/features/iot/iotRules'
import { useRegisterIotDeviceMutation } from '@/hooks/useIot'
import { isApiError } from '@/services/api/errors'
import type { IotDeviceCredentialView } from '@/types/res/iotMonitoringRes'

// Đăng ký thiết bị ESP32 (quản trị). Dải đo để trống thì backend dùng dải mặc định của cấu hình (IotMonitoring:DefaultMaxCurrentAmps),
// không điền sẵn một loại cảm biến. Đăng ký xong trả khoá cho nơi gọi hiện một lần rồi xoá

const EMPTY: RegisterForm = { deviceId: '', displayName: '', sensorModel: '', maxCurrentAmps: '' }

/** Lỗi theo ô của backend (`fieldErrors`) về đúng ô của form */
function serverFieldErrors(error: unknown): RegisterErrors {
  if (!isApiError(error)) return {}
  const out: RegisterErrors = {}
  for (const key of ['deviceId', 'displayName', 'sensorModel', 'maxCurrentAmps'] as const) {
    const message = error.fieldErrors[key]
    if (message) out[key] = 'Giá trị chưa hợp lệ.'
  }
  if (error.code === 'IOT_DEVICE_ID_TAKEN') out.deviceId = 'Mã thiết bị này đã được đăng ký. Dùng mã khác.'
  return out
}

export function RegisterDeviceDialog({
  onClose,
  onRegistered,
}: {
  onClose: () => void
  onRegistered: (credential: IotDeviceCredentialView) => void
}) {
  const register = useRegisterIotDeviceMutation()
  const [form, setForm] = useState<RegisterForm>(EMPTY)
  const [errors, setErrors] = useState<RegisterErrors>({})
  const [error, setError] = useState<string | null>(null)
  const set = (patch: Partial<RegisterForm>) => setForm((f) => ({ ...f, ...patch }))
  const busy = register.isPending

  async function submit() {
    setError(null)
    const next = registerErrors(form)
    setErrors(next)
    if (Object.keys(next).length > 0) return
    try {
      const credential = await register.mutateAsync(registerBody(form))
      // Khoá chuyển thẳng cho hộp thoại hiện một lần; xoá khỏi bộ nhớ của mutation ngay
      register.reset()
      onRegistered(credential)
    } catch (e) {
      setErrors(serverFieldErrors(e))
      setError(iotErrorMessage(e))
    }
  }

  return (
    <ModalDialog
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      dismissible={!busy}
      className="max-w-xl"
      aria-label="Đăng ký thiết bị IoT"
    >
      <DialogTitle>Đăng ký thiết bị IoT</DialogTitle>
      <form
        className="mt-4 space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <Field
          label="Mã thiết bị"
          htmlFor="iot-device-id"
          required
          error={errors.deviceId}
          hint="Mã nạp trong firmware (ví dụ ESP32-001): 3–64 ký tự chữ, số, dấu . _ -; hệ thống lưu chữ hoa."
        >
          <Input
            id="iot-device-id"
            value={form.deviceId}
            maxLength={IOT_LIMITS.deviceIdMax}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(errors.deviceId) || undefined}
            aria-describedby={fieldMessageId('iot-device-id')}
            onChange={(e) => set({ deviceId: e.target.value })}
          />
        </Field>
        <Field label="Tên thiết bị" htmlFor="iot-display-name" required error={errors.displayName}>
          <Input
            id="iot-display-name"
            value={form.displayName}
            maxLength={IOT_LIMITS.displayNameMax}
            placeholder="Ví dụ: Kẹp dòng inverter nhà anh A"
            aria-invalid={Boolean(errors.displayName) || undefined}
            aria-describedby={fieldMessageId('iot-display-name')}
            onChange={(e) => set({ displayName: e.target.value })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cảm biến" htmlFor="iot-sensor" optional error={errors.sensorModel}>
            <Input
              id="iot-sensor"
              value={form.sensorModel}
              maxLength={IOT_LIMITS.sensorModelMax}
              placeholder="Ví dụ: ACS712-30A"
              aria-invalid={Boolean(errors.sensorModel) || undefined}
              aria-describedby={fieldMessageId('iot-sensor')}
              onChange={(e) => set({ sensorModel: e.target.value })}
            />
          </Field>
          <Field
            label="Dải đo tối đa"
            htmlFor="iot-max-amps"
            optional
            error={errors.maxCurrentAmps}
            hint="Bỏ trống thì dùng dải mặc định của hệ thống. Số đo vượt dải bị từ chối."
          >
            <WithUnit unit="A">
              <Input
                id="iot-max-amps"
                inputMode="decimal"
                value={form.maxCurrentAmps}
                className="tnum"
                aria-invalid={Boolean(errors.maxCurrentAmps) || undefined}
                aria-describedby={fieldMessageId('iot-max-amps')}
                onChange={(e) => set({ maxCurrentAmps: e.target.value })}
              />
            </WithUnit>
          </Field>
        </div>
        {error && (
          <div role="alert">
            <Notice tone="danger">{error}</Notice>
          </div>
        )}
        <DialogFooter>
          <Button icon="close" variant="secondary" disabled={busy} onClick={onClose}>
            Đóng
          </Button>
          <Button type="submit" icon="add" variant="primary" disabled={busy}>
            {busy ? 'Đang đăng ký…' : 'Đăng ký'}
          </Button>
        </DialogFooter>
      </form>
    </ModalDialog>
  )
}
