import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { FormActions } from '@/components/common/ui/form-actions'
import { Field, Input, Select, Textarea } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import {
  disasterCoverageAllowed,
  paidAmount,
  paidCancellationBlocker,
} from '@/features/after-sales/managerAfterSalesRules'
import { formatVnd, pendingItems } from '@/features/after-sales/serviceDisplay'
import { ContractConfirmDialog } from '@/features/contracts/ContractConfirmDialog'
import {
  useDecideCancellationMutation,
  useDecideCoverageMutation,
  useReviewDisputeMutation,
} from '@/hooks/useManagerAfterSales'
import { errorMessage } from '@/services/api/errors'
import type { ServiceItemView, ServiceRequestView } from '@/types/res/customerAfterSalesRes'

// Các quyết định của quản lý trên một yêu cầu: ai chịu chi phí từng hạng mục, khiếu nại nghiệm thu, yêu cầu huỷ

function ErrorNotice({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div role="alert">
      <Notice tone="danger">{message}</Notice>
    </div>
  )
}

const COVERAGE_LABELS: Record<string, string> = {
  INSTALLATION_WARRANTY: 'bảo hành lắp đặt',
  REPAIR_WARRANTY: 'bảo hành sửa chữa',
  DISASTER_PROTECTION: 'gói bảo vệ thiên tai',
  CHARGEABLE: 'khách trả tiền',
}

type Choice = { coverage: string; reason: string }

/**
 * Chọn bảo hành lắp đặt / bảo hành sửa chữa / gói thiên tai / khách trả tiền cho từng hạng mục. Bảo hành chỉ chọn được khi
 * còn hạn lúc khách báo lỗi; gói thiên tai chỉ khi hỗ trợ đã được duyệt (backend tính phần gói trả trên báo giá). Hạng mục
 * khách trả tiền hoặc gói thiên tai hỗ trợ sẽ sang kinh doanh báo giá
 */
export function CoverageForm({ request }: { request: ServiceRequestView }) {
  const decide = useDecideCoverageMutation()
  const items = pendingItems(request)
  // Thứ tự ưu tiên của backend: bảo hành lắp đặt (miễn phí), rồi gói thiên tai đã duyệt, còn lại khách trả tiền
  const firstChoice = request.withinInstallationWarranty
    ? 'INSTALLATION_WARRANTY'
    : disasterCoverageAllowed(request)
      ? 'DISASTER_PROTECTION'
      : 'CHARGEABLE'
  const [choices, setChoices] = useState<Record<string, Choice>>({})
  const [confirming, setConfirming] = useState(false)
  const choiceOf = (item: ServiceItemView) => choices[item.itemId] ?? { coverage: firstChoice, reason: '' }
  const setChoice = (item: ServiceItemView, change: Partial<Choice>) =>
    setChoices((all) => ({ ...all, [item.itemId]: { ...choiceOf(item), ...change } }))

  const submit = () =>
    decide.mutateAsync({
      requestId: request.requestId,
      body: {
        decisions: items.map((item) => ({
          itemId: item.itemId,
          coverage: choiceOf(item).coverage,
          reason: choiceOf(item).reason.trim() || null,
        })),
      },
    })

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-line">
        {items.map((item) => (
          <li key={item.itemId} className="grid gap-3 py-4 first:pt-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <p className="text-body font-medium text-fg">{item.description}</p>
              <p className="text-body text-fg-2">Chẩn đoán: {item.diagnosis}</p>
              {item.requiredParts && <p className="text-body text-fg-2">Vật tư cần: {item.requiredParts}</p>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Field label="Chi phí" htmlFor={`coverage-${item.itemId}`}>
                <Select
                  id={`coverage-${item.itemId}`}
                  value={choiceOf(item).coverage}
                  onChange={(e) => setChoice(item, { coverage: e.target.value })}
                >
                  <option value="INSTALLATION_WARRANTY" disabled={!request.withinInstallationWarranty}>
                    Bảo hành lắp đặt{request.withinInstallationWarranty ? '' : ' (hết hạn)'}
                  </option>
                  <option value="REPAIR_WARRANTY" disabled={!request.withinRepairWarranty}>
                    Bảo hành sửa chữa{request.withinRepairWarranty ? '' : ' (không có)'}
                  </option>
                  <option value="DISASTER_PROTECTION" disabled={!disasterCoverageAllowed(request)}>
                    Gói bảo vệ thiên tai
                    {disasterCoverageAllowed(request) ? '' : request.claim ? ' (chưa duyệt hỗ trợ)' : ' (không có)'}
                  </option>
                  <option value="CHARGEABLE">Khách trả tiền</option>
                </Select>
              </Field>
              <Field label="Ghi chú" htmlFor={`coverage-reason-${item.itemId}`}>
                <Input
                  id={`coverage-reason-${item.itemId}`}
                  maxLength={1000}
                  value={choiceOf(item).reason}
                  onChange={(e) => setChoice(item, { reason: e.target.value })}
                />
              </Field>
            </div>
          </li>
        ))}
      </ul>
      <FormActions>
        <Button icon="save" variant="primary" disabled={decide.isPending} onClick={() => setConfirming(true)}>
          Lưu quyết định
        </Button>
      </FormActions>
      {confirming && (
        <ContractConfirmDialog
          title="Lưu quyết định bảo hành?"
          confirmLabel="Lưu quyết định"
          icon="save"
          successText="Đã lưu quyết định bảo hành."
          formatError={errorMessage}
          run={submit}
          onClose={() => setConfirming(false)}
        >
          <ul className="list-disc space-y-1 pl-5">
            {items.map((item) => (
              <li key={item.itemId}>
                {item.description}: {COVERAGE_LABELS[choiceOf(item).coverage]}
              </li>
            ))}
          </ul>
        </ContractConfirmDialog>
      )}
    </div>
  )
}

