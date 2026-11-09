import { useMemo, useState } from 'react'
import { Badge, type Tone } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { ListCell, ListCells, ListHead, ListRow } from '@/components/common/ui/list-row'
import {
  formatAreaPair,
  formatRelative,
  isClosedRequest,
  isOverdue,
  needsScheduling,
  surfaceTypeLabel,
  surveyStatusMeta,
} from '@/features/pre-surveys/preSurveyDisplay'
import {
  addDays,
  appointmentStatusMeta,
  formatMoment,
  formatTime,
  relativeDay,
  todayVn,
  vnDate,
} from '@/features/scheduling/schedulingDisplay'
import { ROUTES, withId } from '@/routes/paths'
import { HCM_PROVINCE } from '@/services/administrativeUnitService'
import type {
  MySurveyRequestItem,
  PendingSurveyRequestItem,
  SurveyRequestAppointmentItem,
} from '@/types/res/surveyRequestsRes'
import { cx } from '@/utils/cx'

// Hàng chờ yêu cầu khảo sát của sales: mỗi yêu cầu một dòng, thông tin trải ngang theo cột

/** Hai tab dùng chung một bộ cột (cột 4 luôn là giờ hẹn) để chuyển tab không bị nhảy cột */
const COLUMNS = 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)_minmax(0,1.25fr)_minmax(0,1.3fr)_minmax(0,1.45fr)_9rem]'

// Tên và phường, xã của công trình. Dự án chỉ nhận công trình ở TP.HCM nên chỉ ghi tỉnh khi khác.
// h2 để đúng thứ tự tiêu đề sau h1 của trang
function Property({
  name,
  row,
}: {
  name: string | null
  row: Pick<MySurveyRequestItem, 'communeName' | 'ward' | 'district' | 'province'>
}) {
  const province = row.province === HCM_PROVINCE.name ? null : row.province
  const area = [row.communeName ?? row.ward ?? row.district, province].filter(Boolean).join(', ')
  return (
    <ListCell wide>
      <h2 className="font-semibold">{name || 'Công trình chưa đặt tên'}</h2>
      {area && <p className="mt-0.5 text-meta text-fg-2">{area}</p>}
    </ListCell>
  )
}

/** "hôm kia" và giờ chính xác ngay dưới, không giấu giờ trong tooltip */
function When({ iso }: { iso: string }) {
  return (
    <>
      <time dateTime={iso} className="block">
        {formatRelative(iso)}
      </time>
      <span className="tnum block text-meta text-fg-2">{formatMoment(iso)}</span>
    </>
  )
}

/** "Ngày mai, 09:00"; null khi chưa có giờ */
function startsLabel(iso: string | null | undefined, today: string) {
  return iso ? `${relativeDay(vnDate(iso), today)}, ${formatTime(iso)}` : null
}

/** Chờ lâu nhất lên đầu */
function oldestFirst(a: PendingSurveyRequestItem, b: PendingSurveyRequestItem) {
  return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
}

/** Giờ khách đã đặt và lịch đó đang ở đâu: kinh doanh cần biết trước khi nhận yêu cầu */
function PendingAppointment({
  appointment,
  today,
}: {
  appointment: SurveyRequestAppointmentItem | null
  today: string
}) {
  if (!appointment) return <span className="text-fg-2">Khách chưa đặt giờ</span>
  return (
    <>
      <span className="block">{startsLabel(appointment.startsAt, today)}</span>
      <span className="block text-meta text-fg-2">{appointmentStatusMeta(appointment.status, 'sales').label}</span>
    </>
  )
}

export function PendingRequestList({
  rows,
  claimingId,
  onClaim,
}: {
  rows: PendingSurveyRequestItem[]
  claimingId: string | null
  onClaim: (row: PendingSurveyRequestItem) => void
}) {
  const today = todayVn()
  return (
    <>
      <ListHead columns={COLUMNS} labels={['Công trình', 'Khách hàng', 'Mặt lắp', 'Hẹn khảo sát', 'Khách gửi', '']} />
      <ul className="divide-y divide-line">
        {[...rows].sort(oldestFirst).map((r) => (
          <ListRow key={r.surveyRequestId}>
            <ListCells columns={COLUMNS}>
              <Property name={r.propertyName} row={r} />
              <ListCell label="Khách hàng">{r.customerName || '—'}</ListCell>
              <ListCell label="Mặt lắp">
                <span className="block">{surfaceTypeLabel(r.installationSurfaceType)}</span>
                <span className="tnum block text-meta text-fg-2">
                  dùng được {formatAreaPair(r.usableAreaM2, r.totalAreaM2)}
                </span>
              </ListCell>
              <ListCell label="Hẹn khảo sát">
                <PendingAppointment appointment={r.appointment} today={today} />
              </ListCell>
              <ListCell label="Khách gửi">
                <When iso={r.submittedAt} />
                {isOverdue(r.submittedAt) && (
                  <Badge tone="danger" className="mt-0.5 block">
                    Chờ hơn 1 ngày
                  </Badge>
                )}
              </ListCell>
              <ListCell wide className="lg:justify-self-end">
                <Button
                  icon="assignment_turned_in"
                  size="sm"
                  variant="soft"
                  disabled={claimingId !== null}
                  onClick={() => onClaim(r)}
                >
                  {claimingId === r.surveyRequestId ? 'Đang nhận…' : 'Nhận yêu cầu'}
                </Button>
              </ListCell>
            </ListCells>
          </ListRow>
        ))}
      </ul>
    </>
  )
}

