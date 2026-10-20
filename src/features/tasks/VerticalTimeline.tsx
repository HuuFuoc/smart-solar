import { Avatar, type AvatarTone } from '@/components/common/stitch-ui/Avatar'
import { Card } from '@/components/common/stitch-ui/Card'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { StatusBadge, type StatusVariant } from '@/components/common/stitch-ui/StatusBadge'
import { cn } from '@/utils/cn'

/*
 * Dòng thời gian dọc của "Chronological Audit Log" (task_detail_timeline):
 * đường kẻ dọc, nút tròn có icon, mỗi mục là một card nhật ký.
 * Khác Timeline trong components/common/stitch-ui (stepper ngang của Lifecycle Progression).
 */
export type TimelineNodeTone = 'primary' | 'accent' | 'tint' | 'muted'

export type TimelineMedia = {
  src: string
  alt: string
  /** Nhãn góc dưới ảnh, ví dụ "Roof 28°" */
  label?: string
  /** Lớp phủ thay nhãn, ví dụ "+5 more" */
  overlay?: string
}

export type TimelineEntry = {
  id: string
  /** Icon trong nút tròn trên đường kẻ */
  nodeIcon: string
  nodeTone: TimelineNodeTone
  author: { name: string; initials: string; tone?: AvatarTone }
  /** Badge chức danh cạnh tên */
  role?: { label: string; variant: StatusVariant }
  timestamp: string
  /** Câu mô tả; `strong` in đậm giữa câu, `tail` là phần còn lại */
  body: { text: string; strong?: string; tail?: string }
  media?: TimelineMedia[]
  /** Dải ghi chú nền nhạt dưới nội dung */
  note?: { icon: string; text: string }
  /** Dòng phụ màu surface-tint */
  subNote?: string
  /** Chip xác nhận cuối card */
  chips?: { icon: string; label: string }[]
}

const nodeToneClasses: Record<TimelineNodeTone, string> = {
  primary: 'bg-primary text-on-primary',
  accent: 'bg-primary-container text-on-primary',
  tint: 'bg-surface-tint text-on-primary',
  muted: 'bg-surface-container-high text-primary',
}

export type VerticalTimelineProps = {
  entries: TimelineEntry[]
  className?: string
}

export function VerticalTimeline({ entries, className }: VerticalTimelineProps) {
  return (
    <ol className={cn('relative flex flex-col gap-space-lg pl-6', className)}>
      <div aria-hidden="true" className="absolute bottom-4 left-2.5 top-3 w-0.5 bg-surface-container-high" />

      {entries.map((entry) => (
        <li key={entry.id} className="relative flex flex-col gap-space-xs">
          <div
            aria-hidden="true"
            className={cn(
              'absolute -left-6 top-1.5 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-surface',
              nodeToneClasses[entry.nodeTone],
            )}
          >
            <Icon name={entry.nodeIcon} className="text-[12px]" />
          </div>

          <Card padding="md" interactive className="flex flex-col gap-space-sm">
            <div className="flex flex-wrap items-center justify-between gap-space-xs">
              <div className="flex items-center gap-space-xs">
                <Avatar size="sm" initials={entry.author.initials} tone={entry.author.tone ?? 'primary'} />
                <span className="text-label-md font-semibold text-on-surface">{entry.author.name}</span>
                {entry.role && (
                  <StatusBadge variant={entry.role.variant} size="sm" dot={false}>
                    {entry.role.label}
                  </StatusBadge>
                )}
              </div>
              <span className="text-label-sm text-on-surface-variant">{entry.timestamp}</span>
            </div>

            <p className="text-body-md text-on-surface">
              {entry.body.text}
              {entry.body.strong && <strong className="font-bold"> {entry.body.strong}</strong>}
              {entry.body.tail && <span> {entry.body.tail}</span>}
            </p>

            {entry.media && entry.media.length > 0 && (
              <div className="grid grid-cols-2 gap-space-xs pt-space-xs sm:grid-cols-4">
                {entry.media.map((item) => (
                  <div
                    key={item.src + (item.label ?? item.overlay ?? '')}
                    className="group/img relative aspect-video overflow-hidden rounded-xl bg-surface-container shadow-sm"
                  >
                    <img
                      src={item.src}
                      alt={item.alt}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                    />
                    {item.overlay ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-on-background/40 text-label-sm font-bold text-on-primary backdrop-blur-xs">
                        {item.overlay}
                      </div>
                    ) : (
                      item.label && (
                        <span className="absolute bottom-1 left-1.5 rounded bg-on-background/70 px-1.5 py-0.5 text-label-sm text-on-primary backdrop-blur-sm">
                          {item.label}
                        </span>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}

            {entry.note && (
              <div className="flex items-center gap-space-xs rounded-xl bg-surface-container-low p-space-xs">
                <Icon name={entry.note.icon} className="text-[18px] text-surface-tint" />
                <span className="text-label-sm font-semibold text-on-surface">{entry.note.text}</span>
              </div>
            )}

            {entry.subNote && <span className="text-label-sm text-surface-tint">{entry.subNote}</span>}

            {entry.chips && entry.chips.length > 0 && (
              <div className="flex flex-wrap items-center gap-space-xs pt-space-2xs">
                {entry.chips.map((chip) => (
                  <span
                    key={chip.label}
                    className="flex items-center gap-1 rounded-lg bg-surface-container px-2.5 py-1 text-label-sm text-on-surface-variant"
                  >
                    <Icon name={chip.icon} className="text-[14px] text-surface-tint" />
                    {chip.label}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </li>
      ))}
    </ol>
  )
}
