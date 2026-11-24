import { useState, type ReactNode } from 'react'
import { Button } from '@/components/common/ui/button'
import { KeyValueList, type KV } from '@/components/common/ui/lists'
import {
  disasterTypesLabel,
  formatDurationMonths,
  formatPercent,
  visitMonthsLabel,
  isMaintenance,
  packageKindLabel,
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

/** Giá, thời hạn và quyền lợi của gói theo loại, đúng như backend trả */
export function PackageFacts({ pkg, columns, className }: { pkg: PackageView; columns?: 1 | 2; className?: string }) {
  return <KeyValueList columns={columns} className={className} items={packageFacts(pkg)} />
}

/** Ảnh mặc định theo loại gói, cho gói quản trị chưa gắn ảnh hoặc ảnh không tải được */
const DEFAULT_COVERS: Record<string, string> = {
  MAINTENANCE: '/images/packages/maintenance.webp',
  DISASTER_PROTECTION: '/images/packages/disaster.webp',
}

/** Ảnh bìa của gói: ảnh quản trị gắn, không có hoặc lỗi thì ảnh mặc định của loại gói; cả hai lỗi thì bỏ hẳn */
export function PackageCover({ url, kind }: { url: string | null; kind: string }) {
  const fallback = DEFAULT_COVERS[kind] ?? null
  const [src, setSrc] = useState(url || fallback)
  if (!src) return null
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      width={96}
      height={64}
      className="h-16 w-24 shrink-0 rounded-container border border-line object-cover"
      onError={() => setSrc(src !== fallback ? fallback : null)}
    />
  )
}

function Metric({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx('space-y-1', className)}>
      <p className="text-meta text-fg-2">{label}</p>
      <p className="text-body font-semibold text-fg">{children}</p>
    </div>
  )
}

const DIVIDED = 'lg:border-l lg:border-line lg:pl-6'

/** Thẻ một gói đang bán: tên loại gói, tên và mô tả gói, dải số liệu chính */
function PackageCard({ pkg: p, onBuy }: { pkg: PackageView; onBuy: (pkg: PackageView) => void }) {
  const maintenance = isMaintenance(p.kind)
  const kindTitle = packageKindLabel(p.kind)
  const subtitle = [p.name !== kindTitle ? p.name : null, p.description].filter(Boolean).join(': ')
  return (
    <article className="rounded-container border border-line bg-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <PackageCover key={p.imageUrl ?? p.kind} url={p.imageUrl} kind={p.kind} />
          <div className="min-w-0">
            <h3 className="text-title font-semibold text-fg">{kindTitle}</h3>
            {subtitle && <p className="mt-0.5 max-w-[72ch] text-meta whitespace-pre-line text-fg-2">{subtitle}</p>}
          </div>
        </div>
        <Button icon="shopping_cart" variant="soft" onClick={() => onBuy(p)}>
          Mua gói
          <span className="sr-only"> {p.name}</span>
        </Button>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-y-4 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Giá">{vnd(p.price)}</Metric>
        <Metric label="Thời hạn" className={DIVIDED}>
          {formatDurationMonths(p.durationMonths)}
        </Metric>
        {maintenance ? (
          <Metric label="Lịch bảo trì" className={cx(DIVIDED, 'lg:col-span-2')}>
            <span className="tnum">{p.visitMonths.length} lượt</span>, vào {visitMonthsLabel(p.visitMonths)} tính từ khi
            gói bắt đầu
          </Metric>
        ) : (
          <>
            <Metric label="Tỷ lệ hỗ trợ" className={DIVIDED}>
              {p.coveragePercent != null ? `${formatPercent(p.coveragePercent)} chi phí sửa chữa được duyệt` : '—'}
            </Metric>
            <Metric label="Hạn mức mỗi sự cố, mỗi kỳ" className={DIVIDED}>
              {vnd(p.perIncidentLimit)}, {vnd(p.termLimit)}
            </Metric>
          </>
        )}
      </div>
      {!maintenance && (
        <p className="mt-3 text-meta text-fg-2">Thiên tai được bảo vệ: {disasterTypesLabel(p.coveredDisasterTypes)}</p>
      )}
    </article>
  )
}

/** Gói đang bán của một loại */
export function PackageList({ items, onBuy }: { items: PackageView[]; onBuy: (pkg: PackageView) => void }) {
  return (
    <div className="space-y-4">
      {items.map((p) => (
        <PackageCard key={p.packageId} pkg={p} onBuy={onBuy} />
      ))}
    </div>
  )
}
