import { useState } from 'react'
import { toast } from 'sonner'
import { FOLLOW_UP_OUTCOMES } from '@/common/afterSales'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { DateField, Field, Input, Radio, Textarea, TimeSelect } from '@/components/common/ui/field'
import { ErrorLine } from '@/features/installation-projects/formParts'
import {
  closesTask,
  FOLLOW_UP_NOTE_MAX,
  FOLLOW_UP_OUTCOME_CODES,
  FOLLOW_UP_RESULT_MAX,
  followUpBody,
  followUpErrors,
} from '@/features/after-sales/salesTaskRules'
import { salesTaskTypeLabel } from '@/features/after-sales/serviceDisplay'
import { formatTime, todayVn, vnTimestamp } from '@/features/scheduling/schedulingDisplay'
import { useFollowUpMutation } from '@/hooks/useSalesAfterSales'
import { errorMessage } from '@/services/api/errors'
import type { SalesTaskView } from '@/types/res/salesAfterSalesRes'

// Ghi một lần liên hệ khách của việc nhắc (đặt lịch bảo trì của gói, nghiệm thu). Chưa có kết quả cuối thì việc vẫn mở;
// kết quả cuối đóng việc. Hệ thống tự đóng việc nhắc bảo trì quá hạn (theo cài đặt), FE không tự đóng

/** Giờ hiện tại theo giờ Việt Nam, làm tròn xuống 15 phút */
function nowSlot() {
  const [h, m] = formatTime(new Date().toISOString()).split(':')
  return `${h}:${String(Math.floor(Number(m) / 15) * 15).padStart(2, '0')}`
}

export function FollowUpDialog({ task, onClose }: { task: SalesTaskView; onClose: () => void }) {
  const followUp = useFollowUpMutation()
  const [date, setDate] = useState(todayVn)
  const [time, setTime] = useState(nowSlot)
  const [result, setResult] = useState('')
  const [note, setNote] = useState('')
  const [outcome, setOutcome] = useState('')
  const [errors, setErrors] = useState<ReturnType<typeof followUpErrors>>({})
  const [error, setError] = useState<string | null>(null)
  const maintenance = task.taskType === 'MAINTENANCE_FOLLOW_UP'

  async function submit() {
    setError(null)
    const input = { contactedAt: date && time ? vnTimestamp(date, time) : '', result, note, outcome }
    const found = followUpErrors(input)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    try {
      await followUp.mutateAsync({ taskId: task.taskId, body: followUpBody(input) })
      toast.success(closesTask(outcome) ? 'Đã ghi liên hệ và đóng việc.' : 'Đã ghi liên hệ. Việc vẫn mở để gọi lại.')
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <ModalDialog
      open
      onOpenChange={(open) => !open && !followUp.isPending && onClose()}
      dismissible={!followUp.isPending}
      className="max-w-lg"
      aria-label="Ghi liên hệ khách"
    >
      <DialogTitle>Ghi liên hệ khách</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        {salesTaskTypeLabel(task.taskType)}. Việc này chưa kèm số điện thoại của khách; tra theo mã yêu cầu hoặc hỏi
        quản lý.
      </p>
      <div className="mt-4 space-y-4">
        <Field label="Liên hệ lúc" htmlFor="follow-up-date" required error={errors.contactedAt}>
          <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-3">
            <DateField id="follow-up-date" label="Ngày liên hệ" value={date} max={todayVn()} onChange={setDate} />
            <TimeSelect aria-label="Giờ liên hệ" step={15} to="23:45" value={time} onChange={setTime} />
          </div>
        </Field>
        <Field
          label="Kết quả liên hệ"
          htmlFor="follow-up-result"
          required
          error={errors.result}
          hint={`Ví dụ: khách hẹn tối nay tự đặt lịch. Tối đa ${FOLLOW_UP_RESULT_MAX} ký tự.`}
        >
          <Input
            id="follow-up-result"
            maxLength={FOLLOW_UP_RESULT_MAX}
            aria-required
            aria-invalid={errors.result ? true : undefined}
            value={result}
            onChange={(e) => setResult(e.target.value)}
          />
        </Field>
        <Field
          label="Ghi chú"
          htmlFor="follow-up-note"
          error={errors.note}
          hint={`Không bắt buộc, tối đa ${FOLLOW_UP_NOTE_MAX} ký tự.`}
        >
          <Textarea
            id="follow-up-note"
            rows={2}
            maxLength={FOLLOW_UP_NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <fieldset className="space-y-3">
          <legend className="text-body font-medium text-fg">Kết quả cuối</legend>
          <Radio
            name="follow-up-outcome"
            label="Chưa có, sẽ liên hệ lại"
            description="Việc vẫn mở."
            checked={outcome === ''}
            onChange={() => setOutcome('')}
          />
          {FOLLOW_UP_OUTCOME_CODES.map((code) => (
            <Radio
              key={code}
              name="follow-up-outcome"
              label={FOLLOW_UP_OUTCOMES[code]?.label ?? code}
              description={
                code === 'UNREACHABLE' && maintenance
                  ? 'Đóng việc. Lượt bảo trì thành chưa thực hiện, không bị trừ, khách vẫn đặt được khi gói còn hạn.'
                  : FOLLOW_UP_OUTCOMES[code]?.hint
              }
              checked={outcome === code}
              onChange={() => setOutcome(code)}
            />
          ))}
          {errors.outcome && <p className="text-meta text-danger">{errors.outcome}</p>}
        </fieldset>
      </div>
      <DialogFooter className="items-center">
        <ErrorLine message={error} />
        <Button icon="close" variant="secondary" disabled={followUp.isPending} onClick={onClose}>
          Huỷ
        </Button>
        <Button icon="save" variant="primary" disabled={followUp.isPending} onClick={() => void submit()}>
          {followUp.isPending ? 'Đang lưu…' : 'Lưu liên hệ'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