/** Khách không đồng ý kết quả: bắt làm lại, hoặc giữ kết quả và nhờ khách nghiệm thu lại */
export function DisputeReviewForm({ request }: { request: ServiceRequestView }) {
  const review = useReviewDisputeMutation()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit(requireRework: boolean) {
    if (!note.trim()) return setError('Ghi lời giải thích cho khách.')
    setError(null)
    try {
      await review.mutateAsync({ requestId: request.requestId, body: { requireRework, note: note.trim() } })
      toast.success(requireRework ? 'Đã yêu cầu làm lại. Xếp lịch làm lại ở trên.' : 'Đã gửi khách nghiệm thu lại.')
      setNote('')
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="space-y-4">
      {request.customerDecisionReason && (
        <p className="max-w-[72ch] text-body whitespace-pre-line text-fg">
          Khách ghi: {request.customerDecisionReason}
        </p>
      )}
      <Field label="Giải thích cho khách" htmlFor="dispute-note" required>
        <Textarea id="dispute-note" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <ErrorNotice message={error} />
      <div className="flex flex-wrap gap-3">
        <Button icon="replay" variant="primary" disabled={review.isPending} onClick={() => void submit(true)}>
          Yêu cầu làm lại
        </Button>
        <Button icon="check_circle" variant="secondary" disabled={review.isPending} onClick={() => void submit(false)}>
          Giữ kết quả, nhờ khách xem lại
        </Button>
      </div>
    </div>
  )
}

/** Khách xin huỷ việc chưa bắt đầu. Việc đã thanh toán chỉ từ chối được: backend không huỷ khoản đã trả */
export function CancellationDecisionForm({ request }: { request: ServiceRequestView }) {
  const decide = useDecideCancellationMutation()
  const paid = paidAmount(request)
  const blocker = paidCancellationBlocker(request)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit(approve: boolean) {
    setError(null)
    try {
      await decide.mutateAsync({
        requestId: request.requestId,
        body: { approve, note: note.trim() || null },
      })
      toast.success(approve ? 'Đã đồng ý huỷ.' : 'Đã từ chối yêu cầu huỷ.')
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-body text-fg">
        Khách đã trả {formatVnd(paid)}. Lý do huỷ: {request.cancellationReason ?? '—'}
      </p>
      {blocker && <Notice tone="warn">{blocker}</Notice>}
      <Field label="Ghi chú" htmlFor="cancel-note">
        <Input id="cancel-note" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <ErrorNotice message={error} />
      <div className="flex flex-wrap gap-3">
        {!blocker && (
          <Button icon="cancel" variant="danger" disabled={decide.isPending} onClick={() => void submit(true)}>
            Đồng ý huỷ
          </Button>
        )}
        <Button icon="block" variant="danger" disabled={decide.isPending} onClick={() => void submit(false)}>
          Không đồng ý
        </Button>
      </div>
    </div>
  )
}
