import { useState } from 'react'
import { toast } from 'sonner'
import { QUOTATION_LIMITS } from '@/common/quotation'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { DateField, Field, Input, Textarea, WithUnit, fieldMessageId } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import {
  formatQuotationMoney,
  isMoney,
  moneyText,
  readMoney,
  validUntilFromDate,
  validUntilRange,
} from '@/features/quotations/quotationDisplay'
import { vnDate } from '@/features/scheduling/schedulingDisplay'
import { useSaveQuotationHeaderMutation } from '@/hooks/useSalesQuotations'
import { errorMessage } from '@/services/api/errors'
import type { QuotationView } from '@/types/res/quotationsRes'
import { readDecimal } from '@/utils/number'

// Chi phí ngoài dòng hàng, giảm giá, thuế, hạn hiệu lực, điều khoản, ghi chú của bản nháp. PUT ghi đè cả phần này nên
// gửi đủ mọi ô. Luật bám ValidateHeader của backend: tiền 0 tới 999.999.999.999, thuế 0–20 %, hạn trong 90 ngày,
// giảm giá không quá số tiền trước giảm

type MoneyKey = 'laborCost' | 'transportCost' | 'otherServiceCost' | 'discountAmount'
type Errors = Partial<Record<MoneyKey | 'taxRatePercent' | 'validUntil', string>>

const MONEY_FIELDS: { key: MoneyKey; label: string; hint?: string }[] = [
  { key: 'laborCost', label: 'Nhân công lắp đặt' },
  { key: 'transportCost', label: 'Vận chuyển' },
  { key: 'otherServiceCost', label: 'Dịch vụ khác', hint: 'Ví dụ thủ tục đấu nối, giám sát từ xa.' },
  { key: 'discountAmount', label: 'Giảm giá' },
]

type Props = { open: boolean; quotation: QuotationView; onClose: () => void }

export function QuotationHeaderDialog({ open, quotation, onClose }: Props) {
  const [pending, setPending] = useState(false)
  return (
    <ModalDialog
      open={open}
      onOpenChange={(next) => !next && !pending && onClose()}
      dismissible={!pending}
      aria-label="Chi phí và điều khoản"
      className="max-w-2xl"
    >
      <HeaderForm quotation={quotation} onClose={onClose} pending={pending} setPending={setPending} />
    </ModalDialog>
  )
}

