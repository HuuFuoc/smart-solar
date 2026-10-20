import type { ReactNode } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { cx } from '@/utils/cx'

export type ActivityItem = {
  time: ReactNode
  title: ReactNode
  body?: ReactNode
  by?: string
  /** Trạng thái của mốc: done, current, todo. Có `state` thì vẽ thành dòng thời gian */
  state?: 'done' | 'current' | 'todo'
}

// Dòng thời gian: mốc đã xong tô màu chính, mốc đang tới viền màu chính, chưa tới viền xám
function Timeline({ items, className }: { items: ActivityItem[]; className?: string }) {
  return (
    <ol className={className}>
      {items.map((item, i) => {
        const last = i === items.length - 1
        return (
          <li key={i} className="relative grid grid-cols-[20px_1fr] gap-x-3 pb-5 last:pb-0">
            {!last && (
              <span
                aria-hidden
                className={cx(
                  'absolute top-6 bottom-1 left-2.25 w-0.5',
                  item.state === 'done' ? 'bg-accent-line' : 'bg-line',
                )}
              />
            )}
            <span aria-hidden className="flex h-5 items-center justify-center">
              {item.state === 'done' ? (
                <span className="flex size-5 items-center justify-center rounded-full bg-accent text-on-accent">
                  <Icon name="check" className="text-[16px]" />
                </span>
              ) : (
                <span
                  className={cx(
                    'size-3.5 rounded-full border-2 bg-canvas',
                    item.state === 'current' ? 'border-accent' : 'border-line-2',
                  )}
                />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-body font-medium text-fg">{item.title}</p>
              <div className="tnum mt-0.5 text-meta text-fg-2">{item.time}</div>
              {item.body && <p className="mt-1 text-body text-fg-2">{item.body}</p>}
              {item.by && <p className="mt-1 text-meta text-fg-3">{item.by}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/* Time-stamped activity list. Time sits in its own column so entries scan vertically. */
export function ActivityList({ items, className }: { items: ActivityItem[]; className?: string }) {
  if (items.some((item) => item.state)) return <Timeline items={items} className={className} />
  return (
    <ol className={cx('@container divide-y divide-line', className)}>
      {items.map((item, i) => (
        <li
          key={i}
          className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 @md:grid @md:grid-cols-[104px_1fr] @md:gap-4"
        >
          <time className="tnum text-meta text-fg-3">{item.time}</time>
          <div className="min-w-0">
            <p className="text-body font-medium text-fg">{item.title}</p>
            {item.body && <p className="mt-1 text-body text-fg-2">{item.body}</p>}
            {item.by && <p className="mt-1 text-meta text-fg-3">{item.by}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}

export type KV = { k: ReactNode; v: ReactNode }

/* Definition list for specs and properties. */
export function KeyValueList({ items, className, columns = 1 }: { items: KV[]; className?: string; columns?: 1 | 2 }) {
  return (
    <dl className={cx('grid gap-x-8 text-body', columns === 2 ? 'sm:grid-cols-2' : '', className)}>
      {/* Rules sit above rows, never below, so the last row is clean whatever the count. */}
      {items.map((item, i) => (
        <div
          key={i}
          className={cx(
            'grid grid-cols-[minmax(140px,40%)_1fr] gap-4 border-t border-line py-2 first:border-t-0 first:pt-0',
            columns === 2 && 'sm:nth-2:border-t-0 sm:nth-2:pt-0',
          )}
        >
          <dt className="text-fg-2">{item.k}</dt>
          <dd className="min-w-0 font-medium text-fg">{item.v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Progress({ value, label, className }: { value: number; label: string; className?: string }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cx('h-1 w-full overflow-hidden rounded-control bg-surface-3', className)}
    >
      <div className="h-full rounded-control bg-accent" style={{ width: `${v}%` }} />
    </div>
  )
}

export function Photo({
  src,
  alt,
  caption,
  meta,
  ratio = 'aspect-[4/3]',
  className,
}: {
  src: string
  alt: string
  caption?: ReactNode
  meta?: ReactNode
  ratio?: string
  className?: string
}) {
  return (
    <figure className={cx('min-w-0', className)}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cx('w-full rounded-container bg-surface-2 object-cover', ratio)}
      />
      {(caption || meta) && (
        <figcaption className="mt-2 text-body">
          {caption && <span className="block font-medium text-fg">{caption}</span>}
          {meta && <span className="block text-meta text-fg-3">{meta}</span>}
        </figcaption>
      )}
    </figure>
  )
}

// Thông báo trong trang, nền nhạt theo nghĩa. Chỉ ok / warn / danger mới có icon
const noticeTones = {
  neutral: { box: 'bg-surface-2', icon: null, iconColor: '' },
  info: { box: 'bg-info-soft', icon: null, iconColor: '' },
  ok: { box: 'bg-ok-soft', icon: 'check_circle', iconColor: 'text-ok' },
  warn: { box: 'bg-warn-soft', icon: 'warning', iconColor: 'text-warn' },
  danger: { box: 'bg-danger-soft', icon: 'error', iconColor: 'text-danger' },
} as const

export function Notice({
  tone = 'neutral',
  title,
  children,
  className,
}: {
  tone?: keyof typeof noticeTones
  title?: ReactNode
  children: ReactNode
  className?: string
}) {
  const t = noticeTones[tone]
  return (
    <div className={cx('flex gap-3 rounded-container px-4 py-3 text-body', t.box, className)}>
      {t.icon && <Icon name={t.icon} className={cx('mt-px shrink-0 text-[20px]', t.iconColor)} />}
      <div className="min-w-0">
        {title && <p className="font-semibold text-fg">{title}</p>}
        <div className={cx('text-fg-2', title ? 'mt-1' : undefined)}>{children}</div>
      </div>
    </div>
  )
}
