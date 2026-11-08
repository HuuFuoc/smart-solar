import { Badge, type Tone } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
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

/** `needAssign`: id các yêu cầu có lịch quá hạn cần sales phân công */
export function MyRequestList({ rows, needAssign }: { rows: MySurveyRequestItem[]; needAssign: Set<string> }) {
  const today = todayVn()
  const items = rows
    .map((row) => ({ row, state: rowState(row, needAssign.has(row.surveyRequestId)) }))
    .sort(byNextAction)
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
                {/* Điện thoại theo thứ tự DOM: tình hình (việc phải làm) ngay dưới tên công trình; từ lg về cột 5 */}
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
  )
}
