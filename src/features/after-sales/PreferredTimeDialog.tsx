import { useState, type ReactNode } from 'react'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { DateField, Field, Textarea, TimeSelect } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { bookingDays, preferredStartProblem, type BookingLimits } from '@/features/after-sales/customerServiceRules'
import { vnTimestamp } from '@/features/scheduling/schedulingDisplay'
import { errorMessage } from '@/services/api/errors'

// Chọn giờ muốn hẹn bảo trì (đặt lượt của gói, đổi giờ). Giờ gửi kèm +07:00. Lịch chỉ mở các ngày đủ điều kiện theo giờ máy;
// backend vẫn kiểm lại theo giờ của nó và cài đặt hiện hành, lỗi thì hiện nguyên câu đã dịch, không tự gửi lại

const formatDay = (day: string) => day.split('-').reverse().join('/')

export function PreferredTimeDialog({
  open,
  title,
  children,
  limits,
  submitLabel,
  icon,
  withNote = false,
  onSubmit,
  onClose,
}: {
  open: boolean
  title: string
  /** Mô tả dưới tiêu đề */
  children?: ReactNode
  /** `now` lấy lúc mở hộp thoại */
  limits: Omit<BookingLimits, 'now'>
  submitLabel: string
  icon: string
  /** Có ô ghi chú (chỉ khi backend lưu ghi chú) */
  withNote?: boolean
  /** Gửi lên backend; lỗi ném ra được hiện trong hộp thoại */
  onSubmit: (preferredStartsAt: string, note: string | null) => Promise<unknown>
  onClose: () => void
}) {
  const [pending, setPending] = useState(false)
  return (
    <ModalDialog
      open={open}
      onOpenChange={(next) => !next && !pending && onClose()}
      dismissible={!pending}
      aria-label={title}
      className="max-w-lg"
    >
      {open && (
        <PreferredTimeForm
          title={title}
          limits={limits}
          submitLabel={submitLabel}
          icon={icon}
          withNote={withNote}
          pending={pending}
          setPending={setPending}
          onSubmit={onSubmit}
          onClose={onClose}
        >
          {children}
        </PreferredTimeForm>
      )}
    </ModalDialog>
  )
}

function PreferredTimeForm({
  title,
  children,
  limits,
  submitLabel,
  icon,
  withNote,
  pending,
  setPending,
  onSubmit,
  onClose,
}: {
  title: string
  children?: ReactNode
  limits: Omit<BookingLimits, 'now'>
  submitLabel: string
  icon: string
  withNote: boolean
  pending: boolean
  setPending: (pending: boolean) => void
  onSubmit: (preferredStartsAt: string, note: string | null) => Promise<unknown>
  onClose: () => void
}) {
  const [now] = useState(() => Date.now())
  const { minDay, maxDay } = bookingDays({ ...limits, now })
  const closed = maxDay !== null && maxDay < minDay
  const [date, setDate] = useState(minDay)
  const [time, setTime] = useState('08:00')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (pending) return
    const startsAt = vnTimestamp(date, time)
    const problem =
      !date || date < minDay || (maxDay !== null && date > maxDay)
        ? `Chọn ngày từ ${formatDay(minDay)}${maxDay ? ` đến ${formatDay(maxDay)}` : ''}.`
        : preferredStartProblem(startsAt, { ...limits, now: Date.now() })
    if (problem) return setError(problem)
    setError(null)
    setPending(true)
    try {
      await onSubmit(startsAt, note.trim() || null)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <DialogTitle>{title}</DialogTitle>
      {children && <div className="mt-2 space-y-2 text-body text-fg-2">{children}</div>}
      {closed ? (
        <Notice tone="warn" className="mt-4">
          Không còn ngày nào đặt được trước hạn của lượt này (cần đặt trước ít nhất {limits.leadDays} ngày). Liên hệ
          Smart Solar để được hỗ trợ.
        </Notice>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="Ngày muốn hẹn"
            htmlFor="preferred-date"
            hint={maxDay ? `Từ ${formatDay(minDay)} đến ${formatDay(maxDay)}.` : `Từ ${formatDay(minDay)} trở đi.`}
            required
          >
            <DateField id="preferred-date" value={date} min={minDay} max={maxDay ?? undefined} onChange={setDate} />
          </Field>
          <Field label="Giờ" htmlFor="preferred-time" required>
            <TimeSelect id="preferred-time" value={time} from="08:00" to="16:00" onChange={setTime} />
          </Field>
          {withNote && (
            <Field label="Ghi chú" htmlFor="preferred-note" hint="Không bắt buộc." className="sm:col-span-2">
              <Textarea
                id="preferred-note"
                rows={3}
                maxLength={2000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
          )}
        </div>
      )}
      {error && (
        <div role="alert" className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={pending} onClick={onClose}>
          Đóng
        </Button>
        {!closed && (
          <Button icon={icon} variant="primary" disabled={pending} onClick={() => void submit()}>
            {pending ? 'Đang gửi…' : submitLabel}
          </Button>
        )}
      </DialogFooter>
    </>
  )
}
