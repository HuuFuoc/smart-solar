import { useState } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { ListCell, ListCells, ListHead, ListRow } from '@/components/common/ui/list-row'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { technicianVisitMeta, visitTab, type VisitTab } from '@/features/after-sales/technicianVisitDisplay'
import { visitPurposeLabel } from '@/features/after-sales/serviceDisplay'
import { formatAppointment } from '@/features/scheduling/schedulingDisplay'
import { useMyVisitsQuery } from '@/hooks/useTechnicianAfterSales'
import { ROUTES, withId } from '@/routes/paths'
import type { TechnicianVisitView } from '@/types/res/technicianAfterSalesRes'

const COLUMNS = 'lg:grid-cols-[minmax(0,1.6fr)_minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.2fr)_9rem]'
const LABELS = ['Thời gian', 'Việc', 'Địa chỉ', 'Tình hình', '']

const EMPTY: Record<VisitTab, { title: string; description?: string }> = {
  pending: {
    title: 'Không có buổi hẹn nào chờ bạn nhận',
    description: 'Khi quản lý xếp bạn đi kiểm tra, sửa hay bảo trì, buổi hẹn hiện ở đây để bạn nhận hoặc từ chối.',
  },
  active: { title: 'Chưa có buổi hẹn nào sắp tới', description: 'Buổi hẹn bạn đã nhận hiện ở đây.' },
  done: { title: 'Chưa có buổi hẹn nào đã xong' },
}

const byStart = (a: TechnicianVisitView, b: TechnicianVisitView) => a.startsAt.localeCompare(b.startsAt)

function VisitRow({ visit, tab }: { visit: TechnicianVisitView; tab: VisitTab }) {
  const status = technicianVisitMeta(visit)
  return (
    <ListRow>
      <ListCells columns={COLUMNS}>
        <ListCell label="Thời gian" wide>
          <span className="tnum font-semibold">{formatAppointment(visit.startsAt, visit.endsAt)}</span>
        </ListCell>
        <ListCell wide>
          <p className="font-semibold">
            {visitPurposeLabel(visit.purpose)} <span className="tnum">{visit.requestNumber}</span>
          </p>
          <p className="mt-0.5 line-clamp-2 text-meta text-fg-2">{visit.description}</p>
        </ListCell>
        <ListCell label="Địa chỉ">{visit.siteAddress ?? '—'}</ListCell>
        <ListCell label="Tình hình">
          {/* Việc chờ nhận đã báo đỏ ở đầu trang nên dòng chỉ ghi chữ */}
          <Badge tone={tab === 'pending' ? 'info' : status.tone}>{status.label}</Badge>
        </ListCell>
        <ListCell wide className="lg:justify-self-end">
          <ButtonLink
            to={withId(ROUTES.tech.afterSalesVisit, visit.visitId)}
            size="sm"
            variant="info"
            icon="visibility"
          >
            {tab === 'pending' ? 'Xem và trả lời' : 'Xem chi tiết'}
          </ButtonLink>
        </ListCell>
      </ListCells>
    </ListRow>
  )
}

// Buổi hẹn bảo hành, sửa chữa, bảo trì giao cho kỹ thuật viên: chờ nhận, sắp tới / đang làm, đã xong
export function TechAfterSalesPage() {
  const query = useMyVisitsQuery()
  const [picked, setPicked] = useState<VisitTab | null>(null)
  const rows = query.data ?? []
  const groups: Record<VisitTab, TechnicianVisitView[]> = {
    pending: rows.filter((v) => visitTab(v) === 'pending').sort(byStart),
    active: rows.filter((v) => visitTab(v) === 'active').sort(byStart),
    done: rows
      .filter((v) => visitTab(v) === 'done')
      .sort(byStart)
      .reverse(),
  }
  const waiting = groups.pending.length
  const tab: VisitTab = picked ?? (waiting > 0 ? 'pending' : 'active')

  return (
    <>
      <PageHeader
        title="Bảo hành, sửa chữa"
        description={
          waiting > 0 ? (
            <Badge tone="danger" icon="assignment_late">
              {waiting} buổi hẹn chờ bạn nhận
            </Badge>
          ) : undefined
        }
      />
      <FilterChips
        label="Lọc buổi hẹn"
        className="mb-6"
        value={tab}
        onChange={setPicked}
        chips={[
          { value: 'pending', label: 'Chờ bạn nhận', count: waiting },
          { value: 'active', label: 'Sắp tới, đang làm', count: groups.active.length },
          { value: 'done', label: 'Đã xong', count: groups.done.length },
        ]}
      />
      <QueryBoundary query={query}>
        {() =>
          groups[tab].length === 0 ? (
            <EmptyState {...EMPTY[tab]} />
          ) : (
            <div>
              <ListHead columns={COLUMNS} labels={LABELS} />
              <ul className="divide-y divide-line">
                {groups[tab].map((visit) => (
                  <VisitRow key={visit.visitId} visit={visit} tab={tab} />
                ))}
              </ul>
            </div>
          )
        }
      </QueryBoundary>
    </>
  )
}
