import { useId } from 'react'
import { Notice } from '@/components/common/ui/lists'
import { EmptyState, ErrorState, Skeleton } from '@/components/common/ui/states'
import {
  BOOKING_HORIZON_DAYS,
  addDays,
  dayChip,
  formatDay,
  formatTime,
  formatTimeRange,
  todayVn,
} from '@/features/scheduling/components/schedulingDisplay'
import { useSurveySlotsQuery } from '@/hooks/useBooking'
import { errorMessage } from '@/services/api/errors'
import type { SurveySlot } from '@/types/res/surveySlotsRes'
import { cx } from '@/utils/cx'

/*
  Chọn giờ khảo sát của khách: lưới 30 ngày (hôm nay → 29 ngày sau, giới hạn đặt trước của backend) xếp theo cột thứ như
  lịch tháng, rồi các giờ bắt đầu backend trả cho ngày đó. Không tự vẽ khung 08:00–17:00 rồi đoán giờ nào trống: chỉ hiện
  giờ đã kiểm tra được kỹ thuật viên + đường đi; ngày không còn giờ thì nói lý do (`note`). Khách chỉ chọn giờ, không chọn
  người (hệ thống giữ chỗ một kỹ thuật viên phù hợp, kinh doanh phân công sau).
  Cả ngày lẫn giờ là nhóm radio thật (input ẩn trong label, như Segmented): Tab vào nhóm, phím mũi tên đi giữa các ô.
*/

const WEEK_HEADER = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

/** Ô chọn (ngày hoặc giờ): "đang chọn" là nền accent-soft + viền accent-line, như lựa chọn đang dùng ở mọi nơi khác. */
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
  if (/no technician with a configured base/i.test(note)) return 'Chưa có kỹ thuật viên nào nhận lịch vào ngày này.'
  if (/no technician works on this date|start time has passed/i.test(note)) return 'Ngày này không có ca làm, hoặc các giờ đã qua.'
  const unverified = note.match(/^(\d+) time\(s\) could not be verified/i)
  if (unverified) return `${unverified[1]} giờ chưa kiểm tra được đường đi (dịch vụ bản đồ đang lỗi) nên chưa hiện. Thử lại sau ít phút.`
  return note
}

function DayGrid({ value, onChange, today }: { value: string; onChange: (date: string) => void; today: string }) {
  const name = useId()
  const days = Array.from({ length: BOOKING_HORIZON_DAYS }, (_, i) => addDays(today, i))
  // Cột theo thứ (T2 đầu tuần): ô trống trước hôm nay để hôm nay đứng đúng cột của nó.
  const lead = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7
  return (
    <fieldset>
      <legend className="mb-3 text-body font-medium text-fg">Ngày khảo sát</legend>
      <div aria-hidden className="mb-1 grid grid-cols-7 gap-1 text-center text-meta text-fg-3">
        {WEEK_HEADER.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, i) => (
          <span key={`lead-${i}`} aria-hidden />
        ))}
        {days.map((date, i) => {
          const chip = dayChip(date)
          // Số tháng chỉ ghi ở ô đầu và ngày mùng 1, đủ để biết đang ở tháng nào mà không lặp ở mọi ô.
          const showMonth = i === 0 || date.endsWith('-01')
          return (
            <label key={date} className={cx(choice, 'h-12 flex-col gap-1 px-0.5 leading-none')}>
              <input
                type="radio"
                name={name}
                value={date}
                checked={value === date}
                onChange={() => onChange(date)}
                className="sr-only"
                aria-label={`${date === today ? 'Hôm nay, ' : ''}${formatDay(date, { year: true })}`}
              />
              <span className="tnum">{showMonth ? chip.date : chip.date.slice(0, 2)}</span>
              {/* Ô hẹp (~48px) không đủ chỗ cho chữ "Hôm nay": chấm dưới số, chữ đầy đủ nằm ở aria-label và chú thích dưới lưới. */}
              <span aria-hidden className={cx('size-1.5 rounded-full', date === today ? 'bg-accent' : 'bg-transparent')} />
            </label>
          )
        })}
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-meta text-fg-2">
        <span aria-hidden className="size-1.5 rounded-full bg-accent" />
        Hôm nay
      </p>
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
          const current = disabledStart != null && new Date(slot.startsAt).getTime() === new Date(disabledStart).getTime()
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

  // Lịch ngày và giờ đứng cạnh nhau theo bề rộng của khung (container query), không theo màn hình: khối nằm trong cột 2/3.
  return (
    <div className="@container">
    <div className="grid gap-6 @2xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <DayGrid
        value={date}
        today={today}
        onChange={(next) => {
          onDateChange(next)
          onChange(null)
        }}
      />

      <fieldset className="min-w-0" aria-busy={slots.isFetching}>
        <legend className="mb-3 text-body font-medium text-fg">
          Giờ bắt đầu, {formatDay(date)}
          {slots.data && <span className="font-normal text-fg-2"> (mỗi lần khảo sát {slots.data.appointmentDurationMinutes} phút)</span>}
        </legend>
        {slots.isPending ? (
          <div aria-label="Đang tải giờ trống" className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-11 lg:h-12" />
            ))}
          </div>
        ) : slots.isError && slots.error.code === 'PROPERTY_SITE_LOCATION_REQUIRED' ? (
          // Địa điểm khai trước khi toạ độ bắt buộc (12/10/2026): không có API sửa địa điểm nên chỉ hướng dẫn.
          <Notice tone="warn" title="Địa điểm chưa có toạ độ">
            Không có toạ độ công trình nên chưa tính được đường đi và giờ khảo sát. Liên hệ bộ phận kinh doanh, hoặc làm lại đánh
            giá sơ bộ với toạ độ công trình.
          </Notice>
        ) : slots.isError ? (
          <ErrorState
            title="Không tải được giờ trống."
            message={errorMessage(slots.error)}
            onRetry={slots.error.status >= 400 && slots.error.status < 500 && slots.error.status !== 429 ? undefined : () => slots.refetch()}
          />
        ) : list.length === 0 ? (
          <EmptyState
            title="Ngày này không còn giờ trống"
            description={note ?? 'Chọn một ngày khác trong lịch.'}
          />
        ) : (
          <div className="space-y-4">
            <SlotGroup label="Buổi sáng" slots={morning} value={value} onChange={onChange} name={name} disabledStart={currentStartsAt} />
            <SlotGroup label="Buổi chiều" slots={afternoon} value={value} onChange={onChange} name={name} disabledStart={currentStartsAt} />
            {slots.data && slots.data.unverifiedSlotCount > 0 && note && <Notice tone="warn">{note}</Notice>}
          </div>
        )}
      </fieldset>
    </div>
    </div>
  )
}
