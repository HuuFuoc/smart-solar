import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { DISASTER_TYPES } from '@/common/afterSales'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { DateField, Field, Select, Textarea, TimeSelect } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import {
  activeDisasterTerms,
  disasterTypesOf,
  FAULT_DESCRIPTION_MAX,
  faultDescriptionError,
  incidentTimeError,
  needsDamagedPanel,
  termCoveringPanel,
} from '@/features/after-sales/customerServiceRules'
import { assetName, equipmentWarrantyText } from '@/features/after-sales/serviceDisplay'
import { formatMoment, todayVn, vnTimestamp } from '@/features/scheduling/schedulingDisplay'
import { useCreateFaultMutation } from '@/hooks/useCustomerServiceRequests'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import type { InstalledAssetView, SubscriptionView } from '@/types/res/customerAfterSalesRes'

// Khách báo lỗi trên công trình đã bàn giao. Gửi xong mở trang yêu cầu để theo dõi. Lỗi do thiên tai trên công trình chỉ có gói
// bảo vệ theo tấm pin thì phải chọn tấm pin bị hư hại (gửi làm `suspectedAssetId`); backend xét hỗ trợ theo kỳ bảo vệ tấm đó

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
        disasterTerms={activeDisasterTerms(subscriptions)}
        create={create}
        onClose={onClose}
      />
    </ModalDialog>
  )
}

function FaultForm({
  projectId,
  assets,
  disasterTerms,
  create,
  onClose,
}: {
  projectId: string
  assets: InstalledAssetView[]
  disasterTerms: SubscriptionView[]
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
  const [panelError, setPanelError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Kỳ gói có thể hết khi form đang mở (dữ liệu tải lại khi quay về trang): lúc đó gửi như lỗi thường
  const disasterTerm = disasterTerms[0]
  const disaster = disasterTerm ? disasterType : ''
  // Chỉ có kỳ theo tấm pin: lỗi do thiên tai phải chỉ ra tấm pin bị hư hại
  const panelMode = Boolean(disaster) && needsDamagedPanel(disasterTerms)
  const panels = assets.filter((a) => a.assetType === 'PANEL' && a.status === 'ACTIVE')
  const pickedPanel = panelMode ? panels.find((a) => a.assetId === assetId) : undefined
  const covering = pickedPanel ? termCoveringPanel(disasterTerms, pickedPanel.assetId) : null
  // Mốc bảo vệ để báo trước: kỳ cả công trình, hoặc kỳ đang bảo vệ tấm đã chọn (tấm chưa có kỳ thì để backend xét)
  const coverageStartsAt = panelMode ? (covering?.coverageStartsAt ?? null) : (disasterTerm?.coverageStartsAt ?? null)

  async function submit() {
    const incidentAt = incidentDate && incidentTime ? vnTimestamp(incidentDate, incidentTime) : ''
    const descriptionProblem = faultDescriptionError(description, null)
    const incidentProblem = disaster ? incidentTimeError(incidentAt, coverageStartsAt) : null
    const panelProblem =
      panelMode && !pickedPanel ? 'Chọn tấm pin bị hư hại để xét hỗ trợ của gói bảo vệ thiên tai theo tấm pin.' : null
    setFieldError(descriptionProblem)
    setIncidentError(incidentProblem)
    setPanelError(panelProblem)
    if (descriptionProblem || incidentProblem || panelProblem) return
    setError(null)
    try {
      const request = await create.mutateAsync({
        projectId,
        description: description.trim(),
        suspectedAssetId: panelMode ? (pickedPanel?.assetId ?? null) : assetId || null,
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
        Kỹ thuật viên sẽ tới kiểm tra. Lỗi trong bảo hành không tính tiền; phần tính tiền có báo giá để bạn duyệt trước.
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
        {panelMode ? (
          <Field
            label="Tấm pin bị hư hại"
            htmlFor="fault-panel"
            required
            error={panelError ?? undefined}
            hint={
              pickedPanel
                ? covering
                  ? `Thuộc ${covering.packageName}${covering.coverageStartsAt ? `, bảo vệ từ ${formatMoment(covering.coverageStartsAt)}` : ''}.`
                  : 'Tấm pin này không nằm trong gói bảo vệ thiên tai đang hiệu lực; Smart Solar vẫn nhận báo lỗi và xét theo hợp đồng.'
                : undefined
            }
          >
            <Select
              id="fault-panel"
              aria-required
              aria-invalid={panelError ? true : undefined}
              value={pickedPanel?.assetId ?? ''}
              onChange={(e) => setAssetId(e.target.value)}
            >
              <option value="">Chọn tấm pin</option>
              {panels.map((asset) => (
                <option key={asset.assetId} value={asset.assetId}>
                  {assetName(asset)}
                  {asset.positionCode ? `, vị trí ${asset.positionCode}` : ''}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          assets.length > 0 && (
            <Field
              label="Thiết bị nghi bị lỗi"
              htmlFor="fault-asset"
              optional
              hint={(() => {
                const picked = assets.find((asset) => asset.assetId === assetId)
                return picked ? `${equipmentWarrantyText(picked)}.` : undefined
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
          )
        )}
        {disasterTerm && (
          <Field
            label="Lỗi do thiên tai"
            htmlFor="fault-disaster"
            hint={
              !needsDamagedPanel(disasterTerms) && disasterTerm.coverageStartsAt
                ? `Bảo vệ từ ${formatMoment(disasterTerm.coverageStartsAt)}.`
                : undefined
            }
          >
            <Select id="fault-disaster" value={disasterType} onChange={(e) => setDisasterType(e.target.value)}>
              <option value="">Không</option>
              {disasterTypesOf(disasterTerms).map((type) => (
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
