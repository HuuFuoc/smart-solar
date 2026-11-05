import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { PageHeader } from '@/components/common/ui/page-header'
import { EmptyState, ErrorState, Skeleton } from '@/components/common/ui/states'
import { useAuth } from '@/context/AuthProvider'
import { zoneStateMeta } from '@/features/zones/zoneDisplay'
import { ZoneFormDialog } from '@/features/zones/ZoneFormDialog'
import { useAdminUsersQuery } from '@/hooks/useAdminUsers'
import { useZoneCoverageQuery } from '@/hooks/useOperationalZones'
import { useOperationalZonesQuery } from '@/hooks/useTechnicianAdmin'
import { ROUTES, withId } from '@/routes/paths'
import { HCM_PROVINCE } from '@/services/administrativeUnitService'
import { errorMessage, rateLimitedMessage } from '@/services/api/errors'
import { cx } from '@/utils/cx'

// Khu vực phục vụ: mỗi khu là một nhóm phường, xã và các kỹ thuật viên phục vụ ở đó. Quản trị viên lập/sửa khu, quản lý chỉ xem.
// Đầu trang báo phường, xã chưa thuộc khu nào (khách ở đó không tự đặt giờ khảo sát được)

const MANAGERS = { role: 'MANAGER', status: 'ACTIVE', pageSize: 100, sort: 'name', direction: 'asc' } as const

