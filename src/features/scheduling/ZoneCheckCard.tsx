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
            ? 'border-accent-line bg-accent-soft hover:border-accent'
            : 'border-line bg-canvas hover:border-fg-3 hover:bg-surface-2/50'
      }`}
    >
      <div
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-control border transition-colors ${
          checked ? 'border-accent bg-accent text-on-accent' : 'border-fg-3 bg-canvas'
        }`}
      >
        {checked && <Icon name="check" className="text-[16px] text-on-accent" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="font-semibold text-fg">{zone.name}</span>
          {zone.code && <span className="font-mono text-meta text-fg-3">{zone.code}</span>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-control bg-surface-2 px-1.5 py-0.5 text-meta font-medium text-fg-2">
            <Icon name="location_on" className="text-accent-fg text-meta" />
            {zone.communeCount} phường, xã
          </span>
          {!zone.isServiceable && (
            <span className="inline-block rounded-control border border-warn/30 bg-warn-soft px-1.5 py-0.5 text-meta font-medium text-warn">
              Tạm ngưng
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
