import { Icon } from '@/components/common/stitch-ui/Icon'
import { cn } from '@/utils/cn'
import type { RoleScopeTone, RoleSummary } from '@/data/roles'

/* Thẻ role trong cột "System Roles" của roles_permissions; thẻ đang chọn có vạch primary bên trái. */
const scopeToneClasses: Record<RoleScopeTone, string> = {
  protected: 'font-semibold text-tertiary-container',
  custom: 'text-on-surface-variant',
  readonly: 'font-semibold text-secondary',
}

export type RoleCardProps = {
  role: RoleSummary
  selected: boolean
  onSelect: () => void
  onClone?: () => void
  onEdit?: () => void
  className?: string
}

export function RoleCard({ role, selected, onSelect, onClone, onEdit, className }: RoleCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        'group relative cursor-pointer rounded-2xl border border-outline-card bg-surface-container-lowest p-space-md transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-tertiary-container/30',
        selected ? 'shadow-level-2' : 'shadow-level-1 hover:shadow-level-2',
        className,
      )}
    >
      {selected && <div aria-hidden="true" className="absolute bottom-3 left-0 top-3 w-1.5 rounded-r-full bg-primary" />}

      <div className="flex items-start justify-between gap-space-xs">
        <div className="flex min-w-0 items-center gap-space-xs">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
              selected
                ? 'bg-primary-container text-on-primary'
                : 'bg-surface-container-low text-on-surface-variant group-hover:bg-primary-container group-hover:text-on-primary',
            )}
          >
            <Icon name={role.icon} className="text-[20px]" />
          </div>
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'truncate text-[16px] font-bold transition-colors',
                  selected ? 'text-primary' : 'text-on-surface group-hover:text-primary',
                )}
              >
                {role.name}
              </span>
              {selected && <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-tertiary-container" />}
            </div>
            <span className="truncate text-label-sm text-outline">{role.tagline}</span>
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-label-sm font-bold',
            selected ? 'bg-surface-container text-primary' : 'bg-surface-container-low text-on-surface-variant',
          )}
        >
          {role.users.toLocaleString()} tài khoản
        </span>
      </div>

      <p className="mt-2 line-clamp-2 text-[12px] text-on-surface-variant">{role.description}</p>

      <div className="mt-3 flex items-center justify-between pt-2 text-label-sm text-outline">
        <span className={cn('flex items-center gap-1', scopeToneClasses[role.scopeTone])}>
          <Icon name={role.scopeIcon} className="text-[14px]" /> {role.scopeLabel}
        </span>
        <div className="flex items-center gap-space-xs opacity-80 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClone?.()
            }}
            className="flex items-center gap-0.5 rounded bg-surface-container-low px-2 py-0.5 transition-colors hover:bg-surface-container-high hover:text-primary"
          >
            <Icon name="content_copy" className="text-[13px]" /> Clone
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit?.()
            }}
            className="flex items-center gap-0.5 rounded bg-surface-container-low px-2 py-0.5 transition-colors hover:bg-surface-container-high hover:text-primary"
          >
            <Icon name="edit" className="text-[13px]" /> Edit
          </button>
        </div>
      </div>
    </div>
  )
}
