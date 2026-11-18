import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import {
  DateField,
  Field,
  Input,
  Select,
  Textarea,
  TimeSelect,
  WithUnit,
  fieldMessageId,
} from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { ErrorLine } from '@/features/installation-projects/formParts'
import { scheduleErrorMessage, scheduleWhen, slotReasonText } from '@/features/installation-schedules/scheduleDisplay'
import {
  SCHEDULE_NOTE_MAX,
  availabilityRangeErrors,
  scheduleBody,
  scheduleFormErrors,
  slotToForm,
  type ScheduleForm,
} from '@/features/installation-schedules/scheduleRules'
import { addDays, todayVn } from '@/features/scheduling/schedulingDisplay'
import {
  useProposeStaffScheduleMutation,
  useProposeTechnicianScheduleMutation,
  useTechnicianAvailabilityQuery,
} from '@/hooks/useInstallationSchedules'
import { useTechniciansQuery } from '@/hooks/useTechnicianAdmin'
import type { InstallationScheduleView } from '@/types/res/installationSchedulesRes'

// Ghi hoặc đổi ngày thi công đã thống nhất trực tiếp với khách. Kỹ thuật viên ghi cho chính mình (xem khung trống của mình rồi
// chọn, hoặc gõ ngày giờ); quản lý / quản trị ghi thay khi kỹ thuật viên khảo sát không làm được (chọn người khác, bỏ trống là kỹ
// thuật viên đã khảo sát). Lịch chỉ là dự kiến, không giữ chỗ; hệ thống xác nhận khi hợp đồng đã trả tiền và đã ký. Đổi lịch
// đang có thì bắt buộc lý do và gửi revision của lịch đó

type Props = {
  contractId: string
  /** "HD-…, Nhà anh Minh": để người dùng biết đang hẹn cho hợp đồng nào */
  title: string
  /** Lịch đang hiệu lực; null là ghi lần đầu */
  live: InstallationScheduleView | null
  by: 'technician' | 'staff'
  onClose: () => void
}

type Slot = { startsAt: string; endsAt: string }

/**
 * Khung trống của chính kỹ thuật viên (giờ làm, lịch nghỉ, khu vực, việc khác, lịch đã hẹn khác). Chỉ gọi khi bấm "Xem khung
 * trống" vì backend giới hạn 15 lần / phút; chọn một khung thì đổ vào ô ngày giờ bên dưới, khách không chọn gì trong ứng dụng
 */
