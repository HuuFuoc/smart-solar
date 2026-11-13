import { useMemo, useState } from 'react'
import { Badge, type Tone } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { Field, Select } from '@/components/common/ui/field'
import { ListCell, ListCells, ListHead, ListRow } from '@/components/common/ui/list-row'
import { StatusTableSection } from '@/components/common/ui/status-tables'
import {
  formatAreaPair,
  formatDateTime,
  formatRelative,
  isClosedRequest,
  isCompletedStatus,
  isOverdue,
  isScheduledStatus,
  surfaceTypeLabel,
  surveyStatusMeta,
} from '@/features/pre-surveys/preSurveyDisplay'
import {
  appointmentStatusMeta,
  DATE_FILTER_OPTIONS,
  type DateFilter,
  matchesVnDate,
  formatMoment,
  formatTime,
  relativeDay,
  todayVn,
  vnDate,
} from '@/features/scheduling/schedulingDisplay'
import { WeekdayBadge } from '@/features/scheduling/WeekdayBadge'
import { ROUTES, withId } from '@/routes/paths'
import { HCM_PROVINCE } from '@/services/administrativeUnitService'
import type {
  MySurveyRequestItem,
  PendingSurveyRequestItem,
  SurveyRequestAppointmentItem,
} from '@/types/res/surveyRequestsRes'

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

/** "hôm kia" và giờ chính xác ngay dưới; quá 30 ngày thì formatRelative đã là giờ chính xác nên chỉ một dòng */
function When({ iso }: { iso: string }) {
  const relative = formatRelative(iso)
  if (relative === formatDateTime(iso)) {
    return (
      <time dateTime={iso} className="tnum block">
        {formatMoment(iso)}
      </time>
    )
  }
  return (
    <>
      <time dateTime={iso} className="block">
        {relative}
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
    <div className="space-y-0.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <WeekdayBadge date={appointment.startsAt} format="short" withBar />
        <span className="font-medium text-fg">{startsLabel(appointment.startsAt, today)}</span>
      </div>
      <span className="block text-meta text-fg-2">{appointmentStatusMeta(appointment.status, 'sales').label}</span>
    </div>
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
        state: {
          rank: 0,
          label: 'Cần phân công',
          tone: 'danger',
          hint: 'Lịch quá hạn mà không kỹ thuật viên nào nhận.',
        },
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

const THREE_STATUS_TABLES: { key: ThreeStatusKey; title: string }[] = [
  { key: 'unscheduled', title: 'Khách chưa đặt giờ' },
  { key: 'dispatching', title: 'Đang xếp kỹ thuật viên' },
  { key: 'confirmed', title: 'Kỹ thuật viên đã nhận lịch' },
]

function MyRequestRows({ items, today }: { items: MyRow[]; today: string }) {
  return (
    <>
      <ListHead columns={COLUMNS} labels={['Công trình', 'Khách hàng', 'Bạn nhận', 'Hẹn khảo sát', 'Tình hình', '']} />
      <ul className="divide-y divide-line">
        {items.map(({ row: r, state }) => {
          const technician = r.appointment?.technicianName
          return (
            <ListRow key={r.surveyRequestId}>
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
                  {appointmentStart(r) ? (
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <WeekdayBadge date={appointmentStart(r)!} format="short" withBar />
                        <span className="font-medium text-fg">{startsLabel(appointmentStart(r), today)}</span>
                      </div>
                      {technician && <span className="block text-meta text-fg-2">{technician}</span>}
                    </div>
                  ) : (
                    <span className="block text-fg-2">Chưa có</span>
                  )}
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
  )
}

/** `needAssign`: id các yêu cầu có lịch quá hạn cần sales phân công */
export function MyRequestList({ rows, needAssign }: { rows: MySurveyRequestItem[]; needAssign: Set<string> }) {
  const today = todayVn()
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [groupFilter, setGroupFilter] = useState<'all' | ThreeStatusKey>('all')

  const tables = useMemo(() => {
    const map: Record<ThreeStatusKey, MyRow[]> = { unscheduled: [], dispatching: [], confirmed: [] }
    for (const row of rows) {
      if (!matchesVnDate(vnDate(row.assignedAt || row.submittedAt), dateFilter, today)) continue
      const { key, state } = classifyThreeStatus(row, needAssign.has(row.surveyRequestId))
      map[key].push({ row, state, groupKey: key })
    }
    return THREE_STATUS_TABLES.map((t) => {
      const items = map[t.key].sort(byNextAction)
      // Nhóm đang xếp có lịch quá giờ hoặc cần phân công thì số đếm đỏ
      return { ...t, items, urgent: t.key === 'dispatching' && items.some((it) => it.state.rank === 0) }
    })
  }, [rows, needAssign, dateFilter, today])

  const shown = groupFilter === 'all' ? tables : tables.filter((t) => t.key === groupFilter)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Thời gian nhận" htmlFor="my-requests-date" className="w-full sm:w-52">
          <Select
            id="my-requests-date"
            active={dateFilter !== 'all'}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          >
            {DATE_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tình hình" htmlFor="my-requests-group" className="w-full sm:w-64">
          <Select
            id="my-requests-group"
            active={groupFilter !== 'all'}
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value as 'all' | ThreeStatusKey)}
          >
            <option value="all">Mọi tình hình</option>
            {tables.map((t) => (
              <option key={t.key} value={t.key}>
                {t.title} ({t.items.length})
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {shown.map((t) => (
        <StatusTableSection
          key={t.key}
          title={t.title}
          count={t.items.length}
          emptyText="Không có yêu cầu nào."
          highlight={t.urgent}
        >
          <MyRequestRows items={t.items} today={today} />
        </StatusTableSection>
      ))}
    </div>
  )
}
