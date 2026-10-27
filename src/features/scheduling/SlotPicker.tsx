import { useId, useState } from 'react'
import { IconButton } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { EmptyState, ErrorState, Skeleton } from '@/components/common/ui/states'
import { addMonths, monthCells, monthLabel, monthOf } from '@/features/scheduling/calendarMonth'
import {
  BOOKING_HORIZON_DAYS,
  addDays,
  coverageText,
  formatDay,
  formatTime,
  formatTimeRange,
  todayVn,
} from '@/features/scheduling/schedulingDisplay'
import { useSurveySlotsQuery } from '@/hooks/useBooking'
import { errorMessage } from '@/services/api/errors'
import type { SurveySlot } from '@/types/res/surveySlotsRes'
import { cx } from '@/utils/cx'

// Chọn giờ khảo sát: lịch tháng (đặt được trong 30 ngày tới) rồi các giờ trống backend trả cho ngày đó
// Không tự đoán giờ trống. Khách chỉ chọn giờ, rồi kỹ thuật viên trong khu vực của công trình tự nhận lịch

const WEEK_HEADER = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

const choice = cx(
  'press flex cursor-pointer items-center justify-center rounded-control border text-body',
  'border-line-2 bg-canvas text-fg [&:not(:has(:checked)):not(:has(:disabled)):hover]:border-fg-3 [&:not(:has(:checked)):not(:has(:disabled)):hover]:bg-hover',
  'has-checked:border-accent-line has-checked:bg-accent-soft has-checked:font-semibold has-checked:text-accent-fg',
  'has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-ring',
  'has-disabled:cursor-not-allowed has-disabled:border-line has-disabled:bg-surface-2 has-disabled:text-fg-3',
)

/* Ghi chú của backend (tiếng Anh) khi ngày không còn giờ. Câu lạ thì in nguyên văn. */
function noteText(note: string | null | undefined) {
  if (!note) return null
  if (/no technician works on this date|start time has passed/i.test(note))
    return 'Ngày này không có ca làm, hoặc các giờ đã qua.'
  return note
}

// Ô ngày không viền cho lịch nhẹ mắt; hôm nay có viền mảnh, ngày đang chọn tô màu như các lựa chọn khác
const dayCell = cx(
  'press flex h-11 cursor-pointer items-center justify-center rounded-control border text-body text-fg lg:h-10',
  '[&:not(:has(:checked)):not(:has(:disabled)):hover]:bg-hover',
  'has-checked:border-accent-line has-checked:bg-accent-soft has-checked:font-semibold has-checked:text-accent-fg',
  'has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-ring',
  'has-disabled:cursor-not-allowed has-disabled:text-fg-3',
)

