import '@fontsource/be-vietnam-pro/300.css'
import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/600.css'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, type To } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { LANDING_CONTAINER, TEXT_LINK, ctaClass } from '@/features/landing/components/classes'
import { ThemeToggle } from '@/features/landing/components/theme-toggle'
import { ROUTES } from '@/routes/paths'
import { homePathForRole } from '@/config/roles'
import { useAuth } from '@/context/AuthProvider'
import { cx } from '@/utils/cx'
import { footer, header, solution, workflow } from '@/data/landing'

/*
 * Shell của các trang công khai ("/", "/coming-soon", "/products"). Không dùng AppShell/sidebar.
 * Font Be Vietnam Pro (300 số khai, 400 chữ, 600 tiêu đề và số đo) chỉ đặt ở đây vì
 * Schibsted Grotesk của portal thiếu dấu tiếng Việt.
 * Header: Giải pháp, Quy trình (section của trang chủ), Sản phẩm, Đăng nhập, nút "Đăng ký khảo sát" và nút sáng / tối ở
 * mép phải. Dưới lg chỉ còn logo, nút sáng / tối và nút Menu mở bảng liên kết ngay dưới header.
 */
const solutionLink = { pathname: ROUTES.home, hash: `#${solution.id}` }
const workflowLink = { pathname: ROUTES.home, hash: `#${workflow.id}` }

