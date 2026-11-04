import { Panel, PanelHeader } from '@/components/common/ui/panel'
import { StackedBar } from '@/components/common/ui/stacked-bar'
import { aggregateWorkflowProgress } from '@/features/customer-dashboard/services/dashboardChartService'
import type { CustomerSurveyRequestView } from '@/types/res/customerSurveyRequestsRes'
import type { ServiceRequestSummary } from '@/types/res/customerAfterSalesRes'

export function WorkflowStatusBarChart({
  surveyRequests,
  serviceRequests,
}: {
  surveyRequests: CustomerSurveyRequestView[]
  serviceRequests: ServiceRequestSummary[]
}) {
  const milestones = aggregateWorkflowProgress(surveyRequests, serviceRequests)
  const total = milestones.reduce((sum, m) => sum + m.count, 0)

  return (
    <Panel>
      <PanelHeader title="Tiến độ yêu cầu" description={total > 0 ? `${total} yêu cầu` : undefined} />
      {total === 0 ? (
        <p className="text-body text-fg-2">Chưa có yêu cầu nào</p>
      ) : (
        <StackedBar
          parts={milestones.map((m) => ({
            key: m.id,
            label: m.label,
            value: m.count,
            percent: m.percentage,
            color: m.color,
          }))}
        />
      )}
    </Panel>
  )
}
