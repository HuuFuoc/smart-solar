import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { Field, Input, Select, Textarea } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { formatVnd, quotableItems } from '@/features/after-sales/serviceDisplay'
import { formatWarrantyMonths } from '@/features/installations/installationDisplay'
import { useIssueQuotationMutation, useRepairWarrantyOptionsQuery } from '@/hooks/useSalesAfterSales'
import { errorMessage } from '@/services/api/errors'
import type { ServiceRequestView } from '@/types/res/customerAfterSalesRes'

// Kinh doanh lập báo giá. Báo lỗi: mỗi hạng mục khách trả tiền đúng một dòng (backend bắt đủ, không thừa);
// bảo trì lẻ: các dòng tự ghi. Tiền là số nguyên VND, mỗi dòng phải có tiền vật tư hoặc tiền công

type LineDraft = { itemId: string | null; description: string; parts: string; labor: string }

const toAmount = (text: string) => (text.trim() === '' ? 0 : Number(text))
const isAmount = (text: string) => Number.isInteger(toAmount(text)) && toAmount(text) >= 0

function firstLines(request: ServiceRequestView): LineDraft[] {
  if (request.kind === 'FAULT')
    return quotableItems(request).map((i) => ({ itemId: i.itemId, description: i.description, parts: '', labor: '' }))
  return [{ itemId: null, description: 'Bảo trì: vệ sinh tấm pin, kiểm tra đấu nối và inverter', parts: '', labor: '' }]
}

export function QuotationForm({ request }: { request: ServiceRequestView }) {
  const fault = request.kind === 'FAULT'
  const issue = useIssueQuotationMutation()
  const options = useRepairWarrantyOptionsQuery({ enabled: fault })
  const [lines, setLines] = useState<LineDraft[]>(() => firstLines(request))
  const [months, setMonths] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const total = lines.reduce(
    (sum, l) => sum + (isAmount(l.parts) ? toAmount(l.parts) : 0) + (isAmount(l.labor) ? toAmount(l.labor) : 0),
    0,
  )
  const defaultOption = options.data?.find((o) => o.isDefault)

  const setLine = (index: number, change: Partial<LineDraft>) =>
    setLines((all) => all.map((line, i) => (i === index ? { ...line, ...change } : line)))

  async function submit() {
    if (lines.length === 0) return setError('Thêm ít nhất một dòng.')
    if (lines.some((l) => !l.description.trim())) return setError('Ghi nội dung của mỗi dòng.')
    if (lines.some((l) => !isAmount(l.parts) || !isAmount(l.labor))) return setError('Tiền là số nguyên VND, không âm.')
    if (lines.some((l) => toAmount(l.parts) + toAmount(l.labor) <= 0))
      return setError('Mỗi dòng phải có tiền vật tư hoặc tiền công.')
    setError(null)
    try {
      await issue.mutateAsync({
        requestId: request.requestId,
        body: {
          lines: lines.map((l) => ({
            itemId: l.itemId,
            description: l.description.trim(),
            partsAmount: toAmount(l.parts),
            laborAmount: toAmount(l.labor),
          })),
          repairWarrantyMonths: fault && months ? Number(months) : null,
          note: note.trim() || null,
        },
      })
      toast.success('Đã gửi báo giá cho khách.')
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-line">
        {lines.map((line, index) => (
          <li
            key={line.itemId ?? index}
            className="grid gap-3 py-4 first:pt-0 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
          >
            <Field label="Nội dung" htmlFor={`line-description-${index}`}>
              <Input
                id={`line-description-${index}`}
                maxLength={300}
                value={line.description}
                onChange={(e) => setLine(index, { description: e.target.value })}
              />
            </Field>
            <Field label="Vật tư (VND)" htmlFor={`line-parts-${index}`}>
              <Input
                id={`line-parts-${index}`}
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                value={line.parts}
                onChange={(e) => setLine(index, { parts: e.target.value })}
              />
            </Field>
            <Field label="Công (VND)" htmlFor={`line-labor-${index}`}>
              <Input
                id={`line-labor-${index}`}
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                value={line.labor}
                onChange={(e) => setLine(index, { labor: e.target.value })}
              />
            </Field>
            {/* Báo lỗi: số dòng đúng bằng số hạng mục nên không thêm, bỏ dòng */}
            {!fault && lines.length > 1 && (
              <Button
                size="sm"
                variant="danger"
                icon="delete"
                className="self-end"
                onClick={() => setLines((all) => all.filter((_, i) => i !== index))}
              >
                Bỏ
              </Button>
            )}
          </li>
        ))}
      </ul>
      {!fault && (
        <Button
          variant="soft"
          size="sm"
          icon="add"
          onClick={() => setLines((all) => [...all, { itemId: null, description: '', parts: '', labor: '' }])}
        >
          Thêm dòng
        </Button>
      )}
      <p className="tnum text-body text-fg">
        Tổng cộng: <span className="font-semibold">{formatVnd(total)}</span>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {fault && (options.data?.length ?? 0) > 0 && (
          <Field label="Bảo hành phần sửa" htmlFor="quotation-warranty">
            <Select id="quotation-warranty" value={months} onChange={(e) => setMonths(e.target.value)}>
              <option value="">
                Mặc định{defaultOption ? ` (${formatWarrantyMonths(defaultOption.months)})` : ''}
              </option>
              {options.data?.map((o) => (
                <option key={o.optionId} value={o.months}>
                  {formatWarrantyMonths(o.months)}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Ghi chú cho khách" htmlFor="quotation-note" className={fault ? undefined : 'sm:col-span-2'}>
          <Textarea
            id="quotation-note"
            rows={2}
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>
      {error && (
        <div role="alert">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <Button icon="send" variant="primary" disabled={issue.isPending} onClick={() => void submit()}>
        {issue.isPending ? 'Đang gửi…' : 'Gửi báo giá'}
      </Button>
    </div>
  )
}
