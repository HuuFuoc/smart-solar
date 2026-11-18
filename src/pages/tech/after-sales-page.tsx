import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { DateField, SearchInput, TimeSelect } from '@/components/common/ui/field'
import { FilterMore } from '@/components/common/ui/filter-bar'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { Skeleton } from '@/components/common/ui/states'
import { technicianVisitMeta, visitTab, type VisitTab } from '@/features/after-sales/technicianVisitDisplay'
import { visitPurposeLabel } from '@/features/after-sales/serviceDisplay'
import { DayGroupHeading } from '@/features/scheduling/DayGroupHeading'
import { formatTime, todayVn, vnDate } from '@/features/scheduling/schedulingDisplay'
import { groupByDay } from '@/features/scheduling/scheduleOrder'
import { useMyVisitsQuery } from '@/hooks/useTechnicianAfterSales'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import type { TechnicianVisitView } from '@/types/res/technicianAfterSalesRes'
import { fold } from '@/utils/fold'

const EMPTY: Record<VisitTab, { title: string; description?: string }> = {
  pending: {
    title: 'Không có buổi hẹn nào chờ bạn nhận',
    description: 'Khi quản lý xếp bạn đi kiểm tra, sửa hay bảo trì, buổi hẹn hiện ở đây để bạn nhận hoặc từ chối.',
  },
  active: { title: 'Chưa có buổi hẹn nào sắp tới' },
  done: { title: 'Chưa có buổi hẹn nào đã xong' },
}

const SHORTCUT_TEXT: Record<VisitTab, { title: (n: number) => string; hint: string }> = {
  pending: { title: (n) => `Xem ${n} buổi chờ bạn nhận`, hint: 'Nhận hoặc từ chối buổi hẹn mới' },
  active: { title: (n) => `Xem ${n} buổi sắp tới`, hint: 'Buổi hẹn bạn đã nhận' },
  done: { title: (n) => `Xem ${n} buổi đã xong`, hint: 'Kiểm tra lại các buổi đã báo cáo' },
}

const minutesBetween = (startsAt: string, endsAt: string) =>
  Math.max(0, Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000))

