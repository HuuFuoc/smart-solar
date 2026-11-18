import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Checkbox, DateField, Field, Input, Textarea, WithUnit, fieldMessageId } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { ErrorLine } from '@/features/installation-projects/formParts'
import {
  offerStatusMeta,
  scheduleErrorMessage,
  scheduleWhen,
  slotReasonText,
  withdrawnReasonText,
} from '@/features/installation-schedules/scheduleDisplay'
import {
  SCHEDULE_NOTE_MAX,
  SLOT_OFFER_MAX,
  availabilityRangeErrors,
  offerSlotsProblem,
  openOffers,
} from '@/features/installation-schedules/scheduleRules'
import { addDays, todayVn } from '@/features/scheduling/schedulingDisplay'
import {
  usePublishOffersMutation,
  useTechnicianAvailabilityQuery,
  useTechnicianOffersQuery,
} from '@/hooks/useInstallationSchedules'

// Kỹ thuật viên gửi 1–5 khung thi công cho khách tự chọn trên cổng khách hàng. Khung lấy từ danh sách backend tính theo giờ làm,
// lịch nghỉ, khu vực và việc khác; khung không giữ chỗ nên khách chọn lúc nào backend kiểm lại lúc đó. Gửi lần mới thay mọi
// khung còn mở của hợp đồng

type Props = {
  contractId: string
  title: string
  onClose: () => void
}

