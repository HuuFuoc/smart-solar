import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Badge, Count } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { DateField, SearchInput, Select } from '@/components/common/ui/field'
import { FilterMore } from '@/components/common/ui/filter-bar'
import { Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { Segmented } from '@/components/common/ui/segmented'
import { EmptyState, Skeleton } from '@/components/common/ui/states'
import { assetUnits } from '@/features/installations/installationDisplay'
import { matchesInstallation } from '@/features/installations/installationFilter'
import {
  awaitsSubstitutionApproval,
  canWork,
  installationTab,
  latestRework,
  roundEvidenceCount,
  startBlockedText,
  technicianStatusMeta,
  type InstallationTab,
} from '@/features/installations/technicianInstallationDisplay'
import { DayGroupHeading } from '@/features/scheduling/DayGroupHeading'
import { formatDay, formatTime, todayVn, vnDate } from '@/features/scheduling/schedulingDisplay'
import { byStartsAt, groupByDay } from '@/features/scheduling/scheduleOrder'
import { siteArea } from '@/features/scheduling/siteArea'
import { useMyInstallationsQuery } from '@/hooks/useTechnicianInstallations'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import type { InstallationTechnicianView } from '@/types/res/technicianInstallationsRes'

type View = InstallationTechnicianView
type ViewMode = 'list' | 'kanban'
type Tab = InstallationTab | 'substitution'
type TimeSlot = '' | 'morning' | 'afternoon'
type Stage = '' | 'pending' | 'scheduled' | 'in_progress' | 'acceptance'

const EMPTY: Record<Tab, string> = {
  pending: 'Không có công trình nào chờ bạn nhận',
  active: 'Chưa có công trình nào đang làm',
  done: 'Chưa có công trình nào đã nghiệm thu',
  substitution: 'Không có công trình nào lắp thiết bị khác hợp đồng',
}

function projectCode(id: string) {
  return `#INS-${id.slice(0, 8).toUpperCase()}`
}

/** Giờ bắt đầu theo giờ Việt Nam: sáng trước 12:00, chiều từ 12:00 */
function inSlot(v: View, slot: TimeSlot) {
  if (!slot) return true
  const hour = Number(formatTime(v.startsAt).slice(0, 2))
  return slot === 'morning' ? hour < 12 : hour >= 12
}

function inStage(v: View, stage: Stage) {
  if (stage === 'pending') return installationTab(v) === 'pending'
  if (stage === 'scheduled') return installationTab(v) !== 'pending' && v.status === 'SCHEDULED'
  if (stage === 'in_progress') return v.status === 'IN_PROGRESS' || v.status === 'REWORK_REQUIRED'
  if (stage === 'acceptance') return v.status === 'PENDING_CUSTOMER_ACCEPTANCE'
  return true
}

/** Khung thi công: "08:00 - 17:00" trong ngày, hoặc "đến 17:00 Thứ Năm, 20/11" khi kéo nhiều ngày */
function windowEnd(v: View) {
  const startDay = vnDate(v.startsAt)
  const endDay = vnDate(v.endsAt)
  if (endDay && endDay !== startDay) return `đến ${formatTime(v.endsAt)} ${formatDay(endDay)}`
  return `${formatTime(v.startsAt)} - ${formatTime(v.endsAt)}`
}

function durationText(v: View) {
  const startDay = vnDate(v.startsAt)
  const endDay = vnDate(v.endsAt)
  if (!endDay || endDay === startDay) return 'Trong ngày'
  const days = Math.round((Date.parse(`${endDay}T00:00:00Z`) - Date.parse(`${startDay}T00:00:00Z`)) / 86_400_000) + 1
  return `Thi công ${days} ngày`
}

// Dòng tình hình lấy từ dữ liệu thật: lý do chưa bắt đầu được, số ảnh của lượt, số thiết bị đã ghi
function progressLines(v: View) {
  const lines: string[] = []
  const blocked = installationTab(v) === 'active' && !v.canStart && v.status === 'SCHEDULED'
  if (blocked) {
    const text = startBlockedText(v.startBlockedReason)
    if (text) lines.push(text)
  }
  if (v.startedAt || v.evidence.length > 0) {
    lines.push(`${roundEvidenceCount(v)} ảnh${v.currentRound > 1 ? ` của lượt ${v.currentRound}` : ''}`)
  }
  return lines
}

function InstallationCard({ view: v, tab }: { view: View; tab: Tab }) {
  const site = v.site
  const to = withId(ROUTES.tech.installation, v.projectId)
  const name = site?.propertyName ?? 'Công trình lắp đặt'
  const status = technicianStatusMeta(v)
  const pending = installationTab(v) === 'pending'
  const units = assetUnits(v.assets)
  const rework = v.status === 'REWORK_REQUIRED' ? latestRework(v) : null

  return (
    <article className="sv-card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <Link to={to} className="text-title font-semibold text-fg hover:text-accent-fg">
            {name}
          </Link>
          <span className="font-mono text-meta text-fg-2">{projectCode(v.projectId)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Việc chờ trả lời đã báo đỏ ở menu và đầu trang nên thẻ chỉ ghi chữ */}
          <Badge tone={pending ? 'info' : status.tone}>{status.label}</Badge>
          <div className="flex flex-wrap items-center gap-2">
            {canWork(v) && tab !== 'pending' && (
              <ButtonLink to={to} variant="soft" size="sm" icon="edit">
                Cập nhật tiến độ
                <span className="sr-only"> {name}</span>
              </ButtonLink>
            )}
            <ButtonLink to={to} variant="info" size="sm" icon="visibility">
              {pending ? 'Xem và trả lời' : 'Xem chi tiết'}
              <span className="sr-only"> {name}</span>
            </ButtonLink>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-4 border-t border-line pt-4 lg:grid-cols-12">
        <div className="space-y-1 lg:col-span-3">
          <p className="sv-label text-meta">Lịch trình thi công</p>
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="tnum text-figure font-semibold text-fg">{formatTime(v.startsAt)}</span>
            <span className="text-meta text-fg-2">{durationText(v)}</span>
          </p>
          <p className="tnum text-meta text-fg-2">{windowEnd(v)}</p>
        </div>
        <div className="space-y-1 lg:col-span-5">
          <p className="sv-label text-meta">Địa điểm và thiết bị</p>
          <p className="text-body text-fg">
            {site ? siteArea([site.streetLine, site.ward, site.district], site.province) : '—'}
          </p>
          {site?.customerName && <p className="text-meta text-fg-2">Khách: {site.customerName}</p>}
          {(units > 0 || v.startedAt) && (
            <p className="tnum text-meta text-fg-2">
              {units > 0 ? `${units} thiết bị đã ghi` : 'Chưa ghi thiết bị đã lắp'}
            </p>
          )}
        </div>
        <div className="space-y-1 lg:col-span-4">
          <p className="sv-label text-meta">Tình hình</p>
          {progressLines(v).map((line) => (
            <p key={line} className="text-meta text-fg">
              {line}
            </p>
          ))}
          <p className="text-meta text-fg-2">
            Khu vực: <span className="font-medium text-fg">{v.zoneName ?? '—'}</span>
          </p>
        </div>
      </div>

      {awaitsSubstitutionApproval(v) && (
        <Notice tone="warn">Thiết bị lắp khác hợp đồng, chờ quản lý duyệt trước khi gửi báo cáo hoàn thành.</Notice>
      )}
      {rework?.reason && (
        <Notice tone="warn" title="Khách yêu cầu sửa lại">
          {rework.reason}
        </Notice>
      )}
    </article>
  )
}

const KANBAN: { id: string; title: string; match: (v: View) => boolean }[] = [
  { id: 'pending', title: 'Chờ bạn nhận', match: (v) => installationTab(v) === 'pending' },
  { id: 'scheduled', title: 'Đã nhận, chờ bắt đầu', match: (v) => inStage(v, 'scheduled') },
  {
    id: 'working',
    title: 'Đang thi công',
    match: (v) => installationTab(v) !== 'pending' && inStage(v, 'in_progress'),
  },
  {
    id: 'acceptance',
    title: 'Nghiệm thu, bàn giao',
    match: (v) =>
      installationTab(v) !== 'pending' && (v.status === 'PENDING_CUSTOMER_ACCEPTANCE' || v.status === 'COMPLETED'),
  },
]

function KanbanBoard({ rows }: { rows: View[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {KANBAN.map((col) => {
        const items = rows.filter(col.match)
        return (
          <section
            key={col.id}
            aria-label={col.title}
            className="space-y-3 rounded-container border border-line bg-surface-2 p-3"
          >
            <h2 className="flex items-center justify-between gap-2 border-b border-line pb-2 text-body font-semibold text-fg">
              {col.title}
              <Count value={items.length} />
            </h2>
            {items.length === 0 ? (
              <p className="py-6 text-center text-meta text-fg-2">Không có công trình</p>
            ) : (
              items.map((item) => {
                const to = withId(ROUTES.tech.installation, item.projectId)
                const name = item.site?.propertyName ?? 'Công trình'
                return (
                  <div key={item.projectId} className="space-y-2 rounded-control border border-line bg-panel p-3">
                    <p className="font-mono text-meta text-fg-2">{projectCode(item.projectId)}</p>
                    <Link to={to} className="line-clamp-1 block text-body font-semibold text-fg hover:text-accent-fg">
                      {name}
                    </Link>
                    <p className="truncate text-meta text-fg-2">
                      {item.site ? siteArea([item.site.ward, item.site.district], item.site.province) : '—'}
                    </p>
                    <div className="flex items-center justify-between gap-2 border-t border-line pt-2 text-meta text-fg-2">
                      <span className="tnum">
                        {formatDay(vnDate(item.startsAt))} {formatTime(item.startsAt)}
                      </span>
                      <ButtonLink to={to} variant="info" size="sm" icon="visibility">
                        Mở
                        <span className="sr-only"> {name}</span>
                      </ButtonLink>
                    </div>
                  </div>
                )
              })
            )}
          </section>
        )
      })}
    </div>
  )
}

function InstallationSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="sv-card space-y-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      ))}
    </div>
  )
}

