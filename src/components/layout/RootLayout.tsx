import { Outlet, ScrollRestoration } from 'react-router'
import { SessionExpiredModal } from '@/features/auth/SessionExpiredModal'

/*
 * Route gốc: bọc toàn bộ app để SessionExpiredModal nằm trong router context
 * (modal cần useNavigate) và hiển thị được ở mọi màn.
 * ScrollRestoration: trang mới mở từ đầu trang; Back/Forward về đúng chỗ đã cuộn. Thiếu nó thì trang mới
 * mở ở vị trí cuộn của trang trước (ví dụ /products mở sẵn ở cuối trang).
 */
export function RootLayout() {
  return (
    <>
      <Outlet />
      <ScrollRestoration />
      <SessionExpiredModal />
    </>
  )
}