export function SlotOfferDialog({ contractId, title, onClose }: Props) {
  const today = todayVn()
  const [from, setFrom] = useState(() => addDays(today, 1))
  const [to, setTo] = useState(() => addDays(today, 14))
  const [days, setDays] = useState('1')
  const [args, setArgs] = useState<{ from: string; to: string; durationDays: number } | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [rangeErrors, setRangeErrors] = useState<ReturnType<typeof availabilityRangeErrors>>({})
  const [error, setError] = useState<string | null>(null)
  const availability = useTechnicianAvailabilityQuery(contractId, args)
  const history = useTechnicianOffersQuery(contractId)
  const publish = usePublishOffersMutation()
  const open = openOffers(history.data ?? [])
  const slots = (availability.data ?? []).filter((s) => picked.includes(s.startsAt))
  const busy = publish.isPending

  function search() {
    const durationDays = Number(days)
    const next = availabilityRangeErrors(from, to, durationDays)
    setRangeErrors(next)
    if (Object.keys(next).length > 0) return
    setPicked([])
    setArgs({ from, to, durationDays })
  }

  function toggle(startsAt: string) {
    setPicked((p) => (p.includes(startsAt) ? p.filter((x) => x !== startsAt) : [...p, startsAt]))
  }

  async function submit() {
    setError(null)
    const problem = offerSlotsProblem(slots, note)
    if (problem) return setError(problem)
    try {
      await publish.mutateAsync({
        contractId,
        body: { slots: slots.map((s) => ({ startsAt: s.startsAt, endsAt: s.endsAt })), note: note.trim() || null },
      })
      toast.success(`Đã gửi ${slots.length} khung cho khách chọn.`)
      onClose()
    } catch (e) {
      setError(scheduleErrorMessage(e))
      void availability.refetch()
    }
  }

  return (
    <ModalDialog
      open
      onOpenChange={(o) => !o && !busy && onClose()}
      dismissible={!busy}
      className="max-w-2xl"
      aria-label="Đề xuất khung thi công"
    >
      <DialogTitle>Đề xuất khung thi công</DialogTitle>
      <p className="mt-2 text-body text-fg-2">{title}</p>

      <div className="mt-4 space-y-4">
        {open.length > 0 && (
          <Notice tone="warn" title={`${open.length} khung đang chờ khách chọn`}>
            <ul className="mt-1 space-y-1">
              {open.map((o) => (
                <li key={o.offerId} className="tnum">
                  {scheduleWhen(o)}
                  {!o.available && <span className="text-danger"> ({slotReasonText(o.unavailableReason)})</span>}
                </li>
              ))}
            </ul>
            <p className="mt-2">Gửi lần mới sẽ thay các khung này.</p>
          </Notice>
        )}

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9rem] sm:items-start">
          <Field label="Từ ngày" htmlFor="offer-from" error={rangeErrors.range}>
            <DateField id="offer-from" value={from} min={today} disabled={busy} onChange={setFrom} />
          </Field>
          <Field label="Đến ngày" htmlFor="offer-to">
            <DateField id="offer-to" value={to} min={from || today} disabled={busy} onChange={setTo} />
          </Field>
          <Field label="Thi công trong" htmlFor="offer-days" error={rangeErrors.duration}>
            <WithUnit unit="ngày">
              <Input
                id="offer-days"
                inputMode="numeric"
                value={days}
                disabled={busy}
                aria-invalid={Boolean(rangeErrors.duration) || undefined}
                aria-describedby={fieldMessageId('offer-days')}
                onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))}
              />
            </WithUnit>
          </Field>
        </div>
        <Button icon="search" variant="info" disabled={busy || availability.isFetching} onClick={search}>
          {availability.isFetching ? 'Đang tìm…' : 'Xem khung trống'}
        </Button>

        {args && availability.isError && <ErrorLine message={scheduleErrorMessage(availability.error)} />}
        {args && availability.data && availability.data.length === 0 && (
          <p className="text-body text-fg-2">Không có ngày làm việc nào trong khoảng này.</p>
        )}
        {availability.data && availability.data.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="text-body font-medium text-fg">
              Chọn tối đa {SLOT_OFFER_MAX} khung ({picked.length} đã chọn)
            </legend>
            <ul className="divide-y divide-line border-y border-line">
              {availability.data.map((s) => {
                const checked = picked.includes(s.startsAt)
                return (
                  <li key={s.startsAt} className="py-2">
                    <Checkbox
                      checked={checked}
                      disabled={busy || !s.available || (!checked && picked.length >= SLOT_OFFER_MAX)}
                      onChange={() => toggle(s.startsAt)}
                      label={<span className="tnum">{scheduleWhen(s)}</span>}
                      description={s.available ? undefined : slotReasonText(s.reason)}
                    />
                  </li>
                )
              })}
            </ul>
          </fieldset>
        )}

        <Field label="Ghi chú cho khách" htmlFor="offer-note" optional>
          <Textarea
            id="offer-note"
            rows={2}
            maxLength={SCHEDULE_NOTE_MAX}
            value={note}
            disabled={busy}
            placeholder="Ví dụ: Cần có người ở nhà để mở cửa sân thượng."
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>

        {(history.data ?? []).some((o) => o.status !== 'OPEN') && (
          <details className="border-t border-line pt-4">
            <summary className="tap cursor-pointer text-body font-medium text-fg">Các lần đề xuất trước</summary>
            <ul className="mt-2 space-y-2">
              {(history.data ?? [])
                .filter((o) => o.status !== 'OPEN')
                .map((o) => {
                  const meta = offerStatusMeta(o.status)
                  return (
                    <li key={o.offerId} className="flex flex-wrap items-baseline gap-x-3 text-body">
                      <span className="tnum text-fg">{scheduleWhen(o)}</span>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      {withdrawnReasonText(o.withdrawnReason) && (
                        <span className="text-meta text-fg-2">{withdrawnReasonText(o.withdrawnReason)}</span>
                      )}
                    </li>
                  )
                })}
            </ul>
          </details>
        )}
      </div>

      <DialogFooter className="items-center">
        <ErrorLine message={error} />
        <Button icon="close" variant="secondary" disabled={busy} onClick={onClose}>
          Đóng
        </Button>
        <Button icon="send" variant="primary" disabled={busy || slots.length === 0} onClick={() => void submit()}>
          {busy ? 'Đang gửi…' : slots.length > 0 ? `Gửi ${slots.length} khung cho khách` : 'Gửi cho khách'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
