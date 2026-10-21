import { Badge, type Tone } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { ListCell, ListCells, ListHead, ListRow } from '@/components/common/ui/list-row'
import {
  formatArea,
  formatDateTime,
  formatRelative,
  isOverdue,
  needsScheduling,
  surfaceTypeLabel,
  surveyStatusMeta,
} from '@/features/pre-surveys/preSurveyDisplay'
import { formatTime, relativeDay, todayVn, vnDate } from '@/features/scheduling/schedulingDisplay'
import { ROUTES, withId } from '@/routes/paths'
import type { MySurveyRequestItem, PendingSurveyRequestItem } from '@/types/res/surveyRequestsRes'

// Hàng chờ yêu cầu khảo sát của sales: mỗi yêu cầu một dòng, thông tin trải ngang theo cột

/** Hai tab dùng chung một bộ cột để chuyển tab không bị nhảy cột */
const COLUMNS = 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.6fr)_9rem]'

// Tên và khu vực công trình. h2 để đúng thứ tự tiêu đề sau h1 của trang
function Property({
  name,
  district,
  province,
}: Pick<MySurveyRequestItem, 'district' | 'province'> & { name: string | null }) {
  const area = [district, province].filter(Boolean).join(', ')
  return (
    <ListCell wide>
      <h2 className="font-semibold">{name || 'Công trình chưa đặt tên'}</h2>
      {area && <p className="mt-0.5 text-meta text-fg-2">{area}</p>}
    </ListCell>
  )
}

function When({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} title={formatDateTime(iso)}>
      {formatRelative(iso)}
    </time>
  )
}

/** Chờ lâu nhất lên đầu */
function oldestFirst(a: PendingSurveyRequestItem, b: PendingSurveyRequestItem) {
  return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
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
  return (
    <>
      <ListHead
        columns={COLUMNS}
        labels={['Công trình', 'Khách hàng', 'Bề mặt', 'Dùng được / tổng', 'Khách gửi', '']}
      />
      <ul className="divide-y divide-line">
        {[...rows].sort(oldestFirst).map((r) => (
          <ListRow key={r.surveyRequestId}>
            <ListCells columns={COLUMNS}>
              <Property name={r.propertyName} district={r.district} province={r.province} />
              <ListCell label="Khách hàng">{r.customerName || '—'}</ListCell>
              <ListCell label="Bề mặt">{surfaceTypeLabel(r.installationSurfaceType)}</ListCell>
              <ListCell label="Dùng được / tổng">
                <span className="tnum">
                  {formatArea(r.usableAreaM2)} / {formatArea(r.totalAreaM2)}
                </span>
              </ListCell>
              <ListCell label="Khách gửi">
                <span className="flex flex-wrap items-center gap-2">
                  <When iso={r.submittedAt} />
                  {isOverdue(r.submittedAt) && <Badge tone="danger">Chờ hơn 1 ngày</Badge>}
                </span>
              </ListCell>
              <ListCell wide className="lg:justify-self-end">
                <Button size="sm" variant="soft" disabled={claimingId !== null} onClick={() => onClaim(r)}>
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

// Tình hình một yêu cầu. Danh sách chỉ có trạng thái và giờ hẹn đã có kỹ thuật viên nhận,
// chưa biết khách đã đặt giờ hay chưa, nên các yêu cầu đó chỉ ghi "chưa có kỹ thuật viên"
function rowState(r: MySurveyRequestItem, mustAssign: boolean, today: string): RowState {
  if (mustAssign)
    return { rank: 0, label: 'Cần phân công', tone: 'danger', hint: 'Lịch quá hạn mà không kỹ thuật viên nào nhận.' }
  if (r.status === 4 && r.scheduledAt) {
    if (vnDate(r.scheduledAt) < today)
      return { rank: 3, label: 'Đã qua giờ hẹn', tone: 'warn', hint: 'Chưa có kết quả khảo sát trên hệ thống.' }
    return { rank: 1, label: 'Đã hẹn khảo sát', tone: 'ok', hint: null }
  }
  if (needsScheduling(r.status)) return { rank: 2, label: 'Chưa có kỹ thuật viên', tone: 'info', hint: null }
  return { rank: 4, ...surveyStatusMeta(r.status), hint: null }
}

type MyRow = { row: MySurveyRequestItem; state: RowState }

// Cần làm lên đầu, rồi lịch sắp tới (gần nhất trước), rồi đang chờ, cuối cùng là lịch đã qua
function byNextAction(a: MyRow, b: MyRow) {
  if (a.state.rank !== b.state.rank) return a.state.rank - b.state.rank
  if (a.state.rank === 1) return (a.row.scheduledAt ?? '').localeCompare(b.row.scheduledAt ?? '')
  return new Date(b.row.assignedAt ?? 0).getTime() - new Date(a.row.assignedAt ?? 0).getTime()
}

/** `needAssign`: id các yêu cầu có lịch quá hạn cần sales phân công */
export function MyRequestList({ rows, needAssign }: { rows: MySurveyRequestItem[]; needAssign: Set<string> }) {
  const today = todayVn()
  const items = rows
    .map((row) => ({ row, state: rowState(row, needAssign.has(row.surveyRequestId), today) }))
    .sort(byNextAction)
  return (
    <>
      <ListHead columns={COLUMNS} labels={['Công trình', 'Khách hàng', 'Bạn nhận', 'Hẹn khảo sát', 'Tình hình', '']} />
      <ul className="divide-y divide-line">
        {items.map(({ row: r, state }) => (
          <ListRow key={r.surveyRequestId}>
            <ListCells columns={COLUMNS}>
              <Property name={r.propertyName} district={r.district} province={r.province} />
              <ListCell label="Khách hàng">{r.customerName || '—'}</ListCell>
              <ListCell label="Bạn nhận">{r.assignedAt ? <When iso={r.assignedAt} /> : '—'}</ListCell>
              <ListCell label="Hẹn khảo sát">
                {/* "Ngày mai, 09:00" */}
                {r.scheduledAt
                  ? `${relativeDay(vnDate(r.scheduledAt), today)}, ${formatTime(r.scheduledAt)}`
                  : 'Chưa có'}
              </ListCell>
              <ListCell label="Tình hình">
                <Badge tone={state.tone}>{state.label}</Badge>
                {state.hint && <p className="mt-1 text-meta text-fg-2">{state.hint}</p>}
              </ListCell>
              <ListCell wide className="lg:justify-self-end">
                <ButtonLink to={withId(ROUTES.ops.survey, r.surveyRequestId)} size="sm" variant="soft">
                  Mở yêu cầu
                </ButtonLink>
              </ListCell>
            </ListCells>
          </ListRow>
        ))}
      </ul>
    </>
  )
}
