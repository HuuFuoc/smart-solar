import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { Td } from '@/components/common/ui/table'
import { TruncatedText } from '@/components/common/ui/tooltip'
import { technicianVisitMeta, visitTab, type VisitTab } from '@/features/after-sales/technicianVisitDisplay'
import { visitPurposeLabel } from '@/features/after-sales/serviceDisplay'
import {
  DayActionsCell,
  DayGroupedTable,
  DayRow,
  DayTimeCell,
  DayTitleCell,
  type DayColumn,
} from '@/features/scheduling/DayGroupedTable'
import { useMyVisitsQuery } from '@/hooks/useTechnicianAfterSales'
import { ROUTES, withId } from '@/routes/paths'
import type { TechnicianVisitView } from '@/types/res/technicianAfterSalesRes'

const COLUMNS: DayColumn[] = [
  { label: 'Giờ' },
  { label: 'Việc', primary: true },
  { label: 'Địa chỉ' },
  { label: 'Tình hình' },
]

const EMPTY: Record<VisitTab, { title: string; description?: string }> = {
  pending: {
    title: 'Không có buổi hẹn nào chờ bạn nhận',
    description: 'Khi quản lý xếp bạn đi kiểm tra, sửa hay bảo trì, buổi hẹn hiện ở đây để bạn nhận hoặc từ chối.',
  },
  active: { title: 'Chưa có buổi hẹn nào sắp tới', description: 'Buổi hẹn bạn đã nhận hiện ở đây.' },
  done: { title: 'Chưa có buổi hẹn nào đã xong' },
}

function VisitRow({ visit, tab }: { visit: TechnicianVisitView; tab: VisitTab }) {
  const status = technicianVisitMeta(visit)
  const navigate = useNavigate()
  const to = withId(ROUTES.tech.afterSalesVisit, visit.visitId)
  const title = `${visitPurposeLabel(visit.purpose)} ${visit.requestNumber}`
  return (
    <DayRow>
      <DayTimeCell startsAt={visit.startsAt} endsAt={visit.endsAt} />
      <DayTitleCell to={to} title={<span className="tnum">{title}</span>} detail={visit.description} />
      <Td label="Địa chỉ">
        {visit.siteAddress ? (
          <TruncatedText text={visit.siteAddress} className="xl:max-w-72" onClick={() => navigate(to)} />
        ) : (
          '—'
        )}
      </Td>
      <Td label="Tình hình" className="whitespace-nowrap">
        {/* Việc chờ nhận đã báo đỏ ở đầu trang nên dòng chỉ ghi chữ */}
        <Badge tone={tab === 'pending' ? 'info' : status.tone}>{status.label}</Badge>
      </Td>
      <DayActionsCell>
        <ButtonLink to={to} size="sm" variant="info" icon="visibility">
          {tab === 'pending' ? 'Xem và trả lời' : 'Xem chi tiết'}
          <span className="sr-only"> {title}</span>
        </ButtonLink>
      </DayActionsCell>
    </DayRow>
  )
}

// Buổi hẹn bảo hành, sửa chữa, bảo trì giao cho kỹ thuật viên: chờ nhận, sắp tới / đang làm, đã xong, nhóm theo ngày
// như Việc của tôi
export function TechAfterSalesPage() {
  const query = useMyVisitsQuery()
  const [picked, setPicked] = useState<VisitTab | null>(null)
  const rows = query.data ?? []
  const groups: Record<VisitTab, TechnicianVisitView[]> = {
    pending: rows.filter((v) => visitTab(v) === 'pending'),
    active: rows.filter((v) => visitTab(v) === 'active'),
    done: rows.filter((v) => visitTab(v) === 'done'),
  }
  const waiting = groups.pending.length
  const tab: VisitTab = picked ?? (waiting > 0 ? 'pending' : 'active')

  return (
    <>
      <PageHeader
        title="Bảo hành, sửa chữa"
        description={waiting > 0 ? <Badge tone="danger">{waiting} buổi hẹn chờ bạn nhận</Badge> : undefined}
      />
      <FilterChips
        label="Lọc buổi hẹn"
        className="mb-4"
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
            <DayGroupedTable
              label="Buổi hẹn"
              columns={COLUMNS}
              rows={groups[tab]}
              rowKey={(visit) => visit.visitId}
              unit="buổi hẹn"
              row={(visit) => <VisitRow visit={visit} tab={tab} />}
            />
          )
        }
      </QueryBoundary>
    </>
  )
}
