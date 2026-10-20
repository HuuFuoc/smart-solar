import { cn } from '@/utils/cn'

/*
 * Widget "South Roof Array Grid" của installation_task: ma trận 6 cột thể hiện
 * từng tấm pin theo trạng thái lắp đặt, kèm chú giải màu bên dưới.
 */
export type PanelState = 'mounted' | 'active' | 'queued'

export type PanelCell = {
  index: number
  state: PanelState
}

const cellClasses: Record<PanelState, string> = {
  mounted: 'bg-primary-container text-on-primary font-bold shadow-sm',
  active: 'bg-secondary-fixed text-on-secondary-fixed font-bold',
  queued: 'bg-surface-container-highest text-on-surface-variant',
}

const legendClasses: Record<PanelState, string> = {
  mounted: 'bg-primary-container',
  active: 'bg-secondary-fixed',
  queued: 'bg-surface-container-highest',
}

export type PanelArrayGridProps = {
  cells: PanelCell[]
  legend: { label: string; state: PanelState }[]
  /** Số cột của ma trận (thiết kế dùng 6) */
  columns?: number
  className?: string
}

export function PanelArrayGrid({ cells, legend, columns = 6, className }: PanelArrayGridProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-space-sm rounded-xl bg-surface-container-low p-space-md',
        className,
      )}
    >
      <div
        className="grid w-full max-w-sm gap-1.5"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {cells.map((cell) => (
          <div
            key={cell.index}
            className={cn(
              'flex h-9 items-center justify-center rounded text-label-sm',
              cellClasses[cell.state],
            )}
          >
            {cell.index}
          </div>
        ))}
      </div>

      <div className="flex w-full flex-wrap items-center justify-between gap-space-xs pt-space-xs text-label-sm text-on-surface-variant">
        {legend.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cn('h-3 w-3 rounded', legendClasses[item.state])} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