export function PublicLayout() {
  // Trang chủ kết thúc bằng dải CTA màu nên footer đứng sát.
  const onHome = useLocation().pathname === ROUTES.home
  // Đã đăng nhập: thay "Đăng nhập" bằng đường vào trang làm việc, ẩn nút đăng ký.
  const { user } = useAuth()
  const account = user
    ? { to: homePathForRole(user.role), label: header.workspace }
    : { to: ROUTES.login, label: header.login }
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const closeMenu = () => setMenuOpen(false)

  // Esc đóng bảng liên kết và trả focus về nút Menu.
  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setMenuOpen(false)
      menuButton.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  return (
    <div className="public-shell flex min-h-screen flex-col bg-canvas font-vn text-fg">
      <a
        href="#noi-dung"
        className="fixed top-2 left-2 z-50 -translate-y-20 rounded-control border border-line-2 bg-canvas px-4 py-2.5 ld-action text-fg focus:translate-y-0"
      >
        {header.skip}
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-canvas">
        <div className={cx('flex h-14 items-center gap-4 lg:h-16', LANDING_CONTAINER)}>
          {/* Logo người dùng cung cấp (public/images/Logo-navbar.png), bản WebP đã cắt viền trong suốt. Chữ "Smart" màu
              navy chìm trên nền tối nên ở dark mode logo đặt trên một nền sáng. */}
          <Link to={ROUTES.home} className="flex shrink-0 items-center rounded-control dark:bg-fg dark:px-2 dark:py-1">
            <img
              src="/images/logo-64h.webp"
              srcSet="/images/logo-64h.webp 262w, /images/logo-96h.webp 394w"
              sizes="148px"
              alt={footer.brand}
              width={148}
              height={36}
              className="h-8 w-auto lg:h-9"
            />
          </Link>

          <nav aria-label="Liên kết chính" className="ml-auto hidden items-center gap-6 lg:flex">
            <HeaderLink to={solutionLink}>{header.solution}</HeaderLink>
            <HeaderLink to={workflowLink}>{header.process}</HeaderLink>
            {/* Trang đang mở: chữ đậm màu chính + gạch chân màu thương hiệu, không chỉ đậm hơn một chút. */}
            <NavLink
              to={ROUTES.products}
              className={({ isActive }) =>
                cx(
                  'tap ld-body underline-offset-8 hover:text-fg',
                  isActive ? 'font-semibold text-fg underline decoration-accent decoration-2' : 'text-fg-2 hover:underline hover:decoration-line-2',
                )
              }
            >
              {header.products}
            </NavLink>
            <HeaderLink to={account.to}>{account.label}</HeaderLink>
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-2 lg:gap-4">
            {!user && (
              <Link to={ROUTES.register} className={ctaClass('md', 'hidden lg:inline-flex')}>
                {header.register}
              </Link>
            )}
            <ThemeToggle />
            <button
              ref={menuButton}
              type="button"
              aria-expanded={menuOpen}
              aria-controls="public-menu"
              onClick={() => setMenuOpen((open) => !open)}
              className="press -mr-2 inline-flex h-11 items-center gap-2 rounded-control px-2 ld-body font-semibold text-fg hover:bg-hover lg:hidden"
            >
              <Icon name={menuOpen ? 'close' : 'menu'} className="text-[24px]" />
              {header.menu}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div id="public-menu" className="border-t border-line lg:hidden">
            <nav aria-label="Liên kết chính" className={cx(LANDING_CONTAINER, 'flex flex-col py-3')}>
              <MenuLink to={solutionLink} onClick={closeMenu}>
                {header.solution}
              </MenuLink>
              <MenuLink to={workflowLink} onClick={closeMenu}>
                {header.process}
              </MenuLink>
              <MenuLink to={ROUTES.products} onClick={closeMenu} nav>
                {header.products}
              </MenuLink>
              <MenuLink to={account.to} onClick={closeMenu}>
                {account.label}
              </MenuLink>
              {!user && (
                <Link to={ROUTES.register} onClick={closeMenu} className={ctaClass('lg', 'mt-3 flex')}>
                  {header.register}
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      <main id="noi-dung" className="flex-1">
        <Outlet />
      </main>

      {/* Trang chủ kết thúc bằng dải CTA màu nên footer đứng sát; trang khác cần khoảng trống phía trên. */}
      <footer className={cx('border-t border-line', !onHome && 'mt-24 lg:mt-32')}>
        <div
          className={cx(
            'flex flex-col gap-3 py-8 ld-meta text-fg-2 lg:flex-row lg:flex-wrap lg:items-baseline lg:justify-between lg:gap-x-8',
            LANDING_CONTAINER,
          )}
        >
          <img
            src="/images/logo-64h.webp"
            alt={footer.brand}
            width={115}
            height={28}
            loading="lazy"
            className="h-7 w-auto self-start dark:rounded-control dark:bg-fg dark:px-2 dark:py-1"
          />
          <nav aria-label="Liên kết cuối trang" className="flex flex-wrap gap-x-6">
            <Link to={solutionLink} className={cx(TEXT_LINK, 'inline-block py-1')}>
              {header.solution}
            </Link>
            <Link to={workflowLink} className={cx(TEXT_LINK, 'inline-block py-1')}>
              {header.process}
            </Link>
            <Link to={ROUTES.products} className={cx(TEXT_LINK, 'inline-block py-1')}>
              {header.products}
            </Link>
            <Link to={account.to} className={cx(TEXT_LINK, 'inline-block py-1')}>
              {account.label}
            </Link>
          </nav>
          <p>{footer.copyright}</p>
        </div>
      </footer>
    </div>
  )
}

function HeaderLink({ to, children }: { to: To; children: ReactNode }) {
  return (
    <Link to={to} className="tap ld-body text-fg-2 underline-offset-8 hover:text-fg hover:underline hover:decoration-line-2">
      {children}
    </Link>
  )
}

/* Dòng trong bảng liên kết dưới lg: cao 48px; "Sản phẩm" (nav) có nền "đang chọn" khi đang ở trang sản phẩm. */
function MenuLink({ to, onClick, nav = false, children }: { to: To; onClick: () => void; nav?: boolean; children: ReactNode }) {
  const row = 'press -mx-2 flex h-12 items-center rounded-control px-2 ld-body'
  const idle = 'text-fg-2 hover:bg-hover hover:text-fg'
  if (!nav) {
    return (
      <Link to={to} onClick={onClick} className={cx(row, idle)}>
        {children}
      </Link>
    )
  }
  return (
    <NavLink to={to} onClick={onClick} className={({ isActive }) => cx(row, isActive ? 'bg-accent-soft font-semibold text-fg' : idle)}>
      {children}
    </NavLink>
  )
}
