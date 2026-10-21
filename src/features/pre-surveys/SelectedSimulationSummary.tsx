import type { ReactNode } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { Notice } from '@/components/common/ui/lists'
import { Facts } from '@/features/pre-surveys/Facts'
import { SimulationStats } from '@/features/pre-surveys/SimulationResult'
import { directionLabel, formatRelative } from '@/features/pre-surveys/preSurveyDisplay'
import { formatTwo, mountingLabel, simulationStatusMeta } from '@/features/pre-surveys/simulationDisplay'
import type { SelectedSimulation } from '@/types/res/simulationsRes'

type Props = {
  summary: SelectedSimulation
  /** Câu nhắc khi mô phỏng này tính theo mặt lắp cũ */
  staleNote?: ReactNode
}

// Mô phỏng chính khi kết quả đầy đủ đã hết hạn (backend chỉ giữ 24 giờ).
// Lúc này chỉ còn số liệu lưu lúc chọn, không còn hình bố trí và biểu đồ.
export function SelectedSimulationSummary({ summary, staleNote }: Props) {
  const status = simulationStatusMeta(summary.status, summary.energyStatus)
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={status.tone}>{status.label}</Badge>
        <Badge tone="accent">Mô phỏng chính</Badge>
        {summary.isStale && <Badge tone="warn">Theo mặt lắp cũ</Badge>}
        <span className="text-meta text-fg-3">Chạy {formatRelative(summary.createdAt)}</span>
      </div>
      {summary.isStale && staleNote && <Notice tone="warn">{staleNote}</Notice>}

      <SimulationStats
        panelCount={summary.panelCount}
        capacityKwp={summary.installedCapacityKwp}
        annualEnergyKwh={summary.annualEnergyKwh}
        specificYield={summary.specificYieldKwhPerKwpYear}
      />
      <Facts
        items={[
          { k: 'Tấm pin', v: summary.productName },
          { k: 'Kiểu lắp', v: mountingLabel(summary.mountingType) },
          { k: 'Góc nghiêng tấm', v: `${formatTwo(summary.panelTiltDegree)}°` },
          { k: 'Hướng tấm', v: directionLabel(summary.panelAzimuthDegree) },
        ]}
      />
      <Notice tone="info">
        Hình bố trí và biểu đồ sản lượng chỉ được giữ 24 giờ sau khi chạy nên không còn xem được. Số liệu ở trên được
        lưu lại lúc chọn làm mô phỏng chính.
      </Notice>
    </div>
  )
}
