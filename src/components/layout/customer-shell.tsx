import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/500.css'
import '@fontsource/be-vietnam-pro/600.css'
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Avatar } from '@/components/common/ui/avatar'
import { Count } from '@/components/common/ui/badge'
import { Segmented } from '@/components/common/ui/segmented'
import { WithTooltip } from '@/components/common/ui/tooltip'
import type { RailCount } from '@/components/layout/app-shell'
import { PageCrumbContext, isNavItemActive, isNavItemPage, type PageCrumb } from '@/components/layout/page-crumb'
import { PORTALS, type NavItem } from '@/config/portals'
import { ROLE_LABELS } from '@/common/role'
import { canChangeOwnPassword } from '@/config/roles'
import { useAuth } from '@/context/AuthProvider'
import { changePasswordContent } from '@/data/auth'
import { ChangePasswordDialog } from '@/features/auth/ChangePasswordDialog'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed'
import { THEME_OPTIONS, useTheme } from '@/hooks/useTheme'
import { ROUTES } from '@/routes/paths'
import { cx } from '@/utils/cx'

// Khung của cổng khách hàng: sidebar trái (logo, menu, tài khoản ở đáy), nội dung bên phải
// Từ lg sidebar rộng 264px (đủ cho "Bảo hành, sửa chữa" kèm số đỏ), thu gọn được còn cột icon 64px.
// Dưới lg sidebar là drawer mở bằng nút Menu
// Mở drawer thì focus vào nút đóng và phần còn lại của trang bị khoá (inert), đóng thì trả focus về nút Menu
const DESKTOP = '(min-width: 64rem)'

