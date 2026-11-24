import { Badge } from '@/components/common/ui/badge'
import { Button, IconButton } from '@/components/common/ui/button'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import {
  disasterTypesLabel,
  formatDurationMonths,
  formatPercent,
  visitMonthsLabel,
} from '@/features/after-sales/afterSalesDisplay'
import {
  BUNDLED_KIND_LABELS,
  bundledByKind,
  bundledSubscriptionStage,
  missingBundledKinds,
  type BundledKind,
  type BundledPackage,
  type BundledTotals,
} from '@/features/quotations/bundledPackageRules'
import { TotalRow } from '@/features/quotations/QuotationContent'
import { formatDateVn, formatQuotationMoney } from '@/features/quotations/quotationDisplay'
import type { SubscriptionView } from '@/types/res/customerAfterSalesRes'
import type { QuotationView } from '@/types/res/quotationsRes'
import { cx } from '@/utils/cx'

// Gói dịch vụ đi kèm báo giá lắp đặt: khối riêng, không trộn vào bảng thiết bị. Chỉ hiển thị bản chụp backend trả (giá và quyền
// lợi lúc gắn), không đọc lại danh mục, nên báo giá đã chốt không đổi khi quản trị sửa gói

function benefits(p: BundledPackage, money: (amount: number | null) => string) {
  if (p.kind === 'MAINTENANCE') return `${p.visitMonths.length} lượt bảo trì, vào ${visitMonthsLabel(p.visitMonths)}`
  return [
    disasterTypesLabel(p.coveredDisasterTypes),
    `hỗ trợ ${formatPercent(p.coveragePercent)} chi phí sửa chữa được duyệt`,
    `tối đa ${money(p.perIncidentLimit)} mỗi sự cố, ${money(p.termLimit)} mỗi kỳ`,
  ].join('; ')
}

type Props = {
  /** Gói đang gắn vào báo giá / hợp đồng (bản chụp của backend) */
  packages: BundledPackage[]
  currency?: string
  /** Báo giá còn là giỏ nháp của kỹ thuật viên */
  editable: boolean
  /** Có thì mọi nút tắt và hiện câu này (vd. chức năng chưa bật) */
  unavailable?: string | null
  /** Đang gửi lệnh thêm / đổi / bỏ */
  busy?: boolean
  onAdd?: (kind: BundledKind) => void
  onReplace?: (pkg: BundledPackage) => void
  onRemove?: (pkg: BundledPackage) => void
  className?: string
}

