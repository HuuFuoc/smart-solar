import { useState } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { FilterChips, type Chip } from '@/components/common/ui/chips'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState, Skeleton } from '@/components/common/ui/states'
import { CustomerRequestCard } from '@/features/pre-surveys/components/CustomerRequestCard'
import { CustomerRequestSection } from '@/features/pre-surveys/components/CustomerRequestSection'
import { customerRequestTodo } from '@/features/dispatch/dispatchDisplay'
import { useMyRequestsQuery } from '@/hooks/useBooking'
import { useMyDispatchesQuery } from '@/hooks/useDispatch'
import { ROUTES } from '@/routes/paths'
import type { CustomerSurveyRequestView } from '@/types/res/customerSurveyRequestsRes'
import type { CustomerDispatchView } from '@/types/res/dispatchRes'

type Row = { r: CustomerSurveyRequestView; d: CustomerDispatchView | undefined }
type FilterTab = 'all' | 'to-book' | 'dispatching' | 'confirmed'

export function CustomerRequestsPage() {
  const query = useMyRequestsQuery()
  const { dispatches, pending } = useMyDispatchesQuery(query.data)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const rows: Row[] = pending ? [] : (query.data ?? []).map((r) => ({ r, d: dispatches.get(r.surveyRequestId) }))

  // Phân loại 3 nhóm trạng thái chính
  const toBookRows = rows.filter(({ r, d }) => customerRequestTodo(r, d))
  const dispatchingRows = rows.filter(
    ({ r, d }) =>
      !customerRequestTodo(r, d) &&
      (d?.status === 'OPEN' ||
        (r.appointment && ['WAITING_FOR_TECHNICIAN', 'NEEDS_STAFF'].includes(r.appointment.acceptanceStatus))),
  )
  const confirmedRows = rows.filter(
    ({ r, d }) => !customerRequestTodo(r, d) && r.appointment?.acceptanceStatus === 'CONFIRMED',
  )
  const otherRows = rows.filter(
    (row) =>
      !toBookRows.includes(row) &&
      !dispatchingRows.includes(row) &&
      !confirmedRows.includes(row),
  )

  const toConfirmCount = rows.filter(({ d }) => d?.status === 'PROPOSAL_PENDING').length
  const toBookCount = toBookRows.length - toConfirmCount

  const filterChips: Chip<FilterTab>[] = [
    { value: 'all', label: 'Tất cả', count: rows.length },
    { value: 'to-book', label: 'Cần đặt giờ', count: toBookRows.length, attention: toBookRows.length > 0 },
    { value: 'dispatching', label: 'Đang xếp KTV', count: dispatchingRows.length },
    { value: 'confirmed', label: 'Đã có lịch', count: confirmedRows.length },
  ]

  return (
    <>
      <PageHeader
        title="Yêu cầu khảo sát"
        description={
          toConfirmCount > 0 ? (
            <Badge tone="danger">{toConfirmCount} đề xuất giờ khảo sát chờ bạn xác nhận</Badge>
          ) : toBookCount > 0 ? (
            <Badge tone="danger">{toBookCount} yêu cầu chưa đặt giờ khảo sát</Badge>
          ) : (
            'Theo dõi tiến độ khảo sát thực tế và đặt lịch hẹn với kỹ thuật viên SmartSolar.'
          )
        }
        actions={
          <ButtonLink
            to={ROUTES.customer.assessment}
            variant="primary"
            icon="add_location_alt"
            className="hidden h-9 rounded-lg px-3.5 text-sm font-medium shadow-xs sm:inline-flex"
          >
            Đánh giá địa điểm khác
          </ButtonLink>
        }
      />

      {/* Floating Action Button trên Mobile */}
      <div className="fixed bottom-5 right-5 z-20 sm:hidden">
        <ButtonLink
          to={ROUTES.customer.assessment}
          variant="primary"
          icon="add_location_alt"
          className="flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold shadow-pop"
        >
          + Đánh giá mới
        </ButtonLink>
      </div>

      <QueryBoundary query={query}>
        {(requests) =>
          pending ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-72" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              title="Chưa có yêu cầu khảo sát"
              description="Làm đánh giá sơ bộ cho địa điểm của bạn rồi gửi để đặt lịch khảo sát thực tế."
              action={
                <ButtonLink icon="play_arrow" to={ROUTES.customer.assessment} variant="primary">
                  Bắt đầu đánh giá sơ bộ
                </ButtonLink>
              }
            />
          ) : (
            <div className="space-y-7">
              {/* Bộ lọc theo trạng thái */}
              <FilterChips
                chips={filterChips}
                value={activeTab}
                onChange={setActiveTab}
                label="Lọc theo trạng thái yêu cầu"
              />

              {/* Nhóm 1: Cần đặt giờ (Đường kẻ trái 3px màu cam, tiêu đề ngắn, hướng dẫn 1 lần) */}
              {(activeTab === 'all' || activeTab === 'to-book') &&
                (toBookRows.length > 0 || activeTab === 'to-book') && (
                  <CustomerRequestSection
                    title="Cần đặt giờ"
                    count={toBookRows.length}
                    description="Chọn khung giờ thuận tiện để kỹ thuật viên đến đo đạc và tư vấn thực tế."
                    defaultOpen={true}
                    highlight={toBookRows.length > 0}
                    emptyMessage="Không có yêu cầu nào cần đặt giờ vào lúc này."
                  >
                    {toBookRows.map(({ r, d }) => (
                      <CustomerRequestCard
                        key={r.surveyRequestId}
                        request={r}
                        dispatch={d}
                        showStatusBadge={false}
                      />
                    ))}
                  </CustomerRequestSection>
                )}

              {/* Nhóm 2: Đang xếp kỹ thuật viên (Badge nhỏ xanh dương) */}
              {(activeTab === 'all' || activeTab === 'dispatching') &&
                (dispatchingRows.length > 0 || activeTab === 'dispatching') && (
                  <CustomerRequestSection
                    title="Đang xếp kỹ thuật viên"
                    count={dispatchingRows.length}
                    defaultOpen={dispatchingRows.length > 0}
                    emptyMessage="Hiện không có yêu cầu nào đang chờ điều phối."
                  >
                    {dispatchingRows.map(({ r, d }) => (
                      <CustomerRequestCard
                        key={r.surveyRequestId}
                        request={r}
                        dispatch={d}
                        showStatusBadge={true}
                      />
                    ))}
                  </CustomerRequestSection>
                )}

              {/* Nhóm 3: Đã có lịch khảo sát (Dòng inline ngày giờ + KTV) */}
              {(activeTab === 'all' || activeTab === 'confirmed') &&
                (confirmedRows.length > 0 || activeTab === 'confirmed') && (
                  <CustomerRequestSection
                    title="Đã có lịch khảo sát"
                    count={confirmedRows.length}
                    defaultOpen={confirmedRows.length > 0}
                    emptyMessage="Chưa có lịch hẹn nào được xác nhận."
                  >
                    {confirmedRows.map(({ r, d }) => (
                      <CustomerRequestCard
                        key={r.surveyRequestId}
                        request={r}
                        dispatch={d}
                        showStatusBadge={false}
                      />
                    ))}
                  </CustomerRequestSection>
                )}

              {/* Nhóm 4: Lịch sử hoàn thành / Đã đóng */}
              {activeTab === 'all' && otherRows.length > 0 && (
                <CustomerRequestSection
                  title="Lịch sử yêu cầu"
                  count={otherRows.length}
                  defaultOpen={false}
                >
                  {otherRows.map(({ r, d }) => (
                    <CustomerRequestCard
                      key={r.surveyRequestId}
                      request={r}
                      dispatch={d}
                      showStatusBadge={true}
                    />
                  ))}
                </CustomerRequestSection>
              )}
            </div>
          )
        }
      </QueryBoundary>
    </>
  )
}
