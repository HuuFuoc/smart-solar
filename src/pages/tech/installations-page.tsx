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
import { matchesInstallation } from '@/features/installations/installationFilter'
import {
  installationTab,
  technicianStatusMeta,
  type InstallationTab,
} from '@/features/installations/technicianInstallationDisplay'
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
import { TechJobFilterBar } from '@/features/scheduling/TechJobFilterBar'
import { siteArea } from '@/features/scheduling/siteArea'
import { useMyInstallationsQuery } from '@/hooks/useTechnicianInstallations'
import { ROUTES, withId } from '@/routes/paths'
import type { InstallationTechnicianView } from '@/types/res/technicianInstallationsRes'

const COLUMNS: DayColumn[] = [
  { label: 'Giờ' },
  { label: 'Công trình', primary: true },
  { label: 'Khu vực' },
  { label: 'Tình hình' },
]

const EMPTY: Record<InstallationTab, string> = {
  pending: 'Không có công trình nào chờ bạn nhận',
  active: 'Chưa có công trình nào đang làm',
  done: 'Chưa có công trình nào đã nghiệm thu',
}

function InstallationRow({ view, tab }: { view: InstallationTechnicianView; tab: InstallationTab }) {
  const navigate = useNavigate()
  const status = technicianStatusMeta(view)
  const site = view.site
  const to = withId(ROUTES.tech.installation, view.projectId)
  const name = site?.propertyName ?? 'Công trình lắp đặt'
  return (
    <DayRow>
      <DayTimeCell startsAt={view.startsAt} endsAt={view.endsAt} />
      <DayTitleCell
        to={to}
        title={name}
        detail={site ? siteArea([site.streetLine, site.ward, site.district], site.province) : null}
      />
      <Td label="Khu vực">
        {view.zoneName ? (
          <TruncatedText text={view.zoneName} className="xl:max-w-48" onClick={() => navigate(to)} />
        ) : (
          '—'
        )}
      </Td>
      <Td label="Tình hình" className="whitespace-nowrap">
        {/* Việc chờ trả lời đã báo đỏ ở menu và đầu trang nên dòng chỉ ghi chữ */}
        <Badge tone={tab === 'pending' ? 'info' : status.tone}>{status.label}</Badge>
      </Td>
      <DayActionsCell>
        {tab === 'pending' ? (
          <ButtonLink to={to} size="sm" variant="info" icon="visibility">
            Xem và trả lời
            <span className="sr-only"> {name}</span>
          </ButtonLink>
        ) : (
          <DayViewLink to={to} name={name} />
        )}
      </DayActionsCell>
    </DayRow>
  )
}

// Công trình lắp đặt quản lý giao cho kỹ thuật viên: chờ trả lời, đang làm (đã nhận, chưa nghiệm thu), đã nghiệm thu
export function TechInstallationsPage() {
  const query = useMyInstallationsQuery()
  const [picked, setPicked] = useState<InstallationTab | null>(null)
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')

  const groups = useMemo(() => {
    const out: Record<InstallationTab, InstallationTechnicianView[]> = { pending: [], active: [], done: [] }
    for (const view of query.data ?? []) {
      if (matchesInstallation(view, search, date, time)) out[installationTab(view)].push(view)
    }
    return out
  }, [query.data, search, date, time])

  const waiting = (query.data ?? []).filter((v) => installationTab(v) === 'pending').length
  // Mở sẵn tab "Chờ bạn nhận" khi có việc mới giao
  const tab: InstallationTab = picked ?? (waiting > 0 ? 'pending' : 'active')
  const hasFilter = search.trim() !== '' || date !== '' || time !== ''

  return (
    <>
      <PageHeader
        title="Lắp đặt"
        description={waiting > 0 ? <Badge tone="danger">{waiting} công trình chờ bạn nhận việc</Badge> : undefined}
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
          label="Lọc công trình"
          value={tab}
          onChange={setPicked}
          chips={[
            { value: 'pending', label: 'Chờ bạn nhận', count: groups.pending.length },
            { value: 'active', label: 'Đang làm', count: groups.active.length },
            { value: 'done', label: 'Đã nghiệm thu', count: groups.done.length },
          ]}
        />
      </div>
      <QueryBoundary query={query} fallback={<DayGroupedTableSkeleton />}>
        {() =>
          groups[tab].length === 0 ? (
            <EmptyState title={hasFilter ? 'Không tìm thấy công trình phù hợp' : EMPTY[tab]} />
          ) : (
            <DayGroupedTable
              label="Công trình lắp đặt"
              columns={COLUMNS}
              rows={groups[tab]}
              rowKey={(view) => view.projectId}
              unit="công trình"
              row={(view) => <InstallationRow view={view} tab={tab} />}
            />
          )
        }
      </QueryBoundary>
    </>
  )
}
