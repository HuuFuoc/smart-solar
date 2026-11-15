import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { DateField, SearchInput } from '@/components/common/ui/field'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { technicianVisitMeta, visitTab, type VisitTab } from '@/features/after-sales/technicianVisitDisplay'
import { visitPurposeLabel } from '@/features/after-sales/serviceDisplay'
import { formatDay, formatTime, relativeDay, todayVn, vnDate } from '@/features/scheduling/schedulingDisplay'
import { groupByDay } from '@/features/scheduling/scheduleOrder'
import { useMyVisitsQuery } from '@/hooks/useTechnicianAfterSales'
import { ROUTES, withId } from '@/routes/paths'
import type { TechnicianVisitView } from '@/types/res/technicianAfterSalesRes'

const EMPTY: Record<VisitTab, { title: string; description?: string }> = {
  pending: {
    title: 'Không có buổi hẹn nào chờ bạn nhận',
    description: 'Khi quản lý xếp bạn đi kiểm tra, sửa hay bảo trì, buổi hẹn hiện ở đây để bạn nhận hoặc từ chối.',
  },
  active: { title: 'Chưa có buổi hẹn nào sắp tới', description: 'Buổi hẹn bạn đã nhận hiện ở đây.' },
  done: { title: 'Chưa có buổi hẹn nào đã xong' },
}

const TAG_TONES = ['ok', 'info', 'warn', 'danger'] as const

/** Bỏ dấu và chữ hoa để tìm không phân biệt dấu */
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase()

const minutesBetween = (startsAt: string, endsAt: string) =>
  Math.max(0, Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000))

