import type { ReactNode, RefObject } from 'react'
import { Link, useLocation } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Count } from '@/components/common/ui/badge'
import { WithTooltip } from '@/components/common/ui/tooltip'
import { SidebarAccountMenu } from '@/components/layout/sidebar-account-menu'
import { isNavItemActive, isNavItemPage } from '@/components/layout/page-crumb'
import type { NavGroup, NavItem } from '@/config/portals'
import { useAuth } from '@/context/AuthProvider'
import { cx } from '@/utils/cx'

// Phần chung của sidebar mọi cổng (khách hàng dùng customer-shell, bốn cổng nhân viên dùng app-shell):
// một chỗ giữ kích thước, kiểu hàng menu, đầu và chân sidebar để các cổng không lệch nhau.

/** Số đếm cạnh mục menu. `attention` là việc đang chờ nên tô đỏ */
export type RailCount = { value?: number; attention?: boolean }

/** Biểu tượng thương hiệu nền trong suốt */
export function BrandMark({ className }: { className?: string }) {
  return <img src="/images/mark-96.png" width={36} height={36} alt="" className={cx('shrink-0', className)} />
}

const row = 'press group relative flex h-11 w-full items-center gap-3 rounded-control px-3 text-body lg:h-10'
const iconButton = 'press relative mx-auto flex size-10 items-center justify-center rounded-control'
const quiet = 'text-fg-2 hover:bg-hover hover:text-fg'
// Mục đang mở: nền nhạt, chữ và icon màu thương hiệu, icon tô đặc; không dùng vạch hay nền đậm
const active = 'bg-accent-soft font-medium text-accent-fg'

export function SidebarBrand({
  compact,
  portalName,
  to,
  onClose,
  closeButtonRef,
}: {
  compact: boolean
  portalName: string
  /** Trang mở khi bấm thương hiệu */
  to: string
  onClose: () => void
  closeButtonRef: RefObject<HTMLButtonElement | null>
}) {
  if (compact) {
    return (
      <div className="flex h-16 shrink-0 items-center justify-center border-b border-line">
        <WithTooltip side="right" label={`Smart Solar, ${portalName}`}>
          {(tip) => (
            <Link to={to} aria-label={`Smart Solar, ${portalName}`} className="rounded-control" {...tip}>
              <BrandMark />
            </Link>
          )}
        </WithTooltip>
      </div>
    )
  }
  return (
    <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-line pr-2 pl-4">
      <Link to={to} className="flex min-w-0 items-center gap-3 rounded-control">
        <BrandMark />
        <span className="min-w-0">
          <span className="block truncate text-body leading-tight font-semibold">Smart Solar</span>
          <span className="block truncate text-meta text-fg-2" title={portalName}>
            {portalName}
          </span>
        </span>
      </Link>
      <button
        ref={closeButtonRef}
        type="button"
        aria-label="Đóng menu"
        onClick={onClose}
        className="press inline-flex size-11 shrink-0 items-center justify-center rounded-control text-fg-2 hover:bg-hover hover:text-fg lg:hidden"
      >
        <Icon name="close" className="text-[24px]" />
      </button>
    </div>
  )
}

