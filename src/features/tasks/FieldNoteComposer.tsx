import { useState } from 'react'
import { Button } from '@/components/common/stitch-ui/Button'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { cn } from '@/utils/cn'

/* Khối "Add Field Note" bên phải task_detail_timeline: nút ghi âm, ô nhập và nút gửi. */
export type FieldNoteComposerProps = {
  dictation: { title: string; hint: string }
  placeholder: string
  submitLabel: string
  className?: string
}

/** Cột sóng âm tĩnh, lặp lại đúng nhịp cao/thấp như thiết kế. */
const waveform = [
  { height: 'h-3', tone: 'bg-primary', pulse: true },
  { height: 'h-5', tone: 'bg-surface-tint', pulse: false },
  { height: 'h-2', tone: 'bg-primary', pulse: true },
  { height: 'h-6', tone: 'bg-primary-container', pulse: false },
  { height: 'h-4', tone: 'bg-primary', pulse: true },
  { height: 'h-2', tone: 'bg-surface-tint', pulse: false },
]

export function FieldNoteComposer({ dictation, placeholder, submitLabel, className }: FieldNoteComposerProps) {
  const [note, setNote] = useState('')

  return (
    <div className={cn('flex flex-col gap-space-md', className)}>
      <div className="flex flex-col gap-space-xs rounded-xl bg-surface-container-low p-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <button
              type="button"
              aria-label={dictation.title}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-on-primary shadow transition-all hover:bg-primary-container"
            >
              <Icon name="mic" className="text-[18px]" />
            </button>
            <div className="flex flex-col">
              <span className="text-label-md font-semibold text-on-surface">{dictation.title}</span>
              <span className="text-label-sm text-surface-tint">{dictation.hint}</span>
            </div>
          </div>

          <div aria-hidden="true" className="flex h-6 items-center gap-0.5 px-2">
            {waveform.map((bar, index) => (
              <span
                key={index}
                className={cn('w-1 rounded-full', bar.height, bar.tone)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-space-xs">
        <textarea
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full resize-none rounded-xl border-0 bg-surface p-space-sm text-body-md text-on-surface shadow-inner focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-space-xs text-on-surface-variant">
            <button
              type="button"
              title="Đính kèm ảnh"
              aria-label="Đính kèm ảnh"
              className="rounded-lg p-1.5 transition-all hover:bg-surface-container"
            >
              <Icon name="add_photo_alternate" className="text-[20px]" />
            </button>
            <button
              type="button"
              title="Thêm thẻ"
              aria-label="Thêm thẻ"
              className="rounded-lg p-1.5 transition-all hover:bg-surface-container"
            >
              <Icon name="sell" className="text-[20px]" />
            </button>
          </div>
          <Button size="md" iconRight="send">
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
