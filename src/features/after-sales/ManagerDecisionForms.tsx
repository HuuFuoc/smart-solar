import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { Field, Input, Select, Textarea } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { formatVnd, pendingItems } from '@/features/after-sales/serviceDisplay'
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

type Choice = { coverage: string; reason: string }

/**
 * Chọn bảo hành lắp đặt / bảo hành sửa chữa / khách trả tiền cho từng hạng mục. Bảo hành chỉ chọn được khi còn hạn lúc
 * khách báo lỗi; gói thiên tai chưa làm trên web. Hạng mục khách trả tiền sẽ sang kinh doanh báo giá
 */
export function CoverageForm({ request }: { request: ServiceRequestView }) {
  const decide = useDecideCoverageMutation()
  const items = pendingItems(request)
  const firstChoice = request.withinInstallationWarranty ? 'INSTALLATION_WARRANTY' : 'CHARGEABLE'
  const [choices, setChoices] = useState<Record<string, Choice>>({})
  const [error, setError] = useState<string | null>(null)
  const choiceOf = (item: ServiceItemView) => choices[item.itemId] ?? { coverage: firstChoice, reason: '' }
  const setChoice = (item: ServiceItemView, change: Partial<Choice>) =>
    setChoices((all) => ({ ...all, [item.itemId]: { ...choiceOf(item), ...change } }))

  async function submit() {
    setError(null)
    try {
      await decide.mutateAsync({
        requestId: request.requestId,
        body: {
          decisions: items.map((item) => ({
            itemId: item.itemId,
            coverage: choiceOf(item).coverage,
            reason: choiceOf(item).reason.trim() || null,
          })),
        },
      })
      toast.success('Đã lưu quyết định bảo hành.')
    } catch (e) {
      setError(errorMessage(e))
    }
  }

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
      <ErrorNotice message={error} />
      <Button variant="primary" disabled={decide.isPending} onClick={() => void submit()}>
        {decide.isPending ? 'Đang lưu…' : 'Lưu quyết định'}
      </Button>
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
        <Button variant="primary" disabled={review.isPending} onClick={() => void submit(true)}>
          Yêu cầu làm lại
        </Button>
        <Button variant="secondary" disabled={review.isPending} onClick={() => void submit(false)}>
          Giữ kết quả, nhờ khách xem lại
        </Button>
      </div>
    </div>
  )
}

/** Khách xin huỷ việc đã thanh toán: đồng ý (giữ lại chi phí không hoàn được) hoặc từ chối */
export function CancellationDecisionForm({ request }: { request: ServiceRequestView }) {
  const decide = useDecideCancellationMutation()
  const paid = request.quotations.filter((q) => q.status === 'PAID').reduce((sum, q) => sum + q.customerAmount, 0)
  const [kept, setKept] = useState('0')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit(approve: boolean) {
    const amount = Number(kept)
    if (approve && (!Number.isInteger(amount) || amount < 0 || amount > paid))
      return setError(`Số tiền giữ lại là số nguyên từ 0 đến ${formatVnd(paid)}.`)
    setError(null)
    try {
      await decide.mutateAsync({
        requestId: request.requestId,
        body: { approve, nonRecoverableAmount: approve ? amount : 0, note: note.trim() || null },
      })
      toast.success(approve ? 'Đã đồng ý huỷ. Quản trị sẽ hoàn tiền cho khách.' : 'Đã từ chối yêu cầu huỷ.')
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-body text-fg">
        Khách đã trả {formatVnd(paid)}. Lý do huỷ: {request.cancellationReason ?? '—'}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Chi phí không hoàn được (VND)" htmlFor="cancel-kept" hint="Phần trừ vào tiền hoàn cho khách.">
          <Input
            id="cancel-kept"
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            value={kept}
            onChange={(e) => setKept(e.target.value)}
          />
        </Field>
        <Field label="Ghi chú" htmlFor="cancel-note">
          <Input id="cancel-note" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      <ErrorNotice message={error} />
      <div className="flex flex-wrap gap-3">
        <Button variant="danger" disabled={decide.isPending} onClick={() => void submit(true)}>
          Đồng ý huỷ
        </Button>
        <Button variant="secondary" disabled={decide.isPending} onClick={() => void submit(false)}>
          Không đồng ý
        </Button>
      </div>
    </div>
  )
}
