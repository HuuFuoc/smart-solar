import { useState } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { useClearSelectionMutation, useSelectSimulationMutation, useSimulationsQuery } from '@/hooks/useSimulations'
import { errorMessage, isApiError } from '@/services/api/errors'
import type { SimulationList } from '@/types/res/simulationsRes'

type Props = {
  preSurveyId: string
  /** Phiên bản mặt lắp khách đang xem, gửi kèm khi chọn */
  geometryVersion: number
  /** Lần chạy đang xem */
  viewId: string
  /** Bản nháp đã gửi ở nơi khác (PRE_SURVEY_NOT_EDITABLE) */
  onDraftClosed: () => void
}

/** Lý do không chọn được lần chạy đang xem, null là chọn được */
function blockedReason(list: SimulationList, viewId: string) {
  if (!list.cacheAvailable) return 'Tạm thời không đọc được các lần chạy. Thử lại sau ít phút.'
  const run = list.items.find((item) => item.simulationId === viewId)
  if (!run) return 'Lần chạy này đã hết hạn. Chạy lại mô phỏng để chọn.'
  if (run.isStale) return 'Lần chạy này tính theo mặt lắp cũ. Chạy lại rồi chọn kết quả mới.'
  return null
}

// Chọn lần chạy đang xem làm mô phỏng chính, hoặc bỏ chọn.
// Backend không tự chọn: chỉ mô phỏng chính được lưu lại và gửi cho bộ phận kinh doanh.
export function SimulationSelection({ preSurveyId, geometryVersion, viewId, onDraftClosed }: Props) {
  const list = useSimulationsQuery(preSurveyId)
  const select = useSelectSimulationMutation()
  const clear = useClearSelectionMutation()
  const [error, setError] = useState<string | null>(null)
  const busy = select.isPending || clear.isPending

  function showError(err: unknown) {
    if (isApiError(err) && err.code === 'PRE_SURVEY_NOT_EDITABLE') {
      onDraftClosed()
      return
    }
    setError(errorMessage(err))
  }

  async function choose() {
    setError(null)
    try {
      await select.mutateAsync({ preSurveyId, simulationId: viewId, expectedGeometryVersion: geometryVersion })
      toast.success('Đã chọn làm mô phỏng chính.')
    } catch (err) {
      showError(err)
    }
  }

  async function unselect() {
    setError(null)
    try {
      await clear.mutateAsync(preSurveyId)
      toast('Đã bỏ chọn mô phỏng chính.')
    } catch (err) {
      showError(err)
    }
  }

  if (!list.data) return null

  const errorLine = error && (
    <span className="flex w-full items-center gap-1.5 text-body font-medium text-danger" role="alert">
      <Icon name="error" className="shrink-0 text-[20px]" />
      {error}
    </span>
  )

  if (list.data.selected?.simulationId === viewId) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="flex items-center gap-1.5 text-body font-medium text-accent-fg">
          <Icon name="check_circle" className="text-[20px]" />
          Đã chọn làm mô phỏng chính
        </span>
        <span className="text-meta text-fg-2">Kết quả này được gửi cho bộ phận kinh doanh cùng bản đánh giá.</span>
        <Button size="sm" variant="danger" icon="close" onClick={unselect} disabled={busy}>
          {clear.isPending ? 'Đang bỏ…' : 'Bỏ chọn'}
        </Button>
        {errorLine}
      </div>
    )
  }

  const reason = blockedReason(list.data, viewId)
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Button variant="soft" icon="check" onClick={choose} disabled={busy || reason !== null}>
        {select.isPending ? 'Đang lưu…' : 'Chọn làm mô phỏng chính'}
      </Button>
      <span className="text-meta text-fg-2">
        {reason ?? 'Chỉ mô phỏng chính được lưu lại, các lần chạy khác tự xoá sau 24 giờ.'}
      </span>
      {errorLine}
    </div>
  )
}