export function CustomerShell({
  badges,
  children,
}: {
  /** Số đếm cạnh mục menu, theo `to` của mục; 0 hoặc chưa có thì không hiện */
  badges?: Record<string, RailCount | undefined>
  children: ReactNode
}) {
  const portal = PORTALS.customer
  const items = portal.groups.flatMap((group) => group.items)
  // Điện thoại không thấy menu nên nút Menu mang tổng số việc đang chờ
  const waiting = Object.values(badges ?? {}).reduce((sum, c) => sum + (c?.attention ? (c.value ?? 0) : 0), 0)
  const { pathname } = useLocation()
  const [crumb, setCrumb] = useState<PageCrumb | null>(null)
  // Đường dẫn lúc mở drawer (null: đóng). Chuyển trang hoặc rộng tới lg thì drawer tự đóng, không cần effect
  const [drawerPath, setDrawerPath] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useSidebarCollapsed()
  const desktop = useMediaQuery(DESKTOP)
  const drawerOpen = drawerPath === pathname && !desktop
  // Thu gọn chỉ có từ lg; drawer luôn rộng đủ
  const compact = collapsed && desktop
  const [changingPassword, setChangingPassword] = useState(false)
  const { user } = useAuth()
  const current = items.find((item) => isNavItemActive(item, pathname))
  const onItemPage = current ? isNavItemPage(current, pathname) : false
  const crumbLabel = crumb?.pathname === pathname ? crumb.label : null
  const pastTitle = usePastPageTitle(pathname)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  // Nút cần nhận focus sau khi mở / đóng drawer (null: không đổi focus)
  const focusNext = useRef<RefObject<HTMLButtonElement | null> | null>(null)

  // Tiêu đề tab trình duyệt theo vị trí: "<trang> – Cổng khách hàng – Smart Solar".
  const title = [crumbLabel ?? current?.label, portal.name, 'Smart Solar'].filter(Boolean).join(' – ')
  useEffect(() => {
    document.title = title
  }, [title])

  function openDrawer() {
    focusNext.current = closeButtonRef
    setDrawerPath(pathname)
  }

  function closeDrawer() {
    focusNext.current = menuButtonRef
    setDrawerPath(null)
  }

  // Focus chuyển sau khi DOM đã đổi (nút vừa bấm có thể đã bị ẩn hoặc khoá).
  useEffect(() => {
    const target = focusNext.current
    if (!target) return
    focusNext.current = null
    target.current?.focus()
  }, [drawerOpen])

  useEffect(() => {
    if (!drawerOpen) return
    // Esc của hộp thoại hoặc bảng tài khoản mở từ drawer chỉ đóng chính nó
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('dialog[open], [role=dialog]')) return
      closeDrawer()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  // Trang phía sau drawer không cuộn theo
  useEffect(() => {
    if (!drawerOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [drawerOpen])

  const openChangePassword = () => setChangingPassword(true)

  return (
    <div className="min-h-dvh bg-canvas font-vn text-fg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-canvas focus:px-3 focus:py-2 focus:text-meta"
      >
        Bỏ qua, tới nội dung chính
      </a>

      {drawerOpen && <div className="fixed inset-0 z-30 bg-scrim lg:hidden" aria-hidden onClick={closeDrawer} />}

      <aside
        id="customer-sidebar"
        aria-label="Điều hướng cổng khách hàng"
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line bg-rail duration-200 motion-reduce:transition-none',
          compact ? 'w-16' : 'w-72 lg:w-66',
          // Khi đóng thì ẩn hẳn (invisible) để link bên trong không nhận Tab
          drawerOpen
            ? 'visible translate-x-0 transition-[translate]'
            : 'invisible -translate-x-full transition-[translate,visibility]',
          'lg:visible lg:translate-x-0',
        )}
      >
        <SidebarBrand
          compact={compact}
          portalName={portal.name}
          onClose={closeDrawer}
          closeButtonRef={closeButtonRef}
        />

        {/* Chỉ menu tự cuộn; chân sidebar không cuộn để bảng tài khoản tràn ra ngoài được */}
        <nav
          aria-label={portal.name}
          className={cx(
            'min-h-0 flex-1 overflow-y-auto overscroll-contain py-4 [scrollbar-width:thin]',
            compact ? 'px-3' : 'px-4',
          )}
        >
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.label}>
                {/* Chọn trang trong drawer thì đóng drawer và trả focus về nút Menu */}
                {compact ? (
                  <SidebarIconLink item={item} pathname={pathname} count={badges?.[item.to]} />
                ) : (
                  <SidebarLink
                    item={item}
                    pathname={pathname}
                    count={badges?.[item.to]}
                    onNavigate={drawerOpen ? closeDrawer : undefined}
                  />
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className={cx('shrink-0 space-y-1 border-t border-line py-3', compact ? 'px-3' : 'px-4')}>
          {/* Thu gọn / mở rộng chỉ có từ lg; cùng một nút ở cả hai trạng thái để focus không bị mất */}
          <div className="hidden lg:block">
            <WithTooltip side="right" label={compact ? 'Mở rộng menu' : null}>
              {(tip) => (
                <button
                  type="button"
                  aria-controls="customer-sidebar"
                  aria-expanded={!compact}
                  aria-label={compact ? 'Mở rộng menu' : undefined}
                  onClick={() => setCollapsed(!collapsed)}
                  className={cx(compact ? sidebarIcon : sidebarRow, 'text-fg-2 hover:bg-hover hover:text-fg')}
                  {...tip}
                >
                  <Icon name={compact ? 'left_panel_open' : 'left_panel_close'} className="text-[20px]" />
                  {!compact && 'Thu gọn menu'}
                </button>
              )}
            </WithTooltip>
          </div>
          {user && <AccountMenu compact={compact} onChangePassword={openChangePassword} />}
        </div>
      </aside>

      {/* Drawer đang mở thì phần còn lại không nhận focus hay thao tác */}
      <div inert={drawerOpen || undefined} className={compact ? 'lg:pl-16' : 'lg:pl-66'}>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-canvas px-4 md:px-6 lg:hidden">
          <button
            ref={menuButtonRef}
            type="button"
            aria-controls="customer-sidebar"
            aria-expanded={drawerOpen}
            onClick={openDrawer}
            className="press -ml-2 inline-flex h-11 shrink-0 items-center gap-2 rounded-control px-2 text-body font-medium text-fg hover:bg-hover"
          >
            <Icon name="menu" className="text-[24px]" />
            Menu
            {waiting > 0 && (
              <>
                <Count value={waiting} attention />
                <span className="sr-only">việc chờ bạn</span>
              </>
            )}
          </button>
          <span aria-hidden className="h-6 border-l border-line" />
          {/* Tiêu đề trang (h1) còn thấy thì thanh trên chỉ ghi thương hiệu, cuộn qua rồi mới ghi tên mục */}
          <p className="flex min-w-0 items-center gap-2 text-body font-semibold">
            <img src="/images/mark-96.png" width={24} height={24} alt="" className="size-6 shrink-0" />
            <span className="truncate">{pastTitle ? (current?.label ?? portal.name) : 'Smart Solar'}</span>
          </p>
        </header>

        <PageCrumbContext value={setCrumb}>
          <main id="main" className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:py-8">
            {current && !onItemPage && (
              <nav aria-label="Vị trí hiện tại" className="mb-4 flex min-w-0 items-center gap-2 text-meta">
                <Link
                  to={current.to}
                  className="tap shrink-0 text-fg-2 underline-offset-4 hover:text-accent-fg hover:underline"
                >
                  {current.label}
                </Link>
                <span aria-hidden className="text-fg-3">
                  /
                </span>
                <span aria-current="page" className="truncate font-semibold text-fg">
                  {crumbLabel ?? '…'}
                </span>
              </nav>
            )}
            {children}
          </main>
        </PageCrumbContext>
      </div>

      {canChangeOwnPassword(user?.role) && (
        <ChangePasswordDialog open={changingPassword} onOpenChange={setChangingPassword} />
      )}
    </div>
  )
}

// Thanh trên của điện thoại cao 56px (h-14)
const TOP_BAR = 56

/** Đã cuộn qua tiêu đề trang (h1 trong #main) chưa. Chuyển trang thì tính lại từ lần cuộn sau */
function usePastPageTitle(pathname: string) {
  const [pastOn, setPastOn] = useState<string | null>(null)
  useEffect(() => {
    const update = () => {
      const heading = document.querySelector('#main h1')
      const past = heading ? heading.getBoundingClientRect().bottom < TOP_BAR : window.scrollY > 0
      setPastOn(past ? window.location.pathname : null)
    }
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  return pastOn === pathname
}

// Hàng của sidebar cao 44px ở mọi cỡ màn hình (khách hàng không cần mật độ như công cụ nhân viên)
const sidebarRow = 'press flex h-11 w-full items-center gap-3 rounded-control px-3 text-left text-body'
// Nút vuông của sidebar thu gọn, căn giữa cột 64px
const sidebarIcon = 'press relative mx-auto flex size-10 items-center justify-center rounded-control'
// Mục đang mở: nền nhạt + vạch 3px bên trái + icon tô đặc + chữ đậm, không chỉ dựa vào màu
const activeBar =
  'before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-control before:bg-accent'

function SidebarBrand({
  compact,
  portalName,
  onClose,
  closeButtonRef,
}: {
  compact: boolean
  portalName: string
  onClose: () => void
  closeButtonRef: RefObject<HTMLButtonElement | null>
}) {
  if (compact) {
    return (
      <div className="flex h-16 shrink-0 items-center justify-center border-b border-line">
        <WithTooltip side="right" label="Trang chủ Smart Solar">
          {(tip) => (
            <Link to={ROUTES.home} aria-label="Smart Solar – Trang chủ" className="rounded-control" {...tip}>
              <img src="/images/mark-96.png" width={32} height={32} alt="" className="size-8" />
            </Link>
          )}
        </WithTooltip>
      </div>
    )
  }
  return (
    <div className="flex shrink-0 items-start justify-between gap-2 border-b border-line px-4 pt-4 pb-3">
      <div className="min-w-0">
        {/* Ở dark mode logo đặt trên nền sáng vì chữ "Smart" màu navy khó thấy. Bấm logo về trang chủ công khai */}
        <Link to={ROUTES.home} className="inline-flex rounded-control dark:bg-fg dark:px-2 dark:py-1">
          <img
            src="/images/logo-64h.webp"
            srcSet="/images/logo-64h.webp 262w, /images/logo-96h.webp 394w"
            sizes="148px"
            alt="Smart Solar – Trang chủ"
            width={148}
            height={36}
            className="h-9 w-auto"
          />
        </Link>
        <p className="mt-1 text-meta text-fg-2">{portalName}</p>
      </div>
      <button
        ref={closeButtonRef}
        type="button"
        aria-label="Đóng menu"
        onClick={onClose}
        className="press -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-control text-fg-2 hover:bg-hover hover:text-fg lg:hidden"
      >
        <Icon name="close" className="text-[24px]" />
      </button>
    </div>
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
  const active = isNavItemActive(item, pathname)
  return (
    // Dùng Link thay NavLink vì NavLink bỏ aria-current khi đang ở trang con
    <Link
      to={item.to}
      onClick={onNavigate}
      aria-label={count?.value ? `${item.label} (${count.value})` : undefined}
      aria-current={active ? (isNavItemPage(item, pathname) ? 'page' : 'location') : undefined}
      className={cx(
        sidebarRow,
        'group relative focus-visible:-outline-offset-2',
        active ? cx('bg-accent-muted font-semibold text-fg', activeBar) : 'text-fg-2 hover:bg-hover hover:text-fg',
      )}
    >
      <Icon
        name={item.icon}
        className={cx('shrink-0 text-[20px]', active ? 'icon-fill text-accent-fg' : 'text-fg-3 group-hover:text-fg-2')}
      />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {count?.value ? <Count value={count.value} attention={count.attention} className="-ml-1" /> : null}
    </Link>
  )
}

// Sidebar thu gọn: chỉ còn icon, tên trong tooltip và aria-label
function SidebarIconLink({ item, pathname, count }: { item: NavItem; pathname: string; count?: RailCount }) {
  const active = isNavItemActive(item, pathname)
  const label = count?.value ? `${item.label} (${count.value})` : item.label
  return (
    <WithTooltip side="right" label={label}>
      {(tip) => (
        <Link
          to={item.to}
          aria-label={label}
          aria-current={active ? (isNavItemPage(item, pathname) ? 'page' : 'location') : undefined}
          className={cx(
            sidebarIcon,
            'focus-visible:-outline-offset-2',
            active ? cx('bg-accent-muted text-accent-fg', activeBar) : 'text-fg-2 hover:bg-hover hover:text-fg',
          )}
          {...tip}
        >
          <Icon name={item.icon} className={cx('text-[20px]', active && 'icon-fill')} />
          {count?.value ? (
            <Count value={count.value} attention={count.attention} className="absolute -top-1.5 -right-1.5" />
          ) : null}
        </Link>
      )}
    </WithTooltip>
  )
}

/** Tên hiện trên nút tài khoản: chưa có họ tên thì là email, không tự đặt tên khác */
function accountName(user: { name: string; email: string } | null) {
  if (!user) return { name: '', email: '' }
  const hasName = user.name.trim() !== '' && user.name !== user.email
  return { name: hasName ? user.name : '', email: user.email }
}

// Nút tài khoản ở đáy sidebar, bấm mở bảng chức năng phía trên (sidebar thu gọn: bên phải)
// Bảng đóng khi bấm ra ngoài, nhấn Esc hoặc sau khi chọn chức năng
function AccountMenu({ compact, onChangePassword }: { compact: boolean; onChangePassword: () => void }) {
  const { user } = useAuth()
  const { name, email } = accountName(user)
  const label = name || email
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Chặn để drawer không đóng cùng lúc
      e.preventDefault()
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <WithTooltip side="right" label={compact && !open ? label : null}>
        {(tip) => (
          // Tên đọc chứa đúng chữ đang hiện (WCAG 2.5.3): "Tài khoản: <tên>"
          <button
            ref={buttonRef}
            type="button"
            aria-expanded={open}
            aria-controls={open ? panelId : undefined}
            aria-label={`Tài khoản: ${label}`}
            onClick={() => setOpen((value) => !value)}
            className={cx(
              compact
                ? sidebarIcon
                : 'press flex min-h-11 w-full items-center gap-3 rounded-control px-2 py-1.5 text-left',
              'text-fg hover:bg-hover',
              open && 'bg-hover',
            )}
            {...tip}
          >
            <Avatar name={label} size="sm" tone="accent" />
            {!compact && (
              <>
                {/* Chưa có họ tên thì ghi đủ email, cỡ nhỏ và xuống dòng ở bất kỳ ký tự nào thay vì bị cắt */}
                <span
                  className={cx(
                    'min-w-0 flex-1 font-medium',
                    name ? 'line-clamp-2 text-body' : 'text-meta [overflow-wrap:anywhere]',
                  )}
                >
                  {label}
                </span>
                <Icon name={open ? 'expand_more' : 'expand_less'} className="shrink-0 text-[20px] text-fg-3" />
              </>
            )}
          </button>
        )}
      </WithTooltip>
      {open && (
        <div
          id={panelId}
          className={cx(
            'absolute z-50 w-64 max-w-[calc(100vw-2rem)] rounded-container border border-line bg-canvas p-2 shadow-pop',
            compact ? 'bottom-0 left-full ml-3' : 'bottom-full left-0 mb-2',
          )}
        >
          <AccountActions
            onChangePassword={() => {
              setOpen(false)
              onChangePassword()
            }}
          />
        </div>
      )}
    </div>
  )
}

const accountRow = 'press flex h-11 w-full items-center gap-3 rounded-control px-2 text-left text-body lg:h-9'

/* Nội dung bảng tài khoản: tên / email, đổi mật khẩu, giao diện, đăng xuất. */
function AccountActions({ onChangePassword }: { onChangePassword: () => void }) {
  const { user, signOut } = useAuth()
  const { name, email } = accountName(user)
  const navigate = useNavigate()
  const [theme, setTheme] = useTheme()
  const current = THEME_OPTIONS.find((t) => t.value === theme) ?? THEME_OPTIONS[0]!

  async function handleSignOut() {
    await signOut()
    navigate(ROUTES.login, { replace: true })
  }

  return (
    <>
      <div className="px-2 py-2">
        {name && <p className="text-body font-medium text-fg [overflow-wrap:anywhere]">{name}</p>}
        <p className={cx('[overflow-wrap:anywhere]', name ? 'text-meta text-fg-2' : 'text-body font-medium text-fg')}>
          {email}
        </p>
        <p className="text-meta text-fg-2">{user ? ROLE_LABELS[user.role] : ''}</p>
      </div>
      <div className="my-1 border-t border-line" />
      {canChangeOwnPassword(user?.role) && (
        <button
          type="button"
          onClick={onChangePassword}
          className={cx(accountRow, 'text-fg-2 hover:bg-hover hover:text-fg')}
        >
          <Icon name="key" className="text-[20px]" />
          {changePasswordContent.menuLabel}
        </button>
      )}
      <div className="px-2 pt-2 pb-1">
        <p aria-hidden className="mb-2 flex items-center gap-3 text-body text-fg-2">
          <Icon name={current.icon} className="text-[20px]" />
          Giao diện
        </p>
        <Segmented
          label="Giao diện"
          size="sm"
          options={THEME_OPTIONS.map(({ value, label }) => ({ value, label }))}
          value={theme}
          onChange={setTheme}
        />
      </div>
      <div className="my-1 border-t border-line" />
      <button
        type="button"
        onClick={handleSignOut}
        className={cx(accountRow, 'text-fg-2 hover:bg-danger-soft hover:text-danger')}
      >
        <Icon name="logout" className="text-[20px]" />
        Đăng xuất
      </button>
    </>
  )
}
