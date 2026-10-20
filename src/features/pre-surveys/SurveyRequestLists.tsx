import type { ReactNode } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { ListRow } from '@/components/common/ui/list-row'
import { Facts } from '@/features/pre-surveys/Facts'
import {
  formatArea,
  formatDateTime,
  formatRelative,
  isOverdue,
  needsScheduling,
  surfaceTypeLabel,
  surveyStatusMeta,
} from '@/features/pre-surveys/preSurveyDisplay'
import { ROUTES, withId } from '@/routes/paths'
import type { MySurveyRequestItem, PendingSurveyRequestItem, SurveyRequestStatus } from '@/types/res/surveyRequestsRes'

// Hàng chờ yêu cầu khảo sát của sales, dạng danh sách thay vì bảng

function RequestRow({ main, side }: { main: ReactNode; side: ReactNode }) {
  return (
    <ListRow>
      <div className="grid gap-x-8 gap-y-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">{main}</div>
        <div className="flex flex-wrap items-center gap-3 lg:flex-col lg:items-end">{side}</div>
      </div>
    </ListRow>
  )
}

// h2 để đúng thứ tự tiêu đề sau h1 của trang
function Heading({ name }: { name: string | null }) {
  return <h2 className="text-title font-semibold">{name || 'Công trình chưa đặt tên'}</h2>
}

function Area({ district, province }: { district: string | null; province: string | null }) {
  const text = [district, province].filter(Boolean).join(', ')
  return text ? <p className="mt-1 text-body text-fg-2">{text}</p> : null
}

function When({ iso, prefix }: { iso: string; prefix?: string }) {
  return (
    <time dateTime={iso} title={formatDateTime(iso)}>
      {prefix ? `${prefix} ` : ''}
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
    <ul className="divide-y divide-line">
      {[...rows].sort(oldestFirst).map((r) => {
        const overdue = isOverdue(r.submittedAt)
        return (
          <RequestRow
            key={r.surveyRequestId}
            main={
              <>
                <Heading name={r.propertyName} />
                <Area district={r.district} province={r.province} />
                <Facts
                  className="mt-3"
                  items={[
                    { k: 'Khách hàng', v: r.customerName || '—' },
                    { k: 'Bề mặt', v: surfaceTypeLabel(r.installationSurfaceType) },
                    { k: 'Dùng được / tổng', v: `${formatArea(r.usableAreaM2)} / ${formatArea(r.totalAreaM2)}` },
                  ]}
                />
              </>
            }
            side={
              <>
                <span className="flex flex-wrap items-center gap-2 text-body text-fg-2">
                  <When iso={r.submittedAt} prefix="Gửi" />
                  {overdue && <Badge tone="danger">Chờ hơn 1 ngày</Badge>}
                </span>
                <Button size="sm" variant="soft" disabled={claimingId !== null} onClick={() => onClaim(r)}>
                  {claimingId === r.surveyRequestId ? 'Đang nhận…' : 'Nhận yêu cầu'}
                </Button>
              </>
            }
          />
        )
      })}
    </ul>
  )
}

// Thứ tự: đã nhận / đang xem xét, rồi đã hẹn, rồi còn lại. Cùng nhóm thì mới nhận lên trước
const STATUS_ORDER: Record<SurveyRequestStatus, number> = { 2: 0, 3: 1, 4: 2, 1: 3, 5: 4, 6: 5 }

function byNextAction(a: MySurveyRequestItem, b: MySurveyRequestItem) {
  const rank = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
  if (rank !== 0) return rank
  return new Date(b.assignedAt ?? 0).getTime() - new Date(a.assignedAt ?? 0).getTime()
}

// Gợi ý việc tiếp theo cho sales theo trạng thái
function nextStep(r: MySurveyRequestItem) {
  if (needsScheduling(r.status)) return 'Mở yêu cầu để phân công kỹ thuật viên cho giờ khách đặt.'
  if (r.status === 4 && r.scheduledAt) return `Khảo sát lúc ${formatDateTime(r.scheduledAt)}.`
  return null
}

export function MyRequestList({ rows }: { rows: MySurveyRequestItem[] }) {
  return (
    <ul className="divide-y divide-line">
      {[...rows].sort(byNextAction).map((r) => {
        const status = surveyStatusMeta(r.status)
        const hint = nextStep(r)
        return (
          <RequestRow
            key={r.surveyRequestId}
            main={
              <>
                <Heading name={r.propertyName} />
                <Area district={r.district} province={r.province} />
                <Facts
                  className="mt-3"
                  items={[
                    { k: 'Khách hàng', v: r.customerName || '—' },
                    { k: 'Bạn nhận', v: r.assignedAt ? <When iso={r.assignedAt} /> : '—' },
                    {
                      k: 'Hẹn khảo sát',
                      v: r.scheduledAt ? (
                        formatDateTime(r.scheduledAt)
                      ) : needsScheduling(r.status) ? (
                        <Badge tone="danger">Chưa phân công</Badge>
                      ) : (
                        '—'
                      ),
                    },
                  ]}
                />
                {hint && <p className="mt-3 text-body text-fg-2">{hint}</p>}
              </>
            }
            side={
              <>
                <Badge tone={status.tone}>{status.label}</Badge>
                <ButtonLink to={withId(ROUTES.ops.survey, r.surveyRequestId)} size="sm" variant="soft">
                  Mở yêu cầu
                </ButtonLink>
              </>
            }
          />
        )
      })}
    </ul>
  )
}
