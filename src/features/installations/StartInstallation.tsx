import { useState } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { startBlockedText, windowText } from '@/features/installations/technicianInstallationDisplay'
import { useStartInstallationMutation } from '@/hooks/useTechnicianInstallations'
import { errorMessage } from '@/services/api/errors'
import type { InstallationTechnicianView } from '@/types/res/technicianInstallationsRes'

// Bắt đầu lắp đặt. Backend tự kiểm tra lại ngày, khung giờ và hạng mục bắt buộc; canStart chỉ để khoá nút sớm
export function StartInstallation({ view }: { view: InstallationTechnicianView }) {
  const start = useStartInstallationMutation()
  const [error, setError] = useState<string | null>(null)
  const blocked = view.canStart ? null : startBlockedText(view.startBlockedReason)

  async function onStart() {
    if (start.isPending) return
    setError(null)
    try {
      await start.mutateAsync({ id: view.projectId })
      toast.success('Đã bắt đầu lắp đặt.')
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-body text-fg-2">
        Bạn đã nhận lắp đặt <span className="tnum text-fg">{windowText(view)}</span>.
        {blocked ? ` ${blocked}` : ' Tới công trình thì bấm bắt đầu.'}
      </p>
      <span className="flex flex-wrap items-center gap-3">
        <Button
          icon="play_arrow"
          variant="primary"
          disabled={!view.canStart || start.isPending}
          onClick={() => void onStart()}
        >
          {start.isPending ? 'Đang bắt đầu…' : 'Bắt đầu lắp đặt'}
        </Button>
        {error && (
          <span className="flex items-center gap-1.5 text-body font-medium text-danger" role="alert">
            <Icon name="error" className="shrink-0 text-[20px]" />
            {error}
          </span>
        )}
      </span>
    </div>
  )
}