type RowState = {
  /** Nhỏ hơn thì lên trước */
  rank: number
  label: string
  tone: Tone
  hint: string | null
}

// Tình hình một yêu cầu. Việc của sales (lịch quá giờ, cần phân công) lên đầu và tô đỏ
function rowState(r: MySurveyRequestItem, mustAssign: boolean): RowState {
  if (isClosedRequest(r.status)) return { rank: 5, ...surveyStatusMeta(r.status), hint: null }
  if (r.appointment?.isOverdue)
    return { rank: 0, label: 'Quá giờ, chưa khảo sát', tone: 'danger', hint: 'Hẹn lại giờ khác với khách.' }
  if (mustAssign)
    return { rank: 0, label: 'Cần phân công', tone: 'danger', hint: 'Lịch quá hạn mà không kỹ thuật viên nào nhận.' }
  if (r.status === 'SCHEDULED') return { rank: 1, label: 'Đã hẹn khảo sát', tone: 'ok', hint: null }
  if (needsScheduling(r.status))
    return r.appointment
      ? { rank: 2, label: 'Chờ kỹ thuật viên nhận', tone: 'info', hint: null }
      : { rank: 3, label: 'Khách chưa đặt giờ', tone: 'info', hint: null }
  return { rank: 4, ...surveyStatusMeta(r.status), hint: null }
}

/** Giờ hẹn đang hiệu lực: lịch chờ người nhận cũng có giờ khách đã chọn */
const appointmentStart = (r: MySurveyRequestItem) => r.appointment?.startsAt ?? r.scheduledAt

type MyRow = { row: MySurveyRequestItem; state: RowState }

// Cần làm lên đầu, rồi lịch sắp tới (gần nhất trước), rồi đang chờ, cuối cùng là lịch đã qua
function byNextAction(a: MyRow, b: MyRow) {
  if (a.state.rank !== b.state.rank) return a.state.rank - b.state.rank
  if (a.state.rank === 1) return (appointmentStart(a.row) ?? '').localeCompare(appointmentStart(b.row) ?? '')
  return new Date(b.row.assignedAt ?? 0).getTime() - new Date(a.row.assignedAt ?? 0).getTime()
}

type GroupKey = 'urgent' | 'unscheduled' | 'waitingTech' | 'scheduled' | 'done'

const GROUP_CONFIGS: {
  key: GroupKey
  title: string
  description: string
  highlight?: boolean
}[] = [
  {
    key: 'urgent',
    title: 'Cần xử lý ngay',
    description: 'Yêu cầu quá giờ chưa khảo sát hoặc cần bạn phân công kỹ thuật viên.',
    highlight: true,
  },
  {
    key: 'unscheduled',
    title: 'Khách chưa đặt giờ',
    description: 'Yêu cầu bạn đã nhận, đang chờ khách hàng chọn khung giờ khảo sát trên cổng.',
  },
  {
    key: 'waitingTech',
    title: 'Chờ kỹ thuật viên nhận',
    description: 'Khách hàng đã đặt lịch khảo sát, đang chờ kỹ thuật viên tiếp nhận.',
  },
  {
    key: 'scheduled',
    title: 'Đã hẹn khảo sát',
    description: 'Kỹ thuật viên đã nhận lịch, chuẩn bị tiến hành khảo sát công trình.',
  },
  {
    key: 'done',
    title: 'Đã hoàn thành & Đã đóng',
    description: 'Các yêu cầu đã hoàn tất khảo sát hoặc đã kết thúc hồ sơ.',
  },
]

function getGroupKey(state: RowState): GroupKey {
  if (state.rank === 0) return 'urgent'
  if (state.rank === 3) return 'unscheduled'
  if (state.rank === 2) return 'waitingTech'
  if (state.rank === 1) return 'scheduled'
  return 'done'
}

type DateFilter = 'all' | 'today' | 'yesterday' | 'day_before' | 'last_3_days' | 'last_7_days' | 'last_30_days'

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả ngày' },
  { value: 'today', label: 'Hôm nay' },
  { value: 'yesterday', label: 'Hôm qua' },
  { value: 'day_before', label: 'Hôm kia' },
  { value: 'last_3_days', label: '3 ngày gần đây' },
  { value: 'last_7_days', label: '7 ngày gần đây' },
  { value: 'last_30_days', label: '30 ngày gần đây' },
]

