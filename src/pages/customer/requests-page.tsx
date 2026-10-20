import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { ListRow } from '@/components/common/ui/list-row'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { formatRelative, shortCode } from '@/features/pre-surveys/components/preSurveyDisplay'
import { canBook, customerProgress, formatAppointment } from '@/features/scheduling/components/schedulingDisplay'
import { useMyRequestsQuery } from '@/hooks/useBooking'
import { ROUTES, withId } from '@/routes/paths'
import type { CustomerSurveyRequestView } from '@/types/res/customerSurveyRequestsRes'

/*
  Các yêu cầu khảo sát của khách (GET /api/customers/me/survey-requests). Việc của khách đứng đầu: yêu cầu chưa đặt giờ,
  rồi lịch sắp tới theo thứ tự thời gian, cuối cùng là phần còn lại (mới gửi lên trước).
*/
function rank(r: CustomerSurveyRequestView) {
  if (canBook(r)) return 0
  if (r.appointment) return 1
  return 2
}

function byNextAction(a: CustomerSurveyRequestView, b: CustomerSurveyRequestView) {
  const diff = rank(a) - rank(b)
  if (diff !== 0) return diff
  if (a.appointment && b.appointment) return new Date(a.appointment.startsAt).getTime() - new Date(b.appointment.startsAt).getTime()
  return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
}

export function CustomerRequestsPage() {
  const query = useMyRequestsQuery()
  const toBook = query.data?.filter(canBook).length ?? 0

  return (
    <>
      <PageHeader
        title="Yêu cầu khảo sát"
        description={
          toBook > 0 ? (
            <Badge tone="danger" icon="event">
              {toBook} yêu cầu chưa đặt giờ khảo sát
            </Badge>
          ) : undefined
        }
        actions={
          <ButtonLink to={ROUTES.customer.assessment} icon="add">
            Đánh giá địa điểm khác
          </ButtonLink>
        }
      />
      <QueryBoundary query={query}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState
              title="Chưa có yêu cầu khảo sát"
              description="Làm đánh giá sơ bộ cho địa điểm của bạn rồi gửi để đặt lịch khảo sát."
              action={
                <ButtonLink to={ROUTES.customer.assessment} variant="primary">
                  Bắt đầu đánh giá sơ bộ
                </ButtonLink>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {[...rows].sort(byNextAction).map((r) => {
                const progress = customerProgress(r)
                const a = r.appointment
                return (
                  <ListRow key={r.surveyRequestId}>
                    <div className="grid gap-x-8 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                      <div className="min-w-0">
                        <h2 className="text-title font-semibold">{r.propertyName || 'Công trình chưa đặt tên'}</h2>
                        <p className="mt-1 text-body text-fg-2">
                          Gửi {formatRelative(r.submittedAt)}, mã <span className="tnum">{shortCode(r.surveyRequestId)}</span>
                        </p>
                        {a && (
                          <p className="mt-2 text-body text-fg">
                            Khảo sát {formatAppointment(a.startsAt, a.endsAt)}
                            {a.assignedTechnicianName && <span className="text-fg-2">, kỹ thuật viên {a.assignedTechnicianName}</span>}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 sm:flex-col sm:items-end">
                        <Badge tone={progress.tone}>{progress.label}</Badge>
                        <ButtonLink to={withId(ROUTES.customer.request, r.surveyRequestId)} size="sm" variant="soft">
                          {canBook(r) ? 'Đặt giờ khảo sát' : 'Xem yêu cầu'}
                        </ButtonLink>
                      </div>
                    </div>
                  </ListRow>
                )
              })}
            </ul>
          )
        }
      </QueryBoundary>
    </>
  )
}
