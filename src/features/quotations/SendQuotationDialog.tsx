import { toast } from 'sonner'
import { useState } from 'react'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Notice } from '@/components/common/ui/lists'
import { formatDateVn, formatQuotationMoney } from '@/features/quotations/quotationDisplay'
import { useSendQuotationMutation } from '@/hooks/useSalesQuotations'
import { errorMessage } from '@/services/api/errors'
import type { QuotationView } from '@/types/res/quotationsRes'

// Xác nhận gửi bản nháp cho khách. Gửi rồi thì bản này không sửa được; bản trước (nếu có) hết hiệu lực cùng lúc

type Props = {
  open: boolean
  quotation: QuotationView
  /** Bản đang gửi khách sẽ bị thay */
  replacing: QuotationView | null
  onClose: () => void
}

export function SendQuotationDialog({ open, quotation: q, replacing, onClose }: Props) {
  const send = useSendQuotationMutation()
  const [error, setError] = useState<string | null>(null)
  // Lỗi của lần trước không hiện lại khi mở hộp thoại lần sau
  const close = () => {
    setError(null)
    onClose()
  }

  async function submit() {
    setError(null)
    try {
      await send.mutateAsync({ quotationId: q.quotationId, revision: q.revision })
      toast.success('Đã gửi báo giá cho khách.')
      close()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={(next) => !next && !send.isPending && close()}
      dismissible={!send.isPending}
      aria-label="Gửi báo giá cho khách"
    >
      <DialogTitle>Gửi báo giá cho khách?</DialogTitle>
      <div className="mt-2 space-y-3 text-body text-fg-2">
        <p>
          Tổng cộng{' '}
          <span className="tnum font-semibold text-fg">{formatQuotationMoney(q.totalAmount, q.currency)}</span> cho{' '}
          {q.lines.length} dòng hàng, hiệu lực đến hết ngày{' '}
          <span className="tnum text-fg">{formatDateVn(q.validUntil)}</span>.
        </p>
        <p>
          Khách xem trên cổng khách hàng rồi đồng ý hoặc yêu cầu sửa. Đã gửi thì không sửa được; muốn đổi, bạn lập bản
          sửa.
        </p>
        {replacing && <p>Bản {replacing.version} khách đang có sẽ hết hiệu lực khi bản này được gửi.</p>}
      </div>
      {error && (
        <div role="alert" className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={send.isPending} onClick={close}>
          Đóng
        </Button>
        <Button icon="send" variant="primary" disabled={send.isPending} onClick={() => void submit()}>
          {send.isPending ? 'Đang gửi…' : 'Gửi cho khách'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
