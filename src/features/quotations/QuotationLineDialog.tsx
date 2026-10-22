import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { QUOTATION_LIMITS, QUOTATION_UNIT_SUGGESTIONS } from '@/common/quotation'
import { Button } from '@/components/common/ui/button'
import { Combobox } from '@/components/common/ui/combobox'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Input, Textarea, fieldMessageId } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { Segmented } from '@/components/common/ui/segmented'
import { isProductActive } from '@/features/products/productDisplay'
import {
  formatQuantity,
  formatQuotationMoney,
  isMoney,
  isQuantity,
  lineIdentity,
  moneyText,
  readMoney,
  readQuantity,
} from '@/features/quotations/quotationDisplay'
import { useProductsQuery } from '@/hooks/useProducts'
import { useAddQuotationLineMutation, useUpdateQuotationLineMutation } from '@/hooks/useSalesQuotations'
import { errorMessage } from '@/services/api/errors'
import type { ProductResponse } from '@/types/res/adminProductsRes'
import type { QuotationLineView, QuotationView } from '@/types/res/quotationsRes'

// Thêm / sửa một dòng của bản nháp. Dòng từ danh mục: backend chép tên, hãng, model, đơn vị, giá của sản phẩm lúc thêm,
// bỏ trống đơn giá là lấy giá danh mục. Dòng tự ghi: tự nhập tên, đơn vị, đơn giá. Đã thêm thì chỉ sửa được số lượng,
// đơn giá, mô tả (backend giữ mô tả cũ khi gửi trống)

type Mode = 'catalog' | 'custom'

// Hằng ở module để khoá query không đổi giữa các lần vẽ; danh mục hiện chưa tới 100 sản phẩm
const CATALOG_QUERY = { PageSize: 100, SortBy: 'name', SortDirection: 'asc' } as const

const MODES = [
  { value: 'catalog' as const, label: 'Từ danh mục', icon: 'inventory_2' },
  { value: 'custom' as const, label: 'Tự ghi', icon: 'edit_note' },
]

const productLabel = (p: ProductResponse) => (p.sku ? `${p.name} (${p.sku})` : (p.name ?? ''))

type Errors = Partial<Record<'product' | 'name' | 'unit' | 'quantity' | 'unitPrice', string>>

type Props = {
  open: boolean
  quotation: QuotationView
  /** Dòng đang sửa; null là thêm dòng */
  line: QuotationLineView | null
  onClose: () => void
}

