import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button, IconButton } from '@/components/common/ui/button'
import { Combobox } from '@/components/common/ui/combobox'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Input, Textarea, fieldMessageId } from '@/components/common/ui/field'
import { formatVnd } from '@/features/after-sales/serviceDisplay'
import {
  REPAIR_QUOTE_DESCRIPTION_MAX,
  REPAIR_QUOTE_NOTE_MAX,
  quotableItems,
  repairQuoteBody,
  repairQuoteErrors,
  type RepairQuoteLine,
} from '@/features/after-sales/technicianVisitRules'
import { ErrorLine } from '@/features/installation-projects/formParts'
import { isProductActive } from '@/features/products/productDisplay'
import { formatQuantity, lineTypeLabel, readQuantity } from '@/features/quotations/quotationDisplay'
import { useCatalogPickerQuery } from '@/hooks/useProducts'
import { useIssueRepairQuotationMutation } from '@/hooks/useTechnicianAfterSales'
import { detailOf, errorMessage } from '@/services/api/errors'
import type { ProductResponse } from '@/types/res/adminProductsRes'
import type { TechnicianVisitView } from '@/types/res/technicianAfterSalesRes'

// Kỹ thuật viên lập báo giá sửa chữa / bảo trì lẻ đã kiểm tra: mỗi hạng mục khách phải trả chọn sản phẩm danh mục (vật tư) và
// dịch vụ (nhân công, vận chuyển) cùng số lượng. Không có ô giá: backend lấy giá danh mục lúc gửi; số hiện ở đây chỉ để ước tính.
// Sản phẩm chưa có giá thì backend từ chối cả báo giá (SERVICE_QUOTATION_PRICE_MISSING) và tô đỏ đúng dòng

const productLabel = (p: ProductResponse) => (p.sku ? `${p.name} (${p.sku})` : (p.name ?? ''))

type Draft = RepairQuoteLine & { pickText: string; pickQty: string }

