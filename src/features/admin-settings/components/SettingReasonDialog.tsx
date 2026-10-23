import { useState } from 'react'
import { ModalDialog } from '@/components/common/ui/dialog'
import { Button } from '@/components/common/ui/button'

type SettingReasonDialogProps = {
  open: boolean
  title?: string
  description?: string
  isPending?: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}

export function SettingReasonDialog({
  open,
  title = 'Xác nhận điều chỉnh chính sách',
  description = 'Vui lòng cung cấp lý do thay đổi chính sách để lưu vào nhật ký kiểm toán hệ thống.',
  isPending = false,
  onClose,
  onConfirm,
}: SettingReasonDialogProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = reason.trim()
    if (!trimmed) {
      setError('Lý do điều chỉnh không được để trống.')
      return
    }
    if (trimmed.length < 5) {
      setError('Lý do điều chỉnh phải có tối thiểu 5 ký tự.')
      return
    }
    if (trimmed.length > 500) {
      setError('Lý do điều chỉnh không được vượt quá 500 ký tự.')
      return
    }
    setError(null)
    onConfirm(trimmed)
  }

  const handleClose = () => {
    if (isPending) return
    setReason('')
    setError(null)
    onClose()
  }

  return (
    <ModalDialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <h3 className="text-h3 font-semibold text-fg-1">{title}</h3>
          <p className="mt-1 text-body text-fg-2">{description}</p>
        </div>

        <div>
          <label htmlFor="setting-reason-input" className="block text-meta font-medium text-fg-1">
            Lý do điều chỉnh <span className="text-err">*</span>
          </label>
          <textarea
            id="setting-reason-input"
            rows={3}
            value={reason}
            disabled={isPending}
            onChange={(e) => {
              setReason(e.target.value)
              if (error) setError(null)
            }}
            placeholder="Ví dụ: Tăng thời hạn phản hồi đề xuất theo yêu cầu vận hành quý 4..."
            className="mt-1.5 w-full rounded-control border border-line bg-canvas p-2.5 text-body text-fg-1 outline-none focus:border-accent"
          />
          {error ? (
            <p className="mt-1 text-meta text-err">{error}</p>
          ) : (
            <p className="mt-1 text-meta text-fg-3">Tối thiểu 5 ký tự, tối đa 500 ký tự.</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" disabled={isPending} onClick={handleClose}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={isPending || !reason.trim()}>
            {isPending ? 'Đang lưu…' : 'Xác nhận lưu'}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
