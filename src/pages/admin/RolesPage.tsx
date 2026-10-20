import { useEffect, useMemo, useState } from 'react'
import { PermissionMatrix } from '@/features/roles/PermissionMatrix'
import { RoleCard } from '@/features/roles/RoleCard'
import {
  Breadcrumb,
  Button,
  Card,
  CardTitle,
  Icon,
  PageHeader,
  ProgressRing,
  SearchInput,
  StatusBadge,
  Toast,
} from '@/components/common/stitch-ui'
import { cn } from '@/utils/cn'
import {
  auditTrailFooter,
  governanceCallout,
  matrixLabels,
  matrixStatus,
  permissionModules,
  roleDefaults,
  roles,
  rolesPageHeader,
  rolesToasts,
  systemRolesPanel,
  type RoleId,
} from '@/data/roles'

/* Dựng từ roles_permissions/code.html + screen.png. */

type GrantedByRole = Record<RoleId, Set<string>>

function initialGranted(): GrantedByRole {
  return Object.fromEntries(
    (Object.keys(roleDefaults) as RoleId[]).map((id) => [id, new Set(roleDefaults[id])]),
  ) as GrantedByRole
}

function setsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>) {
  if (a.size !== b.size) return false
  for (const value of a) if (!b.has(value)) return false
  return true
}

