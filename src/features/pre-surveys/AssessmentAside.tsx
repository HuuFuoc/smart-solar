import { Count } from '@/components/common/ui/badge'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { SimulationHistory } from '@/features/pre-surveys/SimulationHistory'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import type { SimulationListItem } from '@/types/res/simulationsRes'

type Props = {
  /** Các lần chạy mô phỏng, chỉ truyền ở bước mô phỏng */
  runs: SimulationListItem[] | undefined
  /** Lần chạy đang xem */
  viewingRunId: string | null
  onViewRun: (id: string) => void
  /** Id bản nháp đã lưu trên server */
  preSurveyId: string | undefined
  submitted: boolean
}

// Cột phụ của trang đánh giá sơ bộ. Bước có form hẹp thì nằm dưới khung của bước
export function AssessmentAside({ runs, viewingRunId, onViewRun, preSurveyId, submitted }: Props) {
  const hasRuns = runs !== undefined && runs.length > 0
  return (
    <>
      {hasRuns && (
        <Panel>
          <PanelHeader
            title={
              <span className="flex items-center gap-2">
                Các lần chạy <Count value={runs.length} />
              </span>
            }
          />
          <PanelBody>
            <SimulationHistory items={runs} viewingId={viewingRunId} onView={onViewRun} />
          </PanelBody>
        </Panel>
      )}
      {/* Thông tin cần đọc nhưng không phải việc phải làm ngay: khối xám, để form vẫn là trọng tâm */}
      <Notice tone="neutral" title="Sau khi gửi">
        Bạn chọn ngày giờ khảo sát trong 30 ngày tới. Kỹ thuật viên phụ trách khu vực của công trình nhận lịch rồi tới
        kiểm tra lại các số đo bạn khai.
      </Notice>
      {preSurveyId && !submitted && (
        <Notice tone="ok">
          Bản nháp <span className="tnum font-medium text-fg">{shortCode(preSurveyId)}</span> đã lưu trên hệ thống. Phần
          đang nhập dở được giữ trên máy này, rời trang hay tải lại vẫn còn.
        </Notice>
      )}
    </>
  )
}
