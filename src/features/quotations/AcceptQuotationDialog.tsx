import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Notice } from '@/components/common/ui/lists'
import { formatQuotationMoney } from '@/features/quotations/quotationDisplay'
import { useAcceptMyQuotationMutation } from '@/hooks/useCustomerQuotations'
import { errorMessage } from '@/services/api/errors'
import type { QuotationView } from '@/types/res/quotationsRes'

// Khách xác nhận đồng ý báo giá. Đồng ý rồi thì không đổi lại được; hợp đồng lập theo đúng bản này

type Props = { open: boolean; quotation: QuotationView; onClose: () => void }

export function AcceptQuotationDialog({ open, quotation: q, onClose }: Props) {
  const accept = useAcceptMyQuotationMutation()
  const [error, setError] = useState<string | null>(null)
  const close = () => {
    setError(null)
    onClose()
  }

  async function submit() {
    setError(null)
    try {
      await accept.mutateAsync(q.quotationId)
      toast.success('Đã đồng ý báo giá.')
      close()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={(next) => !next && !accept.isPending && close()}
      dismissible={!accept.isPending}
      aria-label="Đồng ý báo giá"
    >
      <DialogTitle>Đồng ý báo giá?</DialogTitle>
      <div className="mt-2 space-y-3 text-body text-fg-2">
        <p>
          Tổng cộng{' '}
          <span className="tnum font-semibold text-fg">{formatQuotationMoney(q.totalAmount, q.currency)}</span> gồm thuế
          VAT.
        </p>
        <p>
          Đồng ý rồi thì không đổi lại được. Smart Solar lập hợp đồng theo đúng báo giá này. Cần đổi hạng mục hay giá,
          chọn Yêu cầu sửa thay vì đồng ý.
        </p>
      </div>
      {error && (
        <div role="alert" className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={accept.isPending} onClick={close}>
          Đóng
        </Button>
        <Button icon="check_circle" variant="primary" disabled={accept.isPending} onClick={() => void submit()}>
          {accept.isPending ? 'Đang gửi…' : 'Đồng ý báo giá'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
