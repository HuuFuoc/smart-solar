import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Notice } from '@/components/common/ui/lists'
import { useDeleteProductMutation } from '@/hooks/useProducts'
import { errorMessage } from '@/services/api/errors'
import type { ProductResponse } from '@/types/res/adminProductsRes'

/* Xác nhận trước khi gọi DELETE /api/admin/products/{id}. */

export type DeleteProductDialogProps = {
  product: ProductResponse | null
  onOpenChange: (open: boolean) => void
  /** Sau khi xoá: dòng đã mở hộp thoại biến mất, trang chuyển focus tới chỗ khác. */
  onDeleted?: () => void
  /** Chuyển tiếp tới ModalDialog: chạy sau khi hộp thoại đã đóng và trả focus. */
  onAfterClose?: () => void
}

export function DeleteProductDialog({ product, onOpenChange, onDeleted, onAfterClose }: DeleteProductDialogProps) {
  const mutation = useDeleteProductMutation()

  const confirm = async () => {
    if (!product?.id) return
    try {
      await mutation.mutateAsync(product.id)
      toast.success(`Đã xoá ${product.name}`)
      onOpenChange(false)
      onDeleted?.()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <ModalDialog
      open={Boolean(product)}
      onOpenChange={onOpenChange}
      dismissible={!mutation.isPending}
      onAfterClose={onAfterClose}
      aria-label="Xoá sản phẩm"
    >
      <DialogTitle>Xoá sản phẩm?</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        <span className="font-medium text-fg">{product?.name}</span> (<span className="tnum">{product?.sku}</span>) sẽ
        bị xoá khỏi danh mục. Nếu chỉ muốn tạm ẩn, hãy chuyển sang Ngừng bán.
      </p>
      <Notice tone="danger" className="mt-4">
        Không hoàn tác được sau khi xoá.
      </Notice>
      <DialogFooter>
        <Button variant="ghost" disabled={mutation.isPending} onClick={() => onOpenChange(false)}>
          Huỷ
        </Button>
        {/* Xoá không hoàn tác được: nút đặc màu đỏ, khác hẳn "Ngừng bán" (viền đỏ, hoàn tác được). */}
        <Button variant="danger-solid" icon="delete" disabled={mutation.isPending} onClick={confirm}>
          {mutation.isPending ? 'Đang xoá…' : 'Xoá sản phẩm'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
