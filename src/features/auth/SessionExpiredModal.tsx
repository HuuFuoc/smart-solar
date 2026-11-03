import { useNavigate } from 'react-router'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { ROUTES } from '@/routes/paths'
import { useAuth } from '@/context/AuthProvider'
import { sessionExpiredContent } from '@/data/auth'

// Modal hết phiên, mở khi client.ts bắn sự kiện session-expired (refresh token hỏng)
// Dùng Radix Dialog để khoá focus và Esc. Không có nút X vì chỉ có 2 lựa chọn
export function SessionExpiredModal() {
  const navigate = useNavigate()
  const { sessionExpired, dismissSessionExpired } = useAuth()

  const goToLogin = () => {
    dismissSessionExpired()
    navigate(ROUTES.login, { replace: true })
  }

  const goHome = () => {
    dismissSessionExpired()
    navigate(ROUTES.home, { replace: true })
  }

  return (
    <DialogPrimitive.Root open={sessionExpired} onOpenChange={(open) => !open && dismissSessionExpired()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-60 bg-scrim data-[state=open]:animate-[dialog-fade-in_150ms_ease-out]" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-70 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-container border border-line bg-canvas p-6 text-fg shadow-pop focus:outline-none data-[state=open]:animate-[dialog-pop-in_180ms_ease-out]"
        >
          <div className="flex items-start gap-3">
            <Icon name="timer_off" className="mt-0.5 shrink-0 text-[24px] text-danger" />
            <DialogPrimitive.Title className="text-title font-semibold">
              {sessionExpiredContent.title}
            </DialogPrimitive.Title>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button icon="home" variant="secondary" onClick={goHome}>
              {sessionExpiredContent.secondary}
            </Button>
            <Button icon="login" variant="primary" onClick={goToLogin}>
              {sessionExpiredContent.primary}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
