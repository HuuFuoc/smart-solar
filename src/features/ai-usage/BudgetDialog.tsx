import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Checkbox, Field, Input, Textarea, WithUnit } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import {
  BUDGET_FIELDS,
  budgetBounds,
  budgetFormOf,
  budgetFormProblems,
  budgetUpdate,
  type BudgetField,
  type BudgetForm,
} from '@/features/ai-usage/aiUsageRules'
import { useUpdateBudgetMutation } from '@/hooks/useAdminRagUsage'
import { errorMessage, isApiError } from '@/services/api/errors'
import type { AiBudgetView } from '@/types/res/adminRagUsageRes'

// Sửa ngân sách và giới hạn của trợ lý: PUT /admin/rag-budget chỉ gửi ô đã đổi kèm phiên bản lúc mở hộp. Lưu là tạo và áp
// dụng ngay một phiên bản cấu hình mới; người khác vừa đổi (409) thì báo, tải lại, không ghi đè

const NOTES_MAX = 500

const FIELDS: Record<BudgetField, { label: string; unit: string; money?: boolean }> = {
  dailyBudgetUsd: { label: 'Ngân sách ngày', unit: 'USD', money: true },
  monthlyBudgetUsd: { label: 'Ngân sách tháng', unit: 'USD', money: true },
  monthlyIngestionBudgetUsd: { label: 'Ngân sách nạp tài liệu tháng', unit: 'USD', money: true },
  userRequestsPerDay: { label: 'Số câu mỗi người mỗi ngày', unit: 'câu' },
  userConcurrency: { label: 'Số câu cùng lúc mỗi người', unit: 'câu' },
  globalConcurrency: { label: 'Số câu cùng lúc toàn hệ thống', unit: 'câu' },
  maxQuestionCharacters: { label: 'Ký tự tối đa mỗi câu hỏi', unit: 'ký tự' },
  generationTimeoutSeconds: { label: 'Thời gian chờ trả lời', unit: 'giây' },
}

const rangeText = (min: number, max: number, money?: boolean) =>
  `Từ ${String(min).replace('.', ',')} đến ${String(max).replace('.', ',')}${money ? ' USD, tối đa 2 chữ số lẻ' : ''}.`

function BudgetForm({ budget, onClose }: { budget: AiBudgetView; onClose: () => void }) {
  const [form, setForm] = useState<BudgetForm>(() => budgetFormOf(budget))
  const [generationEnabled, setGenerationEnabled] = useState(budget.generationEnabled)
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [confirmOff, setConfirmOff] = useState(false)
  const update = useUpdateBudgetMutation()
  const problems = budgetFormProblems(form, budget.ceilings)
  const serverErrors = isApiError(update.error) ? update.error.fieldErrors : {}
  const body = budgetUpdate(budget, form, generationEnabled, notes)

  async function save() {
    setSubmitted(true)
    setConfirmOff(false)
    if (Object.keys(problems).length > 0 || !body || notes.trim().length > NOTES_MAX) return
    try {
      const result = await update.mutateAsync(body)
      toast.success(`Đã áp dụng giới hạn mới (cấu hình v${result.active.version}).`)
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
      // Người khác vừa đổi cấu hình: hộp đóng, trang tải lại số mới
      if (isApiError(e) && e.status === 409) onClose()
    }
  }

  return (
    <>
      <DialogTitle>Sửa ngân sách và giới hạn</DialogTitle>
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!body) return
          if (!generationEnabled && budget.generationEnabled) setConfirmOff(true)
          else void save()
        }}
      >
        <Checkbox
          checked={generationEnabled}
          disabled={update.isPending}
          onChange={(e) => setGenerationEnabled(e.target.checked)}
          label="Cho trợ lý soạn câu trả lời"
          description="Tắt thì trợ lý chỉ trả lời các câu tư vấn cấu hình (không tốn phí), có hiệu lực với mọi người sau vài giây."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {BUDGET_FIELDS.map((field) => {
            const meta = FIELDS[field]
            const { min, max } = budgetBounds(field, budget.ceilings)
            const id = `budget-${field}`
            const error = submitted ? problems[field] : undefined
            return (
              <Field
                key={field}
                label={meta.label}
                htmlFor={id}
                hint={rangeText(min, max, meta.money)}
                error={error ?? (serverErrors[field] ? 'Giá trị chưa hợp lệ, kiểm tra lại.' : undefined)}
              >
                <WithUnit unit={meta.unit}>
                  <Input
                    id={id}
                    inputMode={meta.money ? 'decimal' : 'numeric'}
                    className="w-32"
                    value={form[field]}
                    disabled={update.isPending}
                    aria-invalid={Boolean(error) || undefined}
                    aria-describedby={`${id}-msg`}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  />
                </WithUnit>
              </Field>
            )
          })}
        </div>
        <Field
          label="Ghi chú"
          htmlFor="budget-notes"
          optional
          hint={`Lý do đổi, lưu vào lịch sử cấu hình. Tối đa ${NOTES_MAX} ký tự.`}
          error={submitted && notes.trim().length > NOTES_MAX ? `Tối đa ${NOTES_MAX} ký tự.` : undefined}
        >
          <Textarea
            id="budget-notes"
            rows={2}
            value={notes}
            disabled={update.isPending}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        {confirmOff && (
          <div role="alert">
            <Notice tone="warn" title="Tắt soạn câu trả lời cho mọi người?">
              Trợ lý sẽ chỉ trả lời câu tư vấn cấu hình cho tới khi bật lại. Bấm "Tắt và lưu" để áp dụng.
            </Notice>
          </div>
        )}
        <DialogFooter>
          <Button icon="close" variant="secondary" disabled={update.isPending} onClick={onClose}>
            Huỷ
          </Button>
          {confirmOff ? (
            <Button icon="pause_circle" variant="warn" disabled={update.isPending} onClick={() => void save()}>
              {update.isPending ? 'Đang lưu…' : 'Tắt và lưu'}
            </Button>
          ) : (
            <Button type="submit" icon="save" variant="primary" disabled={update.isPending || !body}>
              {update.isPending ? 'Đang lưu…' : body ? 'Lưu giới hạn' : 'Chưa có thay đổi'}
            </Button>
          )}
        </DialogFooter>
      </form>
    </>
  )
}

export function BudgetDialog({
  budget,
  open,
  onOpenChange,
}: {
  budget: AiBudgetView
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <ModalDialog open={open} onOpenChange={onOpenChange} className="max-w-2xl" aria-label="Sửa ngân sách và giới hạn">
      {/* Người khác vừa lưu phiên bản mới trong lúc mở thì form lấy lại số đang áp dụng */}
      <BudgetForm key={budget.activeVersion} budget={budget} onClose={() => onOpenChange(false)} />
    </ModalDialog>
  )
}
