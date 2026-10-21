import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '@/utils/cx'

// Panel là một phần của trang, không có nền hay khung. Các panel liền nhau ngăn bằng đường kẻ
// `raised`: khối cần khách quyết định / nhập liệu thì có khung
export function Panel({ raised, className, children, ...rest }: HTMLAttributes<HTMLElement> & { raised?: boolean }) {
  return (
    <section
      className={cx(
        raised ? 'rounded-container border border-line p-5' : 'border-t border-line pt-4 first:border-t-0 first:pt-0',
        className,
      )}
      {...rest}
    >
      {children}
    </section>
  )
}

// Cột phụ của trang chi tiết / wizard, nền xám nhạt
export function PanelAside({ className, children, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <aside className={cx('space-y-4 self-start rounded-container bg-surface-2 p-4 lg:p-5', className)} {...rest}>
      {children}
    </aside>
  )
}

export function PanelHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <header className={cx('mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2', className)}>
      <div className="min-w-0">
        <h2 className="text-title font-semibold">{title}</h2>
        {description && <p className="mt-1 max-w-prose text-body text-fg-2">{description}</p>}
      </div>
      {action && (
        <div className="flex min-w-0 items-center gap-3 [&>a:not([class*=press])]:tap [&>button:not([class*=press])]:tap [&>span[role=link]]:tap">
          {action}
        </div>
      )}
    </header>
  )
}

export function PanelBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={className}>{children}</div>
}

export function PanelFooter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <footer
      className={cx(
        'mt-4 flex flex-wrap items-center gap-3 [&>a:not([class*=press])]:tap [&>button:not([class*=press])]:tap [&>span[role=link]]:tap',
        className,
      )}
    >
      {children}
    </footer>
  )
}
