import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ROUTES } from '@/routes/paths'
import { type NavItem, type Portal } from '@/config/portals'
import { useAuth } from '@/context/AuthProvider'
import { ROLE_LABELS } from '@/common/role'
import { canChangeOwnPassword } from '@/config/roles'
import { cx } from '@/utils/cx'
import { THEME_OPTIONS, useTheme } from '@/hooks/useTheme'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Avatar } from '@/components/common/ui/avatar'
import { Count } from '@/components/common/ui/badge'
import { WithTooltip } from '@/components/common/ui/tooltip'
import { ChangePasswordDialog } from '@/features/auth/ChangePasswordDialog'
import { changePasswordContent } from '@/data/auth'
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed'
import { PageCrumbContext, isNavItemActive, isNavItemPage, type PageCrumb } from '@/components/layout/page-crumb'

// Rail bên trái, nội dung bên phải. Desktop có thể thu gọn rail còn 64px, dưới lg rail thành drawer
// Mở drawer thì focus vào nút "Đóng", đóng thì trả focus về "Menu", Esc để đóng
/** Số đếm cạnh mục menu. `attention` là việc đang chờ nên tô đỏ */
export type RailCount = { value?: number; attention?: boolean }

const DESKTOP = '(min-width: 64rem)'

export function AppShell({
  portal,
  context,
  tools,
  badges,
  collapsedHint,
  children,
}: {
  portal: Portal
  context?: ReactNode
  tools?: ReactNode
  /** Số đếm thật cạnh mục menu, theo `to` của mục; 0 hoặc chưa có thì không hiện. */
  badges?: Record<string, RailCount | undefined>
  /** Nội dung ngắn trên thanh trên cùng khi menu nằm trong drawer, vd. "3 yêu cầu chờ nhận" */
  collapsedHint?: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useSidebarCollapsed()
  const desktop = useMediaQuery(DESKTOP)
  // Thu gọn chỉ có nghĩa từ lg; dưới lg rail luôn là drawer đầy đủ.
  const compact = collapsed && desktop
  const location = useLocation()
  const [crumb, setCrumb] = useState<PageCrumb | null>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  // Nút cần nhận focus sau khi mở / đóng drawer (null: không đổi focus)
  const focusNext = useRef<RefObject<HTMLButtonElement | null> | null>(null)

  function openDrawer() {
    focusNext.current = closeButtonRef
    setOpen(true)
  }

  function closeDrawer() {
    focusNext.current = menuButtonRef
    setOpen(false)
  }

  // Focus chuyển sau khi DOM đã đổi (nút vừa bấm có thể đã bị ẩn).
  useEffect(() => {
    const target = focusNext.current
    if (!target) return
    focusNext.current = null
    target.current?.focus()
  }, [open])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!open) return
    // Esc của dialog mở từ drawer chỉ đóng dialog đó
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('dialog[open], [role=dialog]')) return
      closeDrawer()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Màn hình rộng ra quá lg thì đóng drawer, nếu không trang bị khoá cuộn
  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP)
    const onChange = () => {
      if (desktop.matches) setOpen(false)
    }
    desktop.addEventListener('change', onChange)
    return () => desktop.removeEventListener('change', onChange)
  }, [])

  /* The page behind the drawer must not scroll while it is open. */
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-canvas focus:px-3 focus:py-2 focus:text-meta"
      >
        Bỏ qua, tới nội dung chính
      </a>

      <header className="sticky top-0 z-20 flex h-12 items-center justify-between gap-4 border-b border-line bg-rail px-4 md:px-6 lg:hidden">
        <span className="flex items-center gap-2 text-body font-semibold">
          <BrandImage className="size-6" />
          Smart Solar
        </span>
        <div className="flex min-w-0 items-center gap-3">
          {collapsedHint && <div className="flex min-w-0 items-center text-meta text-fg-2">{collapsedHint}</div>}
          <button
            ref={menuButtonRef}
            type="button"
            aria-controls="rail"
            aria-expanded={open}
            className="press -mr-2 inline-flex h-11 items-center gap-2 rounded-control px-2 text-body font-medium text-fg hover:bg-hover"
            onClick={openDrawer}
          >
            <Icon name="menu" className="text-[24px]" />
            Menu
          </button>
        </div>
      </header>

      <Rail
        portal={portal}
        context={context}
        tools={tools}
        badges={badges}
        open={open}
        compact={compact}
        onClose={closeDrawer}
        onToggleCollapsed={() => setCollapsed(!collapsed)}
        closeButtonRef={closeButtonRef}
      />

      <div className={collapsed ? 'lg:pl-16' : 'lg:pl-52'}>
        {/* Dưới thanh trên (h-12) khi thanh đó hiện (dưới lg); từ lg dính sát mép trên. */}
        <div className="sticky top-12 z-10 border-b border-line bg-canvas px-4 md:px-6 lg:top-0">
          <LocationBar portal={portal} crumb={crumb?.pathname === location.pathname ? crumb.label : null} />
        </div>
        <PageCrumbContext value={setCrumb}>
          <main id="main" className="w-full px-4 py-6 md:px-6">
            {children}
          </main>
        </PageCrumbContext>
      </div>
    </div>
  )
}

