import '@fontsource/be-vietnam-pro/300.css'
import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/600.css'
import { Link, Outlet, useLocation } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { ROUTES } from '@/routes/paths'
import { authImages, authLayoutContent } from '@/data/auth'

/*
 * Shell các màn xác thực (/login, /register, /forgot-password, /reset-password, /verify-email, /403).
 *
 * Desktop: cao đúng một màn hình – ảnh 5/12 bên trái, form 7/12 bên phải (logo + về trang chủ ở trên,
 * form ở giữa, bản quyền ở dưới). Màn thấp hơn 720px (variant `short`) thu khoảng đệm; nếu vẫn không
 * đủ thì chỉ cột form cuộn bên trong, trang không cuộn.
 * Mobile: dải ảnh thấp ở trên, form bên dưới, cuộn bình thường.
 *
 * Ảnh do người dùng cung cấp đã in sẵn chữ ở góc trên trái, nên cắt giữ phần trên (object-top).
 * /register dùng ảnh đăng ký, các màn còn lại dùng ảnh đăng nhập. Font Be Vietnam Pro vì
 * Schibsted Grotesk của portal thiếu dấu tiếng Việt.
 */
export function AuthLayout() {
  const { pathname } = useLocation()
  // Ảnh đăng nhập in sẵn chữ "Chào mừng trở lại": trang 403 dùng ảnh đăng ký (lời chào chung) cho khỏi lạc giọng.
  const image = pathname === ROUTES.register || pathname === ROUTES.forbidden ? authImages.register : authImages.login

  return (
    <main className="min-h-svh w-full bg-surface font-vn lg:grid lg:h-svh lg:grid-cols-12">
      <div className="relative h-36 overflow-hidden bg-surface-container sm:h-48 lg:col-span-5 lg:h-full">
        {/* key đổi theo ảnh để khi chuyển giữa đăng nhập và đăng ký, ảnh mới thu nhẹ về cỡ thật. */}
        <img
          key={image.src}
          src={image.src}
          srcSet={image.srcSet}
          sizes="(width >= 64rem) 42vw, 100vw"
          alt={image.alt}
          fetchPriority="high"
          className="h-full w-full object-cover object-top ld-settle"
        />
      </div>

      <div className="flex min-h-0 flex-col lg:col-span-7 lg:overflow-y-auto">
        <header className="flex items-center justify-between gap-4 px-4 py-4 md:px-8 lg:px-12 lg:py-6 short:lg:py-3">
          <Link to={ROUTES.home} className="rounded-control dark:bg-fg dark:px-2 dark:py-1">
            <img
              src="/images/logo-64h.webp"
              srcSet="/images/logo-64h.webp 262w, /images/logo-96h.webp 394w"
              sizes="148px"
              alt={authLayoutContent.brand}
              width={148}
              height={36}
              className="h-8 w-auto lg:h-9"
            />
          </Link>
          <Link
            to={ROUTES.home}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-label-lg text-on-surface-variant transition-colors hover:text-on-surface lg:min-h-9"
          >
            <Icon name="arrow_back" className="text-[18px]" />
            {authLayoutContent.home}
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-4 py-4 md:px-8 lg:px-12 short:lg:py-1">
          <div className="w-full max-w-xl ld-rise">
            <Outlet />
          </div>
        </div>

        <footer className="px-4 pt-2 pb-4 text-body-sm text-on-surface-variant md:px-8 lg:px-12 lg:pb-6 short:lg:pb-3">
          {authLayoutContent.copyright}
        </footer>
      </div>
    </main>
  )
}
