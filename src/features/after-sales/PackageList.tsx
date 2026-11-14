import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { KeyValueList, type KV } from '@/components/common/ui/lists'
import {
  disasterTypesLabel,
  formatDurationMonths,
  formatPercent,
  isMaintenance,
  packageKindLabel,
  visitMonthsLabel,
} from '@/features/after-sales/afterSalesDisplay'
import type { PackageView } from '@/types/res/customerAfterSalesRes'
import { cx } from '@/utils/cx'
import { formatMoney } from '@/utils/format'

const vnd = (amount: number | null) => <span className="tnum">{formatMoney(amount, 'VND')}</span>

function packageFacts(p: PackageView): KV[] {
  const common: KV[] = [
    { k: 'Giá', v: vnd(p.price) },
    { k: 'Thời hạn', v: formatDurationMonths(p.durationMonths) },
  ]
  if (isMaintenance(p.kind))
    return [
      ...common,
      { k: 'Số lượt bảo trì', v: <span className="tnum">{p.visitMonths.length} lượt</span> },
      { k: 'Lịch bảo trì', v: `Vào ${visitMonthsLabel(p.visitMonths)} tính từ khi gói bắt đầu` },
    ]
  return [
    ...common,
    { k: 'Thiên tai được bảo vệ', v: disasterTypesLabel(p.coveredDisasterTypes) },
    { k: 'Tỷ lệ hỗ trợ', v: `${formatPercent(p.coveragePercent)} chi phí sửa chữa được duyệt` },
    { k: 'Hạn mức mỗi sự cố', v: vnd(p.perIncidentLimit) },
    { k: 'Hạn mức mỗi kỳ', v: vnd(p.termLimit) },
  ]
}

/** Giá, thời hạn và quyền lợi của gói theo loại, dùng trong PurchaseDialog */
export function PackageFacts({ pkg, columns, className }: { pkg: PackageView; columns?: 1 | 2; className?: string }) {
  return <KeyValueList columns={columns} className={className} items={packageFacts(pkg)} />
}

/** Thẻ gói dịch vụ hiển thị nổi bật theo chuẩn giao diện hiện đại */
function PackageCard({ pkg: p, onBuy }: { pkg: PackageView; onBuy: (pkg: PackageView) => void }) {
  const isMaint = isMaintenance(p.kind)
  const kindTitle = packageKindLabel(p.kind)
  const subtitle = [p.name !== kindTitle ? p.name : null, p.description].filter(Boolean).join(' – ')

  return (
    <article className="rounded-container border border-line bg-canvas p-5 sm:p-6 mb-4 last:mb-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {/* Header Left: Icon Box + Title/Subtitle */}
        <div className="flex items-start gap-4 min-w-0">
          <div
            className={cx(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-container',
              isMaint ? 'bg-accent-soft text-primary border border-accent-line/30' : 'bg-primary text-primary-fg',
            )}
          >
            <Icon
              name={isMaint ? 'build' : 'verified_user'}
              className={cx('text-[24px]', isMaint ? 'text-primary' : 'text-primary-fg')}
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-title font-bold text-fg">{kindTitle}</h3>
            {subtitle && <p className="mt-0.5 text-meta text-fg-2 leading-relaxed">{subtitle}</p>}
          </div>
        </div>

        {/* Header Right: Mua gói Button */}
        <div className="shrink-0">
          {isMaint ? (
            <Button icon="shopping_cart" variant="primary" onClick={() => onBuy(p)}>
              Mua gói
            </Button>
          ) : (
            <Button
              icon="receipt_long"
              variant="secondary"
              className="border-primary! text-primary! hover:bg-accent-soft!"
              onClick={() => onBuy(p)}
            >
              Mua gói
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Row with dividers */}
      <div className="mt-5 grid grid-cols-1 gap-y-4 pt-4 border-t border-line/60 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-0">
        {/* Metric 1: Giá */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-meta text-fg-2">
            <Icon name="payments" className="text-primary text-[20px]" />
            <span>Giá</span>
          </div>
          <p className="text-body font-bold text-fg">{vnd(p.price)}</p>
        </div>

        {/* Metric 2: Thời hạn */}
        <div className="space-y-1 lg:border-l lg:border-line lg:pl-6">
          <div className="flex items-center gap-1.5 text-meta text-fg-2">
            <Icon name="calendar_today" className="text-primary text-[20px]" />
            <span>Thời hạn</span>
          </div>
          <p className="text-body font-bold text-fg">{formatDurationMonths(p.durationMonths)}</p>
        </div>

        {isMaint ? (
          /* Maintenance Metric 3: Lịch bảo trì */
          <div className="space-y-1 lg:border-l lg:border-line lg:pl-6 lg:col-span-2">
            <div className="flex items-center gap-1.5 text-meta text-fg-2">
              <Icon name="format_list_bulleted" className="text-primary text-[20px]" />
              <span>Lịch bảo trì</span>
            </div>
            <p className="text-body font-bold text-fg">
              Vào {visitMonthsLabel(p.visitMonths)} tính từ khi gói bắt đầu.
            </p>
          </div>
        ) : (
          <>
            {/* Disaster Metric 3: Tỷ lệ hỗ trợ */}
            <div className="space-y-1 lg:border-l lg:border-line lg:pl-6">
              <div className="flex items-center gap-1.5 text-meta text-fg-2">
                <Icon name="percent" className="text-primary text-[20px]" />
                <span>Tỷ lệ hỗ trợ</span>
              </div>
              <p className="text-body font-bold text-fg">
                {p.coveragePercent != null ? `${formatPercent(p.coveragePercent)} chi phí sửa chữa được duyệt` : '—'}
              </p>
            </div>

            {/* Disaster Metric 4: Hạn mức mỗi kỳ */}
            <div className="space-y-1 lg:border-l lg:border-line lg:pl-6">
              <div className="flex items-center gap-1.5 text-meta text-fg-2">
                <Icon name="savings" className="text-primary text-[20px]" />
                <span>{p.termLimit != null ? 'Hạn mức mỗi kỳ' : 'Hạn mức mỗi sự cố'}</span>
              </div>
              <p className="text-body font-bold text-fg">{vnd(p.termLimit ?? p.perIncidentLimit)}</p>
            </div>
          </>
        )}
      </div>
    </article>
  )
}

/** Danh sách các gói đang bán */
export function PackageList({ items, onBuy }: { items: PackageView[]; onBuy: (pkg: PackageView) => void }) {
  return (
    <div className="space-y-4">
      {items.map((p) => (
        <PackageCard key={p.packageId} pkg={p} onBuy={onBuy} />
      ))}
    </div>
  )
}
