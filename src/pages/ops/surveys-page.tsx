import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { isOverdue } from '@/features/pre-surveys/preSurveyDisplay'
import { PendingRequestList } from '@/features/pre-surveys/SurveyRequestLists'
import { useClaimSurveyRequestMutation, usePendingSurveyRequestsQuery } from '@/hooks/useSurveyRequests'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import type { PendingSurveyRequestItem } from '@/types/res/surveyRequestsRes'

// Tab "Chờ nhận": hàng chờ chung chưa ai nhận
export function OpsSurveysPage() {
  const navigate = useNavigate()
  const pending = usePendingSurveyRequestsQuery()
  const claim = useClaimSurveyRequestMutation()
  const overdue = pending.data?.filter((r) => isOverdue(r.submittedAt)).length ?? 0

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
    <div className="sv-list">
      <PageHeader
        title="Yêu cầu chờ nhận"
        description={
          overdue > 0 ? <Badge tone="danger">{overdue} yêu cầu chờ hơn 1 ngày chưa ai nhận</Badge> : undefined
        }
      />
      <QueryBoundary query={pending}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState title="Chưa có yêu cầu nào chờ nhận" />
          ) : (
            <PendingRequestList
              rows={rows}
              claimingId={claim.isPending ? (claim.variables ?? null) : null}
              onClaim={onClaim}
            />
          )
        }
      </QueryBoundary>
    </div>
  )
}