function MonthCalendar({ value, onChange, today }: { value: string; onChange: (date: string) => void; today: string }) {
  const name = useId()
  const last = addDays(today, BOOKING_HORIZON_DAYS - 1)
  const [month, setMonth] = useState(() => monthOf(value))
  return (
    <fieldset className="max-w-sm">
      <legend className="mb-3 text-body font-medium text-fg">Chọn ngày</legend>
      <div className="mb-2 flex items-center justify-between gap-2">
        <IconButton
          icon="chevron_left"
          label="Tháng trước"
          variant="secondary"
          disabled={month <= monthOf(today)}
          onClick={() => setMonth(addMonths(month, -1))}
        />
        <p className="text-body font-semibold text-fg" aria-live="polite">
          {monthLabel(month)}
        </p>
        <IconButton
          icon="chevron_right"
          label="Tháng sau"
          variant="secondary"
          disabled={month >= monthOf(last)}
          onClick={() => setMonth(addMonths(month, 1))}
        />
      </div>
      <div aria-hidden className="mb-1 grid grid-cols-7 gap-1 text-center text-meta text-fg-3">
        {WEEK_HEADER.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {monthCells(month).map((date, i) =>
          date === null ? (
            <span key={`blank-${i}`} aria-hidden />
          ) : (
            // Ngày đã qua hoặc quá 30 ngày tới thì không chọn được
            <label key={date} className={cx(dayCell, date === today ? 'border-line-2' : 'border-transparent')}>
              <input
                type="radio"
                name={name}
                value={date}
                checked={value === date}
                disabled={date < today || date > last}
                onChange={() => onChange(date)}
                className="sr-only"
                aria-label={`${date === today ? 'Hôm nay, ' : ''}${formatDay(date, { year: true })}`}
              />
              <span className="tnum">{Number(date.slice(8))}</span>
            </label>
          ),
        )}
      </div>
    </fieldset>
  )
}

function SlotGroup({
  label,
  slots,
  value,
  onChange,
  name,
  disabledStart,
}: {
  label: string
  slots: SurveySlot[]
  value: string | null
  onChange: (slot: SurveySlot) => void
  name: string
  disabledStart?: string | null
}) {
  if (slots.length === 0) return null
  return (
    <div>
      <p className="mb-2 text-meta text-fg-2">{label}</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2">
        {slots.map((slot) => {
          const current =
            disabledStart != null && new Date(slot.startsAt).getTime() === new Date(disabledStart).getTime()
          const disabled = current || !slot.canBook
          return (
            <label key={slot.startsAt} className={cx(choice, 'tnum h-11 flex-col px-2 lg:h-12')}>
              <input
                type="radio"
                name={name}
                value={slot.startsAt}
                checked={value === slot.startsAt}
                disabled={disabled}
                onChange={() => onChange(slot)}
                className="sr-only"
              />
              <span>{formatTimeRange(slot.startsAt, slot.endsAt)}</span>
              {current && <span className="text-meta font-normal">Giờ hiện tại</span>}
            </label>
          )
        })}
      </div>
    </div>
  )
}

export function SlotPicker({
  propertySiteId,
  date,
  onDateChange,
  value,
  onChange,
  currentStartsAt,
}: {
  propertySiteId: string
  date: string
  onDateChange: (date: string) => void
  /** startsAt của giờ đang chọn (chuỗi đúng như API trả). */
  value: string | null
  onChange: (slot: SurveySlot | null) => void
  /** Giờ của lịch hiện tại khi khách đổi giờ: hiện nhưng không chọn được. */
  currentStartsAt?: string | null
}) {
  const today = todayVn()
  const slots = useSurveySlotsQuery(propertySiteId, date)
  const name = useId()
  const list = slots.data?.slots ?? []
  // Ca sáng / chiều theo giờ Việt Nam của giờ bắt đầu.
  const morning = list.filter((s) => formatTime(s.startsAt) < '12:00')
  const afternoon = list.filter((s) => formatTime(s.startsAt) >= '12:00')
  const note = noteText(slots.data?.note)

  // Dùng container query vì khối nằm trong cột 2/3
  return (
    <div className="@container">
      <div className="grid gap-6 @2xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <MonthCalendar
          value={date}
          today={today}
          onChange={(next) => {
            onDateChange(next)
            onChange(null)
          }}
        />

        <fieldset className="min-w-0" aria-busy={slots.isFetching}>
          <legend className="mb-3 text-body font-medium text-fg">Giờ trống ngày {formatDay(date)}</legend>
          {slots.isPending ? (
            <div
              aria-label="Đang tải giờ trống"
              className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2"
            >
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-11 lg:h-12" />
              ))}
            </div>
          ) : slots.isError ? (
            <ErrorState
              title="Không tải được giờ trống."
              message={errorMessage(slots.error)}
              onRetry={
                slots.error.status >= 400 && slots.error.status < 500 && slots.error.status !== 429
                  ? undefined
                  : () => slots.refetch()
              }
            />
          ) : slots.data && coverageText(slots.data.coverageStatus) ? (
            // Khu vực của công trình chưa có kỹ thuật viên nhận lịch: báo lý do, khách liên hệ kinh doanh
            <Notice tone="warn" title="Chưa đặt được giờ khảo sát">
              {coverageText(slots.data.coverageStatus)} Bộ phận kinh doanh sẽ liên hệ để xếp lịch cho bạn.
            </Notice>
          ) : list.length === 0 ? (
            <EmptyState title="Ngày này không còn giờ trống" description={note ?? 'Chọn một ngày khác trong lịch.'} />
          ) : (
            <div className="space-y-4">
              <SlotGroup
                label="Buổi sáng"
                slots={morning}
                value={value}
                onChange={onChange}
                name={name}
                disabledStart={currentStartsAt}
              />
              <SlotGroup
                label="Buổi chiều"
                slots={afternoon}
                value={value}
                onChange={onChange}
                name={name}
                disabledStart={currentStartsAt}
              />
            </div>
          )}
        </fieldset>
      </div>
    </div>
  )
}
