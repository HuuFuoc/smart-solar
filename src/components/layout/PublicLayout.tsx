import '@fontsource/be-vietnam-pro/300.css'
import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/600.css'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { LANDING_CONTAINER, TEXT_LINK, ctaClass } from '@/features/landing/components/classes'
import { ROUTES } from '@/routes/paths'
import { homePathForRole } from '@/config/roles'
import { useAuth } from '@/context/AuthProvider'
import { cx } from '@/utils/cx'
import { footer, header, projects, trust } from '@/data/landing'

/*
 * Shell của các trang công khai ("/", "/coming-soon", "/products"). Không dùng AppShell/sidebar.
 * Font Be Vietnam Pro (300 số khai, 400 chữ, 600 tiêu đề và số đo) chỉ đặt ở đây vì
 * Schibsted Grotesk của portal thiếu dấu tiếng Việt.
 * Header không có menu theo giai đoạn (khảo sát, báo giá, thi công…): điều hướng đặt tên theo
 * giai đoạn đọc thành quy trình. Chỉ link tới danh mục sản phẩm, phần công trình và phần năng lực thi công.
 */
const capabilityLink = { pathname: ROUTES.home, hash: `#${trust.id}` }
const projectsLink = { pathname: ROUTES.home, hash: `#${projects.id}` }

export function PublicLayout() {
  // Ghi chú nguồn giá điện chỉ đúng với trang chủ (nơi có biểu giá).
  const onHome = useLocation().pathname === ROUTES.home
  // Đã đăng nhập: thay "Đăng nhập" bằng đường vào trang làm việc, ẩn nút đăng ký.
  const { user } = useAuth()
  const account = user
    ? { to: homePathForRole(user.role), label: 'Vào trang làm việc' }
    : { to: ROUTES.login, label: header.login }
  return (
    <div className="public-shell flex min-h-screen flex-col bg-canvas font-vn text-fg">
      <a
        href="#noi-dung"
        className="fixed top-2 left-2 z-50 -translate-y-20 rounded-control border border-line-2 bg-canvas px-4 py-2.5 ld-action text-fg focus:translate-y-0"
      >
        {header.skip}
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-canvas">
        <div className={cx('flex h-14 items-center justify-between gap-4 lg:h-16', LANDING_CONTAINER)}>
          {/* Logo người dùng cung cấp (public/images/Logo-navbar.png), bản WebP đã cắt viền trong suốt. Chữ "Smart" màu
              navy chìm trên nền tối nên ở dark mode logo đặt trên một nền sáng. */}
          <Link to={ROUTES.home} className="flex items-center rounded-control dark:bg-fg dark:px-2 dark:py-1">
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
          <nav aria-label="Liên kết chính" className="flex items-center gap-6">
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
            <Link to={projectsLink} className="hidden ld-body text-fg-2 underline-offset-8 hover:text-fg hover:underline hover:decoration-line-2 lg:inline">
              {header.projects}
            </Link>
            <Link to={capabilityLink} className="hidden ld-body text-fg-2 underline-offset-8 hover:text-fg hover:underline hover:decoration-line-2 lg:inline">
              {header.capability}
            </Link>
            <Link to={account.to} className="tap ld-body text-fg-2 underline-offset-8 hover:text-fg hover:underline hover:decoration-line-2">
              {account.label}
            </Link>
            {!user && (
              <Link to={ROUTES.register} className={ctaClass('md', 'hidden lg:inline-flex')}>
                {header.register}
              </Link>
            )}
          </nav>
        </div>
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
          <nav aria-label="Liên kết cuối trang" className="flex gap-6">
            <Link to={ROUTES.products} className={cx(TEXT_LINK, 'inline-block py-1')}>
              {header.products}
            </Link>
            <Link to={projectsLink} className={cx(TEXT_LINK, 'inline-block py-1')}>
              {header.projects}
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
