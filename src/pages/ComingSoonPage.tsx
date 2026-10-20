import { Link } from 'react-router'
import { LANDING_CONTAINER } from '@/features/landing/classes'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { ROUTES } from '@/routes/paths'
import { cn } from '@/utils/cn'

/*
 * Trang tạm cho các link chưa có nội dung (điều khoản, chính sách bảo mật…). Không nhắc tới portal nào:
 * cổng khách hàng, kinh doanh và quản trị đều đã chạy với dữ liệu thật (08/10/2026).
 */

export function ComingSoonPage() {
  return (
    <div className={cn('flex flex-col items-center py-space-3xl text-center', LANDING_CONTAINER)}>
      <div className="mb-space-md flex h-20 w-20 items-center justify-center rounded-full bg-surface-container-high text-accent-fg shadow-sm">
        <Icon name="construction" className="text-[42px]" />
      </div>
      <h1 className="text-headline-xl-mobile text-accent-fg md:text-headline-xl">Trang này chưa có nội dung</h1>
      <p className="mt-space-xs max-w-xl text-body-lg text-on-surface-variant">
        Nội dung đang được soạn. Bạn có thể quay về trang chủ, hoặc đăng nhập để dùng các chức năng đang có.
      </p>

      <div className="mt-space-xl flex flex-wrap items-center justify-center gap-space-sm">
        <Link
          to={ROUTES.home}
          className="inline-flex items-center justify-center gap-space-xs rounded-xl bg-primary-container px-space-lg py-3 text-label-lg text-on-primary shadow-sm transition-all hover:bg-primary"
        >
          <Icon name="arrow_back" className="text-[18px]" />
          Về trang chủ
        </Link>
        <Link
          to={ROUTES.login}
          className="inline-flex items-center justify-center rounded-xl bg-surface-container px-space-lg py-3 text-label-lg text-on-surface transition-colors hover:bg-surface-container-high"
        >
          Đăng nhập
        </Link>
      </div>
    </div>
  )
}
