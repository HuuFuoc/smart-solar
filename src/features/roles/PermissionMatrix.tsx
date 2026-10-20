import { useState } from 'react'
import { Checkbox } from '@/components/common/stitch-ui/Checkbox'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { cn } from '@/utils/cn'
import type { PermissionModule } from '@/data/roles'

/*
 * "Functional Capability Matrix" trong roles_permissions: 5 module, mỗi quyền là một ô có Checkbox (shadcn/Radix).
 * State do trang quản lý (granted + onToggle); component chỉ giữ trạng thái thu gọn module.
 * Màn nhỏ: lưới quyền giữ nguyên số cột và cuộn ngang trong container thay vì vỡ layout.
 */
export type PermissionMatrixLabels = {
  title: string
  collapse: string
  expand: string
  grantAll: string
  revokeAll: string
  allowed: string
}

export type PermissionMatrixProps = {
  modules: PermissionModule[]
  granted: ReadonlySet<string>
  onToggle: (permissionId: string, checked: boolean) => void
  onGrantAll: () => void
  onRevokeAll: () => void
  labels: PermissionMatrixLabels
  disabled?: boolean
  className?: string
}

export function PermissionMatrix({
  modules,
  granted,
  onToggle,
  onGrantAll,
  onRevokeAll,
  labels,
  disabled = false,
  className,
}: PermissionMatrixProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const allCollapsed = collapsed.size === modules.length
  const allGranted = modules.every((module) => module.items.every((item) => granted.has(item.id)))

  const toggleCollapsed = (moduleId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(moduleId)) next.delete(moduleId)
      else next.add(moduleId)
      return next
    })
  }

  return (
    <div className={cn('flex flex-col gap-space-md', className)}>
      <div className="flex items-center justify-between pt-space-xs">
        <div className="flex items-center gap-space-xs">
          <Icon name="rule_folder" className="text-[20px] text-primary" />
          <span className="text-[17px] font-semibold text-on-surface">{labels.title}</span>
        </div>
        <div className="flex items-center gap-space-xs text-label-sm text-outline">
          <button
            type="button"
            onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(modules.map((module) => module.id)))}
            className="text-[12px] transition-colors hover:text-primary"
          >
            {allCollapsed ? labels.expand : labels.collapse}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={allGranted ? onRevokeAll : onGrantAll}
            className="text-[12px] transition-colors hover:text-primary disabled:opacity-50"
          >
            {allGranted ? labels.revokeAll : labels.grantAll}
          </button>
        </div>
      </div>

      {modules.map((module) => {
        const allowed = module.items.filter((item) => granted.has(item.id)).length
        const isCollapsed = collapsed.has(module.id)
        const countTone =
          allowed === module.items.length ? 'text-tertiary-container' : allowed === 0 ? 'text-outline' : 'text-secondary'
        return (
          <section key={module.id} className="flex flex-col gap-space-sm rounded-2xl bg-surface-container-low/40 p-space-md">
            <button
              type="button"
              aria-expanded={!isCollapsed}
              onClick={() => toggleCollapsed(module.id)}
              className="flex w-full items-center justify-between gap-space-sm text-left"
            >
              <div className="flex items-center gap-space-xs">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-primary">
                  <Icon name={module.icon} className="text-[16px]" />
                </span>
                <span className="text-label-lg font-bold text-on-surface">
                  {module.index}. {module.title}
                </span>
              </div>
              <span className={cn('shrink-0 text-label-sm font-semibold', countTone)}>
                {allowed} / {module.items.length} {labels.allowed}
              </span>
            </button>

            {!isCollapsed && (
              <div className="overflow-x-auto pt-1 pb-1">
                <div
                  className={cn(
                    'grid gap-space-xs',
                    module.columns === 2 ? 'grid-cols-2 max-md:min-w-[520px]' : 'grid-cols-3 max-md:min-w-[640px]',
                  )}
                >
                  {module.items.map((item) => {
                    const inputId = `perm-${item.id}`
                    return (
                      <label
                        key={item.id}
                        htmlFor={inputId}
                        className="flex cursor-pointer items-center justify-between rounded-xl bg-surface-container-lowest p-space-sm shadow-level-1 transition-shadow hover:shadow-level-2"
                      >
                        <div className="flex flex-col pr-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn('text-label-md font-semibold', item.destructive ? 'text-error' : 'text-on-surface')}
                            >
                              {item.label}
                            </span>
                            {item.destructive && <Icon name="crisis_alert" className="text-[14px] text-error" />}
                          </div>
                          <span className="text-label-sm text-outline">{item.description}</span>
                        </div>
                        <Checkbox
                          id={inputId}
                          checked={granted.has(item.id)}
                          disabled={disabled}
                          tone={item.destructive ? 'error' : 'primary'}
                          onCheckedChange={(value) => onToggle(item.id, value === true)}
                        />
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