export function SidebarNav({
  label,
  groups,
  badges,
  compact,
  onNavigate,
  tools,
}: {
  label: string
  groups: NavGroup[]
  badges?: Record<string, RailCount | undefined>
  compact: boolean
  /** Chọn trang trong drawer thì đóng drawer */
  onNavigate?: () => void
  tools?: ReactNode
}) {
  const { pathname } = useLocation()
  return (
    <nav
      aria-label={label}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 [scrollbar-width:thin]"
    >
      {groups.map((group, index) => (
        <section
          key={group.label ?? index}
          className={cx(index > 0 && (compact ? 'mt-3 border-t border-line pt-3' : 'mt-5'))}
        >
          {group.label && !compact && (
            <p className="mb-1 truncate px-3 text-meta font-semibold text-fg-2">{group.label}</p>
          )}
          <ul aria-label={compact ? group.label : undefined} className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.label}>
                {compact ? (
                  <SidebarIconLink item={item} pathname={pathname} count={badges?.[item.to]} />
                ) : (
                  <SidebarLink item={item} pathname={pathname} count={badges?.[item.to]} onNavigate={onNavigate} />
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {tools && !compact && <div className="mt-6 space-y-3">{tools}</div>}
    </nav>
  )
}

function SidebarLink({
  item,
  pathname,
  count,
  onNavigate,
}: {
  item: NavItem
  pathname: string
  count?: RailCount
  onNavigate?: () => void
}) {
  const on = isNavItemActive(item, pathname)
  const inner = (
    <>
      <Icon
        name={item.icon}
        className={cx('shrink-0 text-[20px]', on ? 'icon-fill' : 'text-fg-3 group-hover:text-fg-2')}
      />
      <span className="min-w-0 flex-1 truncate" title={item.label}>
        {item.label}
      </span>
      {item.badge && <span className="text-meta text-accent-fg">{item.badge}</span>}
      {!item.badge && count?.value ? <Count value={count.value} attention={count.attention} /> : null}
    </>
  )
  if (item.to === '#') {
    return (
      <WithTooltip side="right" label="Chưa có trong bản này">
        {(tip) => (
          <button type="button" aria-disabled className={cx(row, quiet, 'text-left')} {...tip}>
            {inner}
          </button>
        )}
      </WithTooltip>
    )
  }
  return (
    // Dùng Link thay NavLink vì NavLink bỏ aria-current khi đang ở trang con
    <Link
      to={item.to}
      onClick={onNavigate}
      aria-label={count?.value ? `${item.label} (${count.value})` : undefined}
      aria-current={on ? (isNavItemPage(item, pathname) ? 'page' : 'location') : undefined}
      className={cx(row, 'focus-visible:-outline-offset-2', on ? active : quiet)}
    >
      {inner}
    </Link>
  )
}

// Sidebar thu gọn: chỉ còn icon, tên trong tooltip và số đếm ở góc
function SidebarIconLink({ item, pathname, count }: { item: NavItem; pathname: string; count?: RailCount }) {
  const on = isNavItemActive(item, pathname)
  const label = count?.value ? `${item.label} (${count.value})` : item.label
  const className = cx(iconButton, 'focus-visible:-outline-offset-2', on ? active : quiet)
  const inner = (
    <>
      <Icon name={item.icon} className={cx('text-[20px]', on && 'icon-fill')} />
      {count?.value ? (
        <Count value={count.value} attention={count.attention} className="absolute -top-1.5 -right-1.5" />
      ) : null}
    </>
  )
  if (item.to === '#') {
    return (
      <WithTooltip side="right" label={`${item.label} (chưa có trong bản này)`}>
        {(tip) => (
          <button type="button" className={className} aria-disabled aria-label={item.label} {...tip}>
            {inner}
          </button>
        )}
      </WithTooltip>
    )
  }
  return (
    <WithTooltip side="right" label={item.label}>
      {(tip) => (
        <Link
          to={item.to}
          aria-label={label}
          aria-current={on ? (isNavItemPage(item, pathname) ? 'page' : 'location') : undefined}
          className={className}
          {...tip}
        >
          {inner}
        </Link>
      )}
    </WithTooltip>
  )
}

/** Chân sidebar: thu gọn / mở rộng (chỉ từ lg) và tài khoản. Một nút thu gọn duy nhất, cùng nút ở cả hai trạng thái nên focus không mất */
export function SidebarFooter({
  compact,
  controlsId,
  onToggleCollapsed,
}: {
  compact: boolean
  controlsId: string
  onToggleCollapsed: () => void
}) {
  const { user } = useAuth()
  return (
    <div className="shrink-0 space-y-1 border-t border-line p-3">
      <div className="hidden lg:block">
        <WithTooltip side="right" label={compact ? 'Mở rộng menu' : null}>
          {(tip) => (
            <button
              type="button"
              aria-controls={controlsId}
              aria-expanded={!compact}
              aria-label={compact ? 'Mở rộng menu' : undefined}
              onClick={onToggleCollapsed}
              className={cx(compact ? iconButton : row, quiet)}
              {...tip}
            >
              <Icon name={compact ? 'left_panel_open' : 'left_panel_close'} className="text-[20px]" />
              {!compact && 'Thu gọn menu'}
            </button>
          )}
        </WithTooltip>
      </div>
      {user && (
        <div className={cx(!compact && 'rounded-container border border-line bg-canvas p-1')}>
          <SidebarAccountMenu compact={compact} showRole />
        </div>
      )}
    </div>
  )
}
