import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { DISASTER_TYPES } from '@/common/afterSales'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { DateField, Field, Select, Textarea, TimeSelect } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import {
  activeDisasterTerm,
  FAULT_DESCRIPTION_MAX,
  faultDescriptionError,
  incidentTimeError,
} from '@/features/after-sales/customerServiceRules'
import { assetName, equipmentWarrantyText } from '@/features/after-sales/serviceDisplay'
import { formatMoment, todayVn, vnTimestamp } from '@/features/scheduling/schedulingDisplay'
import { useCreateFaultMutation } from '@/hooks/useCustomerServiceRequests'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import type { InstalledAssetView, SubscriptionView } from '@/types/res/customerAfterSalesRes'

// Khách báo lỗi trên công trình đã bàn giao. Gửi xong mở trang yêu cầu để theo dõi

export function ReportFaultDialog({
  open,
  projectId,
  assets,
  subscriptions,
  onClose,
}: {
  open: boolean
  projectId: string
  assets: InstalledAssetView[]
  subscriptions: SubscriptionView[]
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
      <FaultForm
        projectId={projectId}
        assets={assets}
        disasterTerm={activeDisasterTerm(subscriptions)}
        create={create}
        onClose={onClose}
      />
    </ModalDialog>
  )
}

function FaultForm({
  projectId,
  assets,
  disasterTerm,
  create,
  onClose,
}: {
  projectId: string
  assets: InstalledAssetView[]
  disasterTerm: SubscriptionView | undefined
  create: ReturnType<typeof useCreateFaultMutation>
  onClose: () => void
}) {
  const navigate = useNavigate()
  const [description, setDescription] = useState('')
  const [assetId, setAssetId] = useState('')
  const [disasterType, setDisasterType] = useState('')
  const [incidentDate, setIncidentDate] = useState('')
  const [incidentTime, setIncidentTime] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [incidentError, setIncidentError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Kỳ gói có thể hết khi form đang mở (dữ liệu tải lại khi quay về trang): lúc đó gửi như lỗi thường
  const disaster = disasterTerm ? disasterType : ''

  async function submit() {
    const incidentAt = incidentDate && incidentTime ? vnTimestamp(incidentDate, incidentTime) : ''
    const descriptionProblem = faultDescriptionError(description, null)
    const incidentProblem = disaster ? incidentTimeError(incidentAt, disasterTerm?.coverageStartsAt ?? null) : null
    setFieldError(descriptionProblem)
    setIncidentError(incidentProblem)
    if (descriptionProblem || incidentProblem) return
    setError(null)
    try {
      const request = await create.mutateAsync({
        projectId,
        description: description.trim(),
        suspectedAssetId: assetId || null,
        disasterType: disaster || null,
        incidentOccurredAt: disaster ? incidentAt : null,
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
            maxLength={FAULT_DESCRIPTION_MAX}
            aria-required
            aria-invalid={fieldError ? true : undefined}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        {assets.length > 0 && (
          <Field
            label="Thiết bị nghi bị lỗi"
            htmlFor="fault-asset"
            hint={(() => {
              const picked = assets.find((asset) => asset.assetId === assetId)
              return picked ? `${equipmentWarrantyText(picked)}.` : 'Không bắt buộc.'
            })()}
          >
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
        {disasterTerm && (
          <Field
            label="Lỗi do thiên tai"
            htmlFor="fault-disaster"
            hint={
              disasterTerm.coverageStartsAt ? `Bảo vệ từ ${formatMoment(disasterTerm.coverageStartsAt)}.` : undefined
            }
          >
            <Select id="fault-disaster" value={disasterType} onChange={(e) => setDisasterType(e.target.value)}>
              <option value="">Không</option>
              {disasterTerm.coveredDisasterTypes.map((type) => (
                <option key={type} value={type}>
                  {DISASTER_TYPES[type] ?? type}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {disaster && (
          <Field label="Xảy ra lúc" htmlFor="fault-incident-date" required error={incidentError ?? undefined}>
            <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-3">
              <DateField
                id="fault-incident-date"
                label="Ngày xảy ra"
                value={incidentDate}
                max={todayVn()}
                aria-required
                aria-invalid={incidentError ? true : undefined}
                onChange={setIncidentDate}
              />
              <TimeSelect
                aria-label="Giờ xảy ra"
                aria-required
                aria-invalid={incidentError ? true : undefined}
                emptyLabel="Giờ"
                value={incidentTime}
                onChange={setIncidentTime}
              />
            </div>
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
