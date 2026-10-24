import { Card } from '@/components/common/stitch-ui/Card'
import { Icon } from '@/components/common/stitch-ui/Icon'

type SalesPipelineFunnelProps = {
  total: number
  pending: number
  scheduled: number
  completed: number
}

export function SalesPipelineFunnel({
  total,
  pending,
  scheduled,
  completed,
}: SalesPipelineFunnelProps) {
  const safeTotal = total > 0 ? total : 1
  const pendingPct = Math.round((pending / safeTotal) * 100)
  const scheduledPct = Math.round((scheduled / safeTotal) * 100)
  const completedPct = Math.round((completed / safeTotal) * 100)

  return (
    <Card className="flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between border-b border-surface-container-highest pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name="filter_alt" className="text-[20px]" />
          </div>
          <div>
            <h3 className="text-label-lg font-bold text-on-surface">Phễu chuyển đổi bán hàng</h3>
            <p className="text-body-sm text-on-surface-variant">Tiến độ từ lúc tiếp nhận đến khi hoàn tất khảo sát</p>
          </div>
        </div>
        <span className="rounded-full bg-surface-container px-3 py-1 text-label-sm font-semibold text-on-surface-variant">
          Tổng cộng: {total} hồ sơ
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-container-highest">
          <div
            className="bg-amber-500 transition-all duration-500"
            style={{ width: `${pendingPct}%` }}
            title={`Chờ xếp lịch: ${pending} (${pendingPct}%)`}
          />
          <div
            className="bg-blue-500 transition-all duration-500"
            style={{ width: `${scheduledPct}%` }}
            title={`Đã lên lịch: ${scheduled} (${scheduledPct}%)`}
          />
          <div
            className="bg-emerald-500 transition-all duration-500"
            style={{ width: `${completedPct}%` }}
            title={`Đã khảo sát xong: ${completed} (${completedPct}%)`}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2">
          <div className="flex flex-col rounded-xl bg-amber-500/10 p-3">
            <div className="flex items-center gap-1.5 text-label-sm font-semibold text-amber-700 dark:text-amber-300">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Chờ xếp lịch
            </div>
            <span className="mt-1 text-headline-sm font-bold text-amber-900 dark:text-amber-100">{pending}</span>
            <span className="text-body-sm text-amber-700/80 dark:text-amber-300/80">{pendingPct}% tổng số</span>
          </div>

          <div className="flex flex-col rounded-xl bg-blue-500/10 p-3">
            <div className="flex items-center gap-1.5 text-label-sm font-semibold text-blue-700 dark:text-blue-300">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Đã có lịch KTV
            </div>
            <span className="mt-1 text-headline-sm font-bold text-blue-900 dark:text-blue-100">{scheduled}</span>
            <span className="text-body-sm text-blue-700/80 dark:text-blue-300/80">{scheduledPct}% tổng số</span>
          </div>

          <div className="flex flex-col rounded-xl bg-emerald-500/10 p-3">
            <div className="flex items-center gap-1.5 text-label-sm font-semibold text-emerald-700 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Sẵn sàng báo giá
            </div>
            <span className="mt-1 text-headline-sm font-bold text-emerald-900 dark:text-emerald-100">{completed}</span>
            <span className="text-body-sm text-emerald-700/80 dark:text-emerald-300/80">{completedPct}% tổng số</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
