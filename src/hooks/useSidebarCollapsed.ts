import { useCallback, useState } from 'react'

const KEY = 'smartsolar.sidebar-collapsed'

function read() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** Thu gọn sidebar trên desktop thành cột icon 64px, nhớ theo trình duyệt */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(read)
  const update = useCallback((next: boolean) => {
    setCollapsed(next)
    try {
      if (next) localStorage.setItem(KEY, '1')
      else localStorage.removeItem(KEY)
    } catch {
      /* Trình duyệt chặn storage: vẫn thu gọn được, chỉ không nhớ sau khi tải lại. */
    }
  }, [])
  return [collapsed, update] as const
}