// Biểu tượng thương hiệu 96px nền trong suốt
function BrandImage({ className }: { className?: string }) {
  return <img src="/images/mark-96.png" width={32} height={32} alt="" className={cx('shrink-0', className)} />
}

// Hàng thao tác trên rail: 44px trong drawer, 36px từ lg
const railRow = 'press flex h-11 w-full items-center gap-3 rounded-control px-3 text-left text-body lg:h-9'
/* Nút vuông của rail thu gọn, căn giữa cột 64px (rail px-3 còn đúng 40px). */
const railIcon = 'press relative mx-auto flex size-10 items-center justify-center rounded-control'
const railQuiet = 'text-fg-2 hover:bg-hover hover:text-fg'
// Đăng xuất chỉ đỏ khi rê chuột
const railDanger = 'text-fg-2 hover:bg-danger-soft hover:text-danger'

function Rail({
  portal,
  context,
  tools,
  badges,
  open,
  compact,
  onClose,
  onToggleCollapsed,
  closeButtonRef,
}: {
  portal: Portal
  context?: ReactNode
  tools?: ReactNode
  badges?: Record<string, RailCount | undefined>
  open: boolean
  compact: boolean
  onClose: () => void
  onToggleCollapsed: () => void
  closeButtonRef: RefObject<HTMLButtonElement | null>
}) {
  const { pathname } = useLocation()
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-scrim lg:hidden" aria-hidden onClick={onClose} />}
      {/* Rail chia ba phần: đầu, menu (tự cuộn), chân (thu gọn + tài khoản) */}
      <aside
        id="rail"
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex flex-col overflow-y-auto overscroll-contain [scrollbar-width:thin] border-r border-line bg-rail pt-5 pb-4 duration-200',
          // Drawer điện thoại rộng 288px, rail desktop 208px
          compact ? 'w-16 px-3' : 'w-72 px-6 lg:w-52',
          // Khi đóng thì ẩn hẳn (invisible) để link bên trong không nhận Tab
          open
            ? 'visible translate-x-0 transition-[translate]'
            : 'invisible -translate-x-full transition-[translate,visibility]',
          'lg:visible lg:translate-x-0',
        )}
        aria-label="Điều hướng chính"
      >
        {compact ? (
          <div className="flex shrink-0 justify-center">
            <BrandImage className="size-8" />
            <span className="sr-only">Smart Solar, {portal.name}</span>
          </div>
        ) : (
          <div className="flex shrink-0 items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2.5">
              <BrandImage className="mt-0.5 size-8" />
              <div className="min-w-0">
                <p className="text-body font-semibold">Smart Solar</p>
                <p className="text-meta text-balance text-fg-2">{portal.name}</p>
              </div>
            </div>
            {/* Chỉ icon ✕ (tên đọc + tooltip "Đóng menu") để tên portal đủ chỗ trên một dòng. */}
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Đóng menu"
              title="Đóng menu"
              className="press -mt-1.5 -mr-3 inline-flex size-11 shrink-0 items-center justify-center rounded-control text-fg-2 hover:bg-hover hover:text-fg lg:hidden"
              onClick={onClose}
            >
              <Icon name="close" className="text-[24px]" />
            </button>
          </div>
        )}
        {context && !compact && <div className="mt-4 shrink-0 text-meta text-fg-2">{context}</div>}

        {/* Khung cuộn rộng bằng các hàng để hàng không bị cắt */}
        <nav
          className={cx(
            '-mx-3 mt-6 min-h-28 flex-1 overflow-y-auto overscroll-contain px-3 [scrollbar-width:thin]',
            compact && 'pt-1.5',
          )}
        >
          {portal.groups.map((group, gi) => {
            const groupActive = group.items.some((item) => isNavItemActive(item, pathname))
            return (
              <div key={gi} className={cx(gi > 0 && (compact ? 'mt-3 border-t border-line pt-3' : 'mt-5'))}>
                {group.label && !compact && (
                  <p className={cx('mb-1 text-meta font-medium', groupActive ? 'text-fg' : 'text-fg-2')}>
                    {group.label}
                  </p>
                )}
                <ul aria-label={compact ? group.label : undefined} className="space-y-0.5">
                  {group.items.map((item) => (
                    <li key={item.label}>
                      {compact ? (
                        <RailIconLink item={item} count={badges?.[item.to]} />
                      ) : (
                        <RailLink item={item} count={badges?.[item.to]} />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
          {tools && !compact && <div className="mt-6 space-y-3">{tools}</div>}
        </nav>

        <div className="mt-4 shrink-0">
          {/* Thu gọn / mở rộng chỉ có từ lg; cùng một nút ở cả hai trạng thái để focus không bị mất. */}
          <div className={cx('hidden lg:block', !compact && '-mx-3')}>
            <WithTooltip side="right" label={compact ? 'Mở rộng menu' : null}>
              {(tip) => (
                <button
                  type="button"
                  aria-controls="rail"
                  aria-expanded={!compact}
                  aria-label={compact ? 'Mở rộng menu' : undefined}
                  onClick={onToggleCollapsed}
                  className={cx(compact ? railIcon : railRow, railQuiet)}
                  {...tip}
                >
                  <Icon name={compact ? 'left_panel_open' : 'left_panel_close'} className="text-[20px]" />
                  {!compact && 'Thu gọn menu'}
                </button>
              )}
            </WithTooltip>
          </div>
          <SessionBlock compact={compact} onExpandRail={onToggleCollapsed} />
        </div>
      </aside>
    </>
  )
}

// Hàng menu: 44px trong drawer, 36px trên desktop. Mục đang mở có nền nhạt, vạch 3px bên trái và icon tô đặc
// Viền focus vẽ vào trong vì khung cuộn sẽ cắt mất viền vẽ ra ngoài
const railActiveBar =
  'before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-control before:bg-accent'

function RailLink({ item, count }: { item: NavItem; count?: RailCount }) {
  const { pathname } = useLocation()
  const active = isNavItemActive(item, pathname)
  const isPlaceholder = item.to === '#'
  const className = (on: boolean) =>
    cx(
      'group press relative -mx-3 flex items-center gap-3 rounded-control px-3 py-3 text-body focus-visible:-outline-offset-2 lg:py-2',
      on ? cx('bg-accent-muted font-semibold text-fg', railActiveBar) : 'text-fg-2 hover:bg-hover hover:text-fg',
    )
  const inner = (on: boolean) => (
    <>
      <Icon
        name={item.icon}
        className={cx('shrink-0 text-[20px]', on ? 'icon-fill text-accent-fg' : 'text-fg-3 group-hover:text-fg-2')}
      />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge && <span className="text-meta text-accent-fg">{item.badge}</span>}
      {!item.badge && count?.value ? <Count value={count.value} attention={count.attention} /> : null}
    </>
  )
  if (isPlaceholder) {
    return (
      <button
        type="button"
        className={cx(className(false), 'w-[calc(100%+1.5rem)] text-left')}
        aria-disabled
        title="Chưa có trong bản này"
      >
        {inner(false)}
      </button>
    )
  }
  return (
    // Dùng Link thay NavLink vì NavLink bỏ aria-current khi đang ở trang con
    <Link
      to={item.to}
      aria-current={active ? (isNavItemPage(item, pathname) ? 'page' : 'location') : undefined}
      className={className(active)}
    >
      {inner(active)}
    </Link>
  )
}

// Rail thu gọn: chỉ còn icon, tooltip và số đếm ở góc
function RailIconLink({ item, count }: { item: NavItem; count?: RailCount }) {
  const { pathname } = useLocation()
  const active = isNavItemActive(item, pathname)
  const label = count?.value ? `${item.label} (${count.value})` : item.label
  const className = cx(
    railIcon,
    'focus-visible:-outline-offset-2',
    active ? cx('bg-accent-muted text-accent-fg', railActiveBar) : railQuiet,
  )
  const inner = (
    <>
      <Icon name={item.icon} className={cx('text-[20px]', active && 'icon-fill')} />
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
          aria-current={active ? (isNavItemPage(item, pathname) ? 'page' : 'location') : undefined}
          className={className}
          {...tip}
        >
          {inner}
        </Link>
      )}
    </WithTooltip>
  )
}

// Thanh định vị: portal / nhóm / mục / trang chi tiết. Mắt xích cuối là trang đang xem, không phải link
// Trên điện thoại chỉ hiện tên trang hiện tại
function LocationBar({ portal, crumb }: { portal: Portal; crumb: string | null }) {
  const { pathname } = useLocation()
  const group = portal.groups.find((g) => g.items.some((item) => isNavItemActive(item, pathname)))
  const item = group?.items.find((i) => isNavItemActive(i, pathname))
  const onItemPage = item ? isNavItemPage(item, pathname) : false

  type Step = { label: string; to?: string; wide?: boolean }
  const trail: Step[] = [{ label: portal.name, wide: true }]
  if (group?.label) trail.push({ label: group.label, to: group.items[0]?.to, wide: true })
  // Mục menu là link khi đang ở trang con của nó
  if (item) trail.push({ label: item.label, to: onItemPage ? undefined : item.to })
  if (crumb) trail.push({ label: crumb })

  const title = [trail[trail.length - 1]?.label, portal.name, 'Smart Solar'].filter(Boolean).join(' – ')
  useEffect(() => {
    document.title = title
  }, [title])

  return (
    <nav aria-label="Vị trí hiện tại" className="flex h-10 items-center">
      <ol className="flex min-w-0 flex-1 items-center gap-2 text-meta">
        {trail.map((step, i) => {
          const last = i === trail.length - 1
          return (
            <li
              key={i}
              className={cx(
                'items-center gap-2',
                step.wide && !last ? 'hidden sm:flex' : 'flex',
                last ? 'min-w-0' : 'max-w-[45%] shrink-0 sm:max-w-none',
              )}
            >
              {i > 0 && (
                // Trên điện thoại các mắt xích "wide" phía trước bị ẩn: bỏ luôn dấu "/" đứng đầu.
                <span
                  aria-hidden
                  className={cx('text-fg-3', trail.slice(0, i).every((prev) => prev.wide) && 'hidden sm:inline')}
                >
                  /
                </span>
              )}
              {/* Mắt xích có `to` luôn là link, kể cả khi đứng cuối (trang chi tiết đang tải hoặc lỗi). */}
              {last && !step.to ? (
                <span aria-current="page" title={step.label} className="truncate font-semibold text-fg">
                  {step.label}
                </span>
              ) : step.to ? (
                <Link
                  to={step.to}
                  className="tap min-w-0 text-fg-2 underline-offset-4 hover:text-accent-fg hover:underline"
                >
                  <span className="min-w-0 truncate">{step.label}</span>
                </Link>
              ) : (
                <span className="truncate text-fg-2">{step.label}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

const THEMES = THEME_OPTIONS

const subRow = 'press flex h-11 w-full items-center gap-3 rounded-control px-2 text-left text-body lg:h-9'

// Nhóm Tài khoản ở đáy rail, bấm mới mở: thông tin đăng nhập, Đổi mật khẩu, Giao diện, Đăng xuất
// Rail thu gọn thì chỉ còn nút icon, bấm thì rail mở rộng và nhóm mở sẵn
const canChangePassword = canChangeOwnPassword
// Nhớ trạng thái mở / đóng của nhóm Tài khoản
const ACCOUNT_OPEN_KEY = 'smartsolar.rail-account-open'

function useAccountGroupOpen() {
  const [open, setOpenState] = useState(() => {
    try {
      return localStorage.getItem(ACCOUNT_OPEN_KEY) === '1'
    } catch {
      return false
    }
  })
  const setOpen = (next: boolean) => {
    setOpenState(next)
    try {
      if (next) localStorage.setItem(ACCOUNT_OPEN_KEY, '1')
      else localStorage.removeItem(ACCOUNT_OPEN_KEY)
    } catch {
      /* Trình duyệt chặn storage: vẫn mở / đóng được, chỉ không nhớ sau khi tải lại. */
    }
  }
  return [open, setOpen] as const
}

function SessionBlock({ compact, onExpandRail }: { compact: boolean; onExpandRail: () => void }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [theme, setTheme] = useTheme()
  const [open, setOpen] = useAccountGroupOpen()
  const [themeOpen, setThemeOpen] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const groupId = useId()
  const themeId = useId()
  const name = user?.name ?? ''
  // Chưa có họ tên thì ghi phần trước "@" của email cho vừa rail
  const shortName = user?.email && name === user.email ? name.split('@')[0]! : name
  const role = user ? ROLE_LABELS[user.role] : ''
  const current = THEMES.find((t) => t.value === theme) ?? THEMES[0]!
  const expanded = open && !compact

  async function handleSignOut() {
    await signOut()
    navigate(ROUTES.login, { replace: true })
  }

  function onAccountClick() {
    if (compact) {
      setOpen(true)
      onExpandRail()
    } else {
      setOpen(!open)
    }
  }

  return (
    <div className="mt-2 border-t border-line pt-2">
      <div className={cx(!compact && '-mx-3')}>
        <WithTooltip side="right" label={compact ? name || 'Tài khoản' : null}>
          {(tip) => (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={expanded ? groupId : undefined}
              aria-label={`Tài khoản: ${name}`}
              onClick={onAccountClick}
              className={cx(compact ? railIcon : railRow, 'font-medium text-fg hover:bg-hover')}
              {...tip}
            >
              <Avatar name={name} size="sm" tone="accent" className={cx(!compact && '-ml-1')} />
              {!compact && (
                <>
                  <span className="min-w-0 flex-1 truncate">{shortName || 'Tài khoản'}</span>
                  <Icon name={expanded ? 'expand_less' : 'expand_more'} className="shrink-0 text-[20px] text-fg-3" />
                </>
              )}
            </button>
          )}
        </WithTooltip>
      </div>

      {expanded && (
        <ul id={groupId} className="mt-0.5 -mr-3 ml-[9px] space-y-0.5 border-l border-line pl-2">
          {/* Hàng nhóm đã ghi tên (rút gọn): tầng con ghi email đầy đủ và vai trò. */}
          <li className="px-2 py-1.5">
            {user?.email && (
              <p className="truncate text-meta text-fg-2" title={user.email}>
                {user.email}
              </p>
            )}
            <p className="text-meta text-fg-2">{role}</p>
          </li>
          {user && (
            <>
              {canChangePassword(user.role) && (
                <li>
                  <button type="button" onClick={() => setChangingPassword(true)} className={cx(subRow, railQuiet)}>
                    <Icon name="key" className="text-[20px]" />
                    {changePasswordContent.menuLabel}
                  </button>
                </li>
              )}
              <li>
                <button
                  type="button"
                  aria-expanded={themeOpen}
                  aria-controls={themeOpen ? themeId : undefined}
                  onClick={() => setThemeOpen((value) => !value)}
                  className={cx(subRow, railQuiet)}
                >
                  <Icon name={current.icon} className="text-[20px]" />
                  <span className="min-w-0 flex-1">Giao diện</span>
                  <Icon name={themeOpen ? 'expand_less' : 'expand_more'} className="text-[20px] text-fg-3" />
                </button>
                {themeOpen && (
                  <div
                    id={themeId}
                    role="radiogroup"
                    aria-label="Giao diện"
                    className="mt-0.5 ml-[17px] space-y-0.5 border-l border-line pl-2"
                  >
                    {THEMES.map((t) => {
                      const on = theme === t.value
                      return (
                        <label
                          key={t.value}
                          className={cx(
                            subRow,
                            'cursor-pointer gap-2 has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ring',
                            on ? 'bg-accent-soft font-semibold text-accent-fg' : railQuiet,
                          )}
                        >
                          <input
                            type="radio"
                            name={themeId}
                            value={t.value}
                            checked={on}
                            onChange={() => setTheme(t.value)}
                            className="sr-only"
                          />
                          {/* Không icon riêng cho từng lựa chọn: tầng ba chỉ còn ~125px, icon làm "Tự động" bẻ dòng. */}
                          <span className="min-w-0 flex-1 whitespace-nowrap">{t.label}</span>
                          {on && <Icon name="check" className="text-[20px]" />}
                        </label>
                      )
                    })}
                  </div>
                )}
              </li>
              <li>
                <button type="button" onClick={handleSignOut} className={cx(subRow, railDanger)}>
                  <Icon name="logout" className="text-[20px]" />
                  Đăng xuất
                </button>
              </li>
            </>
          )}
        </ul>
      )}
      {canChangePassword(user?.role) && (
        <ChangePasswordDialog open={changingPassword} onOpenChange={setChangingPassword} />
      )}
    </div>
  )
}
