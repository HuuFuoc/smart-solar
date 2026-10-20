import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cx } from '@/utils/cx'

/*
  Khối hiện dần khi cuộn tới (CSS .ld-reveal trong landing.css): mỗi khối một IntersectionObserver,
  ngắt ngay sau lần hiện đầu nên không theo dõi mãi. Trình duyệt không có IntersectionObserver thì hiện
  luôn. `delay` (ms) để các khối cùng hàng hiện lệch nhau một chút.
*/
export function Reveal({ delay, className, children }: { delay?: number; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const el = ref.current
    if (!el || shown) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.1 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [shown])

  return (
    <div
      ref={ref}
      data-shown={shown || undefined}
      // Thời gian trễ là tham số chuyển động của từng khối nên đặt inline.
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cx('ld-reveal', className)}
    >
      {children}
    </div>
  )
}
