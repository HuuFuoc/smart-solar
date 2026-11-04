import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Select, Textarea } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { managerActionError } from '@/features/after-sales/managerAfterSalesDisplay'
import { TASK_REASON_MAX, assignTaskErrors, isReassignment } from '@/features/after-sales/managerAfterSalesRules'
import { salesTaskTypeLabel } from '@/features/after-sales/serviceDisplay'
import { useAssignTaskMutation } from '@/hooks/useManagerAfterSales'
import { isApiError } from '@/services/api/errors'
import type { SalesAssigneeView } from '@/types/res/managerAfterSalesRes'
import type { SalesTaskView } from '@/types/res/salesAfterSalesRes'

// Giao việc chưa ai nhận, hoặc giao lại việc đã có người giữ (bắt buộc lý do). Người nhận chọn trong danh sách kinh doanh đang
// hoạt động của GET /manager/after-sales/sales-assignees (quản lý và quản trị cùng đọc được). Lưu ý `salesUserId` của lệnh
// này khác `saleUserId` của lệnh đổi kinh doanh phụ trách yêu cầu khảo sát

type SalesUsers = {
  isPending: boolean
  isError: boolean
  error: unknown
  data?: SalesAssigneeView[]
  refetch: () => void
}

function AssignForm({ task, sales, onClose }: { task: SalesTaskView; sales: SalesUsers; onClose: () => void }) {
  const assign = useAssignTaskMutation()
  const [salesUserId, setSalesUserId] = useState('')
  const [reason, setReason] = useState('')
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reassign = isReassignment(task)
  const errors = checked ? assignTaskErrors(task, salesUserId, reason) : {}
  const current = sales.data?.find((u) => u.userId === task.assignedSalesUserId)

  async function submit() {
    if (assign.isPending) return
    setChecked(true)
    setError(null)
    if (Object.keys(assignTaskErrors(task, salesUserId, reason)).length > 0) return
    const person = sales.data?.find((u) => u.userId === salesUserId)
    try {
      await assign.mutateAsync({ taskId: task.taskId, body: { salesUserId, reason: reason.trim() || null } })
      toast.success(`Đã ${reassign ? 'giao lại' : 'giao'} việc cho ${person?.fullName ?? 'nhân viên kinh doanh'}.`)
      onClose()
    } catch (e) {
      // Việc vừa đổi (người khác nhận, việc đã xong): hàng việc đã tải lại, đóng để xem bản mới
      if (isApiError(e) && (e.code === 'SALES_TASK_ALREADY_CLAIMED' || e.code === 'AFTER_SALES_INVALID_STATE')) {
        toast.error(managerActionError(e))
        onClose()
        return
      }
      setError(managerActionError(e))
    }
  }

  return (
    <>
      <DialogTitle>{reassign ? 'Giao lại việc' : 'Giao việc'}</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        {salesTaskTypeLabel(task.taskType)}.{' '}
        {reassign
          ? `Đang do ${current?.fullName ?? 'một nhân viên kinh doanh'} giữ; người mới tiếp tục từ trạng thái hiện tại.`
          : 'Chưa ai nhận; người được giao thấy việc trong mục "Của tôi".'}
      </p>
      <div className="mt-4 space-y-4">
        {sales.isPending ? (
          <Skeleton className="h-11" />
        ) : sales.isError ? (
          <ErrorState message={managerActionError(sales.error)} onRetry={sales.refetch} />
        ) : (sales.data ?? []).length === 0 ? (
          <Notice tone="warn">Chưa có tài khoản kinh doanh nào đang hoạt động để giao việc.</Notice>
        ) : (
          <Field label="Nhân viên kinh doanh" htmlFor="assign-sales" required error={errors.salesUserId}>
            <Select
              id="assign-sales"
              value={salesUserId}
              aria-required
              aria-invalid={errors.salesUserId ? true : undefined}
              disabled={assign.isPending}
              onChange={(e) => setSalesUserId(e.target.value)}
            >
              <option value="">Chọn người nhận việc</option>
              {(sales.data ?? []).map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.fullName || 'Chưa có họ tên'}
                  {u.userId === task.assignedSalesUserId ? ' (đang giữ việc)' : ''}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field
          label="Lý do"
          htmlFor="assign-reason"
          required={reassign}
          hint={`${reassign ? 'Bắt buộc khi giao lại' : 'Không bắt buộc'}, tối đa ${TASK_REASON_MAX} ký tự. Lưu vào lịch sử của việc.`}
          error={errors.reason}
        >
          <Textarea
            id="assign-reason"
            rows={2}
            maxLength={TASK_REASON_MAX}
            value={reason}
            aria-required={reassign || undefined}
            disabled={assign.isPending}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
      </div>
      {error && (
        <div role="alert" className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={assign.isPending} onClick={onClose}>
          Huỷ
        </Button>
        <Button
          icon="assignment_ind"
          variant="primary"
          disabled={assign.isPending || !sales.data?.length}
          onClick={() => void submit()}
        >
          {assign.isPending ? 'Đang giao…' : reassign ? 'Giao lại' : 'Giao việc'}
        </Button>
      </DialogFooter>
    </>
  )
}

export function AssignTaskDialog({
  task,
  sales,
  onClose,
}: {
  task: SalesTaskView | null
  sales: SalesUsers
  onClose: () => void
}) {
  return (
    <ModalDialog
      open={Boolean(task)}
      onOpenChange={(open) => !open && onClose()}
      className="max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto"
      aria-label="Giao việc"
    >
      {task && <AssignForm key={task.taskId} task={task} sales={sales} onClose={onClose} />}
    </ModalDialog>
  )
}
