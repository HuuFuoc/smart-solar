import { useState } from 'react'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { Icon } from '@/components/common/stitch-ui/Icon'
import {
  aggregateWorkflowProgress,
  type MilestoneProgress,
} from '@/features/customer-dashboard/services/dashboardChartService'
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
  const [activeItem, setActiveItem] = useState<MilestoneProgress | null>(null)

  return (
    <Panel className="w-full">
      <PanelHeader
        title="Tiến độ dịch vụ & Lịch hẹn"
        description={
          total > 0
            ? `Tổng cộng ${total} quy trình đang phân bổ theo các giai đoạn thực hiện`
            : 'Chưa có yêu cầu đang xử lý'
        }
      />
      <PanelBody className="space-y-6">
        {total === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-center text-body text-fg-3">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-fg-3">
              <Icon name="pending_actions" className="text-[22px]" />
            </div>
            <p className="font-medium text-fg-2">Chưa có quy trình nào</p>
            <p className="text-meta">Các yêu cầu khảo sát hoặc bảo trì sẽ được theo dõi tiến độ tại đây.</p>
          </div>
        ) : (
          <>
            <div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2">
                {milestones.map((m) =>
                  m.percentage > 0 ? (
                    <div
                      key={m.id}
                      style={{ width: `${m.percentage}%`, backgroundColor: m.color }}
                      className="cursor-pointer transition-all duration-300 hover:opacity-90"
                      onMouseEnter={() => setActiveItem(m)}
                      onMouseLeave={() => setActiveItem(null)}
                    />
                  ) : null,
                )}
              </div>
              <div className="mt-2 flex items-center justify-between text-meta text-fg-3">
                <span>Toàn bộ quy trình</span>
                <span className="font-semibold text-fg-1">{total} yêu cầu</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {milestones.map((m) => {
                const isHovered = activeItem?.id === m.id

                return (
                  <div
                    key={m.id}
                    onMouseEnter={() => setActiveItem(m)}
                    onMouseLeave={() => setActiveItem(null)}
                    className="group flex flex-col justify-between rounded-control border border-line/60 bg-canvas p-3 transition-all hover:border-line"
                  >
                    <div>
                      <div className="flex items-center justify-between text-body">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: m.color }} />
                          <span className="truncate font-medium text-fg-1">{m.label}</span>
                        </div>
                        <div className="flex items-center gap-1 text-meta shrink-0 ml-1">
                          <span className="font-bold text-fg-1">{m.count}</span>
                          <span className="text-fg-3">({m.percentage}%)</span>
                        </div>
                      </div>

                      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${m.percentage}%`,
                            backgroundColor: m.color,
                            opacity: isHovered ? 1 : 0.8,
                          }}
                        />
                      </div>
                    </div>

                    <p className="mt-2 text-meta text-fg-3 line-clamp-2">{m.description}</p>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </PanelBody>
    </Panel>
  )
}
