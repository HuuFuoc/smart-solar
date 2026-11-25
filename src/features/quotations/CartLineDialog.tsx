import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { Combobox } from '@/components/common/ui/combobox'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Input, fieldMessageId } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { isProductActive } from '@/features/products/productDisplay'
import {
  formatQuantity,
  formatQuotationMoney,
  lineIdentity,
  lineTypeLabel,
  quotationErrorMessage,
  readQuantity,
} from '@/features/quotations/quotationDisplay'
import { addedQuantity, cartQuantityError, isCountedType } from '@/features/quotations/quotationRules'
import { useCatalogPickerQuery } from '@/hooks/useProducts'
import { useAddCartLineMutation, useUpdateCartLineMutation } from '@/hooks/useTechnicianQuotations'
import type { ProductResponse } from '@/types/res/adminProductsRes'
import type { QuotationLineView, QuotationView } from '@/types/res/quotationsRes'

// Thêm sản phẩm danh mục vào giỏ báo giá, hoặc đổi số lượng một dòng. Không có ô giá: backend lấy giá danh mục của sản phẩm
// (định giá lại lúc gửi khách). Thêm lại sản phẩm đã có trong giỏ thì backend cộng dồn số lượng vào dòng cũ

const productLabel = (p: ProductResponse) => (p.sku ? `${p.name} (${p.sku})` : (p.name ?? ''))

type Props = {
  open: boolean
  quotation: QuotationView
  /** Dòng đang đổi số lượng; null là thêm sản phẩm */
  line: QuotationLineView | null
  onClose: () => void
}

export function CartLineDialog({ open, quotation, line, onClose }: Props) {
  const [pending, setPending] = useState(false)
  return (
    <ModalDialog
      open={open}
      onOpenChange={(next) => !next && !pending && onClose()}
      dismissible={!pending}
      aria-label={line ? 'Đổi số lượng' : 'Thêm sản phẩm vào báo giá'}
      className="max-w-xl"
    >
      <LineForm quotation={quotation} line={line} onClose={onClose} pending={pending} setPending={setPending} />
    </ModalDialog>
  )
}

