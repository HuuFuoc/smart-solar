import { useMemo, useState } from 'react'
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
  DayGroupedTableSkeleton,
  DayRow,
  DayTimeCell,
  DayTitleCell,
  DayViewLink,
  type DayColumn,
} from '@/features/scheduling/DayGroupedTable'
import { formatTime, vnDate } from '@/features/scheduling/schedulingDisplay'
import { TechJobFilterBar } from '@/features/scheduling/TechJobFilterBar'
import { useMyVisitsQuery } from '@/hooks/useTechnicianAfterSales'
import { ROUTES, withId } from '@/routes/paths'
import type { TechnicianVisitView } from '@/types/res/technicianAfterSalesRes'
import { fold } from '@/utils/fold'

const COLUMNS: DayColumn[] = [
  { label: 'Giờ' },
  { label: 'Việc', primary: true },
  { label: 'Địa chỉ' },
  { label: 'Tình hình' },
]

const EMPTY: Record<VisitTab, string> = {
  pending: 'Không có buổi hẹn nào chờ bạn nhận',
  active: 'Chưa có buổi hẹn nào sắp tới',
  done: 'Chưa có buổi hẹn nào đã xong',
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
        {visit.customerConfirmationRequired && !visit.customerConfirmedAt && (
          <span className="block text-meta text-fg-2">Khách chưa xác nhận giờ</span>
        )}
      </Td>
      <DayActionsCell>
        {tab === 'pending' ? (
          <ButtonLink to={to} size="sm" variant="info" icon="visibility">
            Xem và trả lời
            <span className="sr-only"> {title}</span>
          </ButtonLink>
        ) : (
          <DayViewLink to={to} name={title} />
        )}
      </DayActionsCell>
    </DayRow>
  )
}

// Buổi hẹn bảo hành, sửa chữa, bảo trì giao cho kỹ thuật viên: chờ nhận, sắp tới / đang làm, đã xong, nhóm theo ngày
// như Khảo sát
export function TechAfterSalesPage() {
  const query = useMyVisitsQuery()
  const [picked, setPicked] = useState<VisitTab | null>(null)
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')

  const groups = useMemo(() => {
    const key = fold(search.trim())
    const out: Record<VisitTab, TechnicianVisitView[]> = { pending: [], active: [], done: [] }
    for (const v of query.data ?? []) {
      if (date && vnDate(v.startsAt) !== date) continue
      if (time && formatTime(v.startsAt) !== time) continue
      if (key && !fold(`${v.requestNumber} ${v.siteAddress ?? ''} ${v.description}`).includes(key)) continue
      out[visitTab(v)].push(v)
    }
    return out
  }, [query.data, search, date, time])

  const waiting = (query.data ?? []).filter((v) => visitTab(v) === 'pending').length
  const tab: VisitTab = picked ?? (waiting > 0 ? 'pending' : 'active')
  const hasFilter = search.trim() !== '' || date !== '' || time !== ''

  return (
    <>
      <PageHeader
        title="Bảo hành, sửa chữa"
        description={waiting > 0 ? <Badge tone="danger">{waiting} buổi hẹn chờ bạn nhận</Badge> : undefined}
      />
      <div className="mb-4 space-y-3">
        <TechJobFilterBar
          search={search}
          onSearchChange={setSearch}
          date={date}
          onDateChange={setDate}
          time={time}
          onTimeChange={setTime}
          hasFilter={hasFilter}
          onReset={() => {
            setSearch('')
            setDate('')
            setTime('')
          }}
        />
        <FilterChips
          label="Lọc buổi hẹn"
          value={tab}
          onChange={setPicked}
          chips={[
            { value: 'pending', label: 'Chờ bạn nhận', count: groups.pending.length },
            { value: 'active', label: 'Sắp tới, đang làm', count: groups.active.length },
            { value: 'done', label: 'Đã xong', count: groups.done.length },
          ]}
        />
      </div>
      <QueryBoundary query={query} fallback={<DayGroupedTableSkeleton />}>
        {() =>
          groups[tab].length === 0 ? (
            <EmptyState title={hasFilter ? 'Không tìm thấy buổi hẹn phù hợp' : EMPTY[tab]} />
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
