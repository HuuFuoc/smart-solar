import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { FormActions } from '@/components/common/ui/form-actions'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { assetName } from '@/features/after-sales/serviceDisplay'
import {
  emptyItemDraft,
  inspectionBody,
  inspectionError,
  ITEM_DESCRIPTION_MAX,
  ITEM_DIAGNOSIS_MAX,
  ITEM_PARTS_MAX,
  REPORT_MAX,
  type ItemDraft,
} from '@/features/after-sales/technicianVisitRules'
import { formatTime } from '@/features/scheduling/schedulingDisplay'
import { useInspectionReportMutation, useWorkReportMutation } from '@/hooks/useTechnicianAfterSales'
import { errorMessage } from '@/services/api/errors'
import type { TechnicianVisitView } from '@/types/res/technicianAfterSalesRes'

// Báo cáo cuối buổi hẹn của kỹ thuật viên. Backend bắt có ít nhất một ảnh của buổi này trước khi nhận báo cáo

function ErrorNotice({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div role="alert">
      <Notice tone="danger">{message}</Notice>
    </div>
  )
}

/**
 * Buổi kiểm tra: không phát hiện lỗi, hoặc liệt kê từng hạng mục hỏng để quản lý xét bảo hành. Có hạng mục thì kỹ thuật
 * viên chọn ở lại công trình (stayOnSite): buổi và khung giờ còn giữ, được duyệt và thanh toán kịp thì sửa luôn
 */
