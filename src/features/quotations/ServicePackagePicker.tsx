import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { KeyValueList, Notice } from '@/components/common/ui/lists'
import { EmptyState, ErrorState, Skeleton } from '@/components/common/ui/states'
import { PackageCover } from '@/features/after-sales/PackageList'
import { benefitFacts, bundledKindLabel, formatUnitPrice } from '@/features/after-sales/servicePackageDisplay'
import {
  customerTotal,
  isSelectablePackage,
  packageOfKind,
  pickAction,
  validPanelQuantity,
  type BundledKind,
} from '@/features/quotations/bundledPackageRules'
import { formatQuotationMoney, quotationErrorMessage } from '@/features/quotations/quotationDisplay'
import {
  useCartWriting,
  useSetCartServicePackageMutation,
  useTechnicianServicePackagesQuery,
} from '@/hooks/useTechnicianQuotations'
import { isApiError } from '@/services/api/errors'
import type { PackageView } from '@/types/res/customerAfterSalesRes'
import type { QuotationView } from '@/types/res/quotationsRes'

// Hộp chọn gói dịch vụ đi kèm cho giỏ báo giá: gói PER_PANEL đang bán của một loại. Chỉ gửi gói và revision; số tấm pin, thành tiền,
// tổng báo giá đọc từ báo giá backend trả về. Báo giá vừa đổi ở nơi khác (409) thì đóng hộp để kỹ thuật viên xem bản mới rồi chọn lại

// Báo giá không còn sửa được hoặc đã đổi: đóng hộp, danh sách báo giá đã được tải lại
const CLOSE_ON = new Set(['QUOTATION_STALE_REVISION', 'QUOTATION_NOT_DRAFT', 'QUOTATION_NOT_FOUND'])

export function ServicePackagePicker({
  quotation: q,
  kind,
  onClose,
}: {
  quotation: QuotationView
  kind: BundledKind
  onClose: () => void
}) {
  const query = useTechnicianServicePackagesQuery(kind)
  const set = useSetCartServicePackageMutation()
  const writing = useCartWriting()
  const [error, setError] = useState<string | null>(null)
  const current = packageOfKind(q, kind)
  const panels = validPanelQuantity(q)
  const label = bundledKindLabel(kind)
  const money = (amount: number) => formatQuotationMoney(amount, q.currency)
  const items = (query.data ?? []).filter((p) => isSelectablePackage(p, kind))

  async function choose(pkg: PackageView) {
    if (writing || panels === null) return
    setError(null)
    try {
      const view = await set.mutateAsync({
        quotationId: q.quotationId,
        kind,
        revision: q.revision,
        packageId: pkg.packageId,
      })
      const chosen = packageOfKind(view, kind)
      toast.success(current ? `Đã đổi sang ${pkg.name}.` : `Đã chọn ${pkg.name}.`, {
        description: chosen
          ? `${chosen.quantity} tấm pin, thành tiền ${money(chosen.totalAmount)}. Tổng giá trị báo giá ${money(customerTotal(view))}.`
          : undefined,
      })
      onClose()
    } catch (e) {
      if (isApiError(e) && e.code && CLOSE_ON.has(e.code)) {
        toast.error(quotationErrorMessage(e))
        onClose()
        return
      }
      setError(quotationErrorMessage(e))
      // Gói vừa ngừng bán / đổi đơn vị tính: tải lại danh mục để không chọn lại gói đó
      void query.refetch()
    }
  }

  return (
    <ModalDialog
      open
      onOpenChange={(open) => !open && !set.isPending && onClose()}
      dismissible={!set.isPending}
      aria-label={`Chọn ${label.toLowerCase()}`}
      className="max-w-3xl"
    >
      <DialogTitle>{current ? `Đổi ${label.toLowerCase()}` : `Chọn ${label.toLowerCase()}`}</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        {panels !== null ? (
          <>
            Áp dụng cho <span className="tnum">{panels}</span> tấm pin của báo giá.{' '}
          </>
        ) : null}
        {kind === 'MAINTENANCE'
          ? 'Số lượt bảo trì là của cả kỳ, không nhân theo số tấm pin.'
          : 'Hạn mức hỗ trợ là của cả kỳ, không nhân theo số tấm pin.'}
      </p>

      <div className="mt-4">
        {query.isPending ? (
          <Skeleton className="h-40" />
        ) : query.data === undefined ? (
          <ErrorState
            title="Không tải được danh sách gói."
            message={quotationErrorMessage(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title={`Chưa có ${label.toLowerCase()} tính theo tấm pin đang bán`}
            description="Quản trị thêm gói theo tấm pin trong danh mục gói dịch vụ."
          />
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {items.map((p) => {
              const action = pickAction(current, p.packageId)
              return (
                <li key={p.packageId} className="flex flex-wrap items-start gap-4 py-4">
                  <PackageCover key={p.imageUrl ?? p.kind} url={p.imageUrl} kind={p.kind} />
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-semibold text-fg">{p.name}</p>
                    {p.description && (
                      <p className="mt-0.5 max-w-[72ch] text-meta whitespace-pre-line text-fg-2">{p.description}</p>
                    )}
                    <KeyValueList
                      columns={2}
                      className="mt-3"
                      items={[
                        { k: 'Đơn giá', v: <span className="tnum">{formatUnitPrice(p.price, 'PER_PANEL')}</span> },
                        ...benefitFacts(p),
                      ]}
                    />
                  </div>
                  {action === 'current' ? (
                    <Button icon="check" variant="secondary" size="sm" disabled>
                      Đang chọn
                    </Button>
                  ) : (
                    <Button
                      icon={action === 'replace' ? 'swap_horiz' : 'add'}
                      variant="soft"
                      size="sm"
                      disabled={writing || panels === null}
                      onClick={() => void choose(p)}
                    >
                      {set.isPending && set.variables?.packageId === p.packageId
                        ? 'Đang lưu…'
                        : action === 'replace'
                          ? 'Đổi sang gói này'
                          : 'Chọn gói'}
                      <span className="sr-only"> {p.name}</span>
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {error && (
        <div role="alert" className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}

      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={set.isPending} onClick={onClose}>
          Đóng
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
