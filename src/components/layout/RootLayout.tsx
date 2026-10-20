import { Outlet, ScrollRestoration } from 'react-router'
import { SessionExpiredModal } from '@/features/auth/SessionExpiredModal'

// Route gốc, bọc cả app để SessionExpiredModal dùng được useNavigate
// ScrollRestoration để trang mới mở từ đầu trang, Back / Forward về đúng chỗ đã cuộn
export function RootLayout() {
  return (
    <>
      <Outlet />
      <ScrollRestoration />
      <SessionExpiredModal />
    </>
  )
}
