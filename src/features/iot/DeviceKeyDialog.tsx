import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Checkbox } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'

// Hiện khoá thiết bị đúng một lần sau khi đăng ký hoặc đổi key. Khoá chỉ nằm trong props của hộp thoại: nơi gọi xoá khỏi state khi
// đóng; không ghi storage, URL, log hay cache. Đóng chỉ được khi người dùng xác nhận đã chép (khoá không xem lại được)

export type DeviceKey = { deviceId: string; secret: string; secretVersion: number; rotated: boolean }

export function DeviceKeyDialog({ value, onClose }: { value: DeviceKey; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value.secret)
      setCopied(true)
      toast.success('Đã chép khoá thiết bị.')
    } catch {
      toast.error('Trình duyệt không cho chép tự động. Bôi đen khoá rồi chép bằng tay.')
    }
  }

  return (
    <ModalDialog
      open
      onOpenChange={(open) => !open && confirmed && onClose()}
      dismissible={confirmed}
      className="max-w-xl"
      aria-label="Khoá thiết bị"
    >
      <DialogTitle>{value.rotated ? 'Khoá thiết bị mới' : 'Đã đăng ký thiết bị'}</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Thiết bị <span className="tnum font-medium text-fg">{value.deviceId}</span>, khoá phiên bản{' '}
        <span className="tnum">{value.secretVersion}</span>.
        {value.rotated && ' Khoá cũ đã hết hiệu lực: thiết bị phải nạp khoá mới mới gửi được số đo.'}
      </p>
      <div className="mt-4 space-y-4">
        <Notice tone="warn" title="Khoá chỉ hiện một lần">
          Chép khoá này vào cấu hình firmware của ESP32 (header X-Device-Key). Đóng hộp thoại là không xem lại được; mất
          khoá thì phải đổi khoá mới.
        </Notice>
        <div>
          <label htmlFor="iot-device-key" className="text-meta text-fg-2">
            Khoá thiết bị
          </label>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <input
              id="iot-device-key"
              readOnly
              value={value.secret}
              autoComplete="off"
              spellCheck={false}
              onFocus={(e) => e.currentTarget.select()}
              className="tnum min-w-0 flex-1 rounded-control border border-line bg-field px-3 py-2 font-mono text-body text-fg"
            />
            <Button icon={copied ? 'check' : 'content_copy'} variant="soft" onClick={() => void copy()}>
              {copied ? 'Đã chép' : 'Chép khoá'}
            </Button>
          </div>
        </div>
        <Checkbox
          label="Tôi đã chép và cất khoá ở nơi an toàn"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
      </div>
      <DialogFooter>
        <Button icon="close" variant="primary" disabled={!confirmed} onClick={onClose}>
          Đóng
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
