import { useState } from 'react'
import { toast } from 'sonner'
import { DISPATCH_SESSIONS, MAX_DISPATCH_WINDOWS, type DispatchSession } from '@/common/dispatch'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button, IconButton } from '@/components/common/ui/button'
import { DateField, Field, Select, Textarea } from '@/components/common/ui/field'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/common/ui/panel'
import { toPreferredWindow, windowProblems, type WindowDraft } from '@/features/dispatch/dispatchDisplay'
import {
  BOOKING_HORIZON_DAYS,
  addDays,
  coverageText,
  formatMoment,
  initialBookingDate,
  todayVn,
} from '@/features/scheduling/schedulingDisplay'
import { useCreateDispatchMutation } from '@/hooks/useDispatch'
import { errorMessage } from '@/services/api/errors'

const NOTE_MAX = 1000

let lastKey = 0
const newWindow = (date: string, session: DispatchSession = 'morning'): WindowDraft => ({
  key: ++lastKey,
  date,
  session,
})

// Khu vực của công trình chưa có kỹ thuật viên nhận lịch: khách chọn vài khung giờ tiện,
// Smart Solar xếp người rồi phân công thẳng hoặc gửi đề xuất giờ để khách đồng ý
export function DispatchRequestForm({
  surveyRequestId,
  coverageStatus,
  startDate,
  onCancel,
  onDone,
}: {
  surveyRequestId: string
  /** Vì sao không đặt được giờ, để nói rõ cho khách */
  coverageStatus?: string | null
  /** Ngày khách đang xem ở lịch đặt giờ */
  startDate?: string
  onCancel: () => void
  onDone: () => void
}) {
  const today = todayVn()
  const lastDay = addDays(today, BOOKING_HORIZON_DAYS - 1)
  const [windows, setWindows] = useState<WindowDraft[]>(() => [newWindow(startDate ?? initialBookingDate())])
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const create = useCreateDispatchMutation()
  const problems = windowProblems(windows)
  const reason = coverageStatus ? coverageText(coverageStatus) : null

  const update = (key: number, change: Partial<WindowDraft>) => {
    setWindows((all) => all.map((w) => (w.key === key ? { ...w, ...change } : w)))
    setError(null)
  }

  /** Khung mới là ngày sau khung cuối, không quá ngày cuối được đặt */
  const addWindow = () =>
    setWindows((all) => {
      const next = addDays(all[all.length - 1]?.date ?? today, 1)
      return [...all, newWindow(next > lastDay ? lastDay : next)]
    })

  async function submit() {
    if (problems.some(Boolean)) return setError('Sửa các khung giờ được đánh dấu.')
    setError(null)
    try {
      const result = await create.mutateAsync({
        surveyRequestId,
        preferredWindows: windows.map(toPreferredWindow),
        note: note.trim() || null,
      })
      toast.success(
        result.created
          ? `Đã gửi. Smart Solar sẽ phản hồi trước ${formatMoment(result.reviewDueAt)}.`
          : 'Yêu cầu xếp kỹ thuật viên của bạn đã được gửi trước đó.',
      )
      onDone()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <Panel raised>
      <PanelHeader
        title="Nhờ Smart Solar xếp kỹ thuật viên"
        description={`${reason ? `${reason} ` : ''}Chọn tối đa ${MAX_DISPATCH_WINDOWS} khung giờ bạn tiện, nhân viên sẽ xếp người và báo lại.`}
      />
      <PanelBody className="space-y-4">
        <fieldset className="space-y-3">
          <legend className="mb-1 text-body font-medium text-fg">Khung giờ bạn tiện</legend>
          {windows.map((w, i) => (
            <div key={w.key}>
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Ngày" htmlFor={`dispatch-date-${w.key}`} className="w-full sm:w-48">
                  <DateField
                    id={`dispatch-date-${w.key}`}
                    min={today}
                    max={lastDay}
                    value={w.date}
                    onChange={(value) => value && update(w.key, { date: value })}
                  />
                </Field>
                <Field label="Buổi" htmlFor={`dispatch-session-${w.key}`} className="w-full sm:w-64">
                  <Select
                    id={`dispatch-session-${w.key}`}
                    value={w.session}
                    onChange={(e) => update(w.key, { session: e.target.value as DispatchSession })}
                  >
                    {DISPATCH_SESSIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                {windows.length > 1 && (
                  <IconButton
                    icon="delete"
                    label={`Bỏ khung giờ ${i + 1}`}
                    variant="danger-quiet"
                    onClick={() => setWindows((all) => all.filter((x) => x.key !== w.key))}
                  />
                )}
              </div>
              {problems[i] && (
                <p className="mt-1 text-meta text-danger" role="alert">
                  {problems[i]}
                </p>
              )}
            </div>
          ))}
          {windows.length < MAX_DISPATCH_WINDOWS && (
            <Button icon="add" size="sm" variant="soft" onClick={addWindow}>
              Thêm khung giờ
            </Button>
          )}
        </fieldset>
        <Field
          label="Ghi chú"
          htmlFor="dispatch-note"
          hint={`Không bắt buộc, tối đa ${NOTE_MAX} ký tự. Ví dụ: giờ ra vào nhà xưởng, người liên hệ tại công trình.`}
        >
          <Textarea
            id="dispatch-note"
            rows={3}
            maxLength={NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </PanelBody>
      <PanelFooter className="mt-6 border-t border-line pt-4">
        {error && (
          <span className="flex basis-full items-center gap-1.5 text-body font-medium text-danger" role="alert">
            <Icon name="error" className="shrink-0 text-[20px]" />
            {error}
          </span>
        )}
        <Button icon="close" variant="secondary" disabled={create.isPending} onClick={onCancel}>
          Thôi
        </Button>
        <Button
          icon="send"
          variant="primary"
          disabled={create.isPending}
          onClick={() => void submit()}
          className="w-full sm:w-auto"
        >
          {create.isPending ? 'Đang gửi…' : 'Gửi yêu cầu'}
        </Button>
      </PanelFooter>
    </Panel>
  )
}