// Công trình quản lý giao cho kỹ thuật viên: chờ trả lời, đang làm (đã nhận, chưa nghiệm thu), đã nghiệm thu, và
// công trình lắp thiết bị khác hợp đồng đang chờ duyệt. Kanban xếp mọi công trình theo công đoạn
export function TechInstallationsPage() {
  const query = useMyInstallationsQuery()
  const [picked, setPicked] = useState<Tab | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState<TimeSlot>('')
  const [stage, setStage] = useState<Stage>('')
  const [refreshing, setRefreshing] = useState(false)

  const matched = useMemo(
    () =>
      (query.data ?? []).filter(
        (v) => matchesInstallation(v, search, date, '') && inSlot(v, slot) && inStage(v, stage),
      ),
    [query.data, search, date, slot, stage],
  )
  const groups = useMemo(() => {
    const out: Record<Tab, View[]> = { pending: [], active: [], done: [], substitution: [] }
    for (const v of matched) {
      out[installationTab(v)].push(v)
      if (awaitsSubstitutionApproval(v)) out.substitution.push(v)
    }
    return out
  }, [matched])

  const all = query.data ?? []
  const waiting = all.filter((v) => installationTab(v) === 'pending').length
  const working = all.filter((v) => installationTab(v) === 'active').length
  const tab: Tab = picked ?? (waiting > 0 ? 'pending' : 'active')
  const hasFilter = search.trim() !== '' || date !== '' || slot !== '' || stage !== ''
  const today = todayVn()

  const resetFilters = () => {
    setSearch('')
    setDate('')
    setSlot('')
    setStage('')
  }

  async function refresh() {
    setRefreshing(true)
    try {
      await query.refetch({ throwOnError: true })
      toast.success('Đã cập nhật danh sách công trình.')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Tiến độ lắp đặt và bàn giao"
        description={
          <span className="flex flex-wrap gap-x-3">
            <span className="tnum">{working} công trình đang triển khai</span>
            {waiting > 0 && <Badge tone="danger">{waiting} công trình chờ bạn nhận việc</Badge>}
          </span>
        }
        actions={
          <>
            <Segmented
              label="Cách xem"
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: 'list', label: 'Danh sách', icon: 'view_agenda' },
                { value: 'kanban', label: 'Kanban', icon: 'view_kanban' },
              ]}
            />
            <Button variant="secondary" icon="refresh" disabled={refreshing} onClick={() => void refresh()}>
              {refreshing ? 'Đang làm mới…' : 'Làm mới'}
            </Button>
            <ButtonLink to={ROUTES.tech.schedule} variant="info" icon="calendar_month">
              Lịch làm việc
            </ButtonLink>
          </>
        }
      />

      <div className="sv-card mb-4 space-y-3">
        <div role="search" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label>
            <span className="sr-only">Tìm theo công trình, khách, địa chỉ, khu vực</span>
            <SearchInput
              name="installation-search"
              placeholder="Tìm theo công trình, khách, địa chỉ..."
              maxLength={100}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
            />
          </label>
          <FilterMore active={(date ? 1 : 0) + (slot ? 1 : 0) + (stage ? 1 : 0)}>
            <DateField label="Lọc theo ngày" value={date} onChange={setDate} />
            <Select
              aria-label="Khung giờ"
              active={slot !== ''}
              value={slot}
              onChange={(e) => setSlot(e.target.value as TimeSlot)}
            >
              <option value="">Tất cả khung giờ</option>
              <option value="morning">Bắt đầu buổi sáng</option>
              <option value="afternoon">Bắt đầu buổi chiều</option>
            </Select>
            <Select
              aria-label="Công đoạn"
              active={stage !== ''}
              value={stage}
              onChange={(e) => setStage(e.target.value as Stage)}
            >
              <option value="">Mọi công đoạn</option>
              <option value="pending">Chờ bạn nhận</option>
              <option value="scheduled">Đã nhận, chờ bắt đầu</option>
              <option value="in_progress">Đang lắp đặt, sửa lại</option>
              <option value="acceptance">Chờ nghiệm thu</option>
            </Select>
          </FilterMore>
        </div>
        {viewMode === 'list' && (
          <div className="border-t border-line pt-3">
            <FilterChips
              label="Lọc công trình"
              value={tab}
              onChange={setPicked}
              chips={[
                { value: 'pending', label: 'Chờ bạn nhận', count: groups.pending.length },
                { value: 'active', label: 'Đang làm', count: groups.active.length },
                { value: 'done', label: 'Đã nghiệm thu', count: groups.done.length },
                { value: 'substitution', label: 'Thiết bị khác hợp đồng', count: groups.substitution.length },
              ]}
            />
          </div>
        )}
      </div>

      <QueryBoundary query={query} fallback={<InstallationSkeleton />}>
        {() => {
          if (viewMode === 'kanban') return <KanbanBoard rows={[...matched].sort(byStartsAt)} />
          const rows = groups[tab]
          if (rows.length === 0)
            return hasFilter ? (
              <EmptyState
                title="Không có công trình nào phù hợp"
                description="Thử đổi từ khoá, ngày hoặc công đoạn."
                action={
                  <Button variant="ghost" bleed={false} icon="filter_alt_off" onClick={resetFilters}>
                    Xoá lọc
                  </Button>
                }
              />
            ) : (
              <EmptyState title={EMPTY[tab]} />
            )
          return (
            <div className="space-y-6">
              {groupByDay(rows).map(([day, items]) => (
                <section key={day} className="space-y-3">
                  <DayGroupHeading day={day} today={today} count={items.length} unit="công trình" />
                  <div className="space-y-3">
                    {items.map((item) => (
                      <InstallationCard key={item.projectId} view={item} tab={tab} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )
        }}
      </QueryBoundary>
    </>
  )
}
