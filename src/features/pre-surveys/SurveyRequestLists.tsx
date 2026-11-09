import { useMemo, useState } from 'react'
import { Badge, type Tone } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { ListCell, ListCells, ListHead, ListRow } from '@/components/common/ui/list-row'
import {
  formatAreaPair,
  formatRelative,
  isClosedRequest,
  isCompletedStatus,
  isOverdue,
  isScheduledStatus,
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

/** Giờ hẹn đang hiệu lực: lịch chờ người nhận cũng có giờ khách đã chọn */
const appointmentStart = (r: MySurveyRequestItem) => r.appointment?.startsAt ?? r.scheduledAt

type ThreeStatusKey = 'unscheduled' | 'dispatching' | 'confirmed'

type MyRow = {
  row: MySurveyRequestItem
  state: RowState
  groupKey: ThreeStatusKey
}

/** Phân loại chính xác 3 trạng thái của yêu cầu khảo sát */
function classifyThreeStatus(r: MySurveyRequestItem, mustAssign: boolean): { key: ThreeStatusKey; state: RowState } {
  const hasApptStart = Boolean(appointmentStart(r))
  const hasAppt = Boolean(r.appointment)
  const isSched =
    r.status === 'SCHEDULED' ||
    isScheduledStatus(r.status) ||
    Boolean(r.appointment?.technicianUserId) ||
    r.appointment?.status === 'ACCEPTED' ||
    r.appointment?.status === 'ASSIGNED'
  const isCompleted = isCompletedStatus(r.status) || r.appointment?.status === 'COMPLETED'
  const isClosed = isClosedRequest(r.status)

  // 1. Kỹ thuật viên đã nhận lịch / Đã có lịch
  if (isSched || isCompleted) {
    const label = isCompleted ? 'Đã khảo sát' : 'Kỹ thuật viên đã nhận lịch'
    return {
      key: 'confirmed',
      state: { rank: 1, label, tone: 'ok', hint: null },
    }
  }

  // 2. Đang xếp kỹ thuật viên (khách đã chọn giờ / có appointment nhưng chưa có KTV nhận)
  if (hasApptStart || hasAppt || mustAssign) {
    if (r.appointment?.isOverdue) {
      return {
        key: 'dispatching',
        state: { rank: 0, label: 'Quá giờ, chưa khảo sát', tone: 'danger', hint: 'Hẹn lại giờ khác với khách.' },
      }
    }
    if (mustAssign || r.appointment?.status === 'ESCALATED') {
      return {
        key: 'dispatching',
        state: { rank: 0, label: 'Cần phân công', tone: 'danger', hint: 'Lịch quá hạn mà không kỹ thuật viên nào nhận.' },
      }
    }
    return {
      key: 'dispatching',
      state: { rank: 2, label: 'Đang xếp kỹ thuật viên', tone: 'info', hint: 'Chờ kỹ thuật viên tiếp nhận lịch.' },
    }
  }

  // 3. Khách chưa đặt giờ
  if (isClosed) {
    return {
      key: 'unscheduled',
      state: { rank: 5, ...surveyStatusMeta(r.status), hint: null },
    }
  }

  return {
    key: 'unscheduled',
    state: { rank: 3, label: 'Khách chưa đặt giờ', tone: 'info', hint: null },
  }
}

// Cần làm lên đầu, rồi lịch sắp tới (gần nhất trước), rồi đang chờ, cuối cùng là lịch đã qua
function byNextAction(a: MyRow, b: MyRow) {
  if (a.state.rank !== b.state.rank) return a.state.rank - b.state.rank
  if (a.state.rank === 1) return (appointmentStart(a.row) ?? '').localeCompare(appointmentStart(b.row) ?? '')
  return new Date(b.row.assignedAt ?? 0).getTime() - new Date(a.row.assignedAt ?? 0).getTime()
}

const THREE_STATUS_TABLES: {
  key: ThreeStatusKey
  title: string
  description: string
  tone: Tone
}[] = [
  {
    key: 'unscheduled',
    title: 'Khách chưa đặt giờ',
    description: 'Yêu cầu bạn đã nhận, đang chờ khách hàng chọn khung giờ khảo sát trên cổng.',
    tone: 'info',
  },
  {
    key: 'dispatching',
    title: 'Đang xếp kỹ thuật viên',
    description: 'Khách hàng đã đặt lịch khảo sát, đang chờ kỹ thuật viên tiếp nhận.',
    tone: 'warn',
  },
  {
    key: 'confirmed',
    title: 'Kỹ thuật viên đã nhận lịch',
    description: 'Kỹ thuật viên đã nhận lịch và chuẩn bị tiến hành khảo sát công trình.',
    tone: 'ok',
  },
]

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
                count === 0
                  ? 'bg-surface-3 text-fg-3'
                  : highlight
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
          {items.length === 0 ? (
            <div className="py-6 text-center text-meta text-fg-3">
              Chưa có yêu cầu nào ở trạng thái này
            </div>
          ) : (
            <>
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
            </>
          )}
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
        .map((row) => {
          const classified = classifyThreeStatus(row, needAssign.has(row.surveyRequestId))
          return { row, state: classified.state, groupKey: classified.key }
        })
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

  // Gom thành đúng 3 bảng trạng thái
  const tables = useMemo(() => {
    const map: Record<ThreeStatusKey, MyRow[]> = {
      unscheduled: [],
      dispatching: [],
      confirmed: [],
    }
    for (const item of dateFilteredItems) {
      map[item.groupKey].push(item)
    }

    return THREE_STATUS_TABLES.map((config) => {
      const items = map[config.key]
      const hasUrgent = items.some((it) => it.state.rank === 0)
      return {
        ...config,
        items,
        highlight: config.key === 'dispatching' && hasUrgent,
      }
    })
  }, [dateFilteredItems])

  const visibleTables =
    filterKey === 'all' ? tables : tables.filter((t) => t.key === filterKey)

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

        {/* 3 tabs / pills chọn 3 bảng trạng thái */}
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
            Tất cả ({dateFilteredItems.length})
          </button>
          {tables.map((table) => {
            const isSelected = filterKey === table.key
            return (
              <button
                key={table.key}
                type="button"
                onClick={() => setFilterKey(isSelected ? 'all' : table.key)}
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-meta font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  isSelected
                    ? 'bg-accent text-on-accent shadow-sm'
                    : 'bg-surface-2 text-fg-2 hover:bg-surface-3 hover:text-fg',
                )}
              >
                <span>{table.title}</span>
                <span
                  className={cx(
                    'rounded-full px-1.5 py-0.2 text-[11px] font-bold',
                    isSelected
                      ? 'bg-white/20 text-white'
                      : table.highlight
                        ? 'bg-danger text-on-danger'
                        : 'bg-surface-3 text-fg-2',
                  )}
                >
                  {table.items.length}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Hiển thị chính xác 3 bảng danh sách theo 3 trạng thái */}
      {visibleTables.map((table) => (
        <SurveyStatusTable
          key={table.key}
          title={table.title}
          count={table.items.length}
          description={table.description}
          highlight={table.highlight}
          items={table.items}
          today={today}
        />
      ))}
    </div>
  )
}
