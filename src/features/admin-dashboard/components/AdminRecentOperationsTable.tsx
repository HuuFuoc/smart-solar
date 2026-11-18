import { useState } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { Panel, PanelHeader } from '@/components/common/ui/panel'
import { EmptyState } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { requestKindLabel, requestStatusMeta } from '@/features/after-sales/serviceDisplay'
import { dispatchStatusMeta } from '@/features/dispatch/dispatchDisplay'
import { projectStatusMeta } from '@/features/installation-projects/projectDisplay'
import { formatDay, formatTime, vnDate } from '@/features/scheduling/schedulingDisplay'
import { ROUTES } from '@/routes/paths'
import type { InstallationProjectSummary } from '@/types/res/managerInstallationsRes'
import type { ServiceRequestSummary } from '@/types/res/customerAfterSalesRes'
import type { DispatchQueueItemView } from '@/types/res/dispatchRes'

type AdminRecentOperationsTableProps = {
  projects: InstallationProjectSummary[]
  serviceRequests: ServiceRequestSummary[]
  dispatchItems: DispatchQueueItemView[]
}

type TabType = 'installations' | 'afterSales' | 'dispatch'

const SHOWN = 6

function formatDateTimeText(iso: string | null | undefined) {
  if (!iso) return '—'
  return `${formatTime(iso)}, ${formatDay(vnDate(iso))}`
}

const ALL_LINKS: Record<TabType, { to: string; label: string }> = {
  installations: { to: ROUTES.admin.installations, label: 'Xem tất cả thi công' },
  afterSales: { to: ROUTES.admin.afterSales, label: 'Xem tất cả bảo hành' },
  dispatch: { to: ROUTES.admin.dispatch, label: 'Xem tất cả điều phối' },
}

function ShownCount({ shown, total, noun }: { shown: number; total: number; noun: string }) {
  return (
    <p className="tnum mt-3 text-meta text-fg-2">
      Hiển thị {shown} trên {total} {noun}
    </p>
  )
}

