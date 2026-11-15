import { useNavigate } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { MyRequestList } from '@/features/pre-surveys/SurveyRequestLists'
import { PendingReviewQuotations } from '@/features/quotations/PendingReviewQuotations'
import { useEscalatedAppointmentsQuery, useMySurveyRequestsQuery } from '@/hooks/useSurveyRequests'
import { ROUTES } from '@/routes/paths'

// Tab "Đã nhận": yêu cầu bạn đã nhận chăm sóc
export function OpsMySurveysPage() {
  const navigate = useNavigate()
  const my = useMySurveyRequestsQuery()
  const escalated = useEscalatedAppointmentsQuery()
  // Lịch quá hạn không kỹ thuật viên nào nhận, thuộc yêu cầu của bạn
  const needAssign = new Set(escalated.data?.filter((item) => item.ownedByMe).map((item) => item.surveyRequestId) ?? [])

  return (
    <div className="sv-list">
      <PageHeader
        title="Yêu cầu đã nhận"
        description={
          needAssign.size > 0 ? (
            <Badge tone="danger">{needAssign.size} yêu cầu của bạn cần phân công kỹ thuật viên</Badge>
          ) : undefined
        }
      />
      <QueryBoundary query={my}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState
              title="Bạn chưa nhận yêu cầu nào"
              action={
                <Button icon="visibility" size="sm" variant="info" onClick={() => navigate(ROUTES.ops.surveys)}>
                  Xem yêu cầu chờ nhận
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              <PendingReviewQuotations requests={rows} />
              <MyRequestList rows={rows} needAssign={needAssign} />
            </div>
          )
        }
      </QueryBoundary>
    </div>
  )
}
