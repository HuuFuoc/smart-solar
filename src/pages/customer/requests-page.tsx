import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { ListRow } from '@/components/common/ui/list-row'
import { PageHeader } from '@/components/common/ui/page-header'
import { PagedList } from '@/components/common/ui/pagination'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState, Skeleton } from '@/components/common/ui/states'
import { customerRequestProgress, customerRequestTodo, isActiveDispatch } from '@/features/dispatch/dispatchDisplay'
import { formatRelative, shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { formatAppointment, formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useMyRequestsQuery } from '@/hooks/useBooking'
import { useMyDispatchesQuery } from '@/hooks/useDispatch'
import { ROUTES, withId } from '@/routes/paths'
import type { CustomerSurveyRequestView } from '@/types/res/customerSurveyRequestsRes'
import type { CustomerDispatchView } from '@/types/res/dispatchRes'

type Row = { r: CustomerSurveyRequestView; d: CustomerDispatchView | undefined }

// Yêu cầu khảo sát của khách. Việc của khách (đặt giờ, trả lời giờ đề xuất) lên đầu, rồi lịch sắp tới
// hoặc đang chờ Smart Solar xếp kỹ thuật viên, rồi còn lại
function rank({ r, d }: Row) {
  if (customerRequestTodo(r, d)) return 0
  if (r.appointment || isActiveDispatch(d?.status)) return 1
  return 2
}

function byNextAction(a: Row, b: Row) {
  const diff = rank(a) - rank(b)
  if (diff !== 0) return diff
  if (a.r.appointment && b.r.appointment)
    return new Date(a.r.appointment.startsAt).getTime() - new Date(b.r.appointment.startsAt).getTime()
  return new Date(b.r.submittedAt).getTime() - new Date(a.r.submittedAt).getTime()
}

export function CustomerRequestsPage() {
  const query = useMyRequestsQuery()
  const { dispatches, pending } = useMyDispatchesQuery(query.data)
  const rows: Row[] = pending ? [] : (query.data ?? []).map((r) => ({ r, d: dispatches.get(r.surveyRequestId) }))
  const toConfirm = rows.filter(({ d }) => d?.status === 'PROPOSAL_PENDING').length
  const toBook = rows.filter(({ r, d }) => customerRequestTodo(r, d)).length - toConfirm

  return (
    <>
      <PageHeader
        title="Yêu cầu khảo sát"
        description={
          toConfirm > 0 ? (
            <Badge tone="danger">{toConfirm} đề xuất giờ khảo sát chờ bạn xác nhận</Badge>
          ) : toBook > 0 ? (
            <Badge tone="danger">{toBook} yêu cầu chưa đặt giờ khảo sát</Badge>
          ) : undefined
        }
        actions={
          <ButtonLink to={ROUTES.customer.assessment} variant="soft" icon="add">
            Đánh giá địa điểm khác
          </ButtonLink>
        }
      />
      <QueryBoundary query={query}>
        {(requests) =>
          pending ? (
            <Skeleton className="h-40" />
          ) : requests.length === 0 ? (
            <EmptyState
              title="Chưa có yêu cầu khảo sát"
              description="Làm đánh giá sơ bộ cho địa điểm của bạn rồi gửi để đặt lịch khảo sát."
              action={
                <ButtonLink icon="play_arrow" to={ROUTES.customer.assessment} variant="primary">
                  Bắt đầu đánh giá sơ bộ
                </ButtonLink>
              }
            />
          ) : (
            <PagedList items={[...rows].sort(byNextAction)} noun="yêu cầu">
              {(page) => (
                <ul className="divide-y divide-line">
                  {page.map(({ r, d }) => {
                    const progress = customerRequestProgress(r, d)
                    const a = r.appointment
                    const live = d?.status === 'PROPOSAL_PENDING' ? d.liveProposal : null
                    return (
                      <ListRow key={r.surveyRequestId}>
                        <div className="grid gap-x-8 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                          <div className="min-w-0">
                            <h2 className="text-title font-semibold">{r.propertyName || 'Công trình chưa đặt tên'}</h2>
                            <p className="mt-1 text-body text-fg-2">
                              Gửi {formatRelative(r.submittedAt)}, mã{' '}
                              <span className="tnum">{shortCode(r.surveyRequestId)}</span>
                            </p>
                            {a && (
                              <p className="mt-2 text-body text-fg">
                                Khảo sát {formatAppointment(a.startsAt, a.endsAt)}
                                {a.assignedTechnicianName && (
                                  <span className="text-fg-2">, kỹ thuật viên {a.assignedTechnicianName}</span>
                                )}
                              </p>
                            )}
                            {live && (
                              <p className="mt-2 text-body text-fg">
                                Đề xuất khảo sát {formatAppointment(live.startsAt, live.endsAt)}, trả lời trước{' '}
                                {formatMoment(live.expiresAt)}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 sm:flex-col sm:items-end">
                            <Badge tone={progress.tone}>{progress.label}</Badge>
                            <ButtonLink
                              icon="event"
                              to={withId(ROUTES.customer.request, r.surveyRequestId)}
                              size="sm"
                              variant="soft"
                            >
                              {live
                                ? 'Xem giờ đề xuất'
                                : customerRequestTodo(r, d)
                                  ? 'Đặt giờ khảo sát'
                                  : 'Xem yêu cầu'}
                            </ButtonLink>
                          </div>
                        </div>
                      </ListRow>
                    )
                  })}
                </ul>
              )}
            </PagedList>
          )
        }
      </QueryBoundary>
    </>
  )
}
