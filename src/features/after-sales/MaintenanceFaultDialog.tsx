import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Textarea } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { FAULT_DESCRIPTION_MAX, faultDescriptionError } from '@/features/after-sales/customerServiceRules'
import { useReportFaultFromMaintenanceMutation } from '@/hooks/useCustomerServiceRequests'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'

// Báo lỗi kỹ thuật viên phát hiện trong một lần bảo trì. Backend tạo yêu cầu báo lỗi mới gắn với yêu cầu bảo trì này
// (originRequestId); bỏ trống mô tả thì backend dùng ghi chú của kỹ thuật viên. Gửi xong mở yêu cầu mới
export function MaintenanceFaultDialog({
  requestId,
  finding,
  onClose,
}: {
  requestId: string
  /** Ghi chú kỹ thuật viên phát hiện, null khi không có */
  finding: string | null
  onClose: () => void
}) {
  const navigate = useNavigate()
  const report = useReportFaultFromMaintenanceMutation()
  const [description, setDescription] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const problem = faultDescriptionError(description, finding)
    setFieldError(problem)
    if (problem) return
    setError(null)
    try {
      const created = await report.mutateAsync({ requestId, description: description.trim() || null })
      toast.success('Đã gửi báo lỗi. Smart Solar sẽ hẹn kỹ thuật viên tới kiểm tra.')
      onClose()
      void navigate(withId(ROUTES.customer.afterSalesRequest, created.requestId))
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <ModalDialog
      open
      onOpenChange={(open) => !open && !report.isPending && onClose()}
      dismissible={!report.isPending}
      aria-label="Báo lỗi phát hiện khi bảo trì"
      className="max-w-lg"
    >
      <DialogTitle>Báo lỗi phát hiện khi bảo trì</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Yêu cầu báo lỗi mới được gắn với lần bảo trì này. Lỗi thuộc bảo hành thì không tính tiền; phần phải trả tiền sẽ
        có báo giá để bạn duyệt.
      </p>
      {finding && (
        <Notice className="mt-4" title="Kỹ thuật viên ghi khi bảo trì">
          <span className="whitespace-pre-line">{finding}</span>
        </Notice>
      )}
      <Field
        label="Mô tả lỗi"
        htmlFor="maintenance-fault-description"
        className="mt-4"
        error={fieldError ?? undefined}
        hint={finding ? 'Bỏ trống thì dùng ghi chú của kỹ thuật viên.' : 'Bạn thấy gì, từ khi nào.'}
        required={!finding}
      >
        <Textarea
          id="maintenance-fault-description"
          rows={4}
          maxLength={FAULT_DESCRIPTION_MAX}
          aria-invalid={fieldError ? true : undefined}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      {error && (
        <div role="alert" className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={report.isPending} onClick={onClose}>
          Đóng
        </Button>
        <Button icon="report" variant="danger-solid" disabled={report.isPending} onClick={() => void submit()}>
          {report.isPending ? 'Đang gửi…' : 'Gửi báo lỗi'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
