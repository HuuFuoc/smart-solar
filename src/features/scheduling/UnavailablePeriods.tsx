import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Input } from '@/components/common/ui/field'
import { EmptyState, ErrorState, Skeleton } from '@/components/common/ui/states'
import { ConflictList } from '@/features/scheduling/ConflictList'
import { conflictsOf } from '@/features/scheduling/schedulingDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import {
  useAddUnavailablePeriodMutation,
  useRemoveUnavailablePeriodMutation,
  useUnavailablePeriodsQuery,
} from '@/hooks/useTechnicianAdmin'
import { errorMessage } from '@/services/api/errors'
import type { UnavailablePeriodView } from '@/types/res/adminTechniciansRes'

const REASON_MAX = 500
const MAX_DAYS = 366

/** "2026-10-20T08:00" hiểu là giờ Việt Nam. */
const toVnIso = (local: string) => `${local}:00+07:00`

// Ô ngày + ô giờ 24h thay cho datetime-local. Mặc định 08:00 đến 17:00
function AddPeriodForm({ technicianUserId }: { technicianUserId: string }) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [reason, setReason] = useState('')
  const [issue, setIssue] = useState<string | null>(null)
  const [failure, setFailure] = useState<unknown>(null)
  const add = useAddUnavailablePeriodMutation()

  async function submit(e: FormEvent) {
    e.preventDefault()
    setFailure(null)
    if (!from || !to) return setIssue('Nhập đủ thời điểm bắt đầu và kết thúc.')
    const start = new Date(toVnIso(from)).getTime()
    const end = new Date(toVnIso(to)).getTime()
    if (end <= start) return setIssue('Thời điểm kết thúc phải sau lúc bắt đầu.')
    if (end - start > MAX_DAYS * 86_400_000) return setIssue('Mỗi lần nghỉ tối đa một năm.')
    setIssue(null)
    try {
      await add.mutateAsync({
        id: technicianUserId,
        body: { startsAt: toVnIso(from), endsAt: toVnIso(to), reason: reason.trim() || null },
      })
      toast.success('Đã thêm lịch nghỉ.')
      setFrom('')
      setTo('')
      setReason('')
    } catch (error) {
      setFailure(error)
    }
  }

  const conflicts = conflictsOf(failure)
  const message = issue ?? (failure !== null && conflicts.length === 0 ? errorMessage(failure) : null)
  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Từ" htmlFor="leave-from" required>
          <Input
            id="leave-from"
            type="datetime-local"
            step={1800}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
        <Field label="Đến" htmlFor="leave-to" required>
          <Input
            id="leave-to"
            type="datetime-local"
            step={1800}
            min={from || undefined}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Lý do" htmlFor="leave-reason" hint={`Không bắt buộc, tối đa ${REASON_MAX} ký tự.`}>
        <Input id="leave-reason" maxLength={REASON_MAX} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <ConflictList conflicts={conflicts} />
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="soft" type="submit" icon="add" disabled={add.isPending}>
          {add.isPending ? 'Đang thêm…' : 'Thêm lịch nghỉ'}
        </Button>
        {message && (
          <span className="flex items-center gap-1.5 text-body font-medium text-danger" role="alert">
            <Icon name="error" className="shrink-0 text-[20px]" />
            {message}
          </span>
        )}
      </div>
    </form>
  )
}

// Lịch nghỉ của kỹ thuật viên. Đè lên lịch đã có thì backend từ chối và trả về danh sách lịch đó
export function UnavailablePeriods({ technicianUserId }: { technicianUserId: string }) {
  const query = useUnavailablePeriodsQuery(technicianUserId)
  const remove = useRemoveUnavailablePeriodMutation()
  const [removing, setRemoving] = useState<UnavailablePeriodView | null>(null)

  async function confirmRemove() {
    if (!removing) return
    try {
      await remove.mutateAsync({ id: technicianUserId, periodId: removing.id })
      toast.success('Đã bỏ lịch nghỉ.')
      setRemoving(null)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <section aria-labelledby="leave-list" className="space-y-3">
        <h3 id="leave-list" className="text-body font-semibold text-fg">
          Lịch nghỉ sắp tới
        </h3>
        {query.isPending ? (
          <Skeleton className="h-20" />
        ) : query.isError ? (
          <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
        ) : query.data.length === 0 ? (
          <EmptyState title="Không có lịch nghỉ nào sắp tới" />
        ) : (
          <ul className="divide-y divide-line">
            {[...query.data]
              .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
              .map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3 first:pt-0">
                  <div className="min-w-0">
                    <p className="tnum font-medium text-fg">
                      {formatMoment(p.startsAt)} – {formatMoment(p.endsAt)}
                    </p>
                    {p.reason && <p className="text-meta text-fg-2">{p.reason}</p>}
                  </div>
                  <Button size="sm" variant="danger" icon="delete" onClick={() => setRemoving(p)}>
                    Bỏ
                  </Button>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="leave-add" className="space-y-3 border-t border-line pt-6">
        <h3 id="leave-add" className="text-body font-semibold text-fg">
          Thêm lịch nghỉ
        </h3>
        <AddPeriodForm technicianUserId={technicianUserId} />
      </section>

      <ModalDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        dismissible={!remove.isPending}
        aria-label="Bỏ lịch nghỉ"
      >
        <DialogTitle>Bỏ lịch nghỉ này?</DialogTitle>
        {removing && (
          <p className="mt-2 text-body text-fg-2">
            {formatMoment(removing.startsAt)} – {formatMoment(removing.endsAt)}. Khách đặt được giờ trong khoảng này
            ngay sau khi bỏ.
          </p>
        )}
        <DialogFooter>
          <Button icon="close" variant="secondary" disabled={remove.isPending} onClick={() => setRemoving(null)}>
            Giữ lại
          </Button>
          <Button icon="delete" variant="danger" disabled={remove.isPending} onClick={() => void confirmRemove()}>
            {remove.isPending ? 'Đang bỏ…' : 'Bỏ lịch nghỉ'}
          </Button>
        </DialogFooter>
      </ModalDialog>
    </div>
  )
}
