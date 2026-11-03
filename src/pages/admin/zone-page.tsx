import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { KeyValueList } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { useAuth } from '@/context/AuthProvider'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { ZoneCommunesEditor } from '@/features/zones/ZoneCommunesEditor'
import { zoneStateMeta } from '@/features/zones/zoneDisplay'
import { ZoneFormDialog } from '@/features/zones/ZoneFormDialog'
import { useAdminUserQuery } from '@/hooks/useAdminUsers'
import { useZoneCoverageQuery, useZoneQuery, useZoneTechniciansQuery } from '@/hooks/useOperationalZones'
import { ROUTES, withId } from '@/routes/paths'
import { HCM_PROVINCE } from '@/services/administrativeUnitService'
import { errorMessage } from '@/services/api/errors'

// Một khu vực phục vụ: thông tin, phường, xã của khu, kỹ thuật viên thuộc khu. Chỉ quản trị sửa được

function ManagerName({ id }: { id: string | null }) {
  const user = useAdminUserQuery(id ?? undefined)
  if (!id) return <>Chưa có</>
  if (user.isPending) return <span className="text-fg-3">Đang tải…</span>
  if (user.isError) return <span className="text-fg-3">Không đọc được tài khoản</span>
  return <>{user.data.fullName || user.data.email}</>
}

function ZoneTechnicians({ zoneId }: { zoneId: string }) {
  const query = useZoneTechniciansQuery(zoneId)
  return (
    <Panel>
      <PanelHeader
        title={query.data ? `Kỹ thuật viên (${query.data.length})` : 'Kỹ thuật viên'}
        description="Gán khu cho kỹ thuật viên ở trang Kỹ thuật viên, mục Khu vực."
      />
      <PanelBody>
        {query.isPending ? (
          <Skeleton className="h-16" />
        ) : query.isError ? (
          <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : query.data.length === 0 ? (
          <p className="text-body text-fg-2">
            Chưa có kỹ thuật viên nào thuộc khu này, khách ở đây chưa có giờ khảo sát.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {query.data.map((t) => (
              <li key={t.technicianUserId} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
                <div className="min-w-0">
                  <Link to={withId(ROUTES.admin.technician, t.technicianUserId)} className="ui-link font-medium">
                    {t.fullName || 'Chưa có tên'}
                  </Link>
                  <p className="tnum text-meta text-fg-3">Vào khu lúc {formatMoment(t.assignedAt)}</p>
                </div>
                <Badge tone={t.isSchedulable ? 'ok' : 'neutral'}>
                  {t.isSchedulable
                    ? 'Nhận lịch được'
                    : !t.isActiveUser
                      ? 'Tài khoản không hoạt động'
                      : 'Đang tắt nhận lịch'}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </PanelBody>
    </Panel>
  )
}

export function AdminZonePage() {
  const { id } = useParams()
  const canEdit = useAuth().user?.role === 'admin'
  const query = useZoneQuery(id)
  const coverage = useZoneCoverageQuery(HCM_PROVINCE.code)
  const [editing, setEditing] = useState(false)
  usePageCrumb(query.data ? query.data.zone.name : null)

  return (
    <QueryBoundary query={query}>
      {(d) => {
        const z = d.zone
        const state = zoneStateMeta(z)
        return (
          <>
            <PageHeader
              meta={
                <>
                  <Badge tone={state.tone}>{state.label}</Badge>
                  <span className="font-mono">{z.code}</span>
                </>
              }
              title={z.name}
              actions={
                canEdit && (
                  <Button variant="soft" icon="edit" onClick={() => setEditing(true)}>
                    Sửa thông tin
                  </Button>
                )
              }
            />
            <div className="space-y-4">
              <Panel>
                <PanelHeader title="Thông tin" />
                <KeyValueList
                  columns={2}
                  items={[
                    { k: 'Quản lý phụ trách', v: <ManagerName id={z.responsibleManagerUserId} /> },
                    {
                      k: 'Hoạt động',
                      v: z.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động (phường, xã gán được sang khu khác)',
                    },
                    {
                      k: 'Nhận lịch mới',
                      v: z.isServiceable ? 'Có' : 'Tạm ngừng: khách ở khu này được chuyển sang "Nhờ xếp kỹ thuật viên"',
                    },
                    {
                      k: 'Kỹ thuật viên nhận lịch được',
                      v: `${z.schedulableMemberCount} / ${z.memberCount} người thuộc khu`,
                    },
                    { k: 'Tạo lúc', v: formatMoment(z.createdAt) },
                    { k: 'Sửa lần cuối', v: formatMoment(z.updatedAt) },
                  ]}
                />
              </Panel>
              <ZoneCommunesEditor
                detail={d}
                canEdit={canEdit}
                unmapped={coverage.data ? coverage.data.unmappedCommunes : null}
              />
              <ZoneTechnicians zoneId={z.zoneId} />
            </div>
            <ZoneFormDialog open={editing} zone={z} onOpenChange={setEditing} />
          </>
        )
      }}
    </QueryBoundary>
  )
}