export function RolesPage() {
  const [selectedId, setSelectedId] = useState<RoleId>('super-admin')
  const [granted, setGranted] = useState<GrantedByRole>(initialGranted)
  const [saved, setSaved] = useState<GrantedByRole>(initialGranted)
  const [search, setSearch] = useState('')
  const [statusMessage, setStatusMessage] = useState(matrixStatus.clean)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(timer)
  }, [toast])

  const role = roles.find((r) => r.id === selectedId) ?? roles[0]!
  const current = granted[selectedId]
  const dirty = !setsEqual(current, saved[selectedId])

  const visibleRoles = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return roles
    return roles.filter((r) =>
      [r.name, r.tagline, r.description, r.scopeLabel].some((text) => text.toLowerCase().includes(query)),
    )
  }, [search])

  const updateCurrent = (next: Set<string>) => setGranted((prev) => ({ ...prev, [selectedId]: next }))

  const handleToggle = (permissionId: string, checked: boolean) => {
    const next = new Set(current)
    if (checked) next.add(permissionId)
    else next.delete(permissionId)
    updateCurrent(next)
    setStatusMessage(matrixStatus.dirty)
  }

  const handleSelectRole = (id: RoleId) => {
    setSelectedId(id)
    const name = roles.find((r) => r.id === id)?.name ?? ''
    setStatusMessage(matrixStatus.loaded(name))
  }

  const handleSave = () => {
    setSaved((prev) => ({ ...prev, [selectedId]: new Set(current) }))
    setStatusMessage(matrixStatus.saved)
    setToast(rolesToasts.saved)
  }

  const handleReset = () => {
    updateCurrent(new Set(roleDefaults[selectedId]))
    setStatusMessage(matrixStatus.reset)
    setToast(rolesToasts.reset)
  }

  return (
    <div className="flex flex-col gap-space-lg">
      {/* Breadcrumb + chip trạng thái */}
      <Breadcrumb items={rolesPageHeader.breadcrumb} activeTone="primary" />

      <Card>
        <PageHeader
          bottomSpacing="none"
          title={rolesPageHeader.title}
          actions={
            <>
              <Button variant="ghost" size="md" iconLeft="ios_share" className="h-11 text-on-surface shadow-sm hover:bg-surface-container-high" onClick={() => setToast(rolesToasts.export)}>
                {rolesPageHeader.actions.export}
              </Button>
              <Button variant="ghost" size="md" iconLeft="verified_user" className="h-11 text-secondary shadow-sm hover:bg-surface-container-high" onClick={() => setToast(rolesToasts.audit)}>
                {rolesPageHeader.actions.audit}
              </Button>
              <Button size="md" iconLeft="add_moderator" className="h-11">
                {rolesPageHeader.actions.create}
              </Button>
            </>
          }
        />
      </Card>

      <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
        {/* Cột trái: danh sách role */}
        <div className="flex flex-col gap-space-md lg:col-span-4">
          <Card padding="md" className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <CardTitle icon="groups_3">{systemRolesPanel.title}</CardTitle>
              <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-label-sm font-bold text-on-surface-variant">
                {systemRolesPanel.countLabel(roles.length)}
              </span>
            </div>
            <SearchInput
              size="md"
              placeholder={systemRolesPanel.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="[&>input]:h-10 [&>input]:pl-9 [&>input]:text-body-sm"
            />
            <div className="flex items-center justify-between gap-space-sm rounded-xl bg-surface-container-low/60 p-3">
              <div className="flex flex-col">
                <span className="text-label-sm text-outline">{systemRolesPanel.governed.label}</span>
                <span className="mt-1 text-data-metric leading-none text-primary">{systemRolesPanel.governed.value}</span>
                <span className="mt-0.5 flex items-center gap-1 text-label-sm text-tertiary-container">
                  <Icon name="check_circle" className="text-[13px]" /> {systemRolesPanel.governed.note}
                </span>
              </div>
              <ProgressRing value={systemRolesPanel.governed.percent} label={systemRolesPanel.governed.note}>
                <Icon name="security" className="text-[18px] text-primary" />
              </ProgressRing>
            </div>
          </Card>

          <div className="flex flex-col gap-space-xs">
            {visibleRoles.map((r) => (
              <RoleCard key={r.id} role={r} selected={r.id === selectedId} onSelect={() => handleSelectRole(r.id)} />
            ))}
            {visibleRoles.length === 0 && (
              <p className="rounded-2xl bg-surface-container-low/60 p-space-md text-center text-body-sm text-on-surface-variant">
                Không có vai trò nào khớp bộ lọc
              </p>
            )}
          </div>

          <div className="flex items-center gap-space-sm rounded-2xl bg-surface-container-low/70 p-space-md">
            <img src={governanceCallout.image} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
            <div className="flex min-w-0 flex-col">
              <span className="text-label-sm text-outline">{governanceCallout.eyebrow}</span>
              <span className="truncate text-[14px] font-semibold text-on-surface">{governanceCallout.title}</span>
              <span className="line-clamp-1 text-label-sm text-on-surface-variant">{governanceCallout.note}</span>
            </div>
          </div>
        </div>

        {/* Cột phải: role đang chọn + ma trận quyền */}
        <div className="flex flex-col gap-space-md lg:col-span-8">
          <Card className="flex flex-col gap-space-md">
            <div className="flex flex-col justify-between gap-space-sm pb-space-sm sm:flex-row sm:items-center">
              <div className="flex items-center gap-space-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-on-primary shadow-level-2">
                  <Icon name={role.icon} className="text-[28px]" />
                </div>
                <div className="flex flex-col">
                  <div className="flex flex-wrap items-center gap-space-xs">
                    <h2 className="text-headline-lg font-bold text-on-surface">{role.name}</h2>
                    {role.detail.badge && (
                      <StatusBadge variant={role.detail.badge.variant} size="sm" className="px-3">
                        {role.detail.badge.label}
                      </StatusBadge>
                    )}
                  </div>
                  <span className="text-body-sm text-on-surface-variant">{role.detail.subtitle}</span>
                </div>
              </div>
              <span className="self-start rounded-xl bg-surface-container-low px-3 py-1.5 text-label-sm text-outline sm:self-auto">
                Scope: {role.detail.scope}
              </span>
            </div>

            {role.detail.warning && (
              <div className="flex items-start gap-space-sm rounded-xl bg-error-container/40 p-space-md text-on-error-container">
                <Icon name="warning" className="mt-0.5 shrink-0 text-[22px] text-error" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-label-lg font-bold text-error">{role.detail.warning.title}</span>
                  <p className="text-body-sm text-on-surface">
                    {role.detail.warning.before}
                    <strong className="font-semibold text-error">{role.detail.warning.strong}</strong>
                    {role.detail.warning.after}
                  </p>
                </div>
              </div>
            )}

            <PermissionMatrix
              modules={permissionModules}
              granted={current}
              onToggle={handleToggle}
              onGrantAll={() => {
                updateCurrent(new Set(permissionModules.flatMap((m) => m.items.map((i) => i.id))))
                setStatusMessage(matrixStatus.dirty)
              }}
              onRevokeAll={() => {
                updateCurrent(new Set())
                setStatusMessage(matrixStatus.dirty)
              }}
              labels={matrixLabels}
            />

            <div className="mt-space-sm flex flex-col items-center justify-between gap-space-md rounded-2xl bg-surface-container-low p-space-md shadow-level-1 sm:flex-row">
              <div className="flex items-center gap-space-xs text-on-surface-variant">
                <span
                  aria-hidden="true"
                  className={cn('h-2.5 w-2.5 rounded-full', dirty ? 'bg-secondary' : 'bg-tertiary-container')}
                />
                <span className="text-label-md text-on-surface">{statusMessage}</span>
              </div>
              <div className="flex w-full items-center justify-end gap-space-sm sm:w-auto">
                <Button variant="tonal" size="md" className="h-11 text-on-surface hover:bg-surface-container-high" onClick={handleReset}>
                  {matrixLabels.reset}
                </Button>
                <Button size="md" iconLeft="save" className="h-11 px-space-lg" onClick={handleSave}>
                  {matrixLabels.save}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="flex flex-col items-center justify-between gap-space-md sm:flex-row">
            <div className="flex items-center gap-space-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container-low text-primary">
                <Icon name="history_toggle_off" className="text-[22px]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[15px] font-semibold text-on-surface">{auditTrailFooter.title}</span>
                <span className="text-[12px] text-outline">
                  {auditTrailFooter.before}
                  <strong>{auditTrailFooter.strong}</strong>
                  {auditTrailFooter.after}
                </span>
              </div>
            </div>
            <button type="button" className="flex shrink-0 items-center gap-1 text-label-md font-semibold text-primary hover:underline">
              <span>{auditTrailFooter.linkLabel}</span>
            </button>
          </Card>
        </div>
      </div>

      <Toast open={toast !== null} message={toast ?? ''} />
    </div>
  )
}
