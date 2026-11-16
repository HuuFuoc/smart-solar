import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button, ButtonLink, IconButton, buttonClass } from '@/components/common/ui/button'
import { ModalDialog } from '@/components/common/ui/dialog'
import { addressMapUrl } from '@/features/pre-surveys/preSurveyDisplay'
import { formatDay, formatTime } from '@/features/scheduling/schedulingDisplay'
import { dayMinutes, type DayEntry, type WorkKind } from '@/features/scheduling/workCalendar'

const KIND: Record<WorkKind, { label: string; tone: 'info' | 'ok' | 'warn' }> = {
  survey: { label: 'Khảo sát', tone: 'info' },
  installation: { label: 'Lắp đặt', tone: 'ok' },
  service: { label: 'Bảo hành & Sửa chữa', tone: 'warn' },
}

const TAG_TONES = ['ok', 'info', 'warn', 'danger'] as const

/** 300 phút thành "5h00" */
const formatDuration = (minutes: number) => `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`

function WorkCard({ entry }: { entry: DayEntry }) {
  const { item, continued } = entry
  const kind = KIND[item.kind]
  const map = item.address ? addressMapUrl(item.address) : null
  const statusTone = TAG_TONES.find((t) => t === item.statusTone) ?? 'neutral'
  return (
    <article className="sv-work" data-kind={item.kind}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="sv-tag tnum font-semibold" data-tone={kind.tone}>
          {continued ? 'Tiếp tục' : `${formatTime(item.startsAt)} - ${formatTime(item.endsAt)}`}
        </span>
        <span className="sv-tag" data-tone="plain">
          {kind.label}
        </span>
        {item.code && <span className="font-mono text-meta text-fg-3">{item.code}</span>}
        <span className="sv-tag ml-auto" data-tone={statusTone} data-shape="pill">
          {item.statusLabel}
        </span>
      </div>

      <h3 className="mt-3 text-title font-bold text-fg">{item.title}</h3>

      {(item.address || item.note) && (
        <div className="sv-work-box mt-3 space-y-2">
          {item.address && (
            <p className="flex items-start gap-2 text-body text-fg">
              <Icon name="location_on" className="mt-0.5 shrink-0 text-[20px] text-fg-3" />
              <span>{item.address}</span>
            </p>
          )}
          {item.note && (
            <p className="flex items-start gap-2 text-body text-fg-2">
              <Icon name="description" className="mt-0.5 shrink-0 text-[20px] text-fg-3" />
              <span className="whitespace-pre-line">
                <b className="font-semibold text-fg">Khách mô tả: </b>
                {item.note}
              </span>
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ButtonLink to={item.to} variant="info" icon="visibility">
          {item.actionLabel}
        </ButtonLink>
        {item.phone && (
          <a className={buttonClass('secondary')} href={`tel:${item.phone}`}>
            <Icon name="call" className="-ml-0.5 text-[20px]" />
            Gọi khách hàng ({item.phone})
          </a>
        )}
        {map && (
          <a className={buttonClass('secondary')} href={map} target="_blank" rel="noreferrer">
            <Icon name="navigation" className="-ml-0.5 text-[20px]" />
            Chỉ đường
            <span className="sr-only"> (mở tab mới)</span>
          </a>
        )}
      </div>
    </article>
  )
}

// Hộp thoại việc của một ngày, mở từ lịch tháng / tuần
export function DayWorkDialog({
  day,
  entries,
  onClose,
  onOpenDayPage,
}: {
  /** Ngày đang xem; null khi đóng */
  day: string | null
  entries: DayEntry[]
  onClose: () => void
  onOpenDayPage: (day: string) => void
}) {
  const minutes = day
    ? dayMinutes(
        entries.map((e) => e.item),
        day,
      )
    : 0
  return (
    <ModalDialog open={day !== null} onOpenChange={(open) => !open && onClose()} className="sv-modal max-w-2xl">
      {day && (
        <>
          <header className="flex items-start gap-4 border-b border-line px-6 py-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-container bg-ok-soft text-ok">
              <Icon name="calendar_month" className="text-[24px]" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-title font-semibold text-fg">
                Lịch làm việc: {formatDay(day, { year: true })}
                <span className="sv-tag" data-tone="info" data-shape="pill">
                  {entries.length} công việc
                </span>
              </h2>
            </div>
            <IconButton icon="close" label="Đóng" variant="ghost" onClick={onClose} />
          </header>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto bg-surface-2 px-6 py-5">
            {entries.length === 0 ? (
              <p className="py-8 text-center text-body text-fg-2">Không có việc nào trong ngày này.</p>
            ) : (
              entries.map((entry) => <WorkCard key={`${entry.item.kind}-${entry.item.id}`} entry={entry} />)
            )}
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4">
            {minutes > 0 ? (
              <p className="flex items-center gap-2 text-body text-fg-2">
                <Icon name="schedule" className="text-[20px] text-fg-3" />
                Tổng: <b className="tnum font-semibold text-fg">{formatDuration(minutes)}</b>
              </p>
            ) : (
              <span />
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={onClose}>
                Đóng
              </Button>
              <Button variant="primary" icon="arrow_forward" onClick={() => onOpenDayPage(day)}>
                Đến trang danh sách việc ngày này
              </Button>
            </div>
          </footer>
        </>
      )}
    </ModalDialog>
  )
}
