import { useCallback, useEffect, useState } from 'react'
import { goToCheckout } from '@/features/payments/payosReturn'

/**
 * Chuyển sang trang thanh toán PayOS trong tab đang dùng. `leaving` khoá nút trong lúc trang rời đi để khách không tạo link
 * lần hai; khách bấm Back và trình duyệt khôi phục trang từ bộ nhớ đệm thì mở khoá lại
 */
export function useCheckoutRedirect() {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const restore = (e: PageTransitionEvent) => {
      if (e.persisted) setLeaving(false)
    }
    window.addEventListener('pageshow', restore)
    return () => window.removeEventListener('pageshow', restore)
  }, [])

  const go = useCallback((attempt: { orderCode: number | string; checkoutUrl: string | null }, returnPath: string) => {
    const ok = goToCheckout(attempt, returnPath)
    if (ok) setLeaving(true)
    return ok
  }, [])

  return { leaving, go }
}
