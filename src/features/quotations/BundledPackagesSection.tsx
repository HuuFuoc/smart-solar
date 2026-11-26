import { useState } from 'react'
import { toast } from 'sonner'
import { Button, IconButton } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import {
  disasterTypesLabel,
  formatDurationMonths,
  formatPercent,
  visitMonthsLabel,
} from '@/features/after-sales/afterSalesDisplay'
import { bundledKindLabel } from '@/features/after-sales/servicePackageDisplay'
import { panelProblemText } from '@/features/quotations/bundledPackageDisplay'
import {
  BUNDLED_KINDS,
  customerTotal,
  packageEditing,
  packageOfKind,
  packagesInKindOrder,
  quotationPackages,
  validPanelQuantity,
  type BundledKind,
} from '@/features/quotations/bundledPackageRules'
import { ServicePackagePicker } from '@/features/quotations/ServicePackagePicker'
import { formatQuotationMoney, quotationErrorMessage } from '@/features/quotations/quotationDisplay'
import {
  useCartWriting,
  useRemoveCartServicePackageMutation,
  useSetCartServicePackageMutation,
} from '@/hooks/useTechnicianQuotations'
import type { QuotationServicePackageView, QuotationView } from '@/types/res/quotationsRes'

// Khối "Gói dịch vụ đi kèm" của báo giá lắp đặt, tách khỏi dòng thiết bị. Giỏ nháp của kỹ thuật viên: mỗi loại chọn / đổi / bỏ một
// gói; số tấm pin và thành tiền luôn là số backend trả theo các dòng tấm pin hiện tại. Bản đã chốt, đã đồng ý, đã đóng: chỉ xem bản
// chụp giá lúc chốt, không đọc lại giá danh mục

function benefitLine(p: QuotationServicePackageView) {
  if (p.kind === 'MAINTENANCE')
    return p.visitMonths.length > 0
      ? `${p.visitMonths.length} lượt bảo trì mỗi kỳ, vào ${visitMonthsLabel(p.visitMonths)}`
      : null
  const limits = [
    p.coveragePercent != null && `hỗ trợ ${formatPercent(p.coveragePercent)}`,
    p.perIncidentLimit != null && `tối đa ${formatQuotationMoney(p.perIncidentLimit)} mỗi sự cố`,
    p.termLimit != null && `${formatQuotationMoney(p.termLimit)} mỗi kỳ`,
  ].filter(Boolean)
  return [disasterTypesLabel(p.coveredDisasterTypes), limits.join(', ')].filter(Boolean).join('; ')
}

