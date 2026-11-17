import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { QuotationNeededList } from '@/features/quotations/QuotationNeededList'
import { useMySurveyRequestsQuery } from '@/hooks/useSurveyRequests'

// Tab "Báo giá": yêu cầu của tôi đã khảo sát xong và còn việc báo giá
export function OpsQuotationsPage() {
  const my = useMySurveyRequestsQuery()
  return (
    <div className="sv-list">
      <PageHeader title="Báo giá cần làm" />
      <QueryBoundary query={my}>{(rows) => <QuotationNeededList rows={rows} />}</QueryBoundary>
    </div>
  )
}
