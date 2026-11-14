import { useCallback, useState } from 'react'

/**
 * Chiều cao để phần tử kéo tới đáy khung nhìn, chừa `gap` px bên dưới. Vị trí phần tử đo khi gắn và khi đổi cỡ
 * cửa sổ; phần phía trên đổi cao mà cửa sổ giữ nguyên cỡ thì không đo lại.
 */
export function useFillViewport(gap: number) {
  const [top, setTop] = useState<number | null>(null)
  const ref = useCallback((el: HTMLElement | null) => {
    if (!el) return
    // Làm tròn lên để tổng chiều cao không lố khung nhìn nửa điểm ảnh rồi hiện thanh cuộn
    const measure = () => setTop(Math.ceil(el.getBoundingClientRect().top + window.scrollY))
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])
  return [ref, top === null ? undefined : `calc(100dvh - ${top + gap}px)`] as const
}
