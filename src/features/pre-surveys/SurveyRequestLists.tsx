import { useMemo, useState } from 'react'
import { Badge, type Tone } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { Field, SearchInput, Select } from '@/components/common/ui/field'
import { ListCell, ListCells, ListHead, ListRow } from '@/components/common/ui/list-row'
import { PagedList } from '@/components/common/ui/pagination'
import { Segmented } from '@/components/common/ui/segmented'
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
import { compareSchedule } from '@/features/scheduling/scheduleOrder'
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
export function Property({
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
export function When({ iso }: { iso: string }) {
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
      <span className="block font-medium text-fg">{startsLabel(appointment.startsAt, today)}</span>
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

type ThreeStatusKey = 'unscheduled' | 'dispatching' | 'confirmed' | 'finished'

type MyRow = {
  row: MySurveyRequestItem
  state: RowState
  groupKey: ThreeStatusKey
}

/** Nhóm của một yêu cầu: đang xếp người, khách chưa đặt giờ, đã có kỹ thuật viên nhận, đã xong hoặc đã đóng */
function classifyThreeStatus(r: MySurveyRequestItem, mustAssign: boolean): { key: ThreeStatusKey; state: RowState } {
  if (isCompletedStatus(r.status) || r.appointment?.status === 'COMPLETED')
    return { key: 'finished', state: { rank: 4, label: 'Đã khảo sát', tone: 'neutral', hint: null } }
  if (isClosedRequest(r.status))
    return { key: 'finished', state: { rank: 5, ...surveyStatusMeta(r.status), hint: null } }

  const confirmed =
    isScheduledStatus(r.status) ||
    Boolean(r.appointment?.technicianUserId) ||
    r.appointment?.status === 'ACCEPTED' ||
    r.appointment?.status === 'ASSIGNED'
  if (confirmed) {
    if (r.appointment?.isOverdue)
      return {
        key: 'confirmed',
        state: { rank: 0, label: 'Quá giờ, chưa khảo sát', tone: 'danger', hint: 'Hẹn lại giờ khác với khách.' },
      }
    return { key: 'confirmed', state: { rank: 1, label: 'Kỹ thuật viên đã nhận lịch', tone: 'ok', hint: null } }
  }

  // Khách đã chọn giờ nhưng chưa kỹ thuật viên nào nhận
  if (appointmentStart(r) || r.appointment || mustAssign) {
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

  return { key: 'unscheduled', state: { rank: 3, label: 'Khách chưa đặt giờ', tone: 'info', hint: null } }
}

// Việc cần làm lên đầu, rồi theo giờ hẹn như mọi danh sách lịch (ngày mới nhất trước, trong ngày giờ sớm trước);
// chưa có giờ hẹn thì yêu cầu bạn nhận gần nhất trước
function byNextAction(a: MyRow, b: MyRow) {
  if (a.state.rank !== b.state.rank) return a.state.rank - b.state.rank
  return (
    compareSchedule(appointmentStart(a.row), appointmentStart(b.row)) ||
    new Date(b.row.assignedAt ?? 0).getTime() - new Date(a.row.assignedAt ?? 0).getTime()
  )
}

// Nhóm cần làm trước đứng trước; đã xong, đã đóng ở cuối
const THREE_STATUS_TABLES: { key: ThreeStatusKey; title: string }[] = [
  { key: 'dispatching', title: 'Đang xếp kỹ thuật viên' },
  { key: 'unscheduled', title: 'Khách chưa đặt giờ' },
  { key: 'confirmed', title: 'Kỹ thuật viên đã nhận lịch' },
  { key: 'finished', title: 'Đã khảo sát, đã đóng' },
]

/** Bỏ dấu, chữ thường: tìm "dat lich" ra "Đặt lịch" */
const fold = (text: string | null | undefined) =>
  (text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()

function MyRequestRows({ items, today }: { items: MyRow[]; today: string }) {
  return (
    <>
      <ListHead
        columns={COLUMNS}
        labels={['Công trình', 'Khách hàng', 'Thời gian nhận', 'Lịch hẹn khảo sát', 'Trạng thái', 'Thao tác']}
      />
      <ul className="divide-y divide-line">
        {items.map(({ row: r, state }) => {
          const technician = r.appointment?.technicianName
          return (
            <ListRow key={r.surveyRequestId}>
              <ListCells columns={COLUMNS}>
                <Property name={r.propertyName} row={r} />
                <ListCell label="Trạng thái" wide className="lg:order-5">
                  <Badge tone={state.tone}>{state.label}</Badge>
                  {state.hint && <p className="mt-0.5 text-meta text-fg-2">{state.hint}</p>}
                </ListCell>
                <ListCell label="Khách hàng" className="lg:order-2">
                  {r.customerName || '—'}
                </ListCell>
                <ListCell label="Thời gian nhận" className="lg:order-3">
                  {r.assignedAt ? <When iso={r.assignedAt} /> : '—'}
                </ListCell>
                <ListCell label="Lịch hẹn khảo sát" className="lg:order-4">
                  {appointmentStart(r) ? (
                    <div className="space-y-0.5">
                      <span className="block font-medium text-fg">{startsLabel(appointmentStart(r), today)}</span>
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
type AgeFilter = 'all' | 'old' | 'recent'
const AGE_FILTERS: { value: AgeFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'old', label: 'Quá 7 ngày' },
  { value: 'recent', label: 'Gần đây' },
]
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function SvStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="sv-stat">
      <div className="min-w-0">
        <p className="text-body text-fg-2">{label}</p>
        <p className="tnum text-figure font-semibold">{value}</p>
      </div>
    </div>
  )
}

export function MyRequestList({ rows, needAssign }: { rows: MySurveyRequestItem[]; needAssign: Set<string> }) {
  const today = todayVn()
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [picked, setPicked] = useState<ThreeStatusKey | null>(null)
  const [age, setAge] = useState<AgeFilter>('all')
  const [now] = useState(() => Date.now())
  const [keyword, setKeyword] = useState('')

  const needle = fold(keyword.trim())
  const tables = useMemo(() => {
    const map: Record<ThreeStatusKey, MyRow[]> = { unscheduled: [], dispatching: [], confirmed: [], finished: [] }
    for (const row of rows) {
      if (!matchesVnDate(vnDate(row.assignedAt || row.submittedAt), dateFilter, today)) continue
      if (
        needle &&
        !fold([row.propertyName, row.customerName, row.communeName, row.ward, row.district].join(' ')).includes(needle)
      )
        continue
      const { key, state } = classifyThreeStatus(row, needAssign.has(row.surveyRequestId))
      map[key].push({ row, state, groupKey: key })
    }
    return THREE_STATUS_TABLES.map((t) => ({ ...t, items: map[t.key].sort(byNextAction) }))
  }, [rows, needAssign, dateFilter, needle, today])

  // Số tổng quan tính trên mọi yêu cầu của bạn, không theo bộ lọc
  const overview = useMemo(() => {
    const out = { total: rows.length, unscheduled: 0, booked: 0, done: 0 }
    for (const row of rows) {
      const { key } = classifyThreeStatus(row, needAssign.has(row.surveyRequestId))
      if (key === 'unscheduled') out.unscheduled += 1
      else if (key === 'finished') out.done += 1
      else out.booked += 1
    }
    return out
  }, [rows, needAssign])

  // Mở sẵn nhóm đầu tiên còn việc
  const active = picked ?? tables.find((t) => t.items.length > 0)?.key ?? 'confirmed'
  const current = tables.find((t) => t.key === active) ?? tables[0]!
  const isOld = (r: MySurveyRequestItem) => now - new Date(r.assignedAt || r.submittedAt).getTime() > WEEK_MS
  const byAge = (kind: AgeFilter) =>
    current.items.filter(({ row }) => kind === 'all' || (kind === 'old') === isOld(row))
  const items = byAge(age)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SvStat label="Tổng yêu cầu của tôi" value={overview.total} />
        <SvStat label="Khách chưa đặt giờ" value={overview.unscheduled} />
        <SvStat label="Đã có lịch hẹn" value={overview.booked} />
        <SvStat label="Đã khảo sát, đã đóng" value={overview.done} />
      </div>
      <div role="search" className="sv-card flex flex-wrap items-end gap-4">
        <label className="min-w-0 flex-1 basis-72">
          <span className="sr-only">Tìm yêu cầu</span>
          <SearchInput
            name="my-requests-search"
            placeholder="Tìm theo tên công trình, khách hàng, phường, xã..."
            maxLength={100}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onClear={() => setKeyword('')}
          />
        </label>
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
      </div>
      <FilterChips
        label="Tình hình yêu cầu"
        value={current.key}
        onChange={(key) => {
          setPicked(key)
          setAge('all')
        }}
        chips={tables.map((t) => ({ value: t.key, label: t.title, count: t.items.length }))}
      />
      <section className="sv-card sv-flush">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 text-meta text-fg-2">
          <span>Lọc theo thời gian nhận</span>
          <Segmented
            label="Lọc theo thời gian nhận"
            size="sm"
            value={age}
            onChange={setAge}
            options={AGE_FILTERS.map((o) => ({ value: o.value, label: `${o.label} (${byAge(o.value).length})` }))}
          />
        </div>
        <div className="px-4 pb-2">
          {items.length === 0 ? (
            <p className="py-3 text-meta text-fg-2">Không có yêu cầu nào.</p>
          ) : (
            <PagedList key={`${current.key}-${age}`} items={items} noun="yêu cầu" keepScroll>
              {(pageItems) => <MyRequestRows items={pageItems} today={today} />}
            </PagedList>
          )}
        </div>
      </section>
    </div>
  )
}