function FreeSlots({
  contractId,
  disabled,
  onPick,
}: {
  contractId: string
  disabled: boolean
  onPick: (slot: Slot) => void
}) {
  const today = todayVn()
  const [from, setFrom] = useState(() => addDays(today, 1))
  const [to, setTo] = useState(() => addDays(today, 14))
  const [days, setDays] = useState('1')
  const [args, setArgs] = useState<{ from: string; to: string; durationDays: number } | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [rangeErrors, setRangeErrors] = useState<ReturnType<typeof availabilityRangeErrors>>({})
  const availability = useTechnicianAvailabilityQuery(contractId, args)

  function search() {
    const durationDays = Number(days)
    const next = availabilityRangeErrors(from, to, durationDays)
    setRangeErrors(next)
    if (Object.keys(next).length > 0) return
    setPicked(null)
    setArgs({ from, to, durationDays })
  }

  return (
    <details className="rounded-container border border-line p-3" open={args !== null || undefined}>
      <summary className="tap cursor-pointer text-body font-medium text-fg">Xem khung trống của bạn</summary>
      <div className="mt-3 space-y-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem] sm:items-start">
          <Field label="Từ ngày" htmlFor="slot-from" error={rangeErrors.range}>
            <DateField id="slot-from" value={from} min={today} disabled={disabled} onChange={setFrom} />
          </Field>
          <Field label="Đến ngày" htmlFor="slot-to">
            <DateField id="slot-to" value={to} min={from || today} disabled={disabled} onChange={setTo} />
          </Field>
          <Field label="Thi công trong" htmlFor="slot-days" error={rangeErrors.duration}>
            <WithUnit unit="ngày">
              <Input
                id="slot-days"
                inputMode="numeric"
                value={days}
                disabled={disabled}
                aria-invalid={Boolean(rangeErrors.duration) || undefined}
                aria-describedby={fieldMessageId('slot-days')}
                onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))}
              />
            </WithUnit>
          </Field>
        </div>
        <Button icon="search" variant="info" size="sm" disabled={disabled || availability.isFetching} onClick={search}>
          {availability.isFetching ? 'Đang tìm…' : 'Xem khung trống'}
        </Button>
        {args && availability.isError && <ErrorLine message={scheduleErrorMessage(availability.error)} />}
        {args && availability.data?.length === 0 && (
          <p className="text-body text-fg-2">Không có ngày làm việc nào trong khoảng này.</p>
        )}
        {availability.data && availability.data.length > 0 && (
          <ul className="max-h-60 divide-y divide-line overflow-y-auto border-y border-line">
            {availability.data.map((slot) => (
              <li key={slot.startsAt} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
                <span className="min-w-0">
                  <span className="tnum block text-body text-fg">{scheduleWhen(slot)}</span>
                  {!slot.available && <span className="block text-meta text-fg-2">{slotReasonText(slot.reason)}</span>}
                </span>
                {slot.available && (
                  <Button
                    size="sm"
                    variant={picked === slot.startsAt ? 'soft' : 'secondary'}
                    icon={picked === slot.startsAt ? 'check' : 'event_available'}
                    disabled={disabled}
                    aria-pressed={picked === slot.startsAt}
                    onClick={() => {
                      setPicked(slot.startsAt)
                      onPick(slot)
                    }}
                  >
                    {picked === slot.startsAt ? 'Đã chọn' : 'Chọn'}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  )
}

function initialForm(): ScheduleForm {
  const date = addDays(todayVn(), 3)
  return { date, startTime: '08:00', endDate: date, endTime: '17:00', agreementNote: '', reason: '' }
}

export function ScheduleDialog({ contractId, title, live, by, onClose }: Props) {
  const technicianWrite = useProposeTechnicianScheduleMutation()
  const staffWrite = useProposeStaffScheduleMutation()
  const technicians = useTechniciansQuery({ enabled: by === 'staff' })
  const [form, setForm] = useState<ScheduleForm>(initialForm)
  const [technicianId, setTechnicianId] = useState('')
  const [errors, setErrors] = useState<Partial<Record<keyof ScheduleForm, string>>>({})
  const [error, setError] = useState<string | null>(null)
  const busy = technicianWrite.isPending || staffWrite.isPending
  const set = (patch: Partial<ScheduleForm>) => setForm((f) => ({ ...f, ...patch }))
  const today = todayVn()

  async function submit() {
    setError(null)
    const next = scheduleFormErrors(form, live !== null)
    setErrors(next)
    if (Object.keys(next).length > 0) return
    try {
      const body = scheduleBody(form, live, by === 'staff' ? technicianId || null : null)
      const view =
        by === 'technician'
          ? await technicianWrite.mutateAsync({ contractId, body })
          : await staffWrite.mutateAsync({ contractId, body })
      toast.success(
        view.status === 'CONFIRMED'
          ? 'Đã ghi lịch và xác nhận (hợp đồng đã hoàn tất).'
          : view.status === 'RESCHEDULE_REQUIRED'
            ? 'Đã ghi lịch nhưng chưa xác nhận được; xem lý do ở lịch.'
            : view.awaitingContractSignature
              ? 'Đã ghi lịch dự kiến. Lịch được xác nhận tự động khi hợp đồng được duyệt bản ký.'
              : 'Đã ghi lịch dự kiến. Lịch được xác nhận khi hợp đồng đã thanh toán.',
      )
      onClose()
    } catch (e) {
      setError(scheduleErrorMessage(e))
    }
  }

  return (
    <ModalDialog
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      dismissible={!busy}
      className="max-w-xl"
      aria-label={live ? 'Đổi ngày thi công' : 'Hẹn ngày thi công'}
    >
      <DialogTitle>{live ? 'Đổi ngày thi công' : 'Hẹn ngày thi công'}</DialogTitle>
      <p className="mt-2 text-body text-fg-2">{title}</p>
      {live && <p className="mt-1 text-body text-fg-2">Lịch đang có: {scheduleWhen(live)}.</p>}

      <div className="mt-4 space-y-4">
        {live?.customerChangeRequestNote && (
          <Notice tone="warn" title="Khách xin đổi ngày">
            <span className="whitespace-pre-line">{live.customerChangeRequestNote}</span>
          </Notice>
        )}
        {by === 'technician' && (
          <FreeSlots contractId={contractId} disabled={busy} onPick={(slot) => set(slotToForm(slot))} />
        )}
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
          <Field label="Ngày bắt đầu" htmlFor="schedule-date" required error={errors.date}>
            <DateField
              id="schedule-date"
              value={form.date}
              min={today}
              disabled={busy}
              onChange={(date) => set({ date, endDate: form.endDate < date ? date : form.endDate })}
            />
          </Field>
          <Field label="Giờ bắt đầu" htmlFor="schedule-start">
            <TimeSelect
              id="schedule-start"
              value={form.startTime}
              from="06:00"
              to="20:00"
              disabled={busy}
              onChange={(startTime) => set({ startTime })}
            />
          </Field>
          <Field label="Ngày kết thúc" htmlFor="schedule-end-date" required error={errors.endDate}>
            <DateField
              id="schedule-end-date"
              value={form.endDate}
              min={form.date || today}
              disabled={busy}
              onChange={(endDate) => set({ endDate })}
            />
          </Field>
          <Field label="Giờ kết thúc" htmlFor="schedule-end">
            <TimeSelect
              id="schedule-end"
              value={form.endTime}
              from="06:00"
              to="21:00"
              disabled={busy}
              onChange={(endTime) => set({ endTime })}
            />
          </Field>
        </div>

        {by === 'staff' && (
          <Field
            label="Kỹ thuật viên"
            htmlFor="schedule-technician"
            optional
            hint="Bỏ trống là kỹ thuật viên đã khảo sát. Hệ thống kiểm tra giờ làm, lịch nghỉ, khu vực và việc khác."
          >
            <Select
              id="schedule-technician"
              value={technicianId}
              disabled={busy || technicians.isPending}
              aria-describedby={fieldMessageId('schedule-technician')}
              onChange={(e) => setTechnicianId(e.target.value)}
            >
              <option value="">{technicians.isPending ? 'Đang tải…' : 'Kỹ thuật viên đã khảo sát'}</option>
              {(technicians.data ?? [])
                .filter((t) => t.readyForScheduling)
                .map((t) => (
                  <option key={t.technicianUserId} value={t.technicianUserId}>
                    {t.fullName}
                  </option>
                ))}
            </Select>
          </Field>
        )}

        <Field
          label="Khách đồng ý thế nào"
          htmlFor="schedule-agreement"
          required
          error={errors.agreementNote}
          hint="Ví dụ: Khách đồng ý qua điện thoại lúc 15:00 ngày 17/11."
        >
          <Textarea
            id="schedule-agreement"
            rows={2}
            maxLength={SCHEDULE_NOTE_MAX}
            aria-required
            aria-invalid={Boolean(errors.agreementNote) || undefined}
            aria-describedby={fieldMessageId('schedule-agreement')}
            value={form.agreementNote}
            disabled={busy}
            onChange={(e) => set({ agreementNote: e.target.value })}
          />
        </Field>
        {live && (
          <Field label="Lý do đổi ngày" htmlFor="schedule-reason" required error={errors.reason}>
            <Textarea
              id="schedule-reason"
              rows={2}
              maxLength={SCHEDULE_NOTE_MAX}
              aria-required
              aria-invalid={Boolean(errors.reason) || undefined}
              aria-describedby={fieldMessageId('schedule-reason')}
              value={form.reason}
              disabled={busy}
              onChange={(e) => set({ reason: e.target.value })}
            />
          </Field>
        )}
        <p className="text-meta text-fg-2">
          Lịch chỉ là dự kiến và chưa giữ chỗ; hệ thống xác nhận khi hợp đồng đã thanh toán và đã được duyệt bản ký.
        </p>
      </div>

      <DialogFooter className="items-center">
        <ErrorLine message={error} />
        <Button icon="close" variant="secondary" disabled={busy} onClick={onClose}>
          Đóng
        </Button>
        <Button icon="event_available" variant="primary" disabled={busy} onClick={() => void submit()}>
          {busy ? 'Đang lưu…' : live ? 'Lưu ngày mới' : 'Ghi lịch'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
