import { Button } from '@/components/common/ui/button'
import { ListRow } from '@/components/common/ui/list-row'
import { KeyValueList } from '@/components/common/ui/lists'
import { disasterTypesLabel, formatDurationMonths, formatPercent } from '@/features/after-sales/afterSalesDisplay'
import type { PackageView } from '@/types/res/customerAfterSalesRes'
import { formatMoney } from '@/utils/format'

const vnd = (amount: number | null) => <span className="tnum">{formatMoney(amount, 'VND')}</span>

/** Gói thiên tai đang bán, thông tin đúng như backend trả */
export function DisasterPackageList({ items, onBuy }: { items: PackageView[]; onBuy: (pkg: PackageView) => void }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((p) => (
        <ListRow key={p.packageId}>
          <div className="grid gap-x-8 gap-y-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="min-w-0">
              <h3 className="text-title font-semibold">{p.name}</h3>
              {p.description && (
                <p className="mt-1 max-w-[72ch] text-body whitespace-pre-line text-fg-2">{p.description}</p>
              )}
              <KeyValueList
                columns={2}
                className="mt-4"
                items={[
                  { k: 'Giá', v: vnd(p.price) },
                  { k: 'Thời hạn', v: formatDurationMonths(p.durationMonths) },
                  { k: 'Thiên tai được bảo vệ', v: disasterTypesLabel(p.coveredDisasterTypes) },
                  { k: 'Tỷ lệ hỗ trợ', v: `${formatPercent(p.coveragePercent)} chi phí sửa chữa được duyệt` },
                  { k: 'Hạn mức mỗi sự cố', v: vnd(p.perIncidentLimit) },
                  { k: 'Hạn mức mỗi kỳ', v: vnd(p.termLimit) },
                ]}
              />
            </div>
            <Button variant="soft" onClick={() => onBuy(p)}>
              Mua gói
            </Button>
          </div>
        </ListRow>
      ))}
    </ul>
  )
}