export function BundledPackagesSection({
  packages,
  currency = 'VND',
  editable,
  unavailable,
  busy = false,
  onAdd,
  onReplace,
  onRemove,
  className,
}: Props) {
  const money = (amount: number | null) => (amount == null ? '—' : formatQuotationMoney(amount, currency))
  const rows = bundledByKind(packages)
  const missing = missingBundledKinds(rows)
  const actionable = editable && !unavailable
  const actions = actionable && (onReplace || onRemove)
  if (!editable && rows.length === 0) return null

  return (
    <section aria-labelledby="bundled-packages-title" className={cx('space-y-3', className)}>
      <h3 id="bundled-packages-title" className="text-body font-semibold text-fg">
        Gói dịch vụ đi kèm
      </h3>
      {rows.length === 0 ? (
        <p className="text-body text-fg-2">Chưa có gói nào.</p>
      ) : (
        <Table stack>
          <thead>
            <tr>
              <Th>Gói</Th>
              <Th>Thời hạn</Th>
              <Th>Quyền lợi</Th>
              <Th className="text-right">Thành tiền</Th>
              {actions && (
                <Th>
                  <span className="sr-only">Thao tác</span>
                </Th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <Tr key={p.packageId}>
                <Td label="Gói" className="lg:min-w-48">
                  <p className="font-medium text-fg">{p.name}</p>
                  <p className="text-meta text-fg-2">{BUNDLED_KIND_LABELS[p.kind as BundledKind] ?? p.kind}</p>
                </Td>
                <Td label="Thời hạn" className="whitespace-nowrap">
                  {formatDurationMonths(p.durationMonths)}
                </Td>
                <Td label="Quyền lợi" className="text-fg-2">
                  {benefits(p, money)}
                </Td>
                <Td label="Thành tiền" className="tnum font-medium whitespace-nowrap text-fg lg:text-right">
                  {money(p.price)}
                </Td>
                {actions && (
                  <Td>
                    <div className="flex flex-wrap gap-2 lg:flex-nowrap lg:justify-end">
                      {onReplace && (
                        <IconButton
                          icon="swap_horiz"
                          label={`Đổi ${p.name}`}
                          tooltip="Đổi gói"
                          variant="soft"
                          size="sm"
                          disabled={busy}
                          onClick={() => onReplace(p)}
                        />
                      )}
                      {onRemove && (
                        <IconButton
                          icon="delete"
                          label={`Bỏ ${p.name}`}
                          tooltip="Bỏ gói"
                          variant="danger-quiet"
                          size="sm"
                          disabled={busy}
                          onClick={() => onRemove(p)}
                        />
                      )}
                    </div>
                  </Td>
                )}
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      {unavailable && <p className="text-meta text-fg-2">{unavailable}</p>}
      {editable && onAdd && (
        <Button
          icon="add"
          variant="soft"
          disabled={!actionable || busy || missing.length === 0}
          onClick={() => missing[0] && onAdd(missing[0])}
        >
          Thêm gói dịch vụ
        </Button>
      )}
    </section>
  )
}

/**
 * Tổng của báo giá có gói đi kèm: chi phí lắp đặt (số của backend) tách khỏi tiền gói. `packages` và `grandTotal` lấy của backend
 * khi có; chưa có thì nơi gọi cộng bản chụp và bật `preview` để ghi là tạm tính
 */
export function BundledQuotationTotals({
  quotation: q,
  packages,
  grandTotal,
  preview,
  className,
}: {
  quotation: Pick<
    QuotationView,
    | 'currency'
    | 'equipmentSubtotal'
    | 'laborCost'
    | 'transportCost'
    | 'otherServiceCost'
    | 'discountAmount'
    | 'taxAmount'
    | 'totalAmount'
  >
  packages: BundledTotals
  /** Tổng giá trị báo giá của backend; không có thì = chi phí lắp đặt + tiền gói */
  grandTotal?: number | null
  preview: boolean
  className?: string
}) {
  const money = (amount: number) => formatQuotationMoney(amount, q.currency)
  const fees = q.taxAmount + q.laborCost + q.transportCost + q.otherServiceCost
  return (
    <div className={cx('w-full max-w-md space-y-2', className)}>
      <dl>
        <TotalRow label="Tổng tiền thiết bị và vật tư" value={money(q.equipmentSubtotal)} />
        <TotalRow label="Thuế và các khoản phí hiện hành" value={money(fees)} />
        {q.discountAmount > 0 && <TotalRow label="Giảm giá" value={`−${money(q.discountAmount)}`} />}
        <TotalRow label="Tổng chi phí lắp đặt" value={money(q.totalAmount)} strong />
      </dl>
      <dl>
        <TotalRow label="Tổng tiền gói bảo trì" value={money(packages.maintenance)} />
        <TotalRow label="Tổng tiền gói bảo vệ thiên tai" value={money(packages.disaster)} />
        <TotalRow label="Tổng chi phí gói dịch vụ" value={money(packages.total)} strong />
      </dl>
      <dl>
        <TotalRow label="Tổng giá trị báo giá" value={money(grandTotal ?? q.totalAmount + packages.total)} strong />
      </dl>
      {preview && <p className="text-meta text-fg-2">Tiền gói và tổng giá trị là số tạm tính.</p>}
    </div>
  )
}

/**
 * Trạng thái một gói đi kèm theo backend. Không bao giờ tự báo "Đang có hiệu lực": chỉ khi backend trả ACTIVE (đã xác nhận tiền
 * và đã bàn giao). Kèm ngày bắt đầu kỳ, hoặc ngày bắt đầu bảo vệ khi gói thiên tai còn trong thời gian chờ
 */
export function BundledPackageStatus({
  subscription,
  now,
}: {
  subscription: Pick<SubscriptionView, 'status' | 'startsAt' | 'coverageStartsAt' | 'kind'>
  now: number
}) {
  const s = bundledSubscriptionStage(subscription, now)
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      <Badge tone={s.tone}>{s.label}</Badge>
      {s.startsAt && <span className="text-meta text-fg-2">bắt đầu {formatDateVn(s.startsAt)}</span>}
      {s.coverageStartsAt && (
        <span className="text-meta text-fg-2">bảo vệ thiên tai từ {formatDateVn(s.coverageStartsAt)}</span>
      )}
    </span>
  )
}