function LineForm({
  quotation,
  line,
  onClose,
  pending,
  setPending,
}: Omit<Props, 'open'> & { pending: boolean; setPending: (pending: boolean) => void }) {
  const editing = line !== null
  const add = useAddCartLineMutation()
  const update = useUpdateCartLineMutation()
  const catalog = useCatalogPickerQuery()
  const [productText, setProductText] = useState('')
  const [quantity, setQuantity] = useState(line ? String(line.quantity).replace('.', ',') : '1')
  const [errors, setErrors] = useState<{ product?: string; quantity?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const money = (amount: number) => formatQuotationMoney(amount, quotation.currency)

  // Chỉ sản phẩm đang bán, có giá VND mới vào được giỏ (backend: QUOTATION_PRODUCT_UNAVAILABLE, QUOTATION_PRICE_MISSING)
  const products = useMemo(() => {
    const map = new Map<string, ProductResponse>()
    for (const p of catalog.data?.items ?? [])
      if (
        p.id &&
        p.name &&
        isProductActive(p.status) &&
        (p.currency ?? 'VND').toUpperCase() === 'VND' &&
        (p.unitPrice ?? 0) > 0
      )
        map.set(productLabel(p), p)
    return map
  }, [catalog.data])
  const product = editing ? undefined : products.get(productText.trim())

  const qty = readQuantity(quantity)
  const unitPrice = editing ? line.unitPrice : (product?.unitPrice ?? null)
  const finalQuantity = product?.id ? addedQuantity(quotation.lines, product.id, qty) : qty
  // Backend ghi mã loại sản phẩm vào `description` của dòng giỏ
  const type = editing ? line.description : product?.productType
  const counted = Boolean(type) && isCountedType(type)
  const preview =
    cartQuantityError(qty, counted) === null && unitPrice != null ? Math.round(finalQuantity * unitPrice) : null
  const alreadyInCart = product?.id ? quotation.lines.find((l) => l.productId === product.id) : undefined
  const unit = editing ? line.unit : product?.unit

  async function submit() {
    const next: { product?: string; quantity?: string } = {}
    if (!editing && !product?.id) next.product = 'Chọn sản phẩm trong danh sách.'
    const quantityProblem =
      cartQuantityError(qty, counted) ?? (product?.id ? cartQuantityError(finalQuantity, counted) : null)
    if (quantityProblem) next.quantity = quantityProblem
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setError(null)
    setPending(true)
    try {
      if (editing)
        await update.mutateAsync({
          quotationId: quotation.quotationId,
          lineId: line.lineId,
          revision: quotation.revision,
          quantity: qty,
        })
      else
        await add.mutateAsync({
          quotationId: quotation.quotationId,
          revision: quotation.revision,
          productId: product!.id!,
          quantity: qty,
        })
      toast.success(editing ? 'Đã đổi số lượng.' : 'Đã thêm vào báo giá.')
      onClose()
    } catch (e) {
      setError(quotationErrorMessage(e))
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <DialogTitle>{editing ? 'Đổi số lượng' : 'Thêm sản phẩm'}</DialogTitle>
      <div className="mt-4 space-y-4">
        {editing ? (
          <div>
            <p className="text-body font-medium text-fg">{line.name}</p>
            {lineIdentity(line) && <p className="text-meta text-fg-2">{lineIdentity(line)}</p>}
          </div>
        ) : (
          <Field
            label="Sản phẩm"
            htmlFor="cart-line-product"
            required
            error={errors.product ?? (catalog.isError ? quotationErrorMessage(catalog.error) : undefined)}
            hint={catalog.isPending ? 'Đang tải danh mục…' : 'Chỉ có sản phẩm đang bán và đã có giá.'}
          >
            <Combobox
              id="cart-line-product"
              value={productText}
              onChange={setProductText}
              options={[...products.keys()]}
              listLabel="Sản phẩm"
              placeholder="Gõ tên hoặc mã sản phẩm"
              emptyText="Không có sản phẩm đang bán nào khớp."
              invalid={Boolean(errors.product)}
              required
              describedBy={fieldMessageId('cart-line-product')}
              disabled={catalog.isPending}
            />
          </Field>
        )}
        {product && (
          <p className="text-meta text-fg-2">
            {[lineTypeLabel({ description: product.productType ?? null }), product.brand, product.model, product.unit]
              .filter(Boolean)
              .join(', ')}
            {product.unitPrice != null && `. Giá danh mục ${money(product.unitPrice)}`}
          </p>
        )}

        <Field
          label={unit ? `Số lượng (${unit})` : 'Số lượng'}
          htmlFor="cart-line-quantity"
          required
          error={errors.quantity}
          hint={
            alreadyInCart
              ? `Đã có ${formatQuantity(alreadyInCart.quantity)} trong giỏ; số này được cộng thêm.`
              : counted
                ? undefined
                : 'Tối đa 3 chữ số thập phân.'
          }
        >
          <Input
            id="cart-line-quantity"
            inputMode="decimal"
            className="tnum"
            aria-required
            aria-invalid={Boolean(errors.quantity) || undefined}
            aria-describedby={fieldMessageId('cart-line-quantity')}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </Field>

        <p className="tnum text-body text-fg-2">
          Thành tiền dự kiến: <span className="font-semibold text-fg">{preview == null ? '—' : money(preview)}</span>
        </p>
        <p className="text-meta text-fg-2">Giá tính lại theo danh mục lúc chốt báo giá; thuế do hệ thống tính.</p>

        {error && (
          <div role="alert">
            <Notice tone="danger">{error}</Notice>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={pending} onClick={onClose}>
          Đóng
        </Button>
        <Button
          icon={editing ? 'save' : 'add'}
          variant="primary"
          disabled={pending || (!editing && catalog.isPending)}
          onClick={() => void submit()}
        >
          {pending ? 'Đang lưu…' : editing ? 'Lưu số lượng' : 'Thêm vào báo giá'}
        </Button>
      </DialogFooter>
    </>
  )
}
