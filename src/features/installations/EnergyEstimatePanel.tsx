import type { UseQueryResult } from '@tanstack/react-query'
import { KeyValueList } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { formatKwh, formatOne } from '@/features/pre-surveys/simulationDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { errorMessage } from '@/services/api/errors'
import type { EnergyMonitoringView } from '@/types/res/customerInstallationsRes'

// Sản lượng dự kiến của công trình, lấy từ mô phỏng khách chọn trước khi lắp. Chưa có đồng hồ đo nên không có số thực tế
// và không có cảnh báo sản lượng thấp; luôn ghi rõ là dự kiến

export function EnergyEstimatePanel({ query }: { query: UseQueryResult<EnergyMonitoringView> }) {
  const sim = query.data?.simulated
  return (
    <Panel>
      <PanelHeader title="Sản lượng dự kiến" />
      <PanelBody>
        {query.isPending ? (
          <Skeleton className="h-24" />
        ) : query.data === undefined ? (
          <ErrorState
            title="Không tải được sản lượng dự kiến."
            message={errorMessage(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : !sim ? (
          <p className="text-body text-fg-2">Công trình chưa có mô phỏng đã chọn nên chưa ước tính được sản lượng.</p>
        ) : (
          <div className="space-y-3">
            <KeyValueList
              items={[
                {
                  k: 'Sản lượng một năm',
                  v: sim.annualEnergyKwh != null ? `${formatKwh(sim.annualEnergyKwh)} kWh` : 'Chưa tính được',
                },
                { k: 'Công suất lắp', v: `${formatOne(sim.installedCapacityKwp)} kWp, ${sim.panelCount} tấm` },
                ...(sim.specificYieldKwhPerKwpYear != null
                  ? [{ k: 'Mỗi kWp một năm', v: `${formatKwh(sim.specificYieldKwhPerKwpYear)} kWh` }]
                  : []),
                { k: 'Mô phỏng chọn lúc', v: formatMoment(sim.selectedAt) },
              ]}
            />
            <p className="text-meta text-fg-2">
              Ước tính theo mô phỏng chọn trước khi lắp, chưa phải số đo thực tế của hệ thống.
            </p>
          </div>
        )}
      </PanelBody>
    </Panel>
  )
}
