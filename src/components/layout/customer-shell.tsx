import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/500.css'
import '@fontsource/be-vietnam-pro/600.css'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Avatar } from '@/components/common/ui/avatar'
import { Segmented } from '@/components/common/ui/segmented'
import { PageCrumbContext, isNavItemActive, isNavItemPage, type PageCrumb } from '@/components/layout/page-crumb'
import { PORTALS, type NavItem } from '@/config/portals'
import { ROLE_LABELS } from '@/common/role'
import { canChangeOwnPassword } from '@/config/roles'
import { useAuth } from '@/context/AuthProvider'
import { changePasswordContent } from '@/data/auth'
import { ChangePasswordDialog } from '@/features/auth/ChangePasswordDialog'
import { THEME_OPTIONS, useTheme } from '@/hooks/useTheme'
import { ROUTES } from '@/routes/paths'
import { cx } from '@/utils/cx'

// Khung của cổng khách hàng, theo kiểu website công khai thay vì rail của nhân viên
// Thanh trên dính có logo, menu chữ và nút tài khoản. Nội dung căn giữa, rộng tối đa 1200px
// Điện thoại: nút Menu mở bảng gồm menu và tài khoản
export function CustomerShell({ children }: { children: ReactNode }) {
  const portal = PORTALS.customer
  const items = portal.groups.flatMap((group) => group.items)
  const { pathname } = useLocation()
  const [crumb, setCrumb] = useState<PageCrumb | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const { user } = useAuth()
  const current = items.find((item) => isNavItemActive(item, pathname))
  const onItemPage = current ? isNavItemPage(current, pathname) : false
  const crumbLabel = crumb?.pathname === pathname ? crumb.label : null

  // Tiêu đề tab trình duyệt theo vị trí: "<trang>, Cổng khách hàng, Smart Solar".
  const title = [crumbLabel ?? current?.label, portal.name, 'Smart Solar'].filter(Boolean).join(' – ')
  useEffect(() => {
    document.title = title
  }, [title])

  const openChangePassword = () => {
    setMobileOpen(false)
    setChangingPassword(true)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas font-vn text-fg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-canvas focus:px-3 focus:py-2 focus:text-meta"
      >
        Bỏ qua, tới nội dung chính
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-canvas">
        <div className="mx-auto flex h-14 w-full max-w-landing items-center gap-8 px-4 md:px-6 lg:h-16">
          {/* Ở dark mode logo đặt trên nền sáng vì chữ "Smart" màu navy khó thấy. Bấm logo về trang chủ công khai */}
          <Link to={ROUTES.home} className="flex shrink-0 items-center rounded-control dark:bg-fg dark:px-2 dark:py-1">
            <img
              src="/images/logo-64h.webp"
              srcSet="/images/logo-64h.webp 262w, /images/logo-96h.webp 394w"
              sizes="148px"
              alt="Smart Solar – Trang chủ"
              width={148}
              height={36}
              className="h-8 w-auto lg:h-9"
            />
          </Link>

          <nav aria-label="Cổng khách hàng" className="hidden flex-1 items-center gap-6 md:flex">
            {items.map((item) => (
              <TopNavLink key={item.label} item={item} pathname={pathname} />
            ))}
          </nav>

          <div className="ml-auto flex items-center">
            {user && <AccountMenu onChangePassword={openChangePassword} className="hidden md:block" />}
            <button
              type="button"
              aria-expanded={mobileOpen}
              aria-controls="customer-menu"
              onClick={() => setMobileOpen((value) => !value)}
              className="press -mr-2 inline-flex h-11 items-center gap-2 rounded-control px-2 text-body font-medium text-fg hover:bg-hover md:hidden"
            >
              <Icon name={mobileOpen ? 'close' : 'menu'} className="text-[24px]" />
              Menu
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div id="customer-menu" className="border-t border-line md:hidden">
            <div className="mx-auto max-w-landing px-4 py-3">
              <nav aria-label="Cổng khách hàng" className="space-y-0.5">
                {items.map((item) => {
                  const active = isNavItemActive(item, pathname)
                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      aria-current={active ? (isNavItemPage(item, pathname) ? 'page' : 'location') : undefined}
                      className={cx(
                        'press -mx-2 flex h-11 items-center gap-3 rounded-control px-2 text-body',
                        active ? 'bg-accent-soft font-semibold text-fg' : 'text-fg-2 hover:bg-hover hover:text-fg',
                      )}
                    >
                      <Icon
                        name={item.icon}
                        className={cx('text-[20px]', active ? 'icon-fill text-accent-fg' : 'text-fg-3')}
                      />
                      {item.label}
                    </Link>
                  )
                })}
              </nav>
              {user && (
                <div className="-mx-2 mt-3 border-t border-line pt-2">
                  <AccountActions onChangePassword={openChangePassword} />
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <PageCrumbContext value={setCrumb}>
        <main id="main" className="mx-auto w-full max-w-landing flex-1 px-4 py-6 md:px-6 lg:py-8">
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
              <span aria-current="page" className="truncate font-semibold text-fg" title={crumbLabel ?? undefined}>
                {crumbLabel ?? '…'}
              </span>
            </nav>
          )}
          {children}
        </main>
      </PageCrumbContext>

      <footer className="border-t border-line">
        <div className="mx-auto w-full max-w-landing px-4 py-6 text-meta text-fg-2 md:px-6">© 2026 Smart Solar</div>
      </footer>

      {canChangeOwnPassword(user?.role) && (
        <ChangePasswordDialog open={changingPassword} onOpenChange={setChangingPassword} />
      )}
    </div>
  )
}

// Mục đang mở đậm + gạch chân xanh
function TopNavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isNavItemActive(item, pathname)
  return (
    <Link
      to={item.to}
      aria-current={active ? (isNavItemPage(item, pathname) ? 'page' : 'location') : undefined}
      className={cx(
        'tap text-body underline-offset-8',
        active
          ? 'font-semibold text-fg underline decoration-accent decoration-2'
          : 'text-fg-2 hover:text-fg hover:underline hover:decoration-line-2',
      )}
    >
      {item.label}
    </Link>
  )
}

// Bảng tài khoản đóng khi bấm ra ngoài, nhấn Esc hoặc sau khi chọn chức năng
function AccountMenu({ onChangePassword, className }: { onChangePassword: () => void; className?: string }) {
  const { user } = useAuth()
  const name = user?.name ?? ''
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
    <div ref={rootRef} className={cx('relative', className)}>
      {/* Tên đọc chứa đúng chữ đang hiện (WCAG 2.5.3): "Tài khoản: <tên>". */}
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`Tài khoản: ${name}`}
        onClick={() => setOpen((value) => !value)}
        className="press -mr-2 flex h-10 max-w-72 items-center gap-2 rounded-control px-2 text-body font-medium text-fg hover:bg-hover"
      >
        <Avatar name={name} size="sm" tone="accent" />
        <span className="min-w-0 truncate">{name}</span>
        <Icon name={open ? 'expand_less' : 'expand_more'} className="shrink-0 text-[20px] text-fg-3" />
      </button>
      {open && (
        <div
          id={panelId}
          className="absolute top-full right-0 z-40 mt-2 w-72 rounded-container border border-line bg-canvas p-2 shadow-pop"
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

/* Nội dung tài khoản, dùng chung cho bảng thả xuống (desktop) và bảng menu (điện thoại). */
function AccountActions({ onChangePassword }: { onChangePassword: () => void }) {
  const { user, signOut } = useAuth()
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
        <p className="truncate text-body font-medium text-fg" title={user?.email}>
          {user?.name}
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