export function InspectionReportForm({ visit }: { visit: TechnicianVisitView }) {
  const send = useInspectionReportMutation()
  const [report, setReport] = useState('')
  const [noFault, setNoFault] = useState(false)
  const [stayOnSite, setStayOnSite] = useState(false)
  const [items, setItems] = useState<ItemDraft[]>([emptyItemDraft()])
  const [error, setError] = useState<string | null>(null)

  const setItem = (index: number, change: Partial<ItemDraft>) =>
    setItems((all) => all.map((item, i) => (i === index ? { ...item, ...change } : item)))

  async function submit() {
    const draft = { report, noFault, stayOnSite, items }
    const problem = inspectionError(draft)
    if (problem) return setError(problem)
    setError(null)
    try {
      const body = inspectionBody(draft)
      await send.mutateAsync({ visitId: visit.visitId, body })
      toast.success(
        body.stayOnSite
          ? 'Đã gửi kết quả kiểm tra. Chờ tại công trình: được duyệt và thanh toán kịp thì bấm Sửa luôn.'
          : 'Đã gửi kết quả kiểm tra.',
      )
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Kết quả kiểm tra" htmlFor="inspection-report" required>
        <Textarea
          id="inspection-report"
          rows={4}
          maxLength={REPORT_MAX}
          value={report}
          onChange={(e) => setReport(e.target.value)}
        />
      </Field>
      <Checkbox
        label="Không phát hiện lỗi"
        description="Hệ thống chạy bình thường, không cần sửa gì."
        checked={noFault}
        onChange={(e) => setNoFault(e.target.checked)}
      />
      {!noFault && (
        <div className="space-y-4">
          <p className="text-body font-medium text-fg">Hạng mục hỏng</p>
          {items.map((item, index) => (
            <div key={index} className="space-y-3 rounded-container border border-line p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-body text-fg-2">Hạng mục {index + 1}</p>
                {items.length > 1 && (
                  <Button
                    size="sm"
                    variant="danger"
                    icon="delete"
                    onClick={() => setItems((all) => all.filter((_, i) => i !== index))}
                  >
                    Bỏ
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tên hạng mục" htmlFor={`item-description-${index}`} required>
                  <Input
                    id={`item-description-${index}`}
                    maxLength={ITEM_DESCRIPTION_MAX}
                    placeholder="Vd: Thay quạt tản nhiệt inverter"
                    value={item.description}
                    onChange={(e) => setItem(index, { description: e.target.value })}
                  />
                </Field>
                <Field label="Thiết bị" htmlFor={`item-asset-${index}`}>
                  <Select
                    id={`item-asset-${index}`}
                    value={item.assetId}
                    onChange={(e) => setItem(index, { assetId: e.target.value })}
                  >
                    <option value="">Không gắn thiết bị</option>
                    {visit.assets.map((asset) => (
                      <option key={asset.assetId} value={asset.assetId}>
                        {assetName(asset)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Chẩn đoán" htmlFor={`item-diagnosis-${index}`} required>
                  <Input
                    id={`item-diagnosis-${index}`}
                    maxLength={ITEM_DIAGNOSIS_MAX}
                    value={item.diagnosis}
                    onChange={(e) => setItem(index, { diagnosis: e.target.value })}
                  />
                </Field>
                <Field label="Vật tư cần" htmlFor={`item-parts-${index}`}>
                  <Input
                    id={`item-parts-${index}`}
                    maxLength={ITEM_PARTS_MAX}
                    value={item.requiredParts}
                    onChange={(e) => setItem(index, { requiredParts: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          ))}
          <Button variant="soft" size="sm" icon="add" onClick={() => setItems((all) => [...all, emptyItemDraft()])}>
            Thêm hạng mục
          </Button>
          <Checkbox
            label="Ở lại công trình để sửa luôn"
            description={`Giữ buổi hẹn mở tới ${formatTime(visit.endsAt)}. Quản lý duyệt hết hạng mục và khách trả phần phải trả kịp thì bạn sửa luôn, không phải hẹn buổi khác.`}
            checked={stayOnSite}
            onChange={(e) => setStayOnSite(e.target.checked)}
          />
        </div>
      )}
      <ErrorNotice message={error} />
      <FormActions>
        <Button icon="send" variant="primary" disabled={send.isPending} onClick={() => void submit()}>
          {send.isPending ? 'Đang gửi…' : 'Gửi kết quả kiểm tra'}
        </Button>
      </FormActions>
    </div>
  )
}

type ResultDraft = { workResult: string; partsUsed: string }

/** Buổi sửa, bảo trì, làm lại: việc đã làm và kết quả từng hạng mục được phép làm */
export function WorkReportForm({ visit }: { visit: TechnicianVisitView }) {
  const send = useWorkReportMutation()
  const authorized = visit.items.filter((i) => i.status === 'AUTHORIZED')
  const [report, setReport] = useState('')
  const [results, setResults] = useState<Record<string, ResultDraft>>({})
  const [findingNote, setFindingNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const resultOf = (itemId: string) => results[itemId] ?? { workResult: '', partsUsed: '' }
  const setResult = (itemId: string, change: Partial<ResultDraft>) =>
    setResults((all) => ({ ...all, [itemId]: { ...resultOf(itemId), ...change } }))

  async function submit() {
    if (!report.trim()) return setError('Ghi việc bạn đã làm.')
    setError(null)
    try {
      await send.mutateAsync({
        visitId: visit.visitId,
        body: {
          report: report.trim(),
          results: authorized.map((item) => ({
            itemId: item.itemId,
            workResult: resultOf(item.itemId).workResult.trim() || null,
            partsUsed: resultOf(item.itemId).partsUsed.trim() || null,
          })),
          replacements: [],
          findingNote: findingNote.trim() || null,
        },
      })
      toast.success('Đã gửi báo cáo. Khách sẽ nghiệm thu.')
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Việc đã làm" htmlFor="work-report" required>
        <Textarea
          id="work-report"
          rows={4}
          maxLength={REPORT_MAX}
          value={report}
          onChange={(e) => setReport(e.target.value)}
        />
      </Field>
      {authorized.length > 0 && (
        <ul className="divide-y divide-line">
          {authorized.map((item) => (
            <li key={item.itemId} className="space-y-3 py-4 first:pt-0">
              <p className="text-body font-medium text-fg">{item.description}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Kết quả" htmlFor={`result-${item.itemId}`}>
                  <Input
                    id={`result-${item.itemId}`}
                    maxLength={2000}
                    value={resultOf(item.itemId).workResult}
                    onChange={(e) => setResult(item.itemId, { workResult: e.target.value })}
                  />
                </Field>
                <Field label="Vật tư đã dùng" htmlFor={`parts-${item.itemId}`}>
                  <Input
                    id={`parts-${item.itemId}`}
                    maxLength={1000}
                    value={resultOf(item.itemId).partsUsed}
                    onChange={(e) => setResult(item.itemId, { partsUsed: e.target.value })}
                  />
                </Field>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Field
        label="Phát hiện thêm"
        htmlFor="work-finding"
        hint="Không bắt buộc. Lỗi khác bạn thấy, khách có thể báo lỗi riêng."
      >
        <Input
          id="work-finding"
          maxLength={2000}
          value={findingNote}
          onChange={(e) => setFindingNote(e.target.value)}
        />
      </Field>
      <ErrorNotice message={error} />
      <FormActions>
        <Button icon="send" variant="primary" disabled={send.isPending} onClick={() => void submit()}>
          {send.isPending ? 'Đang gửi…' : 'Gửi báo cáo'}
        </Button>
      </FormActions>
    </div>
  )
}
