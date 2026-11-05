import { Button } from '@/components/common/ui/button'
import {
  disasterTypesLabel,
  formatDurationMonths,
  formatPercent,
  packageSaleMeta,
  visitMonthsLabel,
  isMaintenance,
} from '@/features/after-sales/afterSalesDisplay'
import type { PackageView } from '@/types/res/customerAfterSalesRes'
import { formatMoney } from '@/utils/format'
import { cx } from '@/utils/cx'

const vnd = (amount: number | null) => formatMoney(amount, 'VND')

function Benefits({ p }: { p: PackageView }) {
  if (isMaintenance(p.kind))
    return (
      <>
        <span className="font-semibold text-fg">{p.visitMonths.length} lượt bảo trì</span>
        <p className="tnum text-[12px] text-fg-muted mt-0.5">Vào các tháng {visitMonthsLabel(p.visitMonths)}</p>
      </>
    )
  return (
    <>
      <span className="font-semibold text-fg">{disasterTypesLabel(p.coveredDisasterTypes)}</span>
      <p className="tnum text-[12px] text-fg-muted mt-0.5">
        Hỗ trợ {formatPercent(p.coveragePercent)}, tối đa {vnd(p.perIncidentLimit)}/sự cố, {vnd(p.termLimit)}/kỳ
      </p>
    </>
  )
}

// Bảng gói của /admin/packages. Thao tác cuối dòng: Sửa, rồi Ngừng bán (hỏi lại) hoặc Mở bán lại
export function PackageTable({
  items,
  busyIds,
  onEdit,
  onStop,
  onReopen,
}: {
  items: PackageView[]
  /** Gói đang chờ đổi trạng thái bán, để khoá đúng những dòng đó */
  busyIds: ReadonlySet<string>
  onEdit: (p: PackageView) => void
  onStop: (p: PackageView) => void
  onReopen: (p: PackageView) => void
}) {
  return (
    <div className="overflow-hidden rounded-container border border-line bg-surface-1 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-meta border-collapse">
          <thead>
            <tr className="border-b border-line bg-surface-2 text-fg-2 font-medium">
              <th className="py-3 px-3.5 border-r border-line text-left text-meta font-semibold">
                Tên gói dịch vụ
              </th>
              <th className="py-3 px-3.5 border-r border-line text-right text-meta font-semibold">
                Đơn giá
              </th>
              <th className="py-3 px-3.5 border-r border-line text-left text-meta font-semibold">
                Thời hạn
              </th>
              <th className="py-3 px-3.5 border-r border-line text-left text-meta font-semibold">
                Quyền lợi bảo vệ
              </th>
              <th className="py-3 px-3.5 border-r border-line text-left text-meta font-semibold">
                Trạng thái
              </th>
              <th className="py-3 px-3.5 text-right text-meta font-semibold">
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {items.map((p) => {
              const sale = packageSaleMeta(p.isActive)
              const busy = busyIds.has(p.packageId)
              return (
                <tr key={p.packageId} className="group hover:bg-surface-2/60 transition-colors">
                  {/* Cột 1: Tên gói */}
                  <td className="py-3.5 px-3.5 border-r border-line align-top">
                    <p className="font-semibold text-fg">{p.name}</p>
                    {p.description && (
                      <p className="line-clamp-2 max-w-[56ch] text-[12px] text-fg-2 mt-0.5">{p.description}</p>
                    )}
                  </td>

                  {/* Cột 2: Giá */}
                  <td className="py-3.5 px-3.5 border-r border-line align-top tnum text-right whitespace-nowrap">
                    <span className="font-semibold text-fg text-sm">{vnd(p.price)}</span>
                  </td>

                  {/* Cột 3: Thời hạn */}
                  <td className="py-3.5 px-3.5 border-r border-line align-top whitespace-nowrap text-meta font-medium text-fg">
                    {formatDurationMonths(p.durationMonths)}
                  </td>

                  {/* Cột 4: Quyền lợi */}
                  <td className="py-3.5 px-3.5 border-r border-line align-top">
                    <Benefits p={p} />
                  </td>

                  {/* Cột 5: Trạng thái */}
                  <td className="py-3.5 px-3.5 border-r border-line align-top whitespace-nowrap">
                    <span
                      className={cx(
                        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                        sale.tone === 'ok'
                          ? 'bg-ok-soft text-ok border-ok/20'
                          : 'bg-surface-3 text-fg-2 border-line',
                      )}
                    >
                      <span
                        className={cx('size-1.5 rounded-full', sale.tone === 'ok' ? 'bg-ok' : 'bg-fg-muted')}
                      />
                      {sale.label}
                    </span>
                  </td>

                  {/* Cột 6: Thao tác */}
                  <td className="py-3.5 px-3.5 align-top text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <Button
                        variant="soft"
                        size="sm"
                        icon="edit"
                        aria-label={`Sửa ${p.name}`}
                        disabled={busy}
                        onClick={() => onEdit(p)}
                      >
                        Sửa
                      </Button>
                      {p.isActive ? (
                        <Button
                          size="sm"
                          variant="warn"
                          icon="visibility_off"
                          aria-label={`Ngừng bán ${p.name}`}
                          disabled={busy}
                          onClick={() => onStop(p)}
                        >
                          {busy ? 'Đang đổi…' : 'Ngừng bán'}
                        </Button>
                      ) : (
                        <Button
                          icon="play_circle"
                          size="sm"
                          variant="soft"
                          aria-label={`Mở bán lại ${p.name}`}
                          disabled={busy}
                          onClick={() => onReopen(p)}
                        >
                          {busy ? 'Đang mở…' : 'Mở bán lại'}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-2/40 px-3.5 py-2.5 text-meta text-fg-2">
        <p className="tnum text-xs">
          Tổng cộng: <strong className="text-fg">{items.length}</strong> gói dịch vụ
        </p>
        <span className="text-xs text-fg-muted">Gói ngừng bán sẽ không hiển thị trên portal khách hàng</span>
      </div>
    </div>
  )
}
