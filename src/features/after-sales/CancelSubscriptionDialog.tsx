import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Textarea } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { cancelMode } from '@/features/after-sales/afterSalesDisplay'
import { useCancelSubscriptionMutation } from '@/hooks/useCustomerAfterSales'
import { errorMessage } from '@/services/api/errors'
import type { SubscriptionView } from '@/types/res/customerAfterSalesRes'

// Backend chỉ giữ 500 ký tự đầu của lý do, chặn ở ô nhập để không mất chữ
const REASON_MAX = 500

const COPY = {
  unpaid: {
    title: (name: string) => `Huỷ đơn mua ${name}?`,
    body: 'Đơn chưa thanh toán bị huỷ ngay cùng link PayOS của nó. Nếu link đó có gói khác thì gói đó phải mua lại; nếu có tiền hợp đồng thì hợp đồng thanh toán lại sau. Nếu PayOS đã nhận tiền trước lúc huỷ, đơn được giữ là đã thanh toán và thành yêu cầu huỷ chờ quản lý duyệt.',
    submit: 'Huỷ đơn',
    variant: 'danger-solid',
  },
  paid: {
    title: (name: string) => `Yêu cầu huỷ ${name}?`,
    body: 'Gói đã thanh toán nhưng chưa hiệu lực. Quản lý xét yêu cầu; nếu đồng ý, số tiền hoàn do quản lý quyết định (tối đa bằng giá gói) và được chuyển trả ngoài hệ thống.',
    submit: 'Gửi yêu cầu huỷ',
    variant: 'danger',
  },
} as const

/** Huỷ gói trước khi hiệu lực. Câu báo dựa vào trạng thái backend trả về, không tự đánh dấu đã huỷ */
export function CancelSubscriptionDialog({
  subscription,
  onClose,
}: {
  /** null: hộp thoại đóng */
  subscription: SubscriptionView | null
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cancel = useCancelSubscriptionMutation()
  const mode = subscription ? cancelMode(subscription.status) : null
  const copy = mode ? COPY[mode] : null

  function close() {
    if (cancel.isPending) return
    setReason('')
    setFieldError(null)
    setError(null)
    onClose()
  }

  async function confirm() {
    if (!subscription || cancel.isPending) return
    const text = reason.trim()
    setError(null)
    if (!text) {
      setFieldError('Ghi lý do huỷ.')
      return
    }
    setFieldError(null)
    try {
      const result = await cancel.mutateAsync({ subscriptionId: subscription.subscriptionId, reason: text })
      if (result.status === 'CANCELLED') toast.success('Đã huỷ đơn mua gói.')
      else if (result.status === 'CANCELLATION_REQUESTED') toast.success('Đã gửi yêu cầu huỷ. Quản lý sẽ xét duyệt.')
      else toast.success('Đã gửi yêu cầu.')
      setReason('')
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <ModalDialog
      open={subscription !== null}
      onOpenChange={(open) => !open && close()}
      dismissible={!cancel.isPending}
      aria-label={subscription && copy ? copy.title(subscription.packageName) : undefined}
    >
      {subscription &&
        (copy ? (
          <>
            <DialogTitle>{copy.title(subscription.packageName)}</DialogTitle>
            <p className="mt-2 text-body text-fg-2">{copy.body}</p>
            <Field
              label="Lý do"
              htmlFor="cancel-subscription-reason"
              hint={`Bắt buộc, tối đa ${REASON_MAX} ký tự.`}
              error={fieldError ?? undefined}
              required
              className="mt-4"
            >
              <Textarea
                id="cancel-subscription-reason"
                rows={3}
                maxLength={REASON_MAX}
                aria-required
                value={reason}
                aria-invalid={fieldError ? true : undefined}
                onChange={(e) => {
                  setReason(e.target.value)
                  if (fieldError) setFieldError(null)
                }}
              />
            </Field>
            {error && (
              <div role="alert" className="mt-4">
                <Notice tone="danger">{error}</Notice>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" disabled={cancel.isPending} onClick={close}>
                Giữ gói
              </Button>
              <Button variant={copy.variant} disabled={cancel.isPending} onClick={() => void confirm()}>
                {cancel.isPending ? 'Đang gửi…' : copy.submit}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogTitle>Không huỷ được gói này</DialogTitle>
            <p className="mt-2 text-body text-fg-2">Gói đã hiệu lực hoặc đã kết thúc nên không huỷ trên mạng được.</p>
            <DialogFooter>
              <Button variant="ghost" onClick={close}>
                Đóng
              </Button>
            </DialogFooter>
          </>
        ))}
    </ModalDialog>
  )
}
