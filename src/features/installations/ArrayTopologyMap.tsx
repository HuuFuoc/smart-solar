import { cn } from '@/utils/cn'

/*
 * "Array Topology Map" trong installation_task_checklist: dãy module của một string,
 * đường bus nét đứt và hộp combiner. Vẽ bằng SVG theo đúng toạ độ trong code.html.
 */
export type ArrayTopologyMapProps = {
  title: string
  /** Chú thích bên phải tiêu đề, ví dụ "2x 12-module strings" */
  note: string
  /** Số module vẽ trên đường bus */
  modules?: number
  /** Nhãn trong hộp combiner */
  combinerLabel: string
  className?: string
}

export function ArrayTopologyMap({
  title,
  note,
  modules = 12,
  combinerLabel,
  className,
}: ArrayTopologyMapProps) {
  return (
    <div className={cn('rounded-xl bg-surface p-space-sm', className)}>
      <div className="mb-2 flex items-center justify-between gap-space-xs">
        <span className="text-label-sm font-bold text-on-surface-variant">{title}</span>
        <span className="text-label-sm font-semibold text-primary">{note}</span>
      </div>

      <svg viewBox="0 0 320 80" fill="none" role="img" aria-label={`${title}: ${note}`} className="h-24 w-full text-on-surface">
        {Array.from({ length: modules }, (_, i) => (
          <rect key={i} x={10 + i * 26} y={10} width={22} height={28} rx={2} className="fill-primary-container" />
        ))}
        <path d="M10 44 H318" stroke="currentColor" strokeWidth={2} strokeDasharray="3 3" strokeOpacity={0.25} />
        <path d="M165 44 V68 H200" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="text-tertiary-container" />
        <rect x={200} y={56} width={118} height={20} rx={4} className="fill-primary" />
        <text x={210} y={70} fontSize={9} fontWeight={600} className="fill-on-primary">
          {combinerLabel}
        </text>
      </svg>
    </div>
  )
}
