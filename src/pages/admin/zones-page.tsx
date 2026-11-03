import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { PageHeader } from '@/components/common/ui/page-header'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
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

// Khu vực phục vụ: mỗi khu là một nhóm phường, xã và các kỹ thuật viên phục vụ ở đó. Quản trị lập / sửa khu, quản lý chỉ xem.
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
    <>
      <PageHeader
        title="Khu vực phục vụ"
        description={
          coverage.data && coverage.data.unmappedCommuneCount > 0 ? (
            <Badge tone="danger" icon="warning">
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
        <details className="mb-6 rounded-container border border-line px-4 py-3">
          <summary className="tap cursor-pointer text-body font-medium text-fg">
            Xem {unmapped.length} phường, xã chưa thuộc khu nào
          </summary>
          <p className="mt-2 text-body text-fg-2">
            Mở một khu rồi thêm các phường, xã này để khách ở đó có giờ khảo sát.
          </p>
          <p className="mt-2 text-body text-fg">
            {[...unmapped]
              .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
              .map((c) => c.name)
              .join(', ')}
          </p>
        </details>
      )}

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
          <Table stack>
            <thead>
              <tr>
                <Th>Khu vực</Th>
                <Th>Trạng thái</Th>
                <Th className="text-right">Phường, xã</Th>
                <Th className="text-right">Kỹ thuật viên</Th>
                <Th>Quản lý phụ trách</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((z) => {
                const state = zoneStateMeta(z)
                return (
                  <Tr key={z.zoneId} className="relative cursor-pointer">
                    <Td label="Khu vực">
                      <Link
                        to={withId(ROUTES.admin.zone, z.zoneId)}
                        className="font-medium text-fg after:absolute after:inset-0 hover:text-accent-fg hover:underline"
                      >
                        {z.name}
                      </Link>
                      <p className="font-mono text-meta text-fg-3">{z.code}</p>
                    </Td>
                    <Td label="Trạng thái">
                      <span className="inline-flex flex-wrap gap-2">
                        <Badge tone={state.tone}>{state.label}</Badge>
                        {noTechnician.has(z.zoneId) && <Badge tone="warn">Chưa có kỹ thuật viên nhận lịch</Badge>}
                      </span>
                    </Td>
                    <Td label="Phường, xã" className="tnum text-right">
                      {z.communeCount}
                    </Td>
                    <Td label="Kỹ thuật viên" className="tnum text-right">
                      {z.schedulableMemberCount} / {z.memberCount}
                      <p className="text-meta text-fg-3">nhận lịch được / thuộc khu</p>
                    </Td>
                    <Td label="Quản lý phụ trách">{managerName(z.responsibleManagerUserId)}</Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </section>

      <ZoneFormDialog
        open={adding}
        zone={null}
        onOpenChange={setAdding}
        onCreated={(z) => navigate(withId(ROUTES.admin.zone, z.zoneId))}
      />
    </>
  )
}
