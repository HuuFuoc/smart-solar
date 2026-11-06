type SalesPipelineFunnelProps = {
  total: number
  pending: number
  scheduled: number
  completed: number
}

export function SalesPipelineFunnel({ total, pending, scheduled, completed }: SalesPipelineFunnelProps) {
  const safeTotal = total > 0 ? total : 1
  const pendingPct = total > 0 ? Math.round((pending / safeTotal) * 100) : 0
  const scheduledPct = total > 0 ? Math.round((scheduled / safeTotal) * 100) : 0
  const completedPct = total > 0 ? Math.round((completed / safeTotal) * 100) : 0

  return (
    <div className="rounded-container border border-line bg-surface-2 p-3 sm:p-4 shadow-sm">
      {/* Header dòng đơn: Tiêu đề + Legend ngắn gọn */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-body font-semibold text-fg">Tiến độ quy trình</span>
          <span className="text-meta text-fg-3">({total} hồ sơ)</span>
        </div>

        {/* Legend trực quan thu gọn */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-meta">
          <div className="flex items-center gap-1.5">
            <span className="size-2 shrink-0 rounded-full bg-warn" aria-hidden />
            <span className="text-fg-2">Chờ kỹ thuật viên:</span>
            <span className="tnum font-medium text-fg">
              {pending} <span className="text-fg-3">({pendingPct}%)</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 shrink-0 rounded-full bg-info" aria-hidden />
            <span className="text-fg-2">Đã có lịch:</span>
            <span className="tnum font-medium text-fg">
              {scheduled} <span className="text-fg-3">({scheduledPct}%)</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 shrink-0 rounded-full bg-ok" aria-hidden />
            <span className="text-fg-2">Sẵn sàng báo giá:</span>
            <span className="tnum font-medium text-fg">
              {completed} <span className="text-fg-3">({completedPct}%)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Thanh Multi-segment Progress Bar mini */}
      <div
        aria-hidden
        className="mt-2.5 flex h-2 w-full overflow-hidden rounded-control bg-surface-3"
        role="progressbar"
        aria-label="Tiến độ hồ sơ khảo sát"
      >
        {pendingPct > 0 && (
          <div className="h-full bg-warn transition-all duration-300" style={{ width: `${pendingPct}%` }} />
        )}
        {scheduledPct > 0 && (
          <div className="h-full bg-info transition-all duration-300" style={{ width: `${scheduledPct}%` }} />
        )}
        {completedPct > 0 && (
          <div className="h-full bg-ok transition-all duration-300" style={{ width: `${completedPct}%` }} />
        )}
      </div>
    </div>
  )
}
