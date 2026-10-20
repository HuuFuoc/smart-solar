import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

/** Chiều cao khung nhìn. Dùng clientHeight vì trên điện thoại nó không đổi khi thanh địa chỉ ẩn / hiện */
export function useViewportHeight() {
  return useSyncExternalStore(subscribe, () => document.documentElement.clientHeight)
}
