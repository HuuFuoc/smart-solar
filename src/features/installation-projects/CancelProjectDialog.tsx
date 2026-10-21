import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { ErrorLine, ReasonField } from '@/features/installation-projects/formParts'
import { installationErrorMessage } from '@/features/installation-projects/projectDisplay'
import { useCancelProjectMutation } from '@/hooks/useManagerInstallations'
import type { InstallationStaffView } from '@/types/res/managerInstallationsRes'

// Huỷ dự án trước khi thi công. Không hoàn tác được: hợp đồng giữ trạng thái đã thanh toán và không tạo được dự án khác

export function CancelProjectDialog({ project, onClose }: { project: InstallationStaffView; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const cancel = useCancelProjectMutation(project.projectId)

  async function submit() {
    const why = reason.trim()
    if (!why) {
      setError('Ghi lý do huỷ dự án.')
      return
    }
    setError(null)
    try {
      await cancel.mutateAsync({ reason: why, expectedRevision: project.revision })
      toast.success('Đã huỷ dự án thi công.')
      onClose()
    } catch (e) {
      setError(installationErrorMessage(e))
    }
  }

  return (
    <ModalDialog
      open
      onOpenChange={(open) => !open && onClose()}
      dismissible={!cancel.isPending}
      className="max-w-xl"
      aria-label="Huỷ dự án thi công"
    >
      <DialogTitle>Huỷ dự án thi công?</DialogTitle>
      <div className="mt-2 space-y-2 text-body text-fg-2">
        <p>
          Không hoàn tác được. Lần phân công hiện tại (nếu có) bị huỷ và hợp đồng này không tạo được dự án thi công
          khác.
        </p>
        <p>Hợp đồng vẫn ở trạng thái đã thanh toán; hoàn tiền nếu có là việc làm ngoài hệ thống.</p>
      </div>
      <div className="mt-4">
        <ReasonField
          id="cancel-reason"
          label="Lý do huỷ"
          required
          value={reason}
          onChange={(value) => {
            setReason(value)
            setError(null)
          }}
        />
      </div>
      <DialogFooter className="items-center">
        <ErrorLine message={error} />
        <Button icon="close" variant="secondary" disabled={cancel.isPending} onClick={onClose}>
          Giữ dự án
        </Button>
        <Button icon="cancel" variant="danger-solid" disabled={cancel.isPending} onClick={() => void submit()}>
          {cancel.isPending ? 'Đang huỷ…' : 'Huỷ dự án'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