function VisitCard({ visit, tab }: { visit: TechnicianVisitView; tab: VisitTab }) {
  const status = technicianVisitMeta(visit)
  const to = withId(ROUTES.tech.afterSalesVisit, visit.visitId)
  const title = `${visitPurposeLabel(visit.purpose)} ${visit.requestNumber}`

  return (
    <article className="sv-card grid gap-4 lg:grid-cols-[10rem_minmax(0,1fr)_auto] lg:items-center">
      <div className="sv-time">
        <p className="tnum text-title font-semibold text-fg">
          {formatTime(visit.startsAt)} - {formatTime(visit.endsAt)}
        </p>
        <p className="tnum text-meta text-fg-2">{minutesBetween(visit.startsAt, visit.endsAt)} phút</p>
      </div>

      <div className="min-w-0 space-y-2">
        <Link to={to} className="tnum block text-title font-semibold text-fg hover:text-accent-fg">
          {title}
        </Link>
        {visit.description && (
          <div className="rounded-control bg-surface-2 px-3 py-2">
            <p className="sv-label text-meta">Nội dung</p>
            <p className="text-body whitespace-pre-line text-fg">{visit.description}</p>
          </div>
        )}
        {visit.siteAddress && <p className="text-body text-fg-2">{visit.siteAddress}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3 lg:flex-col lg:items-end">
        {/* Việc chờ nhận đã báo đỏ ở đầu trang nên thẻ chỉ ghi chữ */}
        <Badge tone={tab === 'pending' ? 'info' : status.tone}>{status.label}</Badge>
        {visit.customerConfirmationRequired && !visit.customerConfirmedAt && (
          <p className="text-meta text-fg-2">Khách chưa xác nhận giờ hẹn</p>
        )}
        <ButtonLink to={to} size="sm" variant="info" icon="visibility">
          {tab === 'pending' ? 'Xem và trả lời' : 'Xem chi tiết'}
          <span className="sr-only"> {title}</span>
        </ButtonLink>
      </div>
    </article>
  )
}

/** Khung trống nét đứt: vì sao trống, và lối tắt sang các tab còn việc */
function TabEmpty({
  title,
  description,
  onClear,
  shortcuts,
  onPick,
}: {
  title: string
  description?: string
  onClear?: () => void
  shortcuts: { tab: VisitTab; count: number }[]
  onPick: (tab: VisitTab) => void
}) {
  return (
    <div className="sv-empty">
      <h2 className="text-title font-semibold text-fg">{title}</h2>
      {description && <p className="mt-1 max-w-xl text-body text-fg-2">{description}</p>}
      {onClear && (
        <Button className="mt-4" variant="ghost" bleed={false} icon="filter_alt_off" onClick={onClear}>
          Xoá lọc
        </Button>
      )}
      {shortcuts.length > 0 && (
        <div className="mt-6 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
          {shortcuts.slice(0, 2).map((s) => {
            const text = SHORTCUT_TEXT[s.tab]
            return (
              <button key={s.tab} type="button" onClick={() => onPick(s.tab)} className="sv-empty-card press">
                <span className="min-w-0">
                  <span className="block text-body font-semibold text-fg">{text.title(s.count)}</span>
                  <span className="block text-meta text-fg-2">{text.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function VisitSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>
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
  const [refreshing, setRefreshing] = useState(false)
  const today = todayVn()

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

  async function refresh() {
    setRefreshing(true)
    try {
      await query.refetch({ throwOnError: true })
      toast.success('Đã cập nhật danh sách buổi hẹn.')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Bảo hành, sửa chữa"
        description={waiting > 0 ? <Badge tone="danger">{waiting} buổi hẹn chờ bạn nhận</Badge> : undefined}
        actions={
          <Button variant="secondary" icon="refresh" disabled={refreshing} onClick={() => void refresh()}>
            {refreshing ? 'Đang làm mới…' : 'Làm mới'}
          </Button>
        }
      />

      <div className="sv-card mb-4 space-y-3">
        <div role="search" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="sm:col-span-2 lg:col-span-1">
            <span className="sr-only">Tìm theo mã hẹn, địa chỉ, nội dung</span>
            <SearchInput
              name="visit-search"
              placeholder="Tìm theo mã hẹn, địa chỉ, nội dung..."
              maxLength={100}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
            />
          </label>
          <FilterMore active={(date ? 1 : 0) + (time ? 1 : 0)}>
            <DateField value={date} onChange={setDate} label="Lọc theo ngày" />
            <TimeSelect
              value={time}
              onChange={setTime}
              from="07:00"
              to="18:00"
              step={30}
              emptyLabel="Tất cả giờ"
              aria-label="Lọc theo giờ bắt đầu"
              active={time !== ''}
            />
          </FilterMore>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-meta text-fg-2">Lọc nhanh</span>
          <Button
            size="sm"
            variant={date === today ? 'soft' : 'secondary'}
            icon="today"
            aria-pressed={date === today}
            onClick={() => setDate(date === today ? '' : today)}
          >
            Hôm nay
          </Button>
        </div>
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

      <QueryBoundary query={query} fallback={<VisitSkeleton />}>
        {() =>
          groups[tab].length === 0 ? (
            <TabEmpty
              {...(hasFilter
                ? { title: 'Không tìm thấy buổi hẹn phù hợp', description: 'Thử đổi từ khoá, ngày hoặc giờ.' }
                : EMPTY[tab])}
              onClear={
                hasFilter
                  ? () => {
                      setSearch('')
                      setDate('')
                      setTime('')
                    }
                  : undefined
              }
              shortcuts={
                hasFilter
                  ? []
                  : (['pending', 'active', 'done'] as const)
                      .filter((t) => t !== tab && groups[t].length > 0)
                      .map((t) => ({ tab: t, count: groups[t].length }))
              }
              onPick={setPicked}
            />
          ) : (
            <div className="space-y-6">
              {groupByDay(groups[tab]).map(([day, items]) => (
                <section key={day} className="space-y-3">
                  <DayGroupHeading day={day} today={today} count={items.length} unit="buổi hẹn" />
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
    </>
  )
}