function matchesDate(itemDate: string, filter: DateFilter, today: string): boolean {
  if (filter === 'all' || !itemDate) return true
  if (filter === 'today') return itemDate === today
  if (filter === 'yesterday') return itemDate === addDays(today, -1)
  if (filter === 'day_before') return itemDate === addDays(today, -2)
  if (filter === 'last_3_days') return itemDate >= addDays(today, -3) && itemDate <= today
  if (filter === 'last_7_days') return itemDate >= addDays(today, -7) && itemDate <= today
  if (filter === 'last_30_days') return itemDate >= addDays(today, -30) && itemDate <= today
  return true
}

/** Bảng con hiển thị một nhóm trạng thái với tiêu đề, số lượng và toggle thu gọn */
function SurveyStatusTable({
  title,
  count,
  description,
  highlight,
  items,
  today,
}: {
  title: string
  count: number
  description?: string
  highlight?: boolean
  items: MyRow[]
  today: string
}) {
  const [open, setOpen] = useState(true)

  return (
    <section
      className={cx(
        'rounded-xl border bg-canvas transition-all shadow-xs overflow-hidden',
        highlight
          ? 'border-danger/40 border-l-[4px] border-l-danger'
          : 'border-line',
      )}
    >
      {/* Tiêu đề bảng trạng thái */}
      <div
        className={cx(
          'flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 sm:px-5 sm:py-3.5',
          highlight ? 'bg-danger-soft/25' : 'bg-surface-2/40',
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="group flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
          aria-expanded={open}
        >
          <h3 className="text-body font-bold text-fg flex items-center gap-2 group-hover:text-accent transition-colors">
            <span>{title}</span>
            <span
              className={cx(
                'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-2 text-[12px] font-bold',
                highlight
                  ? 'bg-danger text-on-danger'
                  : 'bg-surface-3 text-fg',
              )}
            >
              {count}
            </span>
          </h3>
          <Icon
            name={open ? 'expand_less' : 'expand_more'}
            className="text-[20px] text-fg-3 transition-transform group-hover:text-fg"
          />
        </button>

        {description && (
          <p className="text-meta text-fg-3 sm:text-right">
            {description}
          </p>
        )}
      </div>

      {/* Danh sách các dòng trong bảng */}
      {open && (
        <div className="p-3.5 sm:p-5 pt-2 sm:pt-2">
          <ListHead
            columns={COLUMNS}
            labels={['Công trình', 'Khách hàng', 'Bạn nhận', 'Hẹn khảo sát', 'Tình hình', '']}
          />
          <ul className="divide-y divide-line">
            {items.map(({ row: r, state }) => {
              const technician = r.appointment?.technicianName
              return (
                <ListRow key={r.surveyRequestId} className="hover:bg-surface-2/40 transition-colors px-2 rounded-lg">
                  <ListCells columns={COLUMNS}>
                    <Property name={r.propertyName} row={r} />
                    <ListCell label="Tình hình" wide className="lg:order-5">
                      <Badge tone={state.tone}>{state.label}</Badge>
                      {state.hint && <p className="mt-0.5 text-meta text-fg-2">{state.hint}</p>}
                    </ListCell>
                    <ListCell label="Khách hàng" className="lg:order-2">
                      {r.customerName || '—'}
                    </ListCell>
                    <ListCell label="Bạn nhận" className="lg:order-3">
                      {r.assignedAt ? <When iso={r.assignedAt} /> : '—'}
                    </ListCell>
                    <ListCell label="Hẹn khảo sát" className="lg:order-4">
                      <span className={cx('block', !appointmentStart(r) && 'text-fg-2')}>
                        {startsLabel(appointmentStart(r), today) ?? 'Chưa có'}
                      </span>
                      {technician && <span className="block text-meta text-fg-2">{technician}</span>}
                    </ListCell>
                    <ListCell wide className="lg:order-6 lg:justify-self-end">
                      <ButtonLink
                        icon="visibility"
                        to={withId(ROUTES.ops.survey, r.surveyRequestId)}
                        size="sm"
                        variant="info"
                      >
                        Mở yêu cầu
                      </ButtonLink>
                    </ListCell>
                  </ListCells>
                </ListRow>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}

/** `needAssign`: id các yêu cầu có lịch quá hạn cần sales phân công */
export function MyRequestList({ rows, needAssign }: { rows: MySurveyRequestItem[]; needAssign: Set<string> }) {
  const today = todayVn()
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [filterKey, setFilterKey] = useState<string>('all')

  const allItems = useMemo(
    () =>
      rows
        .map((row) => ({ row, state: rowState(row, needAssign.has(row.surveyRequestId)) }))
        .sort(byNextAction),
    [rows, needAssign],
  )

  // Lọc theo mốc thời gian nhận yêu cầu
  const dateFilteredItems = useMemo(() => {
    if (dateFilter === 'all') return allItems
    return allItems.filter(({ row }) => {
      const itemDateIso = row.assignedAt || row.submittedAt
      return matchesDate(vnDate(itemDateIso), dateFilter, today)
    })
  }, [allItems, dateFilter, today])

  // Gom nhóm theo trạng thái từ danh sách đã lọc ngày
  const activeGroups = useMemo(() => {
    const map: Record<GroupKey, MyRow[]> = {
      urgent: [],
      unscheduled: [],
      waitingTech: [],
      scheduled: [],
      done: [],
    }
    for (const item of dateFilteredItems) {
      const key = getGroupKey(item.state)
      map[key].push(item)
    }
    return GROUP_CONFIGS.map((config) => ({
      ...config,
      items: map[config.key],
    })).filter((group) => group.items.length > 0)
  }, [dateFilteredItems])

  const visibleGroups =
    filterKey === 'all' ? activeGroups : activeGroups.filter((g) => g.key === filterKey)

  return (
    <div className="space-y-5">
      {/* Thanh công cụ lọc: Lọc theo thời gian & Lọc theo trạng thái */}
      <div className="space-y-3">
        {/* Bộ lọc mốc thời gian (Hôm nay, Hôm qua, Hôm kia, 3 ngày gần đây...) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-line bg-surface-2/40 p-2.5 sm:px-4 sm:py-2.5">
          <div className="flex items-center gap-2 shrink-0">
            <Icon name="calendar_today" className="text-[18px] text-fg-3" />
            <span className="text-meta font-medium text-fg-2 whitespace-nowrap">Thời gian nhận:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Lọc theo ngày nhận">
            {DATE_OPTIONS.map((opt) => {
              const isSelected = dateFilter === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setDateFilter(opt.value)
                    setFilterKey('all')
                  }}
                  className={cx(
                    'inline-flex items-center rounded-lg px-2.5 py-1 text-meta font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    isSelected
                      ? 'bg-accent text-on-accent shadow-xs'
                      : 'border border-line bg-canvas text-fg-2 hover:bg-surface-2 hover:text-fg',
                  )}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Bộ lọc nhanh theo nhóm trạng thái khi có từ 2 nhóm trạng thái trở lên */}
        {activeGroups.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 pt-0.5" role="group" aria-label="Lọc theo bảng trạng thái">
            <button
              type="button"
              onClick={() => setFilterKey('all')}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-meta font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                filterKey === 'all'
                  ? 'bg-accent text-on-accent shadow-sm'
                  : 'bg-surface-2 text-fg-2 hover:bg-surface-3 hover:text-fg',
              )}
            >
              Tất cả trạng thái ({dateFilteredItems.length})
            </button>
            {activeGroups.map((group) => {
              const isSelected = filterKey === group.key
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setFilterKey(isSelected ? 'all' : group.key)}
                  className={cx(
                    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-meta font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    isSelected
                      ? 'bg-accent text-on-accent shadow-sm'
                      : 'bg-surface-2 text-fg-2 hover:bg-surface-3 hover:text-fg',
                  )}
                >
                  <span>{group.title}</span>
                  <span
                    className={cx(
                      'rounded-full px-1.5 py-0.2 text-[11px] font-bold',
                      isSelected
                        ? 'bg-white/20 text-white'
                        : group.highlight
                          ? 'bg-danger text-on-danger'
                          : 'bg-surface-3 text-fg-2',
                    )}
                  >
                    {group.items.length}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Hiển thị các bảng danh sách theo từng trạng thái */}
      {visibleGroups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-2 p-8 text-center bg-canvas">
          <Icon name="event_busy" className="text-3xl text-fg-3 opacity-40 mx-auto mb-2" />
          <p className="text-body font-medium text-fg">Không có yêu cầu nào trong mốc thời gian này</p>
          <p className="mt-1 text-meta text-fg-3">
            Thử chọn mốc thời gian khác hoặc bấm xem tất cả ngày.
          </p>
          <div className="mt-3.5">
            <button
              type="button"
              onClick={() => {
                setDateFilter('all')
                setFilterKey('all')
              }}
              className="inline-flex items-center gap-1 text-meta font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
            >
              <Icon name="refresh" className="text-[16px]" />
              <span>Xem tất cả ngày</span>
            </button>
          </div>
        </div>
      ) : (
        visibleGroups.map((group) => (
          <SurveyStatusTable
            key={group.key}
            title={group.title}
            count={group.items.length}
            description={group.description}
            highlight={group.highlight}
            items={group.items}
            today={today}
          />
        ))
      )}
    </div>
  )
}
