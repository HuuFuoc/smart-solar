import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/context/AuthProvider'
import { isApiError } from '@/services/api/errors'
import { cx } from '@/utils/cx'

// Lỗi 4xx thử lại cũng không khỏi nên không retry
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (isApiError(error) && error.status >= 400 && error.status < 500) return false
        return failureCount < 2
      },
    },
  },
})

// Toast theo màu của token: thành công xanh, thông tin xanh dương, lỗi / cảnh báo nền đỏ / vàng nhạt
// Nền và viền chỉ đặt trong class theo loại vì cx không gộp class
const toastSurface = 'border-line bg-canvas'
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster
          // Đặt ở trên cùng để không đè nút của ActionBar
          position="top-right"
          toastOptions={{
            unstyled: true,
            classNames: {
              toast: 'flex w-full items-start gap-3 rounded-container border px-4 py-3 font-sans text-fg shadow-pop',
              default: toastSurface,
              loading: toastSurface,
              success: cx(toastSurface, '[&_[data-icon]]:text-ok'),
              info: cx(toastSurface, '[&_[data-icon]]:text-info'),
              warning: 'border-warn/40 bg-warn-soft [&_[data-icon]]:text-warn',
              error: 'border-danger/40 bg-danger-soft [&_[data-icon]]:text-danger',
              title: 'text-body font-medium',
              description: 'mt-0.5 text-meta text-fg-2',
              icon: 'mt-px flex shrink-0',
              // unstyled: sonner không tô nút hành động ("Hoàn tác"), phải tự đặt; cùng kiểu nút secondary.
              actionButton:
                'press ml-auto shrink-0 rounded-control border border-line-2 bg-canvas px-3 py-1 text-meta font-semibold text-fg hover:bg-surface-2',
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  )
}