function VisitCard({ visit, tab }: { visit: TechnicianVisitView; tab: VisitTab }) {
  const status = technicianVisitMeta(visit)
  const to = withId(ROUTES.tech.afterSalesVisit, visit.visitId)
  const title = `${visitPurposeLabel(visit.purpose)} ${visit.requestNumber}`
  // Việc chờ nhận đã báo đỏ ở đầu trang nên nhãn của thẻ chỉ ghi chữ
  const tone = tab === 'pending' ? 'info' : status.tone
  const tagTone = TAG_TONES.find((t) => t === tone) ?? 'neutral'
  const awaitsCustomer = visit.customerConfirmationRequired && !visit.customerConfirmedAt

  return (
    <article className="sv-card grid gap-4 lg:grid-cols-[12rem_minmax(0,1fr)_auto] lg:items-center">
      <div className="space-y-2">
        <span className="sv-tag tnum" data-tone="info">
          <Icon name="schedule" className="text-[16px]" />
          {formatTime(visit.startsAt)} - {formatTime(visit.endsAt)}
        </span>
        <p className="flex items-center gap-1.5 text-meta text-fg-2">
          <Icon name="timer" className="text-[16px] text-fg-3" />
          Thời lượng: {minutesBetween(visit.startsAt, visit.endsAt)} phút
        </p>
        <p className="tnum text-meta text-fg-3">Mã: #{visit.requestNumber}</p>
      </div>

      <div className="min-w-0 space-y-2">
        <Link to={to} className="tnum block text-title font-bold text-fg hover:text-accent-fg">
          {title}
        </Link>
        {visit.description && (
          <div className="rounded-control border border-line bg-surface-2 px-3 py-2">
            <p className="sv-label text-meta font-semibold">Nội dung</p>
            <p className="text-body whitespace-pre-line text-fg">{visit.description}</p>
          </div>
        )}
        {visit.siteAddress && (
          <p className="flex items-start gap-1.5 text-body text-fg-2">
            <Icon name="location_on" className="mt-0.5 shrink-0 text-[16px] text-fg-3" />
            <span>{visit.siteAddress}</span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 lg:flex-col lg:items-end">
        <span className="sv-tag" data-tone={tagTone} data-shape="pill">
          {status.label}
        </span>
        {awaitsCustomer && <p className="text-meta text-fg-3">Khách chưa xác nhận giờ hẹn</p>}
        <ButtonLink to={to} size="sm" variant="info" icon="visibility">
          {tab === 'pending' ? 'Xem và trả lời' : 'Xem chi tiết'}
          <span className="sr-only"> {title}</span>
        </ButtonLink>
      </div>
    </article>
  )
}

// Buổi hẹn bảo hành, sửa chữa, bảo trì giao cho kỹ thuật viên: chờ nhận, sắp tới / đang làm, đã xong, nhóm theo ngày
// như Việc của tôi
export function TechAfterSalesPage() {
  const query = useMyVisitsQuery()
  const [picked, setPicked] = useState<VisitTab | null>(null)
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const rows = useMemo(() => query.data ?? [], [query.data])

  const matches = (v: TechnicianVisitView) => {
    if (date && vnDate(v.startsAt) !== date) return false
    const key = fold(search.trim())
    if (!key) return true
    return fold(`${v.requestNumber} ${v.siteAddress ?? ''} ${v.description}`).includes(key)
  }

  const groups: Record<VisitTab, TechnicianVisitView[]> = {
    pending: rows.filter((v) => visitTab(v) === 'pending' && matches(v)),
    active: rows.filter((v) => visitTab(v) === 'active' && matches(v)),
    done: rows.filter((v) => visitTab(v) === 'done' && matches(v)),
  }
  const waiting = rows.filter((v) => visitTab(v) === 'pending').length
  const tab: VisitTab = picked ?? (waiting > 0 ? 'pending' : 'active')
  const today = todayVn()
  const filtering = search.trim() !== '' || date !== ''

  return (
    <div className="sv-list">
      <PageHeader
        title="Bảo hành, sửa chữa"
        description={waiting > 0 ? <Badge tone="danger">{waiting} buổi hẹn chờ bạn nhận</Badge> : undefined}
        actions={
          <Button variant="secondary" icon="refresh" disabled={query.isFetching} onClick={() => void query.refetch()}>
            Làm mới
          </Button>
        }
      />

      <div className="sv-card mb-6 grid gap-3 sm:grid-cols-2">
        <SearchInput
          name="visit-search"
          placeholder="Tìm theo mã hẹn, địa chỉ, nội dung"
          maxLength={100}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
        />
        <DateField value={date} onChange={setDate} label="Lọc theo ngày" />
      </div>

      <FilterChips
        label="Lọc buổi hẹn"
        className="mb-4"
        value={tab}
        onChange={setPicked}
        chips={[
          { value: 'pending', label: 'Chờ bạn nhận', count: groups.pending.length },
          { value: 'active', label: 'Sắp tới, đang làm', count: groups.active.length },
          { value: 'done', label: 'Đã xong', count: groups.done.length },
        ]}
      />

      <QueryBoundary query={query}>
        {() =>
          groups[tab].length === 0 ? (
            <EmptyState
              {...(filtering
                ? { title: 'Không tìm thấy buổi hẹn phù hợp', description: 'Thử đổi từ khoá hoặc ngày.' }
                : EMPTY[tab])}
              action={
                filtering ? (
                  <Button
                    variant="secondary"
                    icon="filter_alt_off"
                    onClick={() => {
                      setSearch('')
                      setDate('')
                    }}
                  >
                    Xoá lọc
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-8">
              {groupByDay(groups[tab]).map(([day, items]) => (
                <section key={day} aria-label={formatDay(day, { year: true })} className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-control bg-info-soft text-info">
                      <Icon name="calendar_month" className="text-[20px]" />
                    </span>
                    <h2 className="text-body font-bold text-fg">
                      {relativeDay(day, today) !== formatDay(day) && `${relativeDay(day, today)}, `}
                      {formatDay(day, { year: true })}
                    </h2>
                    <span className="sv-tag" data-shape="pill">
                      {items.length} buổi hẹn
                    </span>
                  </div>
                  <div className="space-y-3">
                    {items.map((visit) => (
                      <VisitCard key={visit.visitId} visit={visit} tab={tab} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )
        }
      </QueryBoundary>
    </div>
  )
}