function HeaderForm({
  quotation: q,
  onClose,
  pending,
  setPending,
}: Omit<Props, 'open'> & { pending: boolean; setPending: (pending: boolean) => void }) {
  const save = useSaveQuotationHeaderMutation()
  const [money, setMoney] = useState<Record<MoneyKey, string>>({
    laborCost: moneyText(q.laborCost),
    transportCost: moneyText(q.transportCost),
    otherServiceCost: moneyText(q.otherServiceCost),
    discountAmount: moneyText(q.discountAmount),
  })
  const [tax, setTax] = useState(String(q.taxRatePercent).replace('.', ','))
  const [validDate, setValidDate] = useState(q.validUntil ? vnDate(q.validUntil) : '')
  const [terms, setTerms] = useState(q.terms ?? '')
  const [notes, setNotes] = useState(q.notes ?? '')
  const [errors, setErrors] = useState<Errors>({})
  const [error, setError] = useState<string | null>(null)
  const range = validUntilRange()
  const vnd = (amount: number) => formatQuotationMoney(amount, q.currency)

  const amounts = Object.fromEntries(MONEY_FIELDS.map((f) => [f.key, readMoney(money[f.key])])) as Record<
    MoneyKey,
    number
  >
  // Số tiền trước giảm theo các ô đang gõ; giảm giá không được vượt
  const subtotal = q.equipmentSubtotal + amounts.laborCost + amounts.transportCost + amounts.otherServiceCost

  function validate(): Errors {
    const next: Errors = {}
    for (const f of MONEY_FIELDS)
      if (!isMoney(amounts[f.key])) next[f.key] = 'Số đồng nguyên, không âm, tối đa 999.999.999.999.'
    if (!next.discountAmount && Number.isFinite(subtotal) && amounts.discountAmount > subtotal)
      next.discountAmount = `Giảm giá không quá số tiền trước giảm (${vnd(subtotal)}).`
    const taxValue = readDecimal(tax)
    if (taxValue == null || taxValue < 0 || taxValue > QUOTATION_LIMITS.maxTaxRatePercent)
      next.taxRatePercent = `Thuế suất từ 0 tới ${QUOTATION_LIMITS.maxTaxRatePercent}%.`
    if (validDate && (validDate < range.min || validDate > range.max))
      next.validUntil = `Chọn ngày trong ${QUOTATION_LIMITS.maxValidityDays} ngày tới.`
    return next
  }

  async function submit() {
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setError(null)
    setPending(true)
    try {
      await save.mutateAsync({
        quotationId: q.quotationId,
        body: {
          revision: q.revision,
          ...amounts,
          taxRatePercent: readDecimal(tax),
          validUntil: validUntilFromDate(validDate),
          terms: terms.trim() || null,
          notes: notes.trim() || null,
        },
      })
      toast.success('Đã lưu chi phí và điều khoản.')
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <DialogTitle>Chi phí và điều khoản</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Tiền thiết bị tính từ các dòng hàng ({vnd(q.equipmentSubtotal)}). Tổng tiền được tính lại khi lưu.
      </p>
      <div className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {MONEY_FIELDS.map((f) => {
            const id = `quotation-${f.key}`
            const value = amounts[f.key]
            return (
              <Field
                key={f.key}
                label={`${f.label} (VND)`}
                htmlFor={id}
                error={errors[f.key]}
                hint={money[f.key].trim() && isMoney(value) ? vnd(value) : f.hint}
              >
                <Input
                  id={id}
                  inputMode="numeric"
                  className="tnum"
                  aria-invalid={Boolean(errors[f.key]) || undefined}
                  aria-describedby={fieldMessageId(id)}
                  value={money[f.key]}
                  onChange={(e) => setMoney((all) => ({ ...all, [f.key]: e.target.value }))}
                />
              </Field>
            )
          })}
          <Field label="Thuế VAT" htmlFor="quotation-tax" error={errors.taxRatePercent}>
            <WithUnit unit="%">
              <Input
                id="quotation-tax"
                inputMode="decimal"
                className="tnum w-24"
                aria-invalid={Boolean(errors.taxRatePercent) || undefined}
                aria-describedby={fieldMessageId('quotation-tax')}
                value={tax}
                onChange={(e) => setTax(e.target.value)}
              />
            </WithUnit>
          </Field>
          <Field
            label="Hiệu lực đến hết ngày"
            htmlFor="quotation-valid-until"
            error={errors.validUntil}
            hint={`Bắt buộc trước khi gửi khách, tối đa ${QUOTATION_LIMITS.maxValidityDays} ngày.`}
          >
            <DateField
              id="quotation-valid-until"
              value={validDate}
              onChange={setValidDate}
              min={range.min}
              max={range.max}
              aria-invalid={Boolean(errors.validUntil) || undefined}
              aria-describedby={fieldMessageId('quotation-valid-until')}
            />
          </Field>
        </div>
        <Field label="Điều khoản" htmlFor="quotation-terms" hint="Thanh toán, bảo hành, tiến độ… Khách đọc được.">
          <Textarea
            id="quotation-terms"
            rows={4}
            maxLength={QUOTATION_LIMITS.termsLength}
            aria-describedby={fieldMessageId('quotation-terms')}
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
          />
        </Field>
        <Field label="Ghi chú gửi khách" htmlFor="quotation-notes">
          <Textarea
            id="quotation-notes"
            rows={2}
            maxLength={QUOTATION_LIMITS.notesLength}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        {error && (
          <div role="alert">
            <Notice tone="danger">{error}</Notice>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={pending} onClick={onClose}>
          Đóng
        </Button>
        <Button icon="save" variant="primary" disabled={pending} onClick={() => void submit()}>
          {pending ? 'Đang lưu…' : 'Lưu'}
        </Button>
      </DialogFooter>
    </>
  )
}
