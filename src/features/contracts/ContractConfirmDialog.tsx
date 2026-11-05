import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Notice } from '@/components/common/ui/lists'
import { contractErrorMessage } from '@/features/contracts/contractDisplay'

// Hỏi xác nhận một lệnh đổi trạng thái hợp đồng (phát hành, gửi khách ký, duyệt bản ký). Lỗi thì giữ hộp thoại và hiện
// lỗi; hợp đồng đã được tải lại nên người dùng đóng hộp thoại để xem trạng thái mới, không tự gửi lại
export function ContractConfirmDialog({
  title,
  children,
  confirmLabel,
  icon,
  successText,
  run,
  onClose,
  variant = 'primary',
  formatError = contractErrorMessage,
}: {
  title: string
  children: ReactNode
  confirmLabel: string
  icon: string
  successText: string
  run: () => Promise<unknown>
  onClose: () => void
  variant?: 'primary' | 'danger-solid'
  /** Câu lỗi theo người xem; mặc định là câu cho nhân viên */
  formatError?: (error: unknown) => string
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    setPending(true)
    try {
      await run()
      toast.success(successText)
      onClose()
    } catch (e) {
      setError(formatError(e))
    } finally {
      setPending(false)
    }
  }

  return (
    <ModalDialog open onOpenChange={(open) => !open && !pending && onClose()} dismissible={!pending} aria-label={title}>
      <DialogTitle>{title}</DialogTitle>
      <div className="mt-2 space-y-3 text-body text-fg-2">{children}</div>
      {error && (
        <div role="alert" className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={pending} onClick={onClose}>
          Đóng
        </Button>
        <Button icon={icon} variant={variant} disabled={pending} onClick={() => void submit()}>
          {pending ? 'Đang gửi…' : confirmLabel}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
