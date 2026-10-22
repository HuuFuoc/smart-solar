import { useState, type ComponentProps, type ReactNode } from 'react'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Textarea } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { errorMessage } from '@/services/api/errors'

// Hộp thoại hỏi một lý do / ghi chú bắt buộc rồi gửi. Dùng cho huỷ, từ chối, không đồng ý, khách vắng; báo giá lắp đặt
// dùng cho khách yêu cầu sửa. Backend sau bán hàng cắt lý do dài hơn 1000 ký tự nên mặc định chặn ở ô nhập

const MAX = 1000

type Props = {
  open: boolean
  title: string
  description?: ReactNode
  label?: string
  /** Số ký tự tối đa backend nhận */
  maxLength?: number
  submitLabel: string
  variant?: ComponentProps<typeof Button>['variant']
  /** Icon của nút gửi, mặc định là gửi */
  icon?: string
  /** Lỗi thì giữ hộp thoại và hiện lỗi; xong thì đóng */
  onSubmit: (text: string) => Promise<unknown>
  onClose: () => void
}

export function ReasonDialog({ open, title, onClose, ...rest }: Props) {
  const [pending, setPending] = useState(false)
  return (
    <ModalDialog
      open={open}
      onOpenChange={(next) => !next && !pending && onClose()}
      dismissible={!pending}
      aria-label={title}
    >
      <ReasonForm title={title} onClose={onClose} pending={pending} setPending={setPending} {...rest} />
    </ModalDialog>
  )
}

function ReasonForm({
  title,
  description,
  label = 'Lý do',
  maxLength = MAX,
  submitLabel,
  variant = 'primary',
  icon = 'send',
  onSubmit,
  onClose,
  pending,
  setPending,
}: Omit<Props, 'open'> & { pending: boolean; setPending: (pending: boolean) => void }) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!text.trim()) return setError(`Ghi ${label.toLowerCase()}.`)
    setError(null)
    setPending(true)
    try {
      await onSubmit(text.trim())
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <DialogTitle>{title}</DialogTitle>
      {description && <div className="mt-2 text-body text-fg-2">{description}</div>}
      <Field label={label} htmlFor="reason-dialog-text" required className="mt-4">
        <Textarea
          id="reason-dialog-text"
          rows={3}
          maxLength={maxLength}
          aria-required
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </Field>
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
          {pending ? 'Đang gửi…' : submitLabel}
        </Button>
      </DialogFooter>
    </>
  )
}
