import { matchPath, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { isOverdue, needsScheduling } from '@/features/pre-surveys/preSurveyDisplay'
import { MyRequestList, PendingRequestList } from '@/features/pre-surveys/SurveyRequestLists'
import {
  useClaimSurveyRequestMutation,
  useMySurveyRequestsQuery,
  usePendingSurveyRequestsQuery,
} from '@/hooks/useSurveyRequests'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import type { PendingSurveyRequestItem } from '@/types/res/surveyRequestsRes'

type Tab = 'pending' | 'my'

/* Yêu cầu khảo sát sinh ra khi khách hàng gửi bản đánh giá sơ bộ. Sales nhận yêu cầu rồi xem chi tiết để liên hệ. */
export function OpsSurveysPage() {
  const navigate = useNavigate()
  // Tab theo đường dẫn (/ops/surveys và /ops/surveys/mine) để menu bên trái đánh dấu đúng mục.
  const { pathname } = useLocation()
  // matchPath (không so chuỗi): "/ops/surveys/mine/" có dấu "/" cuối vẫn là tab "Của tôi", khớp với menu.
  const tab: Tab = matchPath(ROUTES.ops.surveysMine, pathname) ? 'my' : 'pending'
  const setTab = (next: Tab) => navigate(next === 'my' ? ROUTES.ops.surveysMine : ROUTES.ops.surveys)
  const pending = usePendingSurveyRequestsQuery()
  const my = useMySurveyRequestsQuery()
  const claim = useClaimSurveyRequestMutation()
  // Việc đang chờ, hiện ngay dưới tiêu đề để không phải mở từng tab mới biết.
  const overdue = pending.data?.filter((r) => isOverdue(r.submittedAt)).length ?? 0
  const unscheduled = my.data?.filter((r) => needsScheduling(r.status)).length ?? 0

  async function onClaim(row: PendingSurveyRequestItem) {
    try {
      await claim.mutateAsync(row.surveyRequestId)
      toast.success(`Đã nhận yêu cầu của ${row.customerName || 'khách hàng'}.`)
      navigate(withId(ROUTES.ops.survey, row.surveyRequestId))
    } catch (error) {
      // Người khác nhận trước: hook đã làm mới danh sách, dòng đó sẽ biến mất.
      toast.error(errorMessage(error))
    }
  }

  return (
    <>
      <PageHeader
        title="Yêu cầu khảo sát"
        description={
          overdue || unscheduled ? (
            <span className="flex flex-wrap gap-2">
              {overdue > 0 && (
                <Badge tone="danger" icon="schedule">
                  {overdue} yêu cầu chờ hơn 1 ngày chưa ai nhận
                </Badge>
              )}
              {unscheduled > 0 && (
                <Badge tone="danger" icon="event_busy">
                  {unscheduled} yêu cầu của bạn chưa phân công kỹ thuật viên
                </Badge>
              )}
            </span>
          ) : undefined
        }
      />

      <FilterChips
        label="Danh sách yêu cầu"
        className="mb-4"
        value={tab}
        onChange={setTab}
        // Số trên tab chỉ để tham khảo (xám): số đỏ báo việc chờ đã nằm ở menu bên trái, cùng màn hình, không nói hai lần.
        chips={[
          { value: 'pending', label: 'Chờ nhận', count: pending.data?.length },
          { value: 'my', label: 'Của tôi', count: my.data?.length },
        ]}
      />

      {tab === 'pending' ? (
        <QueryBoundary query={pending}>
          {(rows) =>
            rows.length === 0 ? (
              <EmptyState title="Chưa có yêu cầu nào chờ nhận" description="Yêu cầu mới xuất hiện ở đây khi khách hàng gửi bản đánh giá sơ bộ." />
            ) : (
              <PendingRequestList rows={rows} claimingId={claim.isPending ? (claim.variables ?? null) : null} onClaim={onClaim} />
            )
          }
        </QueryBoundary>
      ) : (
        <QueryBoundary query={my}>
          {(rows) =>
            rows.length === 0 ? (
              <EmptyState
                title="Bạn chưa nhận yêu cầu nào"
                action={
                  <Button size="sm" variant="soft" onClick={() => setTab('pending')}>
                    Xem yêu cầu chờ nhận
                  </Button>
                }
              />
            ) : (
              <MyRequestList rows={rows} />
            )
          }
        </QueryBoundary>
      )}
    </>
  )
}
