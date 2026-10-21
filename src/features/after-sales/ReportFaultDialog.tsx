import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Select, Textarea } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { assetName } from '@/features/after-sales/serviceDisplay'
import { useCreateFaultMutation } from '@/hooks/useCustomerServiceRequests'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import type { InstalledAssetView } from '@/types/res/customerAfterSalesRes'

// Khách báo lỗi trên công trình đã bàn giao. Gửi xong mở trang yêu cầu để theo dõi

const DESCRIPTION_MIN = 5
const DESCRIPTION_MAX = 2000

export function ReportFaultDialog({
  open,
  projectId,
  assets,
  onClose,
}: {
  open: boolean
  projectId: string
  assets: InstalledAssetView[]
  onClose: () => void
}) {
  const create = useCreateFaultMutation()
  return (
    <ModalDialog
      open={open}
      onOpenChange={(next) => !next && !create.isPending && onClose()}
      dismissible={!create.isPending}
      aria-label="Báo lỗi"
      className="max-w-lg"
    >
      <FaultForm projectId={projectId} assets={assets} create={create} onClose={onClose} />
    </ModalDialog>
  )
}

function FaultForm({
  projectId,
  assets,
  create,
  onClose,
}: {
  projectId: string
  assets: InstalledAssetView[]
  create: ReturnType<typeof useCreateFaultMutation>
  onClose: () => void
}) {
  const navigate = useNavigate()
  const [description, setDescription] = useState('')
  const [assetId, setAssetId] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (description.trim().length < DESCRIPTION_MIN) {
      setFieldError(`Mô tả lỗi ít nhất ${DESCRIPTION_MIN} ký tự.`)
      return
    }
    setFieldError(null)
    setError(null)
    try {
      const request = await create.mutateAsync({
        projectId,
        description: description.trim(),
        suspectedAssetId: assetId || null,
      })
      toast.success('Đã gửi báo lỗi. Smart Solar sẽ xếp kỹ thuật viên tới kiểm tra.')
      onClose()
      void navigate(withId(ROUTES.customer.afterSalesRequest, request.requestId))
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <>
      <DialogTitle>Báo lỗi</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Smart Solar sẽ hẹn kỹ thuật viên tới kiểm tra. Lỗi thuộc bảo hành thì không tính tiền; phần phải trả tiền sẽ có
        báo giá để bạn duyệt trước khi làm.
      </p>
      <div className="mt-4 space-y-4">
        <Field
          label="Mô tả lỗi"
          htmlFor="fault-description"
          hint="Bạn thấy gì, từ khi nào, đèn báo hay mã lỗi trên inverter nếu có."
          error={fieldError ?? undefined}
          required
        >
          <Textarea
            id="fault-description"
            rows={4}
            maxLength={DESCRIPTION_MAX}
            aria-required
            aria-invalid={fieldError ? true : undefined}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        {assets.length > 0 && (
          <Field label="Thiết bị nghi bị lỗi" htmlFor="fault-asset" hint="Không bắt buộc.">
            <Select id="fault-asset" value={assetId} onChange={(e) => setAssetId(e.target.value)}>
              <option value="">Không rõ</option>
              {assets.map((asset) => (
                <option key={asset.assetId} value={asset.assetId}>
                  {assetName(asset)}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
      {error && (
        <div role="alert" className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={create.isPending} onClick={onClose}>
          Đóng
        </Button>
        <Button icon="report" variant="danger-solid" disabled={create.isPending} onClick={() => void submit()}>
          {create.isPending ? 'Đang gửi…' : 'Gửi báo lỗi'}
        </Button>
      </DialogFooter>
    </>
  )
}
