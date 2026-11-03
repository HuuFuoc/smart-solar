import type { ReactNode } from 'react'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import {
  formatPercent,
  formatQuantity,
  formatQuotationMoney,
  isRepriced,
  lineIdentity,
} from '@/features/quotations/quotationDisplay'
import type { QuotationLineView, QuotationView } from '@/types/res/quotationsRes'
import { cx } from '@/utils/cx'

// Các khối chỉ để xem của một báo giá lắp đặt: dòng hàng, tổng tiền, điều khoản. Kinh doanh và khách dùng chung

/** Bảng dòng hàng. `actions` thêm cột thao tác cho bản nháp; `showCatalogPrice` cho kinh doanh thấy giá đã đổi so với danh mục */
export function QuotationLines({
  quotation,
  actions,
  showCatalogPrice,
}: {
  quotation: QuotationView
  actions?: (line: QuotationLineView) => ReactNode
  showCatalogPrice?: boolean
}) {
  const money = (amount: number) => formatQuotationMoney(amount, quotation.currency)
  return (
    <Table stack>
      <thead>
        <tr>
          <Th className="w-10">STT</Th>
          <Th>Hạng mục</Th>
          <Th className="text-right">Số lượng</Th>
          <Th className="text-right">Đơn giá</Th>
          <Th className="text-right">Thành tiền</Th>
          {actions && (
            <Th>
              <span className="sr-only">Thao tác</span>
            </Th>
          )}
        </tr>
      </thead>
      <tbody>
        {quotation.lines.map((line) => {
          const identity = lineIdentity(line)
          return (
            <Tr key={line.lineId}>
              <Td label="STT" className="tnum text-fg-2">
                {line.lineNumber}
              </Td>
              <Td label="Hạng mục">
                <p className="font-medium text-fg">{line.name}</p>
                {identity && <p className="text-meta text-fg-2">{identity}</p>}
                {line.description && <p className="mt-1 text-meta whitespace-pre-line text-fg-2">{line.description}</p>}
              </Td>
              <Td label="Số lượng" className="tnum whitespace-nowrap lg:text-right">
                {formatQuantity(line.quantity)} {line.unit}
              </Td>
              <Td label="Đơn giá" className="tnum lg:text-right">
                <span className="whitespace-nowrap">{money(line.unitPrice)}</span>
                {showCatalogPrice && isRepriced(line) && (
                  <span className="block text-meta whitespace-nowrap text-fg-3">
                    Danh mục {money(line.catalogUnitPrice!)}
                  </span>
                )}
              </Td>
              <Td label="Thành tiền" className="tnum font-medium whitespace-nowrap text-fg lg:text-right">
                {money(line.lineTotal)}
              </Td>
              {actions && (
                <Td>
                  <div className="flex flex-wrap gap-2 lg:justify-end">{actions(line)}</div>
                </Td>
              )}
            </Tr>
          )
        })}
      </tbody>
    </Table>
  )
}

function TotalRow({ label, value, strong }: { label: ReactNode; value: string; strong?: boolean }) {
  return (
    <div className={cx('flex items-baseline justify-between gap-6 py-1', strong && 'mt-1 border-t border-line pt-3')}>
      <dt className={strong ? 'text-body font-semibold text-fg' : 'text-body text-fg-2'}>{label}</dt>
      <dd className={cx('tnum text-right', strong ? 'text-title font-semibold text-fg' : 'text-body text-fg')}>
        {value}
      </dd>
    </div>
  )
}

/** Cách tính do backend: cộng = thiết bị + nhân công + vận chuyển + dịch vụ khác; thuế tính trên (cộng − giảm giá) */
export function QuotationTotals({ quotation, className }: { quotation: QuotationView; className?: string }) {
  const money = (amount: number) => formatQuotationMoney(amount, quotation.currency)
  const q = quotation
  return (
    <dl className={cx('w-full max-w-md', className)}>
      <TotalRow label="Thiết bị, vật tư" value={money(q.equipmentSubtotal)} />
      <TotalRow label="Nhân công lắp đặt" value={money(q.laborCost)} />
      <TotalRow label="Vận chuyển" value={money(q.transportCost)} />
      {q.otherServiceCost > 0 && <TotalRow label="Dịch vụ khác" value={money(q.otherServiceCost)} />}
      <TotalRow label="Cộng" value={money(q.subtotal)} />
      {q.discountAmount > 0 && <TotalRow label="Giảm giá" value={`−${money(q.discountAmount)}`} />}
      <TotalRow label={`Thuế VAT ${formatPercent(q.taxRatePercent)}`} value={money(q.taxAmount)} />
      <TotalRow label="Tổng cộng" value={money(q.totalAmount)} strong />
    </dl>
  )
}

/** Điều khoản và ghi chú gửi khách, không có thì không hiện */
export function QuotationTerms({ quotation }: { quotation: QuotationView }) {
  if (!quotation.terms && !quotation.notes) return null
  return (
    <div className="space-y-4">
      {quotation.terms && (
        <div>
          <h3 className="text-body font-semibold text-fg">Điều khoản</h3>
          <p className="mt-1 max-w-[72ch] text-body whitespace-pre-line text-fg-2">{quotation.terms}</p>
        </div>
      )}
      {quotation.notes && (
        <div>
          <h3 className="text-body font-semibold text-fg">Ghi chú</h3>
          <p className="mt-1 max-w-[72ch] text-body whitespace-pre-line text-fg-2">{quotation.notes}</p>
        </div>
      )}
    </div>
  )
}