export function BundledPackagesSection({
  quotation: q,
  editable = false,
  flaggedKinds = [],
}: {
  quotation: QuotationView
  /** Giỏ nháp của kỹ thuật viên: chọn, đổi, bỏ gói */
  editable?: boolean
  /** Loại gói backend báo chặn lúc chốt báo giá */
  flaggedKinds?: string[]
}) {
  const writing = useCartWriting()
  const remove = useRemoveCartServicePackageMutation()
  const reselect = useSetCartServicePackageMutation()
  const [picking, setPicking] = useState<BundledKind | null>(null)
  const editing = packageEditing(q)
  const canEdit = editable && editing.editable
  // Giỏ nháp luôn có khối gói, kể cả khi máy chủ chưa có chức năng: nút chọn gói tắt và ghi rõ lý do
  const cart = editable && (editing.editable || editing.serverMissing)
  const packages = packagesInKindOrder(quotationPackages(q))
  if (!cart && packages.length === 0) return null

  const money = (amount: number) => formatQuotationMoney(amount, q.currency)
  const panels = validPanelQuantity(q)
  const rows: { kind: string; pkg: QuotationServicePackageView | null }[] = cart
    ? BUNDLED_KINDS.map((kind) => ({ kind, pkg: packageOfKind(q, kind) }))
    : packages.map((pkg) => ({ kind: pkg.kind, pkg }))

  async function removePackage(p: QuotationServicePackageView) {
    if (writing) return
    try {
      const view = await remove.mutateAsync({ quotationId: q.quotationId, kind: p.kind, revision: q.revision })
      toast.success(`Đã bỏ ${p.packageName}.`, {
        description: `Tổng giá trị báo giá ${money(customerTotal(view))}.`,
        action: {
          label: 'Hoàn tác',
          onClick: () =>
            void reselect
              .mutateAsync({
                quotationId: q.quotationId,
                kind: p.kind,
                revision: view.revision,
                packageId: p.packageId,
              })
              .catch((e: unknown) => toast.error(quotationErrorMessage(e))),
        },
      })
    } catch (e) {
      // Báo giá vừa đổi ở nơi khác (409): danh sách đã tải lại (useCartWrite), kỹ thuật viên xem bản mới rồi tự làm lại
      toast.error(quotationErrorMessage(e))
    }
  }

  return (
    <section aria-labelledby={`${q.quotationId}-bundled`} className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 id={`${q.quotationId}-bundled`} className="text-title font-semibold text-fg">
          Gói dịch vụ đi kèm
        </h3>
        {panels !== null && (
          <p className="tnum text-meta text-fg-2">Số lượng tấm pin: {panels.toLocaleString('vi-VN')} tấm</p>
        )}
      </div>
      {canEdit && !editing.canSelect && <p className="text-meta text-fg-2">{panelProblemText(editing.problem)}</p>}
      {cart && editing.serverMissing && (
        <Notice tone="warn" title="Chưa chọn được gói dịch vụ">
          Máy chủ hệ thống chưa được cập nhật chức năng gói dịch vụ đi kèm báo giá. Báo quản trị cập nhật máy chủ rồi
          tải lại trang.
        </Notice>
      )}
      <Table stack>
        <thead>
          <tr>
            <Th>Gói</Th>
            <Th className="text-right">Số tấm pin</Th>
            <Th className="text-right">Đơn giá</Th>
            <Th className="text-right">Thành tiền</Th>
            {cart && (
              <Th>
                <span className="sr-only">Thao tác</span>
              </Th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ kind, pkg }) => {
            const flagged = flaggedKinds.includes(kind)
            return (
              <Tr key={kind}>
                {/* Loại chưa chọn gói: một ô trải hết các cột số để không lặp ba dấu gạch */}
                <Td label="Gói" colSpan={pkg ? undefined : 4}>
                  <p className="font-medium text-fg">{pkg ? pkg.packageName : bundledKindLabel(kind)}</p>
                  <p className="text-meta text-fg-2">
                    {/* Thời hạn ghi ở dòng phụ cho bảng đủ hẹp để nằm trong khung báo giá. Giỏ nháp: cột thao tác chiếm chỗ nên
                    không kể quyền lợi; quyền lợi xem ở hộp chọn gói và màn chỉ xem */}
                    {pkg
                      ? [
                          bundledKindLabel(kind),
                          `thời hạn ${formatDurationMonths(pkg.durationMonths)}`,
                          canEdit ? null : benefitLine(pkg),
                        ]
                          .filter(Boolean)
                          .join(', ')
                      : 'Chưa chọn'}
                  </p>
                  {flagged && (
                    <p className="text-meta text-danger">Gói này không còn bán được: bỏ hoặc đổi gói rồi chốt lại.</p>
                  )}
                </Td>
                {pkg && (
                  <>
                    <Td label="Số tấm pin" className="tnum whitespace-nowrap lg:text-right">
                      {pkg.quantity.toLocaleString('vi-VN')} tấm
                    </Td>
                    <Td label="Đơn giá" className="tnum lg:text-right">
                      <span className="whitespace-nowrap">{money(pkg.unitPrice)}</span>
                      <span className="block text-meta whitespace-nowrap text-fg-3">mỗi tấm pin</span>
                    </Td>
                    <Td label="Thành tiền" className="tnum font-medium whitespace-nowrap text-fg lg:text-right">
                      {money(pkg.totalAmount)}
                    </Td>
                  </>
                )}
                {cart && (
                  <Td>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {pkg ? (
                        <>
                          <Button
                            icon="swap_horiz"
                            variant="soft"
                            size="sm"
                            disabled={writing || !editing.canSelect}
                            onClick={() => setPicking(kind as BundledKind)}
                          >
                            Đổi gói
                            <span className="sr-only"> {pkg.packageName}</span>
                          </Button>
                          <IconButton
                            icon="delete"
                            label={`Bỏ ${pkg.packageName}`}
                            tooltip="Bỏ gói"
                            variant="danger-quiet"
                            size="sm"
                            disabled={writing}
                            onClick={() => void removePackage(pkg)}
                          />
                        </>
                      ) : (
                        <Button
                          icon="add"
                          variant="soft"
                          size="sm"
                          disabled={writing || !editing.canSelect}
                          onClick={() => setPicking(kind as BundledKind)}
                        >
                          Chọn gói
                          <span className="sr-only"> {bundledKindLabel(kind).toLowerCase()}</span>
                        </Button>
                      )}
                    </div>
                  </Td>
                )}
              </Tr>
            )
          })}
        </tbody>
      </Table>
      {picking && <ServicePackagePicker quotation={q} kind={picking} onClose={() => setPicking(null)} />}
    </section>
  )
}
