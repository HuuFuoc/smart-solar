import { isRouteErrorResponse, useRouteError } from 'react-router'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { ROUTES } from '@/routes/paths'
import { homePathForRole } from '@/config/roles'
import { useAuth } from '@/context/AuthProvider'

/* Root error boundary: 404s and unexpected render errors land here. */
export function NotFoundPage() {
  const error = useRouteError()
  const notFound = error == null || (isRouteErrorResponse(error) && error.status === 404)
  const message = !notFound && error instanceof Error ? error.message : undefined
  // Đã đăng nhập thì nút chính về trang làm việc của vai trò; chưa đăng nhập thì về landing.
  const { user } = useAuth()
  const home = user ? homePathForRole(user.role) : ROUTES.home

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col justify-center px-6 py-16">
      <p className="tnum text-body text-fg-2">{notFound ? 'Lỗi 404' : 'Đã xảy ra lỗi'}</p>
      <h1 className="mt-1 text-figure font-semibold">
        {notFound ? 'Trang không tồn tại' : 'Không hiển thị được trang'}
      </h1>
      <p className="mt-2 text-body text-fg-2">
        {notFound
          ? 'Liên kết có thể đã cũ hoặc nội dung đã được chuyển đi.'
          : 'Tải lại trang hoặc quay về trang chính. Nếu lỗi vẫn lặp lại, hãy liên hệ tư vấn viên.'}
      </p>
      {message && (
        <pre className="mt-3 overflow-x-auto rounded-container bg-surface-2 px-3 py-2 font-mono text-meta text-fg-2">
          {message}
        </pre>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink icon="home" to={home} variant="primary">
          {user ? 'Về trang làm việc' : 'Về trang chủ'}
        </ButtonLink>
        <Button icon="refresh" variant="secondary" onClick={() => window.location.reload()}>
          Tải lại
        </Button>
      </div>
    </main>
  )
}