export function AdminZonesPage() {
  const navigate = useNavigate()
  const canEdit = useAuth().user?.role === 'admin'
  const zones = useOperationalZonesQuery()
  const coverage = useZoneCoverageQuery(HCM_PROVINCE.code)
  const managers = useAdminUsersQuery(MANAGERS, { enabled: canEdit })
  const [adding, setAdding] = useState(false)

  const managerName = (id: string | null) => {
    if (!id) return '—'
    const m = managers.data?.items.find((u) => u.id === id)
    return m ? m.fullName || m.email : 'Tài khoản khác'
  }
  const items = [...(zones.data ?? [])].sort(
    (a, b) => Number(b.isActive) - Number(a.isActive) || a.code.localeCompare(b.code),
  )
  const noTechnician = new Set((coverage.data?.zonesWithoutSchedulableTechnicians ?? []).map((z) => z.zoneId))
  const unmapped = coverage.data?.unmappedCommunes ?? []

  return (
    <div className="space-y-4">
      <PageHeader
        title="Khu vực phục vụ"
        description={
          coverage.data && coverage.data.unmappedCommuneCount > 0 ? (
            <Badge tone="danger">
              {coverage.data.unmappedCommuneCount} phường, xã của {HCM_PROVINCE.name} chưa thuộc khu nào
            </Badge>
          ) : coverage.isError ? (
            <span className="text-meta text-fg-2">Chưa tải được độ phủ: {errorMessage(coverage.error)}</span>
          ) : undefined
        }
        actions={
          canEdit && (
            <Button variant="primary" icon="add" onClick={() => setAdding(true)}>
              Thêm khu vực
            </Button>
          )
        }
      />

      {unmapped.length > 0 && (
        <details className="rounded-container border border-warn/40 bg-warn-soft/20 px-4 py-3 shadow-xs">
          <summary className="tap cursor-pointer text-body font-semibold text-fg flex items-center gap-2">
            <Icon name="warning" className="text-warn text-[20px]" />
            Xem {unmapped.length} phường, xã chưa thuộc khu nào
          </summary>
          <p className="mt-2 text-meta text-fg-2">
            Mở một khu rồi thêm các phường, xã này để khách hàng ở đó có thể đặt lịch hẹn khảo sát.
          </p>
          <p className="mt-2 text-meta font-medium text-fg">
            {[...unmapped]
              .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
              .map((c) => c.name)
              .join(', ')}
          </p>
        </details>
      )}

      {/* Chú thích trạng thái khu vực (Legend Bar) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-container border border-line bg-surface-2 p-3 sm:px-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 text-meta">
          <span className="font-semibold text-fg flex items-center gap-1.5 pr-2.5 border-r border-line/70">
            <Icon name="palette" className="text-primary text-[18px]" />
            Chú thích trạng thái:
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-ok-soft text-ok border border-ok/20">
            <span className="size-1.5 rounded-full bg-ok" />
            Đang hoạt động
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-3 text-fg-2 border border-line">
            <span className="size-1.5 rounded-full bg-fg-muted" />
            Tạm dừng
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-warn-soft text-warn border border-warn/20">
            <Icon name="warning" className="text-[13px]" />
            Chưa có KTV nhận lịch
          </span>
        </div>
        <div className="text-meta text-fg-2">
          Tổng số: <strong className="font-semibold text-fg">{items.length}</strong> khu vực
        </div>
      </div>

      <section aria-label="Danh sách khu vực" aria-busy={zones.isFetching}>
        {zones.isPending ? (
          <div aria-label="Đang tải" className="space-y-4">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : zones.isError ? (
          <ErrorState message={rateLimitedMessage(zones.error)} onRetry={() => void zones.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            title="Chưa có khu vực nào"
            description={canEdit ? 'Bấm "Thêm khu vực" để lập khu đầu tiên, rồi gán phường, xã cho khu.' : undefined}
          />
        ) : (
          <div className="overflow-hidden rounded-container border border-line bg-surface-1 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-meta border-collapse">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-fg-2 font-medium">
                    <th className="py-3 px-3.5 border-r border-line text-left text-meta font-semibold">
                      Khu vực
                    </th>
                    <th className="py-3 px-3.5 border-r border-line text-left text-meta font-semibold">
                      Trạng thái
                    </th>
                    <th className="py-3 px-3.5 border-r border-line text-right text-meta font-semibold">
                      Phường, xã
                    </th>
                    <th className="py-3 px-3.5 border-r border-line text-right text-meta font-semibold">
                      Kỹ thuật viên
                    </th>
                    <th className="py-3 px-3.5 text-left text-meta font-semibold">
                      Quản lý phụ trách
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {items.map((z) => {
                    const state = zoneStateMeta(z)
                    const hasWarning = noTechnician.has(z.zoneId)
                    return (
                      <tr
                        key={z.zoneId}
                        onClick={() => navigate(withId(ROUTES.admin.zone, z.zoneId))}
                        className="group hover:bg-surface-2/60 transition-colors cursor-pointer"
                      >
                        {/* Cột 1: Khu vực */}
                        <td className="py-3.5 px-3.5 border-r border-line align-top">
                          <Link
                            to={withId(ROUTES.admin.zone, z.zoneId)}
                            onClick={(e) => e.stopPropagation()}
                            className="font-semibold text-fg group-hover:text-primary transition-colors hover:underline"
                          >
                            {z.name}
                          </Link>
                          <p className="font-mono text-[11px] text-fg-muted mt-0.5">{z.code}</p>
                        </td>

                        {/* Cột 2: Trạng thái */}
                        <td className="py-3.5 px-3.5 border-r border-line align-top">
                          <div className="flex flex-wrap gap-1.5">
                            <span
                              className={cx(
                                'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                                state.tone === 'ok' ? 'bg-ok-soft text-ok border-ok/20' : 'bg-surface-3 text-fg-2 border-line',
                              )}
                            >
                              <span
                                className={cx('size-1.5 rounded-full', state.tone === 'ok' ? 'bg-ok' : 'bg-fg-muted')}
                              />
                              {state.label}
                            </span>
                            {hasWarning && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-warn-soft text-warn border border-warn/20">
                                <Icon name="warning" className="text-[12px]" />
                                Chưa có KTV nhận lịch
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Cột 3: Phường, xã */}
                        <td className="py-3.5 px-3.5 border-r border-line align-top text-right tnum">
                          <span className="inline-flex px-2 py-0.5 rounded-control bg-surface-2 border border-line text-xs font-semibold text-fg">
                            {z.communeCount} xã/phường
                          </span>
                        </td>

                        {/* Cột 4: Kỹ thuật viên */}
                        <td className="py-3.5 px-3.5 border-r border-line align-top text-right tnum">
                          <div className="inline-flex flex-col items-end">
                            <span className="font-semibold text-fg text-xs">
                              <span className={z.schedulableMemberCount > 0 ? 'text-ok' : 'text-danger'}>
                                {z.schedulableMemberCount}
                              </span>{' '}
                              / {z.memberCount} KTV
                            </span>
                            <span className="text-[11px] text-fg-muted">sẵn sàng / tổng</span>
                          </div>
                        </td>

                        {/* Cột 5: Quản lý phụ trách */}
                        <td className="py-3.5 px-3.5 align-top text-meta text-fg">
                          <div className="flex items-center gap-1.5">
                            <Icon name="person" className="text-fg-3 text-[16px]" />
                            <span>{managerName(z.responsibleManagerUserId)}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer bảng */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-2/40 px-3.5 py-2.5 text-meta text-fg-2">
              <p className="tnum text-xs">
                Hiển thị <strong className="text-fg">{items.length}</strong> khu vực phục vụ
              </p>
              <span className="text-xs text-fg-muted">Khu vực có viền xanh là khu vực đang nhận khảo sát</span>
            </div>
          </div>
        )}
      </section>

      <ZoneFormDialog
        open={adding}
        zone={null}
        onOpenChange={setAdding}
        onCreated={(z) => navigate(withId(ROUTES.admin.zone, z.zoneId))}
      />
    </div>
  )
}

export default AdminZonesPage
