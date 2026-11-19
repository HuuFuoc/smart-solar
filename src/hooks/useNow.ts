import { useEffect, useState } from 'react'

/** Giờ hiện tại, cập nhật mỗi `intervalMs` để chữ "còn N phút" và nút mở theo giờ tự đổi khi trang để mở lâu */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}
