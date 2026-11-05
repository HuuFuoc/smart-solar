import { Icon } from '@/components/common/stitch-ui/Icon'
import type { OperationalZoneListItem } from '@/types/res/operationalZonesRes'

interface ZoneCheckCardProps {
  zone: OperationalZoneListItem
  checked: boolean
  onToggle: () => void
}

export function ZoneCheckCard({ zone, checked, onToggle }: ZoneCheckCardProps) {
  const isDisabled = !zone.isActive

  return (
    <div
      role="checkbox"
      tabIndex={isDisabled ? -1 : 0}
      aria-checked={checked}
      aria-disabled={isDisabled}
      onClick={() => !isDisabled && onToggle()}
      onKeyDown={(e) => {
        if (!isDisabled && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault()
          onToggle()
        }
      }}
      className={`relative flex cursor-pointer select-none items-start gap-3 rounded-container border p-3.5 transition-all ${
        isDisabled
          ? 'cursor-not-allowed border-line bg-surface-2/30 opacity-50'
          : checked
            ? 'border-emerald-500/50 bg-emerald-500/10 shadow-2xs hover:border-emerald-500'
            : 'border-line bg-surface-1 hover:border-fg-3 hover:bg-surface-2/50'
      }`}
    >
      <div
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
          checked ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-fg-3 bg-canvas'
        }`}
      >
        {checked && <Icon name="check" className="text-[16px] text-white" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="font-semibold text-fg">{zone.name}</span>
          {zone.code && <span className="font-mono text-micro text-fg-3">{zone.code}</span>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded bg-surface-2 px-1.5 py-0.5 text-micro font-medium text-fg-2">
            <Icon name="location_on" className="text-accent text-[13px]" />
            {zone.communeCount} phường, xã
          </span>
          {!zone.isServiceable && (
            <span className="inline-block rounded border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-micro font-medium text-amber-600 dark:text-amber-400">
              Tạm ngưng
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