export function QuotationLineDialog({ open, quotation, line, onClose }: Props) {
  const [pending, setPending] = useState(false)
  return (
    <ModalDialog
      open={open}
      onOpenChange={(next) => !next && !pending && onClose()}
      dismissible={!pending}
      aria-label={line ? 'Sửa dòng báo giá' : 'Thêm dòng báo giá'}
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
  const add = useAddQuotationLineMutation()
  const update = useUpdateQuotationLineMutation()
  const catalog = useProductsQuery(CATALOG_QUERY, { enabled: !editing })
  const [mode, setMode] = useState<Mode>('catalog')
  const [productText, setProductText] = useState('')
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('')
  const [quantity, setQuantity] = useState(line ? String(line.quantity).replace('.', ',') : '1')
  const [unitPrice, setUnitPrice] = useState(line ? moneyText(line.unitPrice) : '')
  const [description, setDescription] = useState(line?.description ?? '')
  const [errors, setErrors] = useState<Errors>({})
  const [error, setError] = useState<string | null>(null)
  const money = (amount: number) => formatQuotationMoney(amount, quotation.currency)

  // Chỉ sản phẩm đang bán, giá VND mới thêm được vào báo giá
  const products = useMemo(() => {
    const map = new Map<string, ProductResponse>()
    for (const p of catalog.data?.items ?? [])
      if (p.id && p.name && isProductActive(p.status) && (p.currency ?? 'VND').toUpperCase() === 'VND')
        map.set(productLabel(p), p)
    return map
  }, [catalog.data])
  const product = mode === 'catalog' && !editing ? products.get(productText.trim()) : undefined

  // Thành tiền dự kiến; backend làm tròn tới đồng
  const qty = readQuantity(quantity)
  const typedPrice = readMoney(unitPrice)
  const price = unitPrice.trim() === '' ? (product?.unitPrice ?? line?.unitPrice ?? null) : typedPrice
  const preview = isQuantity(qty) && price != null && isMoney(price) ? Math.round(qty * price) : null

  function validate(): Errors {
    const next: Errors = {}
    if (!editing && mode === 'catalog' && !product) next.product = 'Chọn sản phẩm trong danh sách.'
    if (!editing && mode === 'custom') {
      if (!name.trim()) next.name = 'Ghi tên hạng mục.'
      if (!unit.trim()) next.unit = 'Ghi đơn vị.'
      if (unitPrice.trim() === '') next.unitPrice = 'Ghi đơn giá.'
    }
    if (!isQuantity(qty))
      next.quantity = `Số lượng phải lớn hơn 0 và không quá ${formatQuantity(QUOTATION_LIMITS.maxQuantity)}.`
    if (unitPrice.trim() !== '' && !isMoney(typedPrice)) next.unitPrice = 'Đơn giá là số đồng nguyên, không âm.'
    return next
  }

  async function submit() {
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setError(null)
    setPending(true)
    const typed = unitPrice.trim() === '' ? null : typedPrice
    try {
      if (editing) {
        await update.mutateAsync({
          quotationId: quotation.quotationId,
          lineId: line.lineId,
          body: {
            revision: quotation.revision,
            quantity: qty,
            unitPrice: typed,
            description: description.trim() || null,
          },
        })
        toast.success('Đã lưu dòng.')
      } else {
        await add.mutateAsync({
          quotationId: quotation.quotationId,
          body: {
            revision: quotation.revision,
            productId: product?.id ?? null,
            name: mode === 'custom' ? name.trim() : null,
            unit: mode === 'custom' ? unit.trim() : null,
            quantity: qty,
            unitPrice: typed,
            description: description.trim() || null,
          },
        })
        toast.success('Đã thêm dòng.')
      }
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setPending(false)
    }
  }

  const priceHint = (() => {
    if (unitPrice.trim() !== '' && isMoney(typedPrice)) return money(typedPrice)
    if (product) return `Bỏ trống để dùng giá danh mục ${money(product.unitPrice ?? 0)}.`
    return undefined
  })()

  return (
    <>
      <DialogTitle>{editing ? 'Sửa dòng' : 'Thêm dòng'}</DialogTitle>
      <div className="mt-4 space-y-4">
        {editing ? (
          <div>
            <p className="text-body font-medium text-fg">{line.name}</p>
            {lineIdentity(line) && <p className="text-meta text-fg-2">{lineIdentity(line)}</p>}
          </div>
        ) : (
          <Segmented label="Loại dòng" options={MODES} value={mode} onChange={setMode} />
        )}

        {!editing && mode === 'catalog' && (
          <Field
            label="Sản phẩm"
            htmlFor="quotation-line-product"
            required
            error={errors.product ?? (catalog.isError ? errorMessage(catalog.error) : undefined)}
            hint={catalog.isPending ? 'Đang tải danh mục…' : undefined}
          >
            <Combobox
              id="quotation-line-product"
              value={productText}
              onChange={setProductText}
              options={[...products.keys()]}
              listLabel="Sản phẩm"
              placeholder="Gõ tên hoặc mã sản phẩm"
              emptyText="Không có sản phẩm đang bán nào khớp."
              invalid={Boolean(errors.product)}
              required
              describedBy={fieldMessageId('quotation-line-product')}
              disabled={catalog.isPending}
            />
          </Field>
        )}
        {product && (
          <p className="text-meta text-fg-2">
            {[lineIdentity({ brand: product.brand ?? null, model: product.model ?? null, sku: null }), product.unit]
              .filter(Boolean)
              .join(', ')}
          </p>
        )}

        {!editing && mode === 'custom' && (
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
            <Field label="Tên hạng mục" htmlFor="quotation-line-name" required error={errors.name}>
              <Input
                id="quotation-line-name"
                maxLength={QUOTATION_LIMITS.nameLength}
                aria-required
                aria-invalid={Boolean(errors.name) || undefined}
                aria-describedby={fieldMessageId('quotation-line-name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Đơn vị" htmlFor="quotation-line-unit" required error={errors.unit}>
              <Combobox
                id="quotation-line-unit"
                value={unit}
                onChange={(value) => setUnit(value.slice(0, QUOTATION_LIMITS.unitLength))}
                options={QUOTATION_UNIT_SUGGESTIONS}
                listLabel="Đơn vị"
                emptyText="Không có gợi ý, cứ gõ đơn vị của bạn."
                invalid={Boolean(errors.unit)}
                required
                describedBy={fieldMessageId('quotation-line-unit')}
              />
            </Field>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={product?.unit || line?.unit ? `Số lượng (${product?.unit ?? line?.unit})` : 'Số lượng'}
            htmlFor="quotation-line-quantity"
            required
            error={errors.quantity}
          >
            <Input
              id="quotation-line-quantity"
              inputMode="decimal"
              className="tnum"
              aria-required
              aria-invalid={Boolean(errors.quantity) || undefined}
              aria-describedby={fieldMessageId('quotation-line-quantity')}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Field>
          <Field
            label="Đơn giá (VND)"
            htmlFor="quotation-line-price"
            required={!editing && mode === 'custom'}
            error={errors.unitPrice}
            hint={priceHint}
          >
            <Input
              id="quotation-line-price"
              inputMode="numeric"
              className="tnum"
              placeholder={product ? moneyText(product.unitPrice ?? 0) : undefined}
              aria-required={(!editing && mode === 'custom') || undefined}
              aria-invalid={Boolean(errors.unitPrice) || undefined}
              aria-describedby={fieldMessageId('quotation-line-price')}
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Mô tả thêm"
          htmlFor="quotation-line-description"
          hint={
            editing && line.description
              ? 'Khách thấy mô tả này. Để trống thì giữ mô tả cũ.'
              : 'Không bắt buộc. Khách thấy mô tả này trong báo giá.'
          }
        >
          <Textarea
            id="quotation-line-description"
            rows={2}
            maxLength={QUOTATION_LIMITS.lineDescriptionLength}
            aria-describedby={fieldMessageId('quotation-line-description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <p className="tnum text-body text-fg-2">
          Thành tiền: <span className="font-semibold text-fg">{preview == null ? '—' : money(preview)}</span>
        </p>

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
          disabled={pending || (!editing && mode === 'catalog' && catalog.isPending)}
          onClick={() => void submit()}
        >
          {pending ? 'Đang lưu…' : editing ? 'Lưu dòng' : 'Thêm dòng'}
        </Button>
      </DialogFooter>
    </>
  )
}
