import { PACKAGE_TAX_NOTE } from '@/common/servicePackages'
import { QuotationTotals, TotalRow } from '@/features/quotations/QuotationContent'
import { hasServicePackages, packageOfKind, quotationAmounts } from '@/features/quotations/bundledPackageRules'
import { formatPercent, formatQuotationMoney } from '@/features/quotations/quotationDisplay'
import type { QuotationView } from '@/types/res/quotationsRes'
import { cx } from '@/utils/cx'

/**
 * Bảng tổng của báo giá. Có gói dịch vụ đi kèm thì tách chi phí lắp đặt (dòng hàng + thuế báo giá) khỏi gói (giá danh mục, không cộng
 * thuế báo giá) và ghi tổng giá trị báo giá là `grandTotal` của backend. Không có gói thì giữ đúng bảng tổng cũ. Mọi số đọc từ
 * QuotationView, không cộng lại ở FE
 */
export function QuotationPricingSummary({ quotation: q, className }: { quotation: QuotationView; className?: string }) {
  if (!hasServicePackages(q)) return <QuotationTotals quotation={q} className={className} />
  const money = (amount: number) => formatQuotationMoney(amount, q.currency)
  const a = quotationAmounts(q)
  const cart = q.origin === 'TECHNICIAN'
  return (
    <div className={cx('w-full max-w-md space-y-4', className)}>
      <section aria-labelledby={`${q.quotationId}-installation`}>
        <h3 id={`${q.quotationId}-installation`} className="text-body font-semibold text-fg">
          Chi phí lắp đặt
        </h3>
        <dl className="mt-1">
          <TotalRow
            label={cart ? 'Thiết bị, vật tư và dịch vụ' : 'Thiết bị và vật tư'}
            value={money(q.equipmentSubtotal)}
          />
          {(!cart || q.laborCost > 0) && <TotalRow label="Chi phí nhân công" value={money(q.laborCost)} />}
          {(!cart || q.transportCost > 0) && <TotalRow label="Vận chuyển" value={money(q.transportCost)} />}
          {q.otherServiceCost > 0 && <TotalRow label="Dịch vụ khác" value={money(q.otherServiceCost)} />}
          {q.discountAmount > 0 && <TotalRow label="Giảm giá" value={`−${money(q.discountAmount)}`} />}
          <TotalRow label={`Thuế báo giá ${formatPercent(q.taxRatePercent)}`} value={money(q.taxAmount)} />
          <TotalRow label="Tổng chi phí lắp đặt" value={money(a.installation)} strong />
        </dl>
      </section>
      <section aria-labelledby={`${q.quotationId}-packages`}>
        <h3 id={`${q.quotationId}-packages`} className="text-body font-semibold text-fg">
          Gói dịch vụ đi kèm
        </h3>
        <dl className="mt-1">
          {packageOfKind(q, 'MAINTENANCE') && <TotalRow label="Gói bảo trì" value={money(a.maintenance)} />}
          {packageOfKind(q, 'DISASTER_PROTECTION') && (
            <TotalRow label="Gói bảo vệ thiên tai" value={money(a.disaster)} />
          )}
          <TotalRow label="Tổng chi phí gói dịch vụ" value={money(a.packages)} strong />
        </dl>
        <p className="mt-1 text-meta text-fg-2">{PACKAGE_TAX_NOTE}</p>
      </section>
      <dl>
        <TotalRow label="Tổng giá trị báo giá" value={money(a.grand)} strong />
      </dl>
    </div>
  )
}