export function RepairQuotationDialog({ visit, onClose }: { visit: TechnicianVisitView; onClose: () => void }) {
  const issue = useIssueRepairQuotationMutation()
  const catalog = useCatalogPickerQuery()
  const items = quotableItems(visit.items)
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    items.map((i) => ({ itemId: i.itemId, description: '', components: [], pickText: '', pickQty: '1' })),
  )
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [missing, setMissing] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const busy = issue.isPending

  const products = useMemo(() => {
    const map = new Map<string, ProductResponse>()
    for (const p of catalog.data?.items ?? [])
      if (p.id && p.name && isProductActive(p.status) && (p.currency ?? 'VND').toUpperCase() === 'VND')
        map.set(productLabel(p), p)
    return map
  }, [catalog.data])
  const byId = useMemo(() => new Map([...products.values()].map((p) => [p.id!, p])), [products])

  const update = (itemId: string, patch: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d) => (d.itemId === itemId ? { ...d, ...patch } : d)))

  function addComponent(d: Draft) {
    const product = products.get(d.pickText.trim())
    const qty = readQuantity(d.pickQty)
    if (!product?.id) return setErrors((e) => ({ ...e, [d.itemId]: 'Chọn sản phẩm trong danh sách.' }))
    if (!(qty > 0)) return setErrors((e) => ({ ...e, [d.itemId]: 'Ghi số lượng lớn hơn 0.' }))
    const existing = d.components.find((c) => c.productId === product.id)
    // Cùng sản phẩm thì cộng số lượng vào dòng đã có (backend không nhận hai dòng một sản phẩm)
    const components = existing
      ? d.components.map((c) => (c.productId === product.id ? { ...c, quantity: c.quantity + qty } : c))
      : [...d.components, { productId: product.id, quantity: qty }]
    update(d.itemId, { components, pickText: '', pickQty: '1' })
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([key]) => key !== d.itemId)))
  }

  const estimate = drafts.reduce(
    (sum, d) => sum + d.components.reduce((s, c) => s + c.quantity * (byId.get(c.productId)?.unitPrice ?? 0), 0),
    0,
  )

  async function submit() {
    setError(null)
    const next = repairQuoteErrors(drafts, note)
    setErrors(next)
    if (Object.keys(next).length > 0) return
    try {
      await issue.mutateAsync({ requestId: visit.requestId, body: repairQuoteBody(drafts, note) })
      toast.success('Đã gửi báo giá cho khách.')
      onClose()
    } catch (e) {
      const rows = detailOf(e, 'items')
      if (Array.isArray(rows))
        setMissing(new Set(rows.map((r) => (r as { productId?: string }).productId).filter((x): x is string => !!x)))
      setError(errorMessage(e))
    }
  }

  return (
    <ModalDialog
      open
      onOpenChange={(o) => !o && !busy && onClose()}
      dismissible={!busy}
      className="max-w-3xl"
      aria-label="Lập báo giá cho khách"
    >
      <DialogTitle>Lập báo giá cho khách</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Yêu cầu {visit.requestNumber}. Chọn vật tư và dịch vụ cho từng hạng mục khách phải trả; giá lấy theo danh mục
        lúc gửi.
      </p>

      <div className="mt-4 space-y-6">
        {drafts.map((d, index) => {
          const item = items[index]!
          return (
            <section key={d.itemId} className="space-y-3 border-t border-line pt-4 first:border-t-0 first:pt-0">
              <div>
                <h3 className="text-body font-medium text-fg">{item.description}</h3>
                {item.diagnosis && <p className="text-meta text-fg-2">{item.diagnosis}</p>}
                {item.requiredParts && <p className="text-meta text-fg-2">Vật tư cần: {item.requiredParts}</p>}
              </div>
              {d.components.length > 0 && (
                <ul className="divide-y divide-line border-y border-line">
                  {d.components.map((c) => {
                    const p = byId.get(c.productId)
                    return (
                      <li key={c.productId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                        <span className={missing.has(c.productId) ? 'text-danger' : 'text-fg'}>
                          {p?.name ?? 'Sản phẩm'}
                          {p && (
                            <span className="text-meta text-fg-2">
                              {' '}
                              ({lineTypeLabel({ description: p.productType ?? null })})
                            </span>
                          )}
                        </span>
                        <span className="tnum text-meta text-fg-2">
                          {formatQuantity(c.quantity)} {p?.unit}
                          {p?.unitPrice ? ` × ${formatVnd(p.unitPrice)}` : ', chưa có giá'}
                        </span>
                        <IconButton
                          icon="delete"
                          label={`Bỏ ${p?.name ?? 'sản phẩm'}`}
                          variant="danger-quiet"
                          size="sm"
                          className="ml-auto"
                          disabled={busy}
                          onClick={() =>
                            update(d.itemId, { components: d.components.filter((x) => x.productId !== c.productId) })
                          }
                        />
                      </li>
                    )
                  })}
                </ul>
              )}
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-end">
                <Field label="Sản phẩm, dịch vụ" htmlFor={`rq-product-${d.itemId}`} error={errors[d.itemId]}>
                  <Combobox
                    id={`rq-product-${d.itemId}`}
                    value={d.pickText}
                    onChange={(pickText) => update(d.itemId, { pickText })}
                    options={[...products.keys()]}
                    listLabel="Sản phẩm"
                    placeholder={catalog.isPending ? 'Đang tải danh mục…' : 'Gõ tên hoặc mã'}
                    emptyText="Không có sản phẩm đang bán nào khớp."
                    invalid={Boolean(errors[d.itemId])}
                    describedBy={fieldMessageId(`rq-product-${d.itemId}`)}
                    disabled={busy || catalog.isPending}
                  />
                </Field>
                <Field label="Số lượng" htmlFor={`rq-qty-${d.itemId}`}>
                  <Input
                    id={`rq-qty-${d.itemId}`}
                    inputMode="decimal"
                    className="tnum"
                    value={d.pickQty}
                    disabled={busy}
                    onChange={(e) => update(d.itemId, { pickQty: e.target.value })}
                  />
                </Field>
                <Button icon="add" variant="soft" disabled={busy} onClick={() => addComponent(d)}>
                  Thêm
                </Button>
              </div>
              <Field label="Mô tả cho khách" htmlFor={`rq-desc-${d.itemId}`} optional>
                <Input
                  id={`rq-desc-${d.itemId}`}
                  maxLength={REPAIR_QUOTE_DESCRIPTION_MAX}
                  value={d.description}
                  disabled={busy}
                  placeholder={item.description}
                  onChange={(e) => update(d.itemId, { description: e.target.value })}
                />
              </Field>
            </section>
          )
        })}

        <Field label="Ghi chú" htmlFor="rq-note" optional error={errors.note}>
          <Textarea
            id="rq-note"
            rows={2}
            maxLength={REPAIR_QUOTE_NOTE_MAX}
            value={note}
            disabled={busy}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <p className="tnum text-body text-fg-2">
          Ước tính theo giá danh mục hiện tại:{' '}
          <span className="font-semibold text-fg">{formatVnd(Math.round(estimate))}</span>. Thuế, hỗ trợ thiên tai và số
          khách trả do hệ thống tính khi gửi.
        </p>
      </div>

      <DialogFooter className="items-center">
        <ErrorLine message={error} />
        <Button icon="close" variant="secondary" disabled={busy} onClick={onClose}>
          Đóng
        </Button>
        <Button icon="send" variant="primary" disabled={busy} onClick={() => void submit()}>
          {busy ? 'Đang gửi…' : 'Gửi báo giá cho khách'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
