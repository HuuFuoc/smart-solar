import { useEffect, useEffectEvent, useState } from 'react'

/**
 * Đếm ngược sau khi bị server giới hạn số lần gọi (lỗi 429).
 * Gọi `start(seconds)` để bắt đầu. `secondsLeft` là số giây còn phải chờ, 0 là đã hết giờ.
 * Hết giờ thì gọi `onFinish`.
 */
export function useRetryCountdown(onFinish: () => void) {
  // Thời điểm được gọi lại (ms), null là không phải chờ
  const [retryAt, setRetryAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const finish = useEffectEvent(onFinish)

  useEffect(() => {
    if (retryAt === null) return
    const timer = window.setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= retryAt) {
        setRetryAt(null)
        finish()
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [retryAt])

  function start(seconds: number) {
    const current = Date.now()
    setRetryAt(current + seconds * 1000)
    setNow(current)
  }

  const secondsLeft = retryAt === null ? 0 : Math.max(0, Math.ceil((retryAt - now) / 1000))
  return { secondsLeft, start }
}
