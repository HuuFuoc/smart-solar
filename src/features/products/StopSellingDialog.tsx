import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import type { ProductResponse } from '@/types/res/adminProductsRes'

// Hỏi lại trước khi ngừng bán. Khách và nhân viên không thấy sản phẩm nữa, trang quản trị vẫn thấy để mở bán lại

export type StopSellingDialogProps = {
  product: ProductResponse | null
  busy: boolean
  onConfirm: (product: ProductResponse) => void
  onOpenChange: (open: boolean) => void
  onAfterClose?: () => void
}

export function StopSellingDialog({ product, busy, onConfirm, onOpenChange, onAfterClose }: StopSellingDialogProps) {
  return (
    <ModalDialog
      open={Boolean(product)}
      onOpenChange={onOpenChange}
      dismissible={!busy}
      onAfterClose={onAfterClose}
      aria-label="Ngừng bán sản phẩm"
    >
      <DialogTitle>Ngừng bán {product?.name}?</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Khách và nhân viên không thấy sản phẩm này trong danh mục nữa. Mở bán lại được bất cứ lúc nào.
      </p>
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={busy} onClick={() => onOpenChange(false)}>
          Huỷ
        </Button>
        <Button icon="pause_circle" variant="warn" disabled={busy} onClick={() => product && onConfirm(product)}>
          {busy ? 'Đang ngừng bán…' : 'Ngừng bán'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