export function AdminRecentOperationsTable({
  projects,
  serviceRequests,
  dispatchItems,
}: AdminRecentOperationsTableProps) {
  const [activeTab, setActiveTab] = useState<TabType>('installations')
  const all = ALL_LINKS[activeTab]

  return (
    <Panel raised>
      <PanelHeader
        title="Việc gần đây"
        action={
          <ButtonLink to={all.to} variant="info" size="sm" icon="list">
            {all.label}
          </ButtonLink>
        }
      />
      <FilterChips
        label="Loại việc"
        className="mb-3"
        value={activeTab}
        onChange={setActiveTab}
        chips={[
          { value: 'installations', label: 'Dự án thi công', count: projects.length },
          { value: 'afterSales', label: 'Bảo hành, sửa chữa', count: serviceRequests.length },
          { value: 'dispatch', label: 'Chờ điều phối', count: dispatchItems.length },
        ]}
      />

      {activeTab === 'installations' &&
        (projects.length === 0 ? (
          <EmptyState title="Chưa có dự án thi công" />
        ) : (
          <>
            <Table stack="xl">
              <thead>
                <tr>
                  <Th>Dự án</Th>
                  <Th>Kỹ thuật viên</Th>
                  <Th>Lịch thi công</Th>
                  <Th>Trạng thái</Th>
                  <Th className="text-right">
                    <span className="sr-only">Thao tác</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {projects.slice(0, SHOWN).map((project) => {
                  const meta = projectStatusMeta(project.status)
                  const detailUrl = ROUTES.admin.installation.replace(':id', project.projectId)
                  return (
                    <Tr key={project.projectId}>
                      <Td>
                        <Link
                          to={detailUrl}
                          className="tnum font-semibold text-fg hover:text-accent-fg hover:underline"
                        >
                          {project.projectId.slice(0, 8).toUpperCase()}
                        </Link>
                        <p className="tnum text-meta text-fg-2">
                          Hợp đồng {project.contractId.slice(0, 8).toUpperCase()}
                        </p>
                      </Td>
                      <Td label="Kỹ thuật viên">{project.responsibleTechnicianName || 'Chưa có kỹ thuật viên'}</Td>
                      <Td label="Lịch thi công" className="tnum">
                        {project.scheduledStartsAt ? (
                          formatDateTimeText(project.scheduledStartsAt)
                        ) : (
                          <span className="text-fg-2">Tạo lúc {formatDateTimeText(project.createdAt)}</span>
                        )}
                      </Td>
                      <Td label="Trạng thái" className="whitespace-nowrap">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </Td>
                      <Td className="text-right whitespace-nowrap">
                        <ButtonLink to={detailUrl} variant="info" size="sm" icon="visibility">
                          Xem
                        </ButtonLink>
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
            <ShownCount shown={Math.min(SHOWN, projects.length)} total={projects.length} noun="dự án" />
          </>
        ))}

      {activeTab === 'afterSales' &&
        (serviceRequests.length === 0 ? (
          <EmptyState title="Chưa có yêu cầu bảo hành, sửa chữa" />
        ) : (
          <>
            <Table stack="xl">
              <thead>
                <tr>
                  <Th>Yêu cầu</Th>
                  <Th>Loại, mô tả</Th>
                  <Th>Tạo lúc</Th>
                  <Th>Trạng thái</Th>
                  <Th className="text-right">
                    <span className="sr-only">Thao tác</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {serviceRequests.slice(0, SHOWN).map((req) => {
                  const meta = requestStatusMeta(req.status, 'manager')
                  const detailUrl = ROUTES.admin.afterSalesRequest.replace(':id', req.requestId)
                  return (
                    <Tr key={req.requestId}>
                      <Td>
                        <Link
                          to={detailUrl}
                          className="tnum font-semibold text-fg hover:text-accent-fg hover:underline"
                        >
                          {req.requestNumber || req.requestId.slice(0, 8).toUpperCase()}
                        </Link>
                        <p className="tnum text-meta text-fg-2">Dự án {req.projectId.slice(0, 8).toUpperCase()}</p>
                      </Td>
                      <Td label="Loại, mô tả" className="max-w-80">
                        <span className="font-medium text-fg">{requestKindLabel(req.kind)}</span>
                        {req.description && <p className="line-clamp-2 text-meta text-fg-2">{req.description}</p>}
                      </Td>
                      <Td label="Tạo lúc" className="tnum text-fg-2">
                        {formatDateTimeText(req.createdAt)}
                      </Td>
                      <Td label="Trạng thái" className="whitespace-nowrap">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </Td>
                      <Td className="text-right whitespace-nowrap">
                        <ButtonLink to={detailUrl} variant="info" size="sm" icon="open_in_new">
                          Xử lý
                        </ButtonLink>
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
            <ShownCount shown={Math.min(SHOWN, serviceRequests.length)} total={serviceRequests.length} noun="yêu cầu" />
          </>
        ))}

      {activeTab === 'dispatch' &&
        (dispatchItems.length === 0 ? (
          <EmptyState title="Không có yêu cầu nào chờ điều phối" />
        ) : (
          <>
            <Table stack="xl">
              <thead>
                <tr>
                  <Th>Yêu cầu</Th>
                  <Th>Khách hàng, công trình</Th>
                  <Th>Khu vực</Th>
                  <Th>Trạng thái</Th>
                  <Th className="text-right">
                    <span className="sr-only">Thao tác</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {dispatchItems.slice(0, SHOWN).map((item) => {
                  const meta = dispatchStatusMeta(item.status)
                  const detailUrl = ROUTES.admin.dispatchRequest.replace(':id', item.dispatchRequestId)
                  return (
                    <Tr key={item.dispatchRequestId}>
                      <Td>
                        <Link
                          to={detailUrl}
                          className="tnum font-semibold text-fg hover:text-accent-fg hover:underline"
                        >
                          {item.dispatchRequestId.slice(0, 8).toUpperCase()}
                        </Link>
                        <p className="tnum text-meta text-fg-2">{formatDateTimeText(item.createdAt)}</p>
                      </Td>
                      <Td label="Khách hàng, công trình">
                        <span className="font-medium text-fg">{item.customerName}</span>
                        <p className="text-meta text-fg-2">{item.propertyName}</p>
                      </Td>
                      <Td label="Khu vực" className="text-fg-2">
                        {item.zone?.name || item.province || '—'}
                      </Td>
                      <Td label="Trạng thái" className="whitespace-nowrap">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </Td>
                      <Td className="text-right whitespace-nowrap">
                        <ButtonLink to={detailUrl} variant="info" size="sm" icon="support_agent">
                          Điều phối
                        </ButtonLink>
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
            <ShownCount shown={Math.min(SHOWN, dispatchItems.length)} total={dispatchItems.length} noun="yêu cầu" />
          </>
        ))}
    </Panel>
  )
}
